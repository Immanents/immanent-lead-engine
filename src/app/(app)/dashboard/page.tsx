"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Pill, StatCard } from "@/components/ui";
import { COLORS, FONT_MONO } from "@/components/ui";
import { PIPELINE_STAGES, STAGES } from "@/lib/constants";
import { fmtMoney, fmtDateTime, isPast } from "@/lib/utils";
import { TrendingUp, DollarSign, Users, Briefcase, Clock, AlertCircle, Send, FileText } from "lucide-react";

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const [l, c, o, p, a] = await Promise.all([
        supabase.from("leads").select("*"),
        supabase.from("clients").select("*"),
        supabase.from("outreach").select("*"),
        supabase.from("proposals").select("*"),
        supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      setLeads(l.data || []); setClients(c.data || []); setOutreach(o.data || []); setProposals(p.data || []); setActivities(a.data || []);
    })();
  }, []);

  const pipelineValue = leads.filter(l => !["WON","LOST","ARCHIVED"].includes(l.status)).reduce((s,l)=> s + (Number(l.suggested_price)||0), 0);
  const wonRevenue = clients.reduce((s,c)=> s + Number(c.amount_paid||0), 0);
  const activeLeads = leads.filter(l => !["WON","LOST","ARCHIVED"].includes(l.status)).length;
  const counts: any = {}; STAGES.forEach(s => counts[s] = leads.filter(l=>l.status===s).length);
  const followUpsDue = leads.filter(l => l.next_follow_up_at && isPast(l.next_follow_up_at) && !["WON","LOST","ARCHIVED"].includes(l.status));
  const qualifiedLeads = leads.filter(l => l.status === "QUALIFIED");
  const pendingProposals = proposals.filter(p => ["Draft","Sent"].includes(p.status));

  return (
    <div>
      <SectionTitle sub="What should I do today to generate revenue?">Dashboard</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="Pipeline Value" value={fmtMoney(pipelineValue)} icon={TrendingUp} />
        <StatCard label="Won Revenue" value={fmtMoney(wonRevenue)} icon={DollarSign} tone="signal" />
        <StatCard label="Active Leads" value={activeLeads} icon={Users} />
        <StatCard label="Clients" value={clients.length} icon={Briefcase} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:16 }}>
        <Card style={{ padding:18 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:12 }}>Sales Pipeline</div>
          <div style={{ display:"flex", gap:6 }}>
            {PIPELINE_STAGES.map(s => (
              <div key={s} style={{ flex:1, textAlign:"center" }}>
                <div style={{ background: counts[s] ? COLORS.signalSoft : "#F3F3EF", borderRadius:8, padding:"12px 4px", border:`1px solid ${COLORS.rail}` }}>
                  <div style={{ fontFamily:FONT_MONO, fontWeight:600, fontSize:18 }}>{counts[s]}</div>
                </div>
                <div style={{ fontSize:9.5, color:COLORS.muted, marginTop:5, fontWeight:600 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:COLORS.muted, marginTop:14, display:"flex", gap:14 }}>
            <span>Lost: <b style={{color:COLORS.ink}}>{counts.LOST}</b></span>
            <span>Nurture: <b style={{color:COLORS.ink}}>{counts.NURTURE}</b></span>
          </div>
        </Card>
        <Card style={{ padding:18 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:12 }}>Today's Actions</div>
          <ActionRow label="Follow-ups due" count={followUpsDue.length} icon={Clock} onClick={() => followUpsDue[0] && router.push(`/leads/${followUpsDue[0].id}`)} />
          <ActionRow label="Qualified leads to review" count={qualifiedLeads.length} icon={AlertCircle} onClick={() => qualifiedLeads[0] && router.push(`/leads/${qualifiedLeads[0].id}`)} />
          <ActionRow label="Outreach sent (total)" count={outreach.length} icon={Send} onClick={() => router.push("/outreach")} />
          <ActionRow label="Pending proposals" count={pendingProposals.length} icon={FileText} onClick={() => router.push("/proposals")} />
        </Card>
      </div>
      <Card style={{ padding:18, marginTop:16 }}>
        <div style={{ fontWeight:700, fontSize:13.5, marginBottom:10 }}>Recent Activity</div>
        {activities.length === 0 && <div style={{ fontSize:12.5, color:COLORS.muted }}>No activity yet. Add your first lead to get started.</div>}
        {activities.map(a => {
          const lead = leads.find(l => l.id === a.lead_id);
          return (
            <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${COLORS.rail}`, fontSize:12.5 }}>
              <div><b>{lead?.business_name || "—"}</b> · {a.description}</div>
              <div style={{ color:COLORS.muted, fontFamily:FONT_MONO, fontSize:11 }}>{fmtDateTime(a.created_at)}</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
function ActionRow({ label, count, icon: Icon, onClick }: any) {
  return (
    <div onClick={onClick} className="rowhover" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 6px", borderRadius:6, cursor: count ? "pointer" : "default" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5 }}><Icon size={14} color={COLORS.muted} /> {label}</div>
      <Pill tone={count > 0 ? "amber" : "muted"}>{count}</Pill>
    </div>
  );
}
