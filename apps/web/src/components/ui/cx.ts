/** Gabungkan className, abaikan nilai kosong: cx('a', cond && 'b', undefined) → 'a b'. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
