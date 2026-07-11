import { sanitizeRichHtml } from '../sanitizeRichHtml';
import { serializeJsonLd } from '../serializeJsonLd';

describe('HTML output safety', () => {
  it('removes executable markup and unsafe URL schemes from rich text', () => {
    const input = '<p onclick="steal()">Safe</p><script>alert(1)</script>'
      + '<a href="javascript:alert(2)" target="_blank">link</a>'
      + '<img src="data:text/html,boom" onerror="steal()">';
    const output = sanitizeRichHtml(input);

    expect(output).toContain('<p>Safe</p>');
    expect(output).not.toMatch(/script|onclick|onerror|javascript:|data:/i);
    expect(output).toContain('rel="noopener noreferrer nofollow"');
  });

  it('keeps expected CMS formatting', () => {
    const output = sanitizeRichHtml(
      '<h2>Heading</h2><ul><li><strong>Included</strong></li></ul>',
    );
    expect(output).toBe('<h2>Heading</h2><ul><li><strong>Included</strong></li></ul>');
  });

  it('escapes script-closing and Unicode separator characters in JSON-LD', () => {
    const output = serializeJsonLd({ title: '</script><script>alert(1)</script>\u2028&' });
    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('&');
    expect(output).toContain('\\u003c/script\\u003e');
    expect(output).toContain('\\u2028');
    expect(JSON.parse(output).title).toContain('</script>');
  });
});
