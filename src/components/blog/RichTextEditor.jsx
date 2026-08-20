/**
 * RichTextEditor.jsx - TipTap wrapper for blog article bodies
 *
 * Emits plain semantic HTML (h2/h3/p/ul/blockquote/a/img/...) matching the
 * allowlist the backend sanitises against (blog_service.ALLOWED_TAGS). Anything
 * outside that list is stripped on save, so the toolbar deliberately offers no
 * font sizes, colours or alignment — formatting lives in prose.css, not in the
 * content.
 *
 * The editing surface carries the same `blog-prose` class as the Preview tab
 * and the published article, so what the author types is what gets published.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { toast } from 'react-toastify';
import { isEmptyHtml } from '../../utils/blogContent';
import { normalizePastedHtml } from '../../utils/pastedHtml';
import './prose.css';

// =====================================================
// TOOLBAR BUTTON
// =====================================================
const ToolbarButton = ({ onClick, isActive, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={Boolean(isActive)}
    className={`px-2.5 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      isActive
        ? 'bg-blue-600 border-blue-600 text-white'
        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-6 bg-gray-300 mx-1" aria-hidden="true" />;

// =====================================================
// EDITOR
// =====================================================
const RichTextEditor = ({
  value = '',
  onChange,
  onUploadImage,
  placeholder = 'Write the article…',
  disabled = false,
}) => {
  // The image dialog collects alt text BEFORE uploading. An image without alt
  // text is an accessibility and SEO defect, and the API rejects a cover image
  // that has none — in-article images get the same treatment here.
  const [imageDialog, setImageDialog] = useState(null); // { file, previewUrl, alt }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // The page shell renders the post title as the only h1, so the article
        // body starts at h2. One h1 per page is what search engines expect.
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
        },
      }),
      Image.configure({
        HTMLAttributes: { loading: 'lazy' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange?.(isEmptyHtml(html) ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'blog-prose is-editing min-h-[420px] px-5 py-4 focus:outline-none',
      },
      // Clipboard HTML from Docs/Word/ChatGPT carries the SOURCE document's
      // block structure — whole paragraphs wrapped in <h3>, paragraph breaks as
      // <br><br>. TipTap keeps those tags, prose.css then renders them in the
      // heading face, and the article ends up in three different fonts. Rewrite
      // the clipboard into the toolbar's own vocabulary before it is parsed.
      transformPastedHTML: (html) => normalizePastedHtml(html),
    },
  });

  // Toolbar state. useEditor does not re-render on transactions by default in
  // TipTap 3, so active marks are read through useEditorState.
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) return null;
      return {
        isBold: instance.isActive('bold'),
        isItalic: instance.isActive('italic'),
        isUnderline: instance.isActive('underline'),
        isStrike: instance.isActive('strike'),
        isH2: instance.isActive('heading', { level: 2 }),
        isH3: instance.isActive('heading', { level: 3 }),
        isH4: instance.isActive('heading', { level: 4 }),
        isBulletList: instance.isActive('bulletList'),
        isOrderedList: instance.isActive('orderedList'),
        isBlockquote: instance.isActive('blockquote'),
        isCodeBlock: instance.isActive('codeBlock'),
        isLink: instance.isActive('link'),
        canUndo: instance.can().undo(),
        canRedo: instance.can().redo(),
      };
    },
  });

  // Adopt content that arrived after mount (the editor loads an existing post
  // asynchronously). Comparing against getHTML() keeps this from clobbering
  // what the author is typing on every keystroke.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    const current = editor.getHTML();
    if (incoming === current) return;
    if (isEmptyHtml(incoming) && isEmptyHtml(current)) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  // Release the object URL behind the pending image preview.
  useEffect(() => {
    return () => {
      if (imageDialog?.previewUrl) URL.revokeObjectURL(imageDialog.previewUrl);
    };
  }, [imageDialog]);

  // ---- Links ----
  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href || '';
    const url = window.prompt('Link URL (internal links to /salons and /products pass SEO value)', previous);

    if (url === null) return; // cancelled
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  // ---- Images ----
  const handleImagePick = (e) => {
    const file = (e.target.files || [])[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image exceeds the 5MB size limit');
      return;
    }
    setImageDialog({ file, previewUrl: URL.createObjectURL(file), alt: '' });
  };

  const handleImageInsert = async () => {
    if (!imageDialog || !editor) return;
    const alt = imageDialog.alt.trim();
    if (!alt) {
      toast.error('Alt text is required — it is what search engines and screen readers read');
      return;
    }
    if (!onUploadImage) {
      toast.error('Image upload is not available');
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUploadImage(imageDialog.file);
      if (!url) throw new Error('Upload did not return a URL');
      editor.chain().focus().setImage({ src: url, alt }).run();
      URL.revokeObjectURL(imageDialog.previewUrl);
      setImageDialog(null);
    } catch (error) {
      toast.error(error?.data?.detail || error?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const closeImageDialog = () => {
    if (imageDialog?.previewUrl) URL.revokeObjectURL(imageDialog.previewUrl);
    setImageDialog(null);
  };

  if (!editor || !state) {
    return (
      <div className="border border-gray-300 rounded-lg p-8 text-center text-gray-500">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <ToolbarButton
          title="Heading 2"
          isActive={state.isH2}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          isActive={state.isH3}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          title="Heading 4"
          isActive={state.isH4}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          H4
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bold"
          isActive={state.isBold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          isActive={state.isItalic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          isActive={state.isUnderline}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          isActive={state.isStrike}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bulleted list"
          isActive={state.isBulletList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          isActive={state.isOrderedList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          isActive={state.isBlockquote}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          title="Code block"
          isActive={state.isCodeBlock}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {'</>'}
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Add or edit link" isActive={state.isLink} disabled={disabled} onClick={handleSetLink}>
          🔗 Link
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          disabled={disabled || !state.isLink}
          onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
        >
          ⛓️‍💥
        </ToolbarButton>
        <ToolbarButton
          title="Insert image"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          🖼️ Image
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          —
        </ToolbarButton>

        <Divider />

        {/* Paste normalisation catches the clipboard, but a block can still end
            up as the wrong kind by hand. This resets the selection to plain
            body copy so the author can fix it without retyping. */}
        <ToolbarButton
          title="Clear formatting — turn the selection back into plain body text"
          disabled={disabled}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Tx
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Undo"
          disabled={disabled || !state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={disabled || !state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </ToolbarButton>
      </div>

      {/* ---- Editing surface ---- */}
      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImagePick}
        className="hidden"
        data-testid="blog-body-image-input"
      />

      {/* ---- Image alt-text dialog ---- */}
      {imageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75 px-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Insert image</h3>

            <img
              src={imageDialog.previewUrl}
              alt="Selected upload preview"
              className="w-full max-h-48 object-contain rounded border border-gray-200 bg-gray-50"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt text <span className="text-red-600">*</span>
              </label>
              <input
                autoFocus
                value={imageDialog.alt}
                onChange={(e) => setImageDialog((prev) => ({ ...prev, alt: e.target.value }))}
                placeholder="Describe the image, e.g. Hair spa treatment at a Delhi salon"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Describe what is in the image. This is what search engines and screen readers read.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeImageDialog}
                disabled={isUploading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImageInsert}
                disabled={isUploading || !imageDialog.alt.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading…' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
