const STRUCTURED_BLOCK = /<(?:p|ul|ol|blockquote|h[1-6]|br)\b/i;

export function formatExperienceDescription(sanitizedHtml: string): string {
  const content = sanitizedHtml.trim();
  if (!content || STRUCTURED_BLOCK.test(content)) return content;

  const sentences = content
    .match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [content];

  if (sentences.length < 4) return `<p>${content}</p>`;

  const paragraphs: string[] = [];
  let cursor = 0;
  for (const size of [2, 3, 3]) {
    if (cursor >= sentences.length) break;
    paragraphs.push(sentences.slice(cursor, cursor + size).join(' '));
    cursor += size;
  }
  if (cursor < sentences.length) paragraphs.push(sentences.slice(cursor).join(' '));

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
}
