/**
 * Block a member's messages on this phone (owner 26/11/26; Play user-generated-
 * content policy: a way to block). Kept on the device, per group: nothing is
 * stored on the server, nobody is told, and the member stays in the group.
 * Blocking hides their messages in "Whole group" only; "Ask the officials"
 * stays readable so a member can always get help.
 */
export const BLOCK_STORAGE_PREFIX = 'stawi.blocked.';

/** Ids read back from storage; anything malformed is ignored. */
export function parseBlocked(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 100))] : [];
  } catch {
    return [];
  }
}

export function blockMember(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export function unblockMember(list: string[], id: string): string[] {
  return list.filter((x) => x !== id);
}

/** Your own messages and Stawi's notices are never hidden. */
export function visibleMessages<T extends { from: string; mine: boolean }>(
  messages: T[],
  blocked: string[],
  channel: 'ALL' | 'OFFICIALS',
  stawiSender = 'stawi',
): T[] {
  if (channel !== 'ALL' || blocked.length === 0) return messages;
  return messages.filter((m) => m.mine || m.from === stawiSender || !blocked.includes(m.from));
}
