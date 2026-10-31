/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { buildSeed, RealDancer, SEED_STAGES } from './sampleData';

const real = (prefix: string, count: number, withPhoto = (i: number) => i % 3 === 0): RealDancer[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `BBOY ${prefix} ${i + 1}`,
    realName: `Tên thật ${i + 1}`,
    crew: 'CLB Thật',
    gender: 'male',
    ...(withPhoto(i) && { avatarUrl: `https://media.test/${prefix}-${i}-a.webp`, halfBodyUrl: `https://media.test/${prefix}-${i}-h.webp` }),
  }));

const docsOf = (seed: Record<string, Record<string, Record<string, unknown>>>, name: string) => Object.values(seed[name] ?? {});

describe('rehearsal on the real dancer list', () => {
  // Real numbers on 2026-11-01: 54 Newbie, 32 Pro, and some in both.
  const both = real('HAI', 5);
  const lists = { newbie: [...real('NEWBIE', 49), ...both], pro: [...real('PRO', 27), ...both] };

  test('every stage builds, the real dancers keep their names, details and photos', () => {
    for (const stage of SEED_STAGES) {
      const seed = buildSeed(stage, [], { real: lists });
      const newbie = docsOf(seed, 'newbieDancers');
      const named = (name: string) => newbie.find((d) => d.name === name)!;
      expect(named('BBOY NEWBIE 1')).toMatchObject({ realName: 'Tên thật 1', crew: 'CLB Thật', avatarUrl: 'https://media.test/NEWBIE-0-a.webp' });
      expect(named('BBOY NEWBIE 2').avatarUrl).toBeUndefined(); // no photo yet on the real list: none here either
      expect(docsOf(seed, 'matches').length).toBeGreaterThan(0);
    }
  });

  test('a dancer in both lists has the same photo in both', () => {
    const seed = buildSeed('battle', [], { real: lists });
    const inBoth = (col: string) => docsOf(seed, col).find((d) => d.name === 'BBOY HAI 1')!;
    expect(inBoth('newbieDancers').avatarUrl).toBe('https://media.test/HAI-0-a.webp');
    expect(inBoth('proDancers').avatarUrl).toBe('https://media.test/HAI-0-a.webp');
  });

  test('too few for the bracket: topped up with sample dancers (drawn portraits), only as many as needed', () => {
    const pro = docsOf(buildSeed('check-in', [], { real: lists }), 'proDancers');
    expect(pro.length).toBe(32); // enough for the Top 32 placeholder
    const battlePro = docsOf(buildSeed('battle', [], { real: lists }), 'proDancers');
    expect(battlePro.length).toBe(34); // ranks 32-34 for the cut-off tie
    const samples = battlePro.filter((d) => !String(d.name).startsWith('BBOY PRO') && !String(d.name).startsWith('BBOY HAI'));
    expect(samples.length).toBe(2);
    for (const d of samples) expect(String(d.avatarUrl)).toContain('dicebear');
  });
});
