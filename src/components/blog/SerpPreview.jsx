/**
 * SerpPreview.jsx - Live Google-result preview for the SEO tab
 *
 * Shows the author what the post will actually look like in a search result,
 * with the same truncation search engines apply. Meta title / description fall
 * back to title / excerpt exactly as the backend does, so the preview reflects
 * what will be served rather than what was typed.
 */

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

// Search engines cut the title around 60 characters when rendering a result,
// even though the field itself is allowed to run to 70.
const TITLE_DISPLAY_LIMIT = 60;
const DESCRIPTION_DISPLAY_LIMIT = 160;

const truncate = (text, limit) =>
  text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;

/** The host without protocol, for the breadcrumb line. */
const displayHost = FRONTEND_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

const SerpPreview = ({ title, metaTitle, excerpt, metaDescription, slug }) => {
  const effectiveTitle = (metaTitle || title || '').trim() || 'Untitled post';
  const effectiveDescription = (metaDescription || excerpt || '').trim();
  const effectiveSlug = (slug || '').trim() || 'your-post-slug';

  return (
    <div
      role="region"
      aria-label="Search result preview"
      className="border border-gray-200 rounded-lg p-4 bg-white"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Search result preview
      </p>

      <div className="font-[Arial,sans-serif] max-w-xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-500">
            L
          </div>
          <div className="leading-tight">
            <div className="text-[13px] text-gray-900">Lubist</div>
            <div className="text-xs text-gray-600 break-all">
              {displayHost} › blog › {effectiveSlug}
            </div>
          </div>
        </div>

        {/* Title */}
        <p className="text-[#1a0dab] text-xl leading-snug hover:underline cursor-default">
          {truncate(effectiveTitle, TITLE_DISPLAY_LIMIT)}
        </p>

        {/* Description */}
        <p className="text-sm text-[#4d5156] leading-relaxed mt-1">
          {effectiveDescription
            ? truncate(effectiveDescription, DESCRIPTION_DISPLAY_LIMIT)
            : 'No meta description or excerpt set — Google will invent a snippet from the article body, which is rarely what you want.'}
        </p>
      </div>
    </div>
  );
};

export default SerpPreview;
