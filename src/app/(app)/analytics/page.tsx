"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, StatCard, COLORS, FONT_MONO } from "@/components/ui";
import { SOURCES } from "@/lib/constants";
import { fmtMoney } from "@/lib/utils";
import { TrendingUp, DollarSign, Briefcase, BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const supabase = supabaseBrowser();
  const [leads, setLeads] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [l, o, p, c] = await Promise.all([
        supabase.from("leads").select("*"), supabase.from("outreach").select("*"),
        supabase.from("proposals").select("*"), supabase.from("clients").select("*"),
      ]);
      setLeads(l.data || []); setOutreach(o.data || []); setProposals(p.data || []); setClients(c.data || []);
    })();
  }, []);

  const total = leads.length;
  const bySource = SOURCES.map(s => {
    const sl = leads.filter(l=>l.source===s);
    const rev = clients.filter(c=>sl.some(l=>l.id===c.lead_id)).reduce((sum,c)=>sum+Number(c.amount_paid||0),0);
    return { source:s, count: sl.length, revenue: rev };
  }).filter(x=>x.count>0);
  const contacted = leads.filter(l=>outreach.some(o=>o.lead_id===l.id));
  const replied = leads.filter(l=>["INTERESTED","PROPOSAL","WON"].includes(l.status));
  const won = leads.filter(l=>l.status==="WON");
  const pipelineValue = leads.filter(l=>!["WON","LOST","ARCHIVED"].includes(l.status)).reduce((s,l)=>s+Number(l.suggested_price||0),0);
  const wonRevenue = clients.reduce((s,c)=>s+Number(c.amount_paid||0),0);
  const avgProject = clients.length ? Math.round(clients.reduce((s,c)=>s+Number(c.project_value||0),0)/clients.length) : 0;
  const pct = (n:number,d:number) => d ? Math.round((n/d)*100) : 0;

  return (
    <div>
      <SectionTitle sub="Revenue and sales activity — the numbers that matter">Analytics</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
        <StatCard label="Pipeline Value" value={fmtMoney(pipelineValue)} icon={TrendingUp} />
        <StatCard label="Won Revenue" value={fmtMoney(wonRevenue)} icon={DollarSign} tone="signal" />
        <StatCard label="Avg Project Value" value={fmtMoney(avgProject)} icon={Briefcase} />
        <StatCard label="Close Rate" value={pct(won.length,total)+"%"} icon={BarChart3} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card style={{ padding:18 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:12 }}>Funnel Rates</div>
          {[["Total leads",total],["Reply rate",pct(replied.length, contacted.length)+"%"],["Interested rate",pct(leads.filter(l=>l.status==="INTERESTED").length, total)+"%"],["Proposal rate",pct(proposals.length, total)+"%"],["Close rate",pct(won.length, total)+"%"]].map(([l,v]) => (
            <div key={l as string} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${COLORS.rail}`, fontSize:12.5 }}><span>{l}</span><span style={{ fontFamily:FONT_MONO, fontWeight:600 }}>{v}</span></div>
          ))}
        </Card>
        <Card style={{ padding:18 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:12 }}>Revenue by Lead Source</div>
          {bySource.length===0 && <div style={{ fontSize:12.5, color:COLORS.muted }}>No data yet.</div>}
          {bySource.map(s => (
            <div key={s.source} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${COLORS.rail}`, fontSize:12.5 }}>
              <span>{s.source} <span style={{color:COLORS.muted}}>({s.count})</span></span>
              <span style={{ fontFamily:FONT_MONO, color:COLORS.signal }}>{fmtMoney(s.revenue)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
