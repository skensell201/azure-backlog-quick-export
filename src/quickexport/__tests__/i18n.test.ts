import { detectLang, strings } from '../i18n';

describe('detectLang', () => {
  it('returns ru for Russian cultures (case-insensitive)', () => {
    expect(detectLang('ru-RU')).toBe('ru');
    expect(detectLang('RU')).toBe('ru');
  });

  it('defaults to en for non-Russian or missing cultures', () => {
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang('de-DE')).toBe('en');
    expect(detectLang(undefined)).toBe('en');
    expect(detectLang('')).toBe('en');
  });
});

describe('strings', () => {
  it('provides an ID hint in both languages', () => {
    expect(strings('en').idHint).toMatch(/ID/);
    expect(strings('ru').idHint).toMatch(/ID/);
    expect(strings('ru').idHint).not.toBe(strings('en').idHint);
  });

  it('localizes the download buttons', () => {
    expect(strings('en').downloadCsv).toBe('Download CSV');
    expect(strings('ru').downloadCsv).toBe('Скачать CSV');
  });
});
