"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Pill, COLORS } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

export default function OutreachPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [outreach, setOutreach] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const [o, l] = await Promise.all([
        supabase.from("outreach").select("*").order("sent_at", { ascending: false }),
        supabase.from("leads").select("*"),
      ]);
      setOutreach(o.data || []); setLeads(l.data || []);
    })();
  }, []);
  return (
    <div>
      <SectionTitle sub="AI generates → Founder reviews/edits → Founder approves → Message is sent">Outreach</SectionTitle>
      <Card style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
          <thead><tr style={{ background:"#FAFAF8" }}>{["Business","Channel","Message","Sent"].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:COLORS.muted, textTransform:"uppercase", borderBottom:`1px solid ${COLORS.rail}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {outreach.map(o => {
              const lead = leads.find(l => l.id === o.lead_id);
              return (
                <tr key={o.id} className="rowhover" style={{ borderBottom:`1px solid ${COLORS.rail}`, cursor:"pointer" }} onClick={()=>router.push(`/leads/${o.lead_id}`)}>
                  <td style={{ padding:"11px 14px", fontWeight:600 }}>{lead?.business_name || "—"}</td>
                  <td style={{ padding:"11px 14px" }}><Pill tone="ink">{o.channel}</Pill></td>
                  <td style={{ padding:"11px 14px", color:COLORS.muted, maxWidth:400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.content}</td>
                  <td style={{ padding:"11px 14px", color:COLORS.muted }}>{fmtDateTime(o.sent_at)}</td>
                </tr>
              );
            })}
            {outreach.length === 0 && <tr><td colSpan={4} style={{ padding:28, textAlign:"center", color:COLORS.muted }}>No outreach sent yet. Generate a message from a lead's profile.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
