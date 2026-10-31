/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { fillPhotosFromTwins, otherCategory, stageNameKey, twinOf } from './model';
import { Dancer } from './types';

const dancer = (id: string, name: string, photo?: string) =>
  ({
    id,
    name,
    sbd: '',
    gender: 'male',
    category: id.startsWith('pro') ? 'pro_2v2' : 'newbie_1v1',
    prelimScores: {},
    ...(photo && { avatarUrl: `${photo}-avatar`, halfBodyUrl: `${photo}-half`, avatarCrop: { x: 1, y: 2, width: 3, height: 4 } }),
  }) as unknown as Dancer;

describe('one dancer in both categories', () => {
  test('the other category', () => {
    expect(otherCategory('newbie_1v1')).toBe('pro_2v2');
    expect(otherCategory('pro_2v2')).toBe('newbie_1v1');
  });

  test('records are linked by stage name, whatever the spacing and case', () => {
    expect(stageNameKey('bboy  kenz - x ')).toBe('BBOY KENZ-X');
    const pro = [dancer('pro-001', 'BBOY KENZ-X'), dancer('pro-002', 'BBOY SIGMA')];
    expect(twinOf(dancer('newbie-001', 'Bboy Kenz - x'), pro)?.id).toBe('pro-001');
    expect(twinOf(dancer('newbie-002', 'BBOY ANT'), pro)).toBeUndefined();
  });

  test('a record without a photo takes its twin’s, avatar, half body and crop', () => {
    const newbie = [dancer('newbie-001', 'BBOY KENZ', 'kenz'), dancer('newbie-002', 'BBOY ANT')];
    const pro = [dancer('pro-001', 'BBOY KENZ'), dancer('pro-002', 'BBOY SIGMA')];
    const filled = fillPhotosFromTwins(pro, newbie);
    expect(filled[0]).toMatchObject({ avatarUrl: 'kenz-avatar', halfBodyUrl: 'kenz-half', avatarCrop: { x: 1, y: 2, width: 3, height: 4 } });
    expect(filled[1].avatarUrl).toBeUndefined();
  });

  test('its own photo is kept, and an unchanged list comes back as is', () => {
    const newbie = [dancer('newbie-001', 'BBOY KENZ', 'kenz')];
    const pro = [dancer('pro-001', 'BBOY KENZ', 'other')];
    expect(fillPhotosFromTwins(pro, newbie)).toBe(pro);
    expect(fillPhotosFromTwins(newbie, [])).toBe(newbie);
  });
});
