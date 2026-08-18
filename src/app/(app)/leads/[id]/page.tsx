"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, Pill, Btn, Field, inputStyle, stageTone, COLORS, FONT_MONO, FONT_DISPLAY } from "@/components/ui";
import { STAGES, CHANNELS, SCORE_SIGNALS, PACKAGES } from "@/lib/constants";
import { scoreFromSignals, fmtMoney, fmtDate, fmtDateTime, addDays, isPast } from "@/lib/utils";
import LeadModal from "@/components/LeadModal";
import { ArrowLeft, Edit3, Sparkles, Loader2, Check, Globe, Mail, Phone, Instagram, Facebook, Linkedin } from "lucide-react";

export default function LeadProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [lead, setLead] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [outreachList, setOutreachList] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ follow_up_days: [2,5,10] });
  const [editing, setEditing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draftMsg, setDraftMsg] = useState<any>(null);
  const [channel, setChannel] = useState("Email");

  async function load() {
    const [l, c, o, a, s] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase.from("campaigns").select("*"),
      supabase.from("outreach").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("settings").select("*").maybeSingle(),
    ]);
    setLead(l.data); setCampaigns(c.data || []); setOutreachList(o.data || []); setActivities(a.data || []);
    if (s.data) setSettings(s.data);
  }
  useEffect(() => { load(); }, [id]);

  async function logActivity(type: string, description: string, extra: any = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activities").insert({ lead_id: id, type, description, owner_id: user?.id, ...extra });
  }
  async function updateLead(patch: any) {
    const { data } = await supabase.from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    setLead(data);
  }
  async function setStatus(status: string) {
    await updateLead({ status });
    await logActivity("status_change", `Status → ${status}`);
    load();
  }

  async function analyzeLead() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      const { score, priority } = scoreFromSignals(parsed.signals || {});
      await updateLead({
        ai_analysis: parsed, signals: parsed.signals || {}, lead_score: score, priority,
        primary_problem: parsed.primary_problem, opportunity: parsed.business_opportunity,
        recommended_package: parsed.recommended_package, suggested_price: parsed.suggested_price,
        status: lead.status === "NEW" ? "QUALIFIED" : lead.status,
      });
      await logActivity("ai_analysis", "AI analysis run");
      load();
    } catch (e) { alert("Analysis failed — try again"); } finally { setAnalyzing(false); }
  }

  async function generateOutreach() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead, channel }) });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      setDraftMsg(parsed);
    } catch (e) { alert("Message generation failed"); } finally { setGenerating(false); }
  }

  async function approveAndRecord() {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("outreach").insert({ lead_id: id, campaign_id: lead.campaign_id, channel, message_type:"outreach", content: draftMsg.message, subject: draftMsg.subject, status:"SENT", sent_at: new Date().toISOString(), owner_id: user?.id });
    const followDays = settings.follow_up_days || [2,5,10];
    await updateLead({ status: ["QUALIFIED","NEW"].includes(lead.status) ? "CONTACTED" : lead.status, last_contacted_at: new Date().toISOString(), next_follow_up_at: addDays(new Date().toISOString(), followDays[0]) });
    await logActivity("outreach_sent", `Outreach sent via ${channel}`, { channel });
    setDraftMsg(null);
    load();
  }

  if (!lead) return <div style={{ color:COLORS.muted, fontSize:13 }}>Loading…</div>;

  return (
    <div>
      <div onClick={() => router.push("/leads")} style={{ display:"flex", alignItems:"center", gap:6, color:COLORS.muted, fontSize:12.5, cursor:"pointer", marginBottom:14 }}>
        <ArrowLeft size={14} /> Back to Leads
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:22 }}>{lead.business_name}</div>
            <Pill tone={stageTone(lead.status)}>{lead.status}</Pill>
          </div>
          <div style={{ color:COLORS.muted, fontSize:12.5, marginTop:3 }}>{lead.industry} {lead.location && `· ${lead.location}`} · via {lead.source}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="ghost" icon={Edit3} onClick={()=>setEditing(true)}>Edit</Btn>
          <select value={lead.status} onChange={e=>setStatus(e.target.value)} style={{ ...inputStyle, width:160 }}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
        <ContactLine icon={Globe} val={lead.website} /><ContactLine icon={Mail} val={lead.email} /><ContactLine icon={Phone} val={lead.phone} />
        <ContactLine icon={Instagram} val={lead.instagram} /><ContactLine icon={Facebook} val={lead.facebook} /><ContactLine icon={Linkedin} val={lead.linkedin} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16 }}>
        <div>
          <Card style={{ padding:18, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:13.5 }}>AI Lead Analysis</div>
              <Btn variant="signal" icon={analyzing ? Loader2 : Sparkles} disabled={analyzing} onClick={analyzeLead}>{analyzing ? "Analyzing…" : lead.ai_analysis ? "Re-analyze" : "Analyze Lead with AI"}</Btn>
            </div>
            {!lead.ai_analysis && <div style={{ fontSize:12.5, color:COLORS.muted }}>No analysis yet. Run AI analysis to get a business summary, primary problem, opportunity, package recommendation, and score.</div>}
            {lead.ai_analysis && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {["business_summary","online_presence","website_status","primary_problem","customer_journey","business_opportunity","recommended_solution","suggested_outreach_angle"].map(k => (
                  <div key={k}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:COLORS.muted, textTransform:"uppercase", marginBottom:2 }}>{k.replace(/_/g," ")}</div>
                    <div style={{ fontSize:12.5 }}>{lead.ai_analysis[k]}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding:18, marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13.5, marginBottom:12 }}>AI Outreach Generator</div>
            <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center" }}>
              <select style={{ ...inputStyle, width:180 }} value={channel} onChange={e=>setChannel(e.target.value)}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Btn variant="signal" icon={generating ? Loader2 : Sparkles} disabled={generating || !lead.ai_analysis} onClick={generateOutreach}>{generating ? "Generating…" : "Generate Message"}</Btn>
              {!lead.ai_analysis && <div style={{ fontSize:11.5, color:COLORS.muted }}>Run AI analysis first</div>}
            </div>
            {draftMsg && (
              <div style={{ border:`1px solid ${COLORS.rail}`, borderRadius:8, padding:12, background:"#FAFAF8" }}>
                {draftMsg.subject && <div style={{ fontWeight:600, fontSize:12.5, marginBottom:6 }}>Subject: {draftMsg.subject}</div>}
                <textarea style={{ ...inputStyle, minHeight:110, background:"#fff" }} value={draftMsg.message} onChange={e=>setDraftMsg({...draftMsg, message:e.target.value})} />
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <Btn variant="signal" icon={Check} onClick={approveAndRecord}>Approve & Record Sent</Btn>
                  <Btn variant="ghost" onClick={()=>setDraftMsg(null)}>Discard</Btn>
                </div>
              </div>
            )}
          </Card>

          <Card style={{ padding:18 }}>
            <div style={{ fontWeight:700, fontSize:13.5, marginBottom:10 }}>Outreach History</div>
            {outreachList.length === 0 && <div style={{ fontSize:12.5, color:COLORS.muted }}>No outreach sent yet.</div>}
            {outreachList.map(o => (
              <div key={o.id} style={{ padding:"10px 0", borderBottom:`1px solid ${COLORS.rail}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <Pill tone="ink">{o.channel}</Pill>
                  <span style={{ color:COLORS.muted, fontFamily:FONT_MONO }}>{fmtDateTime(o.sent_at)}</span>
                </div>
                <div style={{ fontSize:12.5, marginTop:6, whiteSpace:"pre-wrap" }}>{o.content}</div>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <Card style={{ padding:18, marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13.5, marginBottom:4 }}>Lead Score</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:10 }}>
              <div style={{ fontFamily:FONT_MONO, fontSize:32, fontWeight:600 }}>{lead.lead_score || 0}</div>
              <Pill tone={lead.lead_score >= 80 ? "signal" : lead.lead_score >= 60 ? "amber" : "muted"}>{lead.priority || "Low"}</Pill>
            </div>
            {lead.ai_analysis?.reason_for_score && <div style={{ fontSize:12, color:COLORS.muted, marginBottom:10 }}>{lead.ai_analysis.reason_for_score}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {SCORE_SIGNALS.map(sig => (
                <label key={sig.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <input type="checkbox" checked={!!lead.signals?.[sig.key]} onChange={async e => {
                      const signals = { ...lead.signals, [sig.key]: e.target.checked };
                      const { score, priority } = scoreFromSignals(signals);
                      await updateLead({ signals, lead_score: score, priority });
                    }} /> {sig.label}
                  </span>
                  <span style={{ color:COLORS.muted, fontFamily:FONT_MONO }}>+{sig.points}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card style={{ padding:18, marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13.5, marginBottom:10 }}>Recommended Offer</div>
            <select style={inputStyle} value={lead.recommended_package || ""} onChange={async e => {
              const pkg = e.target.value;
              await updateLead({ recommended_package: pkg, suggested_price: PACKAGES[pkg]?.price || lead.suggested_price });
            }}>
              <option value="">— Select package —</option>
              {Object.keys(PACKAGES).map(p => <option key={p} value={p}>{p} — {fmtMoney(PACKAGES[p].price)}</option>)}
            </select>
            {lead.recommended_package && <div style={{ fontSize:12, color:COLORS.muted, marginTop:8 }}>{PACKAGES[lead.recommended_package]?.scope}</div>}
            <Field label="Price"><input style={{...inputStyle, marginTop:8}} type="number" value={lead.suggested_price || ""} onChange={e=>updateLead({suggested_price: e.target.value})} /></Field>
          </Card>

          <Card style={{ padding:18, marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:13.5, marginBottom:8 }}>Follow-up</div>
            <div style={{ fontSize:12.5, marginBottom:8 }}>Next due: <b style={{ color: lead.next_follow_up_at && isPast(lead.next_follow_up_at) ? COLORS.rose : COLORS.ink }}>{lead.next_follow_up_at ? fmtDate(lead.next_follow_up_at) : "None scheduled"}</b></div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <Btn variant="ghost" onClick={async () => { await updateLead({ next_follow_up_at: addDays(new Date().toISOString(), 2) }); logActivity("followup_scheduled","Follow-up manually scheduled +2d"); }}>+2d</Btn>
              <Btn variant="ghost" onClick={async () => { await updateLead({ next_follow_up_at: addDays(new Date().toISOString(), 5) }); logActivity("followup_scheduled","Follow-up manually scheduled +5d"); }}>+5d</Btn>
              <Btn variant="ghost" onClick={() => setStatus("NURTURE")}>Move to Nurture</Btn>
            </div>
          </Card>

          <Card style={{ padding:18 }}>
            <div style={{ fontWeight:700, fontSize:13.5, marginBottom:8 }}>Activity History</div>
            {activities.map(a => (
              <div key={a.id} style={{ fontSize:11.5, color:COLORS.muted, padding:"5px 0", borderBottom:`1px solid ${COLORS.rail}` }}>
                <span style={{ color:COLORS.ink }}>{a.description}</span> · {fmtDateTime(a.created_at)}
              </div>
            ))}
          </Card>
        </div>
      </div>

      {editing && <LeadModal initial={lead} campaigns={campaigns} onClose={()=>setEditing(false)} onSave={async (l: any) => { await updateLead(l); setEditing(false); }} />}
    </div>
  );
}
function ContactLine({ icon: Icon, val }: any) {
  if (!val) return null;
  return <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:COLORS.muted, background:"#fff", border:`1px solid ${COLORS.rail}`, borderRadius:7, padding:"7px 10px" }}><Icon size={13} /> {val}</div>;
}
