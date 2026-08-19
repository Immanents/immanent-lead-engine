import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar />
      <div style={{ flex:1, minWidth:0, padding:24, maxWidth:1200 }}>{children}</div>
    </div>
  );
}
   export const dynamic = "force-dynamic";
