export function avatarUrl(slot: number) {
  const n = ((Math.max(1, slot) - 1) % 12) + 1;
  return `/avatars/${String(n).padStart(2, '0')}.png`;
}
