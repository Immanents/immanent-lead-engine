"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Btn, Field, inputStyle, COLORS, FONT_MONO, FONT_DISPLAY } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { Plus } from "lucide-react";

const PROJECT_STATUSES = ["NOT STARTED","IN PROGRESS","CLIENT REVIEW","COMPLETED","ON HOLD","CANCELLED"];

export default function ClientsPage() {
  const supabase = supabaseBrowser();
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [showConvert, setShowConvert] = useState(false);
  const [form, setForm] = useState<any>({ lead_id:"", project_name:"", project_value:"", amount_paid:"", start_date:"", deadline:"", project_status:"NOT STARTED" });

  async function load() {
    const [c, l] = await Promise.all([supabase.from("clients").select("*").order("created_at",{ascending:false}), supabase.from("leads").select("*")]);
    setClients(c.data || []); setLeads(l.data || []);
  }
  useEffect(() => { load(); }, []);

  const wonLeads = leads.filter(l => l.status === "WON" && !clients.some(c=>c.lead_id===l.id));

  async function convert() {
    const lead = leads.find(l=>l.id===form.lead_id);
    if (!lead) return;
    const { data: { user } } = await supabase.auth.getUser();
    const value = Number(form.project_value || lead.suggested_price || 0);
    const paid = Number(form.amount_paid || 0);
    await supabase.from("clients").insert({
      lead_id: lead.id, business_name: lead.business_name, contact_person: lead.contact_person,
      project_name: form.project_name || `${lead.business_name} Website`, package: lead.recommended_package,
      project_value: value, amount_paid: paid, balance: value - paid, project_status: form.project_status,
      start_date: form.start_date || null, deadline: form.deadline || null, owner_id: user?.id,
    });
    await supabase.from("activities").insert({ lead_id: lead.id, type:"converted", description:"Converted to client", owner_id: user?.id });
    setShowConvert(false); load();
  }
  async function updateClient(c: any, patch: any) {
    const value = patch.project_value ?? c.project_value;
    const paid = patch.amount_paid ?? c.amount_paid;
    await supabase.from("clients").update({ ...patch, balance: value - paid }).eq("id", c.id);
    load();
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
        <SectionTitle sub="Won leads, converted to paying projects">Clients</SectionTitle>
        <Btn icon={Plus} disabled={wonLeads.length===0} onClick={()=>setShowConvert(true)}>Convert Won Lead</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {clients.map(c => (
          <Card key={c.id} style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div style={{ fontWeight:700 }}>{c.business_name}</div>
              <select value={c.project_status} style={{ ...inputStyle, width:140, padding:"4px 8px", fontSize:11 }} onChange={e=>updateClient(c,{project_status:e.target.value})}>
                {PROJECT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ fontSize:11.5, color:COLORS.muted, margin:"4px 0 10px" }}>{c.project_name} · {c.package}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:11.5 }}>
              <div>Value: <b style={{fontFamily:FONT_MONO}}>{fmtMoney(c.project_value)}</b></div>
              <div>Paid: <b style={{fontFamily:FONT_MONO, color:COLORS.signal}}>{fmtMoney(c.amount_paid)}</b></div>
              <div>Balance: <b style={{fontFamily:FONT_MONO, color:COLORS.amber}}>{fmtMoney(c.balance)}</b></div>
              <div>Deadline: <b>{c.deadline ? fmtDate(c.deadline) : "—"}</b></div>
            </div>
          </Card>
        ))}
        {clients.length===0 && <div style={{ color:COLORS.muted, fontSize:12.5 }}>No clients yet — win a lead and convert it here.</div>}
      </div>
      {showConvert && (
        <div style={{ position:"fixed", inset:0, background:"rgba(20,23,31,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60 }} onClick={()=>setShowConvert(false)}>
          <Card style={{ width:440, padding:20 }} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:16, marginBottom:12 }}>Convert to Client</div>
            <Field label="Won Lead">
              <select style={inputStyle} value={form.lead_id} onChange={e=>setForm({...form,lead_id:e.target.value})}>
                <option value="">Select…</option>
                {wonLeads.map(l=><option key={l.id} value={l.id}>{l.business_name}</option>)}
              </select>
            </Field>
            <Field label="Project Name"><input style={inputStyle} value={form.project_name} onChange={e=>setForm({...form,project_name:e.target.value})} /></Field>
            <Field label="Project Value"><input type="number" style={inputStyle} value={form.project_value} onChange={e=>setForm({...form,project_value:e.target.value})} /></Field>
            <Field label="Amount Paid"><input type="number" style={inputStyle} value={form.amount_paid} onChange={e=>setForm({...form,amount_paid:e.target.value})} /></Field>
            <Field label="Deadline"><input type="date" style={inputStyle} value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} /></Field>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <Btn variant="ghost" onClick={()=>setShowConvert(false)}>Cancel</Btn>
              <Btn variant="signal" onClick={convert}>Convert</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
