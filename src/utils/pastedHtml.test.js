/**
 * Tests for the clipboard normaliser.
 *
 * The headline case is REAL: the HTML below is what the first published Lubist
 * article actually stored, and it is why the article renders in three different
 * faces — an <h3> holding the whole intro (Marcellus serif, 1.375rem), an <h2>
 * holding a heading (Marcellus serif, 1.75rem) and <p> body copy (DM Sans,
 * 1.0625rem). Every other test exists to keep one of the passes honest.
 */

import { describe, expect, it } from 'vitest';
import { normalizePastedHtml, MAX_HEADING_CHARS } from './pastedHtml';

describe('normalizePastedHtml', () => {
  it('returns an empty string for nothing pasted', () => {
    expect(normalizePastedHtml('')).toBe('');
    expect(normalizePastedHtml(null)).toBe('');
    expect(normalizePastedHtml(undefined)).toBe('');
  });

  // ---- The bug this file was written for ----
  it('rebuilds the structure of the article that shipped broken', () => {
    const pasted =
      '<h3>Everyone in Bangalore has a colour horror story by now. Brassy roots two weeks ' +
      'after a "balayage." Highlights that turned orange in the sun. A colourist who mixed ' +
      'the shade on the fly without ever doing a strand test.<br><br>' +
      '<strong>The Short Answer</strong></h3>' +
      '<p>If you want hair colour done by people who treat it as a craft, TONI&amp;GUY ' +
      'Bellandur is the salon worth your trust this year.</p>' +
      '<h2><strong>Why This Salon Earns the Worth Your Trust Part</strong><br></h2>' +
      '<p></p><p></p>';

    const out = normalizePastedHtml(pasted);

    // The intro is body copy, not a heading.
    expect(out).toMatch(/^<p>Everyone in Bangalore/);
    // "The Short Answer" survives as its own h3, not buried inside the intro.
    expect(out).toContain('<h3>The Short Answer</h3>');
    // The h2 keeps its level, loses the redundant bold and the trailing break.
    expect(out).toContain('<h2>Why This Salon Earns the Worth Your Trust Part</h2>');
    expect(out).not.toContain('<br>');
    // The empty trailing paragraphs are gone.
    expect(out).not.toContain('<p></p>');
  });

  // ---- Presentational markup ----
  it('drops every presentational attribute', () => {
    const out = normalizePastedHtml(
      '<p style="font-family:Calibri;font-size:22px" class="c14" id="x" dir="ltr">Copy</p>',
    );
    expect(out).toBe('<p>Copy</p>');
  });

  it('unwraps span and font wrappers but keeps their text', () => {
    const out = normalizePastedHtml(
      '<p><span style="font-family:Arial">Hair </span><font face="Times">colour</font></p>',
    );
    expect(out).toBe('<p>Hair colour</p>');
  });

  it('unwraps the fake bold Google Docs wraps a whole selection in', () => {
    const out = normalizePastedHtml(
      '<b style="font-weight:normal"><p>Not actually bold</p></b>',
    );
    expect(out).toBe('<p>Not actually bold</p>');
    expect(out).not.toContain('<b>');
  });

  it('keeps deliberate bold and italic', () => {
    const out = normalizePastedHtml('<p><strong>Bold</strong> and <em>italic</em></p>');
    expect(out).toBe('<p><strong>Bold</strong> and <em>italic</em></p>');
  });

  it('removes scripts, styles and Word comment markup entirely', () => {
    const out = normalizePastedHtml(
      '<style>p{color:red}</style><!--[if gte mso 9]><xml></xml><![endif]--><p>Copy</p>' +
        '<script>alert(1)</script>',
    );
    expect(out).toBe('<p>Copy</p>');
  });

  // ---- Heading discipline ----
  it('remaps h1 to h2 and h5/h6 to h4', () => {
    const out = normalizePastedHtml('<h1>Title</h1><h5>Deep</h5><h6>Deeper</h6>');
    expect(out).toBe('<h2>Title</h2><h4>Deep</h4><h4>Deeper</h4>');
  });

  it('demotes a heading that is really a paragraph', () => {
    const long = 'x'.repeat(MAX_HEADING_CHARS + 1);
    expect(normalizePastedHtml(`<h2>${long}</h2>`)).toBe(`<p>${long}</p>`);
  });

  it('leaves a heading of a sane length alone', () => {
    const ok = 'x'.repeat(MAX_HEADING_CHARS);
    expect(normalizePastedHtml(`<h2>${ok}</h2>`)).toBe(`<h2>${ok}</h2>`);
  });

  it('splits a heading on a single line break, because headings are one line', () => {
    const out = normalizePastedHtml('<h3>First<br>Second</h3>');
    expect(out).toBe('<h3>First</h3><h3>Second</h3>');
  });

  // ---- Paragraph breaks ----
  it('promotes a double line break inside a paragraph to two paragraphs', () => {
    const out = normalizePastedHtml('<p>One<br><br>Two</p>');
    expect(out).toBe('<p>One</p><p>Two</p>');
  });

  it('keeps a single line break inside a paragraph', () => {
    const out = normalizePastedHtml('<p>Line one<br>Line two</p>');
    expect(out).toBe('<p>Line one<br>Line two</p>');
  });

  it('drops a trailing line break', () => {
    expect(normalizePastedHtml('<p>Copy<br></p>')).toBe('<p>Copy</p>');
  });

  // ---- Links, images, lists, tables ----
  it('keeps a link with its href and nothing else', () => {
    const out = normalizePastedHtml(
      '<p><a href="https://lubist.in/salons" class="c3" style="color:#00f">Salons</a></p>',
    );
    expect(out).toBe('<p><a href="https://lubist.in/salons">Salons</a></p>');
  });

  it('keeps an image with its src and alt', () => {
    const out = normalizePastedHtml('<img src="https://cdn/x.webp" alt="Hair spa" width="800">');
    expect(out).toContain('src="https://cdn/x.webp"');
    expect(out).toContain('alt="Hair spa"');
  });

  it('keeps list and table structure', () => {
    const out = normalizePastedHtml(
      '<ul><li>One</li><li>Two</li></ul>' +
        '<table><tbody><tr><th scope="col">H</th><td colspan="2">C</td></tr></tbody></table>',
    );
    expect(out).toContain('<ul><li>One</li><li>Two</li></ul>');
    expect(out).toContain('<th scope="col">H</th>');
    expect(out).toContain('<td colspan="2">C</td>');
  });

  it('unwraps the div soup a web page paste arrives as', () => {
    const out = normalizePastedHtml('<div><div><p>Copy</p></div></div>');
    expect(out).toBe('<p>Copy</p>');
  });

  // ---- Internal copy/paste must not be touched ----
  it('leaves ProseMirror clipboard content exactly as it found it', () => {
    const internal = '<p data-pm-slice="1 1 []">half a sentence</p>';
    expect(normalizePastedHtml(internal)).toBe(internal);
  });
});
