import { SCORE_SIGNALS } from "./constants";

export function scoreFromSignals(signals: Record<string, boolean>) {
  const pts = SCORE_SIGNALS.reduce((s, sig) => s + (signals?.[sig.key] ? sig.points : 0), 0);
  const capped = Math.min(100, pts);
  let priority = "Low";
  if (capped >= 80) priority = "High Priority";
  else if (capped >= 60) priority = "Good";
  else if (capped >= 40) priority = "Maybe";
  return { score: capped, priority };
}
export const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("en-NG", { day:"2-digit", month:"short", year:"numeric" }) : "—";
export const fmtDateTime = (iso?: string | null) => iso ? new Date(iso).toLocaleString("en-NG", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";
export const fmtMoney = (n?: number | null) => "₦" + Number(n || 0).toLocaleString("en-NG");
export const addDays = (iso: string, d: number) => { const dt = new Date(iso); dt.setDate(dt.getDate() + d); return dt.toISOString(); };
export const isPast = (iso?: string | null) => !!iso && new Date(iso) <= new Date();
