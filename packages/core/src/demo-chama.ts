/**
 * The Stawi Demo Chama (owner 26/11/26): one shared group where every tester,
 * the owner and the Play reviewer meet. Anyone signed in can join it with one
 * tap as an ordinary MEMBER (no joining code: it holds sample money only).
 * Officials stay the people the owner chose. Members appear as "Tester 482"
 * (last three digits only), never with a full name or phone number, so testers
 * cannot see each other's numbers.
 */
export function isDemoGroupId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^[a-z0-9]{10,40}$/i.test(id.trim());
}

export function demoMemberName(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 3 ? `Tester ${digits.slice(-3)}` : 'Tester';
}
