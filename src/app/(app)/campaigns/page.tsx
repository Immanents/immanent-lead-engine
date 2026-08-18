"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Pill, Btn, Field, inputStyle, COLORS, FONT_DISPLAY } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
  const supabase = supabaseBrowser();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", industry:"", location:"", status:"Active", description:"" });

  async function load() {
    const [c, l, o, p, cl] = await Promise.all([
      supabase.from("campaigns").select("*"), supabase.from("leads").select("*"),
      supabase.from("outreach").select("*"), supabase.from("proposals").select("*"), supabase.from("clients").select("*"),
    ]);
    setCampaigns(c.data || []); setLeads(l.data || []); setOutreach(o.data || []); setProposals(p.data || []); setClients(cl.data || []);
  }
  useEffect(() => { load(); }, []);

  function metrics(c: any) {
    const cLeads = leads.filter(l => l.campaign_id === c.id);
    const won = cLeads.filter(l => l.status === "WON");
    const revenue = clients.filter(cl => cLeads.some(l=>l.id===cl.lead_id)).reduce((s,cl)=>s+Number(cl.amount_paid||0),0);
    return {
      total: cLeads.length, qualified: cLeads.filter(l=>l.status!=="NEW").length,
      contacted: cLeads.filter(l=>outreach.some(o=>o.lead_id===l.id)).length,
      interested: cLeads.filter(l=>l.status==="INTERESTED").length,
      proposals: proposals.filter(p=>cLeads.some(l=>l.id===p.lead_id)).length,
      won: won.length, revenue, conv: cLeads.length ? Math.round((won.length/cLeads.length)*100) : 0,
    };
  }
  async function addCampaign() {
    if (!form.name) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("campaigns").insert({ ...form, owner_id: user?.id });
    setForm({ name:"", industry:"", location:"", status:"Active", description:"" });
    setShowAdd(false); load();
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
        <SectionTitle sub="Organize leads by industry, location, source or outreach experiment">Campaigns</SectionTitle>
        <Btn icon={Plus} onClick={()=>setShowAdd(true)}>New Campaign</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {campaigns.map(c => {
          const m = metrics(c);
          return (
            <Card key={c.id} style={{ padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                <Pill tone={c.status==="Active" ? "signal" : "muted"}>{c.status}</Pill>
              </div>
              <div style={{ fontSize:11.5, color:COLORS.muted, margin:"4px 0 12px" }}>{c.industry} {c.location && `· ${c.location}`}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, fontSize:11 }}>
                {[["Leads",m.total],["Qualified",m.qualified],["Contacted",m.contacted],["Interested",m.interested],["Proposals",m.proposals],["Won",m.won],["Revenue",fmtMoney(m.revenue)],["Conv.",m.conv+"%"]].map(([l,v]) => (
                  <div key={l as string} style={{ background:"#FAFAF8", borderRadius:6, padding:"6px 8px" }}>
                    <div style={{ color:COLORS.muted, fontSize:9.5, textTransform:"uppercase" }}>{l}</div>
                    <div style={{ fontWeight:600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {campaigns.length===0 && <div style={{ color:COLORS.muted, fontSize:12.5 }}>No campaigns yet.</div>}
      </div>
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(20,23,31,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60 }} onClick={()=>setShowAdd(false)}>
          <Card style={{ width:420, padding:20 }} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:16, marginBottom:12 }}>New Campaign</div>
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Lagos Salons — August 2026" /></Field>
            <Field label="Industry"><input style={inputStyle} value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} /></Field>
            <Field label="Location"><input style={inputStyle} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} /></Field>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
              <Btn variant="signal" onClick={addCampaign}>Create</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
