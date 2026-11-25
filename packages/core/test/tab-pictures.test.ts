import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const web = join(__dirname, '..', '..', '..', 'apps', 'web', 'components');
const tabs = readFileSync(join(web, 'AppTabs.tsx'), 'utf8');
const pictures = readFileSync(join(web, 'TabPictures.tsx'), 'utf8');

describe('main tabs use our own drawn pictures (standing rule 19, 24/11/26)', () => {
  it('has no emoji in the tab bar', () => {
    expect(/\p{Extended_Pictographic}/u.test(tabs)).toBe(false);
  });
  it('draws every picture the tab bar asks for', () => {
    const asked = [...tabs.matchAll(/picture: '([a-z]+)'|TabPicture name="([a-z]+)"/g)].map((m) => m[1] ?? m[2]);
    expect(asked.length).toBeGreaterThanOrEqual(5);
    for (const name of asked) expect(pictures).toMatch(new RegExp(`\\b${name}: [A-Z]`));
  });
  it('keeps a word under every picture, in English and Kiswahili', () => {
    const labels = [...tabs.matchAll(/label: \{ en: '([^']+)', sw: '([^']+)' \}/g)];
    expect(labels.length).toBe(4);
    expect(tabs).toMatch(/SHARE_LABEL[^\n]*en: 'Share', sw: 'Shiriki'/);
  });
  it('uses only the brand palette', () => {
    const hexes = new Set([...pictures.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase()));
    const brand = new Set(['#16261f', '#1f4d3a', '#2f855a', '#e0a32e', '#b97e15', '#c5613c', '#3c7d8c', '#fffdf8', '#fbf3e2', '#e8dcc4']);
    for (const hex of hexes) expect(brand.has(hex), hex).toBe(true);
  });
});

describe('pictures inside pages are our own drawings too (standing rule 19)', () => {
  const library = readFileSync(join(web, 'Pictures.tsx'), 'utf8');
  const core = join(__dirname, '..', 'src');
  const mapped = new Set([...library.split('FOR_EMOJI')[1]!.split('};')[0]!.matchAll(/'([^']+)': '[a-z]+'/g)].map((m) => m[1]));
  const drawn = new Set([...library.matchAll(/^  ([a-z]+): (?:\(\) =>|[A-Z])/gm)].map((m) => m[1]));

  it('has a drawing for every picture the shared data names', () => {
    const files = ['modules.ts', 'value-props.ts', 'document-house.ts', 'collect-ways.ts'].map((f) => join(core, f));
    files.push(join(web, '..', 'app', 'groups', '[id]', 'GroupCockpit.tsx'));
    for (const file of files) {
      for (const m of readFileSync(file, 'utf8').matchAll(/icon: '([^']+)'/g)) {
        const icon = m[1]!.replace(/️/g, '');
        expect(mapped.has(icon), `${icon} in ${file}`).toBe(true);
      }
    }
  });
  it('maps every emoji to a picture that is really drawn', () => {
    for (const m of library.split('FOR_EMOJI')[1]!.split('};')[0]!.matchAll(/'[^']+': '([a-z]+)'/g)) {
      expect(drawn.has(m[1]!), m[1]).toBe(true);
    }
  });
  it('has no emoji left in the Share bar', () => {
    const share = readFileSync(join(web, 'ShareBar.tsx'), 'utf8');
    expect(/\p{Extended_Pictographic}/u.test(share.replace(/[✓↗]/g, ''))).toBe(false);
  });
  it('adds no colour outside the brand palette', () => {
    const hexes = [...library.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
    for (const hex of hexes) expect(hex).toBe('#e8dcc4');
  });
});
