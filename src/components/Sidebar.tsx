"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  LayoutDashboard, Users, Search, Send, Megaphone, FileText, Briefcase,
  BarChart3, Settings as SettingsIcon, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ width:190, background:"#14171F", color:"#fff", padding:"20px 12px", flexShrink:0, display:"flex", flexDirection:"column", minHeight:"100vh" }}>
      <div style={{ padding:"0 8px 20px 8px" }}>
        <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontWeight:700, fontSize:16, letterSpacing:-0.3 }}>IMMANENT</div>
        <div style={{ fontSize:10, letterSpacing:1.5, color:"#8A8F9C", marginTop:2 }}>LEAD ENGINE · V1</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {NAV.map(item => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="navbtn"
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:7,
                background: active ? "#0E7C4A" : "transparent", color: active ? "#fff" : "#C7CAD1",
                fontSize:13, fontWeight: active ? 600 : 500, textDecoration:"none" }}>
              <Icon size={15} /> {item.label}
            </Link>
          );
        })}
      </div>
      <div onClick={signOut} style={{ marginTop:"auto", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#8A8F9C", padding:"8px", cursor:"pointer" }}>
        <LogOut size={14} /> Sign out
      </div>
    </div>
  );
}
