const NIL = new Set(['', 'nil', 'n/a', 'na', 'none', 'null', '-'])

export function cleanChannel(v: unknown): string | undefined {
  const t = String(v ?? '').trim()
  return NIL.has(t.toLowerCase()) ? undefined : t
}
