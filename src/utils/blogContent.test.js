/**
 * Unit tests for the blog content helpers.
 *
 * slugify and readingMinutes mirror blog_service._generate_slug and
 * _reading_minutes. If they drift, the URL and read time shown while writing
 * stop matching what the backend actually stores on save — so the expectations
 * here are deliberately the same cases the Python side documents.
 */
import { describe, it, expect } from 'vitest';
import { isEmptyHtml, readingMinutes, slugify, stripHtml } from './blogContent';

describe('isEmptyHtml', () => {
  it('treats TipTap\'s empty document as no content', () => {
    // TipTap never yields "" — an untouched editor serialises to <p></p>.
    expect(isEmptyHtml('<p></p>')).toBe(true);
    expect(isEmptyHtml('<p><br></p>')).toBe(true);
    expect(isEmptyHtml('')).toBe(true);
    expect(isEmptyHtml(undefined)).toBe(true);
  });

  it('treats real content as non-empty', () => {
    expect(isEmptyHtml('<p>Hello</p>')).toBe(false);
    expect(isEmptyHtml('<h2>Section</h2>')).toBe(false);
  });
});

describe('stripHtml', () => {
  it('reduces markup to plain text', () => {
    expect(stripHtml('<h2>Hair Spa</h2><p>Good <strong>for</strong> you</p>')).toBe(
      'Hair Spa Good for you'
    );
  });

  it('collapses the whitespace left behind by stripped tags', () => {
    expect(stripHtml('<p>a</p>\n\n  <p>b</p>')).toBe('a b');
  });
});

describe('slugify', () => {
  it('matches the backend example', () => {
    // blog_service._generate_slug docstring case.
    expect(slugify('Best Hair Spa in Delhi (2026)')).toBe('best-hair-spa-in-delhi-2026');
  });

  it('collapses repeated separators and trims stray hyphens', () => {
    expect(slugify('  Hair   spa -- guide!  ')).toBe('hair-spa-guide');
    expect(slugify('--Bridal Makeup--')).toBe('bridal-makeup');
  });

  it('turns underscores into hyphens', () => {
    expect(slugify('hair_spa_guide')).toBe('hair-spa-guide');
  });

  it('returns an empty string for input with nothing usable', () => {
    // The editor leaves the slug empty here and lets the backend generate one.
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });
});

describe('readingMinutes', () => {
  it('floors at one minute for short or empty content', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('<p>Three little words</p>')).toBe(1);
  });

  it('counts words at 200 per minute, ignoring markup', () => {
    const body = `<p>${'word '.repeat(600).trim()}</p>`;
    expect(readingMinutes(body)).toBe(3);
  });

  it('does not count tags as words', () => {
    const withMarkup = `<h2>x</h2>${'<p>word</p>'.repeat(400)}`;
    // 400 words + the heading's single word = 401 -> 2 minutes, not 2000 tags.
    expect(readingMinutes(withMarkup)).toBe(2);
  });
});
