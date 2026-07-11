import sanitizeHtml from 'sanitize-html';

/** Sanitize CMS rich text before it reaches an HTML sink. */
export function sanitizeRichHtml(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';

  return sanitizeHtml(value, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
      'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span',
      'div', 'figure', 'figcaption', 'img', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'hr', 'code', 'pre', 'sup', 'sub',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank'
            ? { rel: 'noopener noreferrer nofollow' }
            : {}),
        },
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: { ...attribs, loading: attribs.loading || 'lazy' },
      }),
    },
  });
}
