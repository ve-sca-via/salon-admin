/**
 * pastedHtml.js — clean clipboard HTML before TipTap parses it.
 *
 * WHY THIS EXISTS
 * The toolbar deliberately offers no fonts, sizes or colours: article
 * typography lives in prose.css so every post looks the same. Paste bypassed
 * that. Copying a draft out of Google Docs / Word / ChatGPT carries the
 * SOURCE's block structure into the document — a whole intro paragraph arrives
 * wrapped in <h3>, a heading arrives as <h2><strong>…</strong><br></h2>, and
 * paragraph breaks arrive as <br><br> inside one block. The backend strips the
 * style attributes but keeps the tags, so the published article renders the
 * intro in the h3 serif face and the body in the p sans face, and the author
 * reports that "the font keeps changing on its own".
 *
 * So the clipboard is rewritten into the same plain semantic HTML the toolbar
 * produces, BEFORE ProseMirror sees it: unknown tags unwrapped, every
 * presentational attribute dropped, <br><br> promoted to real paragraph
 * breaks, and headings that are actually paragraphs demoted.
 *
 * Content copied from inside the editor is left completely alone — see
 * `normalizePastedHtml`.
 */

// Tags the editor itself can produce, i.e. blog_service.ALLOWED_TAGS. Anything
// else is unwrapped: the tag goes, its text stays.
const KEEP_TAGS = new Set([
  'P', 'BR', 'HR',
  'H2', 'H3', 'H4',
  'STRONG', 'EM', 'B', 'I', 'U', 'S', 'CODE', 'PRE', 'BLOCKQUOTE',
  'UL', 'OL', 'LI',
  'A', 'IMG', 'FIGURE', 'FIGCAPTION',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
]);

// Removed together with their contents — never article copy.
const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT',
  'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
  'FORM', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON',
  'COLGROUP', 'COL', 'CAPTION',
]);

// The article body starts at h2 (the page shell owns the only h1), so a pasted
// h1 becomes h2 and anything below h4 flattens up to h4.
const HEADING_REMAP = { H1: 'h2', H5: 'h4', H6: 'h4' };

const HEADINGS = new Set(['H2', 'H3', 'H4']);

// Blocks whose <br> runs are turned back into separate blocks.
const SPLITTABLE = 'p,h2,h3,h4,blockquote';

// Attributes worth keeping, per tag. Matches blog_service.ALLOWED_ATTRIBUTES —
// everything else (style, class, id, dir, lang, align, data-*) is dropped.
const ATTR_ALLOWLIST = {
  A: ['href', 'title', 'target'],
  IMG: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  TD: ['colspan', 'rowspan'],
  TH: ['colspan', 'rowspan', 'scope'],
};

/**
 * A heading longer than this is a paragraph somebody styled by accident. Real
 * headings are labels; the longest sensible one in a Lubist article
 * ("Why This Salon Earns the Worth Your Trust Part") is well under it.
 */
export const MAX_HEADING_CHARS = 120;

// =====================================================
// DOM HELPERS
// =====================================================

/** Drop the element, keep its children in its place. */
const unwrap = (el) => {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
};

/** Replace an element with the same children under a different tag name. */
const rename = (el, tagName) => {
  const replacement = el.ownerDocument.createElement(tagName);
  while (el.firstChild) replacement.appendChild(el.firstChild);
  el.replaceWith(replacement);
  return replacement;
};

/** Child nodes that carry something — whitespace-only text does not count. */
const meaningfulChildren = (el) =>
  Array.from(el.childNodes).filter((n) => n.nodeType !== 3 || n.textContent.trim());

/** A block earns its place if it has text or is itself media. */
const hasSubstance = (el) => Boolean(el.textContent.trim()) || Boolean(el.querySelector('img, hr'));

// =====================================================
// PASSES
// =====================================================

/** Strip comments — Word's conditional markup arrives as a wall of them. */
const removeComments = (root) => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const found = [];
  while (walker.nextNode()) found.push(walker.currentNode);
  found.forEach((node) => node.remove());
};

/** Reduce every element to an allowed tag carrying only allowed attributes. */
const cleanTags = (root) => {
  for (let el of Array.from(root.querySelectorAll('*'))) {
    if (!el.isConnected) continue;

    if (DROP_TAGS.has(el.tagName)) {
      el.remove();
      continue;
    }

    // Google Docs wraps the whole selection in <b style="font-weight:normal">.
    // Kept as-is it would bold the entire article.
    if (
      (el.tagName === 'B' || el.tagName === 'STRONG') &&
      /font-weight\s*:\s*(normal|400)/i.test(el.getAttribute('style') || '')
    ) {
      unwrap(el);
      continue;
    }

    const remapped = HEADING_REMAP[el.tagName];
    if (remapped) el = rename(el, remapped);

    if (!KEEP_TAGS.has(el.tagName)) {
      unwrap(el);
      continue;
    }

    const allowed = ATTR_ALLOWLIST[el.tagName] || [];
    for (const name of el.getAttributeNames()) {
      if (!allowed.includes(name.toLowerCase())) el.removeAttribute(name);
    }
  }
};

