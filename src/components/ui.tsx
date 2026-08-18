"use client";
import React from "react";

export const COLORS = {
  bg:"#F1F1EE", panel:"#FFFFFF", ink:"#14171F", muted:"#6C7079",
  signal:"#0E7C4A", signalSoft:"#E4F2E9", amber:"#C7811A", amberSoft:"#FBF0DD",
  rose:"#B4483A", roseSoft:"#F8E9E6", rail:"#E4E3DD", railDark:"#D8D6CE",
};
export const FONT_DISPLAY = "'Space Grotesk', 'Inter', sans-serif";
export const FONT_MONO = "'JetBrains Mono', monospace";
export const inputStyle: React.CSSProperties = { width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${COLORS.rail}`, fontSize:13, background:"#fff", color:COLORS.ink };

export function Card({ children, style, ...rest }: any) {
  return <div style={{ background: COLORS.panel, border:`1px solid ${COLORS.rail}`, borderRadius:10, ...style }} {...rest}>{children}</div>;
}
export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, letterSpacing:-0.3 }}>{children}</div>
      {sub && <div style={{ fontSize:12.5, color:COLORS.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}
export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted"|"signal"|"amber"|"rose"|"ink" }) {
  const map: any = {
    muted: { bg:"#EDEDE8", fg:COLORS.muted }, signal: { bg:COLORS.signalSoft, fg:COLORS.signal },
    amber: { bg:COLORS.amberSoft, fg:COLORS.amber }, rose: { bg:COLORS.roseSoft, fg:COLORS.rose }, ink: { bg:"#EAEAE6", fg:COLORS.ink },
  };
  const c = map[tone] || map.muted;
  return <span style={{ background:c.bg, color:c.fg, fontSize:10.5, fontWeight:700, letterSpacing:0.4, padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>{children}</span>;
}
export function stageTone(stage: string): "signal"|"rose"|"amber"|"muted" {
  if (stage === "WON") return "signal";
  if (stage === "LOST") return "rose";
  if (["PROPOSAL","INTERESTED"].includes(stage)) return "amber";
  return "muted";
}
export function Btn({ children, onClick, variant = "primary", icon: Icon, style, disabled, type = "button" }: any) {
  const base: React.CSSProperties = { display:"inline-flex", alignItems:"center", gap:6, fontSize:12.5, fontWeight:600, padding:"8px 13px", borderRadius:7, border:"1px solid transparent", opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" };
  const variants: any = {
    primary: { background:COLORS.ink, color:"#fff" }, signal: { background:COLORS.signal, color:"#fff" },
    ghost: { background:"transparent", color:COLORS.ink, border:`1px solid ${COLORS.rail}` },
    danger: { background:"transparent", color:COLORS.rose, border:`1px solid ${COLORS.roseSoft}` },
  };
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{Icon && <Icon size={13.5} />} {children}</button>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display:"block", marginBottom:12 }}>
      <div style={{ fontSize:11.5, fontWeight:600, color:COLORS.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:0.4 }}>{label}</div>
      {children}
    </label>
  );
}
export function StatCard({ label, value, icon: Icon, tone }: any) {
  return (
    <Card style={{ padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontSize:11, color:COLORS.muted, fontWeight:600, letterSpacing:0.3, textTransform:"uppercase" }}>{label}</div>
        <Icon size={15} color={tone==="signal" ? COLORS.signal : COLORS.muted} />
      </div>
      <div style={{ fontFamily:FONT_MONO, fontSize:22, fontWeight:600, marginTop:6, color: tone==="signal" ? COLORS.signal : COLORS.ink }}>{value}</div>
    </Card>
  );
}
