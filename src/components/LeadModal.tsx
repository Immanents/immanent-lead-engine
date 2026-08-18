"use client";
import { useState } from "react";
import { Card, Field, Btn, inputStyle, FONT_DISPLAY } from "@/components/ui";
import { SOURCES } from "@/lib/constants";
import { X } from "lucide-react";

export function emptyLead() {
  return {
    business_name:"", industry:"", location:"", description:"",
    website:"", instagram:"", facebook:"", linkedin:"", email:"", phone:"", contact_person:"",
    source:"Manual", campaign_id:null, notes:"",
  };
}

export default function LeadModal({ initial, campaigns, onClose, onSave }: any) {
  const [lead, setLead] = useState<any>(initial || emptyLead());
  const set = (k: string, v: any) => setLead((l: any) => ({ ...l, [k]: v }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(20,23,31,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60 }} onClick={onClose}>
      <Card style={{ width:560, maxHeight:"85vh", overflowY:"auto", padding:22 }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:17 }}>{initial ? "Edit Lead" : "Add Lead"}</div>
          <X size={18} onClick={onClose} style={{ cursor:"pointer" }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Business Name *"><input style={inputStyle} value={lead.business_name} onChange={e=>set("business_name", e.target.value)} /></Field>
          <Field label="Industry *"><input style={inputStyle} value={lead.industry} onChange={e=>set("industry", e.target.value)} /></Field>
          <Field label="Location"><input style={inputStyle} value={lead.location||""} onChange={e=>set("location", e.target.value)} /></Field>
          <Field label="Contact Person"><input style={inputStyle} value={lead.contact_person||""} onChange={e=>set("contact_person", e.target.value)} /></Field>
          <Field label="Website"><input style={inputStyle} value={lead.website||""} onChange={e=>set("website", e.target.value)} /></Field>
          <Field label="Email"><input style={inputStyle} value={lead.email||""} onChange={e=>set("email", e.target.value)} /></Field>
          <Field label="Instagram"><input style={inputStyle} value={lead.instagram||""} onChange={e=>set("instagram", e.target.value)} /></Field>
          <Field label="Phone"><input style={inputStyle} value={lead.phone||""} onChange={e=>set("phone", e.target.value)} /></Field>
          <Field label="Facebook"><input style={inputStyle} value={lead.facebook||""} onChange={e=>set("facebook", e.target.value)} /></Field>
          <Field label="LinkedIn"><input style={inputStyle} value={lead.linkedin||""} onChange={e=>set("linkedin", e.target.value)} /></Field>
          <Field label="Source *">
            <select style={inputStyle} value={lead.source} onChange={e=>set("source", e.target.value)}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Campaign">
            <select style={inputStyle} value={lead.campaign_id || ""} onChange={e=>set("campaign_id", e.target.value || null)}>
              <option value="">None</option>
              {(campaigns||[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes"><textarea style={{ ...inputStyle, minHeight:60 }} value={lead.notes||""} onChange={e=>set("notes", e.target.value)} /></Field>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="signal" disabled={!lead.business_name || !lead.industry} onClick={() => onSave(lead)}>Save Lead</Btn>
        </div>
      </Card>
    </div>
  );
}
