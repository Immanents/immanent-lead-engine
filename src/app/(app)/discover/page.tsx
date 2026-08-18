"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Pill, Btn, inputStyle, COLORS } from "@/components/ui";
import { SOURCES } from "@/lib/constants";
import LeadModal, { emptyLead } from "@/components/LeadModal";
import { Plus, Upload, Check } from "lucide-react";

export default function DiscoverPage() {
  const supabase = supabaseBrowser();
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const [l, c] = await Promise.all([supabase.from("leads").select("*"), supabase.from("campaigns").select("*")]);
    setLeads(l.data || []); setCampaigns(c.data || []);
  }
  useEffect(() => { load(); }, []);

  function parseCSV(text: string) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g,"_"));
    return lines.slice(1).map(line => {
      const cells = line.split(",").map(c => c.trim());
      const obj: any = {}; headers.forEach((h,i) => obj[h] = cells[i] || "");
      return obj;
    });
  }
  function isDuplicate(row: any) {
    return leads.some(l =>
      (row.website && l.website && l.website.toLowerCase() === row.website.toLowerCase()) ||
      (row.business_name && l.business_name && row.business_name.toLowerCase() === l.business_name.toLowerCase() && (row.location||"").toLowerCase() === (l.location||"").toLowerCase()) ||
      (row.instagram && l.instagram && row.instagram.toLowerCase() === l.instagram.toLowerCase())
    );
  }
  function handlePreview() {
    const rows = parseCSV(csvText);
    if (!rows) { setMsg("Couldn't parse CSV — check the format"); return; }
    setPreview(rows.map(r => ({ ...r, __dup: isDuplicate(r) })));
  }
  async function importRows() {
    const { data: { user } } = await supabase.auth.getUser();
    const toInsert = (preview || []).filter(r => !r.__dup && r.business_name).map(r => ({
      ...emptyLead(), business_name: r.business_name, industry: r.industry || "", location: r.location || "",
      website: r.website || "", instagram: r.instagram || "", facebook: r.facebook || "", linkedin: r.linkedin || "",
      email: r.email || "", phone: r.phone || "", contact_person: r.contact_person || "", source: r.source || "Directory",
      owner_id: user?.id,
    }));
    const { data } = await supabase.from("leads").insert(toInsert).select();
    if (data) await supabase.from("activities").insert(data.map((l: any) => ({ lead_id: l.id, type:"created", description:"Imported via CSV", owner_id: user?.id })));
    setMsg(`Imported ${toInsert.length} leads (${(preview||[]).length - toInsert.length} skipped as duplicates/invalid)`);
    setPreview(null); setCsvText(""); load();
  }
  async function addLead(lead: any) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("leads").insert({ ...lead, owner_id: user?.id }).select().single();
    if (!error && data) { await supabase.from("activities").insert({ lead_id: data.id, type:"created", description:"Lead created", owner_id: user?.id }); setShowAdd(false); load(); }
  }

  return (
    <div>
      <SectionTitle sub="Manual entry and CSV import — V1 works without external scraping">Discover</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card style={{ padding:18 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:6 }}>Manual Lead Entry</div>
          <div style={{ fontSize:12.5, color:COLORS.muted, marginBottom:12 }}>Add a single prospect you found on Google Maps, Instagram, a referral, or elsewhere.</div>
          <Btn variant="signal" icon={Plus} onClick={()=>setShowAdd(true)}>Add Lead</Btn>
          <div style={{ marginTop:14, fontSize:11.5, color:COLORS.muted }}>Source labels: {SOURCES.join(" · ")}</div>
        </Card>
        <Card style={{ padding:18 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:6 }}>CSV Import</div>
          <div style={{ fontSize:12.5, color:COLORS.muted, marginBottom:10 }}>Headers: business_name, industry, location, website, instagram, facebook, linkedin, email, phone, contact_person, source.</div>
          <textarea style={{ ...inputStyle, minHeight:100, fontFamily:"monospace", fontSize:11.5 }} placeholder="business_name,industry,location,website,instagram,email" value={csvText} onChange={e=>setCsvText(e.target.value)} />
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <Btn icon={Upload} onClick={handlePreview} disabled={!csvText.trim()}>Preview Import</Btn>
          </div>
          {msg && <div style={{ fontSize:12, color:COLORS.muted, marginTop:8 }}>{msg}</div>}
        </Card>
      </div>
      {preview && (
        <Card style={{ padding:18, marginTop:16 }}>
          <div style={{ fontWeight:700, fontSize:13.5, marginBottom:10 }}>Import Preview — {preview.length} rows, {preview.filter(r=>r.__dup).length} duplicates flagged</div>
          <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#FAFAF8" }}>{["Business","Industry","Location","Website","Status"].map(h=><th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:10.5, color:COLORS.muted, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {preview.map((r,i) => (
                <tr key={i} style={{ borderBottom:`1px solid ${COLORS.rail}`, opacity: r.__dup ? 0.5 : 1 }}>
                  <td style={{ padding:"7px 10px" }}>{r.business_name}</td><td style={{ padding:"7px 10px" }}>{r.industry}</td>
                  <td style={{ padding:"7px 10px" }}>{r.location}</td><td style={{ padding:"7px 10px" }}>{r.website}</td>
                  <td style={{ padding:"7px 10px" }}>{r.__dup ? <Pill tone="rose">Duplicate</Pill> : <Pill tone="signal">New</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <Btn variant="signal" icon={Check} onClick={importRows}>Import {preview.filter(r=>!r.__dup && r.business_name).length} New Leads</Btn>
            <Btn variant="ghost" onClick={()=>setPreview(null)}>Cancel</Btn>
          </div>
        </Card>
      )}
      {showAdd && <LeadModal campaigns={campaigns} onClose={()=>setShowAdd(false)} onSave={addLead} />}
    </div>
  );
}
