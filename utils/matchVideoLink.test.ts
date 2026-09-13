import { describe, expect, it } from 'vitest';
import { hasYoutubeLink } from './matchVideoLink';

describe('hasYoutubeLink', () => {
  it('returns true for a non-empty YouTube URL', () => {
    expect(hasYoutubeLink('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('returns false for blank or missing values', () => {
    expect(hasYoutubeLink('   ')).toBe(false);
    expect(hasYoutubeLink(null)).toBe(false);
    expect(hasYoutubeLink(undefined)).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(hasYoutubeLink('')).toBe(false);
  });
});
