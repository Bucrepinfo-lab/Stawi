import { describe, expect, it } from 'vitest';
import { blockMember, parseBlocked, unblockMember, visibleMessages } from '../src/message-blocks';

const msgs = [
  { id: '1', from: 'a', mine: false },
  { id: '2', from: 'me', mine: true },
  { id: '3', from: 'b', mine: false },
  { id: '4', from: 'stawi', mine: false },
];

describe('message blocks (per phone)', () => {
  it('reads only a clean list of ids', () => {
    expect(parseBlocked(null)).toEqual([]);
    expect(parseBlocked('not json')).toEqual([]);
    expect(parseBlocked('{"a":1}')).toEqual([]);
    expect(parseBlocked('["a","a",3,"b"]')).toEqual(['a', 'b']);
  });
  it('blocks and unblocks without duplicates', () => {
    expect(blockMember(blockMember([], 'a'), 'a')).toEqual(['a']);
    expect(unblockMember(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('hides a blocked member in the whole group only', () => {
    expect(visibleMessages(msgs, ['a'], 'ALL').map((m) => m.id)).toEqual(['2', '3', '4']);
    expect(visibleMessages(msgs, ['a'], 'OFFICIALS').map((m) => m.id)).toEqual(['1', '2', '3', '4']);
  });
  it('never hides your own messages or Stawi notices', () => {
    expect(visibleMessages(msgs, ['me', 'stawi'], 'ALL').map((m) => m.id)).toEqual(['1', '2', '3', '4']);
  });
});
