"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Pill, Btn, inputStyle, stageTone, COLORS, FONT_MONO } from "@/components/ui";
import { STAGES, SOURCES } from "@/lib/constants";
import { fmtDate, isPast } from "@/lib/utils";
import LeadModal from "@/components/LeadModal";
import { Plus } from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const router = useRouter();
  const supabase = supabaseBrowser();

  async function load() {
    const [l, c] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("*"),
    ]);
    setLeads(l.data || []); setCampaigns(c.data || []);
  }
  useEffect(() => { load(); }, []);

  async function addLead(lead: any) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("leads").insert({ ...lead, owner_id: user?.id }).select().single();
    if (!error && data) {
      await supabase.from("activities").insert({ lead_id: data.id, type: "created", description: "Lead created", owner_id: user?.id });
      setShowAdd(false); load();
    }
  }

  const filtered = leads.filter(l => {
    if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
    if (filterSource !== "ALL" && l.source !== filterSource) return false;
    if (q && !(`${l.business_name} ${l.industry} ${l.location}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
        <SectionTitle sub={`${filtered.length} of ${leads.length} leads`}>Leads</SectionTitle>
        <Btn icon={Plus} onClick={() => setShowAdd(true)}>Add Lead</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input style={{ ...inputStyle, maxWidth:260 }} placeholder="Search business, industry, location…" value={q} onChange={e=>setQ(e.target.value)} />
        <select style={{ ...inputStyle, maxWidth:170 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={{ ...inputStyle, maxWidth:170 }} value={filterSource} onChange={e=>setFilterSource(e.target.value)}>
          <option value="ALL">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Card style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ background:"#FAFAF8", textAlign:"left" }}>
              {["Business","Industry","Location","Score","Status","Source","Next follow-up"].map(h => (
                <th key={h} style={{ padding:"10px 14px", fontSize:10.5, fontWeight:700, color:COLORS.muted, textTransform:"uppercase", borderBottom:`1px solid ${COLORS.rail}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="rowhover" style={{ cursor:"pointer", borderBottom:`1px solid ${COLORS.rail}` }} onClick={() => router.push(`/leads/${l.id}`)}>
                <td style={{ padding:"11px 14px", fontWeight:600 }}>{l.business_name || "Untitled"}</td>
                <td style={{ padding:"11px 14px", color:COLORS.muted }}>{l.industry || "—"}</td>
                <td style={{ padding:"11px 14px", color:COLORS.muted }}>{l.location || "—"}</td>
                <td style={{ padding:"11px 14px", fontFamily:FONT_MONO }}>{l.lead_score || 0}</td>
                <td style={{ padding:"11px 14px" }}><Pill tone={stageTone(l.status)}>{l.status}</Pill></td>
                <td style={{ padding:"11px 14px", color:COLORS.muted }}>{l.source}</td>
                <td style={{ padding:"11px 14px", color: l.next_follow_up_at && isPast(l.next_follow_up_at) ? COLORS.rose : COLORS.muted }}>{l.next_follow_up_at ? fmtDate(l.next_follow_up_at) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ padding:28, textAlign:"center", color:COLORS.muted }}>No leads match. Add one, or import a CSV from Discover.</td></tr>}
          </tbody>
        </table>
      </Card>
      {showAdd && <LeadModal campaigns={campaigns} onClose={() => setShowAdd(false)} onSave={addLead} />}
    </div>
  );
}
