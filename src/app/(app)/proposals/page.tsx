"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Btn, Field, inputStyle, COLORS, FONT_DISPLAY } from "@/components/ui";
import { PACKAGES } from "@/lib/constants";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default function ProposalsPage() {
  const supabase = supabaseBrowser();
  const [proposals, setProposals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ lead_id:"", package:"Business", price: PACKAGES.Business.price, payment_terms:"60% upfront, 40% before final launch/handover", scope: PACKAGES.Business.scope, status:"Draft" });

  async function load() {
    const [p, l] = await Promise.all([supabase.from("proposals").select("*").order("created_at",{ascending:false}), supabase.from("leads").select("*")]);
    setProposals(p.data || []); setLeads(l.data || []);
  }
  useEffect(() => { load(); }, []);

  async function addProposal() {
    if (!form.lead_id) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("proposals").insert({ ...form, price: Number(form.price), owner_id: user?.id });
    await supabase.from("leads").update({ status: "PROPOSAL" }).eq("id", form.lead_id);
    await supabase.from("activities").insert({ lead_id: form.lead_id, type:"proposal_created", description:`Proposal created (${form.package} — ${fmtMoney(form.price)})`, owner_id: user?.id });
    setShowAdd(false); load();
  }
  async function updateStatus(p: any, status: string) {
    const patch: any = { status };
    if (status === "Sent") patch.sent_at = new Date().toISOString();
    if (status === "Accepted") patch.accepted_at = new Date().toISOString();
    await supabase.from("proposals").update(patch).eq("id", p.id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activities").insert({ lead_id: p.lead_id, type:"proposal_status", description:`Proposal → ${status}`, owner_id: user?.id });
    load();
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
        <SectionTitle sub="Interested → Discovery → Proposal → Payment → Client">Proposals</SectionTitle>
        <Btn icon={Plus} onClick={()=>setShowAdd(true)}>New Proposal</Btn>
      </div>
      <Card style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead><tr style={{ background:"#FAFAF8" }}>{["Business","Package","Price","Status","Created"].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:COLORS.muted, textTransform:"uppercase", borderBottom:`1px solid ${COLORS.rail}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {proposals.map(p => {
              const lead = leads.find(l=>l.id===p.lead_id);
              return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${COLORS.rail}` }}>
                  <td style={{ padding:"11px 14px", fontWeight:600 }}>{lead?.business_name}</td>
                  <td style={{ padding:"11px 14px" }}>{p.package}</td>
                  <td style={{ padding:"11px 14px" }}>{fmtMoney(p.price)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <select value={p.status} style={{ ...inputStyle, width:130, padding:"5px 8px" }} onChange={e=>updateStatus(p, e.target.value)}>
                      {["Draft","Sent","Accepted","Declined"].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"11px 14px", color:COLORS.muted }}>{fmtDate(p.created_at)}</td>
                </tr>
              );
            })}
            {proposals.length===0 && <tr><td colSpan={5} style={{ padding:28, textAlign:"center", color:COLORS.muted }}>No proposals yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(20,23,31,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60 }} onClick={()=>setShowAdd(false)}>
          <Card style={{ width:460, padding:20 }} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:16, marginBottom:12 }}>New Proposal</div>
            <Field label="Lead">
              <select style={inputStyle} value={form.lead_id} onChange={e=>setForm({...form,lead_id:e.target.value})}>
                <option value="">Select lead…</option>
                {leads.filter(l=>!["WON","LOST","ARCHIVED"].includes(l.status)).map(l=><option key={l.id} value={l.id}>{l.business_name}</option>)}
              </select>
            </Field>
            <Field label="Package">
              <select style={inputStyle} value={form.package} onChange={e=>setForm({...form, package:e.target.value, price:PACKAGES[e.target.value].price, scope:PACKAGES[e.target.value].scope})}>
                {Object.keys(PACKAGES).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Price"><input type="number" style={inputStyle} value={form.price} onChange={e=>setForm({...form,price:e.target.value})} /></Field>
            <Field label="Payment Terms"><input style={inputStyle} value={form.payment_terms} onChange={e=>setForm({...form,payment_terms:e.target.value})} /></Field>
            <Field label="Scope"><textarea style={{...inputStyle,minHeight:60}} value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})} /></Field>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Cancel</Btn>
              <Btn variant="signal" onClick={addProposal}>Create Proposal</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
