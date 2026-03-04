export function Spinner({ full }) {
  if (full) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', flexDirection:'column', gap:12 }}>
      <span className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
      <span style={{ fontSize:13, color:'var(--text3)' }}>Loading…</span>
    </div>
  );
  return <span className="spinner" />;
}
