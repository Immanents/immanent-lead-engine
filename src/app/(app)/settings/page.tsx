"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, SectionTitle, Btn, Field, inputStyle, COLORS } from "@/components/ui";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const supabase = supabaseBrowser();
  const [studioName, setStudioName] = useState("Immanent Studio");
  const [fu, setFu] = useState("2, 5, 10");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*").maybeSingle();
      if (data) { setStudioName(data.studio_name); setFu((data.follow_up_days||[2,5,10]).join(", ")); }
    })();
  }, []);

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    const follow_up_days = fu.split(",").map(s=>parseInt(s.trim())).filter(n=>!isNaN(n));
    await supabase.from("settings").upsert({ owner_id: user?.id, studio_name: studioName, follow_up_days: follow_up_days.length ? follow_up_days : [2,5,10] });
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  }

  return (
    <div>
      <SectionTitle sub="Follow-up cadence and studio details">Settings</SectionTitle>
      <Card style={{ padding:18, maxWidth:480 }}>
        <Field label="Studio Name"><input style={inputStyle} value={studioName} onChange={e=>setStudioName(e.target.value)} /></Field>
        <Field label="Follow-up Sequence (days after initial outreach)"><input style={inputStyle} value={fu} onChange={e=>setFu(e.target.value)} placeholder="2, 5, 10" /></Field>
        <div style={{ fontSize:11.5, color:COLORS.muted, marginBottom:14 }}>Default: Day 2 → Follow-up #1, Day 5 → Follow-up #2, Day 10 → Final follow-up, then move to Nurture.</div>
        <Btn variant="signal" icon={Check} onClick={save}>{saved ? "Saved" : "Save Settings"}</Btn>
      </Card>
      <Card style={{ padding:18, maxWidth:480, marginTop:16 }}>
        <div style={{ fontWeight:700, fontSize:13.5, marginBottom:8 }}>V1 Scope Reminder</div>
        <div style={{ fontSize:12, color:COLORS.muted, lineHeight:1.6 }}>
          No automated Instagram/WhatsApp sending, no mass messaging, no payment processing, no client portal. All outreach requires founder review and approval before being recorded as sent.
        </div>
      </Card>
    </div>
  );
}