/**
 * Group a block's children into the chunks its <br> runs separate.
 *
 * `minRun` is how many consecutive <br>s count as a break: two inside a
 * paragraph (one is a deliberate line break), one inside a heading, because a
 * heading is a single line by definition.
 */
const chunkOnBreaks = (block, minRun) => {
  const chunks = [];
  let current = [];
  let pendingBreaks = [];

  const keepBreaks = () => {
    current.push(...pendingBreaks);
    pendingBreaks = [];
  };

  for (const node of Array.from(block.childNodes)) {
    if (node.nodeType === 1 && node.tagName === 'BR') {
      pendingBreaks.push(node);
      continue;
    }
    // Whitespace sitting between two <br>s is layout, not content.
    if (node.nodeType === 3 && !node.textContent.trim() && pendingBreaks.length) continue;

    if (pendingBreaks.length >= minRun) {
      chunks.push(current);
      current = [];
      pendingBreaks = [];
    } else {
      keepBreaks();
    }
    current.push(node);
  }

  // A trailing run is just noise; anything shorter stays as a line break.
  if (pendingBreaks.length < minRun) keepBreaks();
  if (current.length) chunks.push(current);

  return chunks.filter((chunk) => chunk.length);
};

/** Turn <br> runs inside a block into separate blocks of the same kind. */
const splitOnBreaks = (root) => {
  for (const block of Array.from(root.querySelectorAll(SPLITTABLE))) {
    if (!block.isConnected) continue;

    const chunks = chunkOnBreaks(block, HEADINGS.has(block.tagName) ? 1 : 2);

    if (chunks.length < 2) {
      // Still drop a lone trailing <br> — it renders as a stray blank line.
      while (block.lastChild && block.lastChild.nodeType === 1 && block.lastChild.tagName === 'BR') {
        block.lastChild.remove();
      }
      continue;
    }

    const fragment = block.ownerDocument.createDocumentFragment();
    const tagName = block.tagName.toLowerCase();
    for (const nodes of chunks) {
      const clone = block.ownerDocument.createElement(tagName);
      nodes.forEach((node) => clone.appendChild(node));
      if (hasSubstance(clone)) fragment.appendChild(clone);
    }
    block.replaceWith(fragment);
  }
};

/**
 * Headings already carry their own weight from prose.css.
 * <h2><strong>Title</strong></h2> renders heavier than the h2 next to it,
 * which is another "the font changed" report.
 */
const unwrapHeadingBold = (root) => {
  for (const heading of root.querySelectorAll('h2,h3,h4')) {
    // Twice, because a Word paste nests <strong><b>.
    for (let pass = 0; pass < 2; pass += 1) {
      const children = meaningfulChildren(heading);
      if (children.length !== 1) break;
      const only = children[0];
      if (only.nodeType !== 1 || (only.tagName !== 'STRONG' && only.tagName !== 'B')) break;
      unwrap(only);
    }
  }
};

/** A heading holding a paragraph's worth of text is a paragraph. */
const demoteLongHeadings = (root) => {
  for (const heading of Array.from(root.querySelectorAll('h2,h3,h4'))) {
    if (heading.textContent.trim().length > MAX_HEADING_CHARS) rename(heading, 'p');
  }
};

/** Drop the empty blocks a paste always leaves behind. */
const removeEmptyBlocks = (root) => {
  for (const el of Array.from(root.querySelectorAll('p,h2,h3,h4,blockquote,li'))) {
    if (!el.isConnected) continue;
    if (!hasSubstance(el)) el.remove();
  }
};

// =====================================================
// ENTRY POINT
// =====================================================

/**
 * Normalise clipboard HTML into the editor's own vocabulary.
 *
 * Content copied from inside a ProseMirror editor is returned untouched: it is
 * already clean, and it carries a `data-pm-slice` marker ProseMirror needs in
 * order to merge a part-of-a-paragraph paste into the paragraph you are typing
 * in. Rewriting it would turn "copy half a sentence, paste it" into a new block.
 */
export const normalizePastedHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  if (html.includes('data-pm-slice')) return html;
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;
  if (!body) return html;

  removeComments(body);
  cleanTags(body);
  splitOnBreaks(body);
  unwrapHeadingBold(body);
  demoteLongHeadings(body);
  removeEmptyBlocks(body);

  return body.innerHTML;
};

export default normalizePastedHtml;
