import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';

export function DashLayout({ children, nav: navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = async () => { await logout(); navigate('/'); };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{
        width:240, flexShrink:0,
        background:'var(--surface)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh', overflowY:'auto',
      }}>
        {/* Logo */}
        <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,var(--gold),var(--gold-d))', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#0A0A0B' }}>Q</span>
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--text)', letterSpacing:'0.04em' }}>QALA</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text4)', marginTop:4, letterSpacing:'0.08em', textTransform:'uppercase', paddingLeft:37 }}>
            {user?.role === 'admin' ? 'Admin Panel' : 'Seller Studio'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard' || item.to === '/admin'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:'var(--radius)',
                fontSize:13.5, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--gold)' : 'var(--text2)',
                background: isActive ? 'var(--gold-dim)' : 'transparent',
                border: isActive ? '1px solid rgba(200,165,90,0.15)' : '1px solid transparent',
                transition:'all 0.15s', textDecoration:'none',
                marginBottom:2,
              })}>
              <span style={{ fontSize:15, width:20, textAlign:'center' }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge && (
                <span className={`badge badge-${item.badge.type}`} style={{ fontSize:10, padding:'2px 7px' }}>
                  {item.badge.text}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding:'14px 12px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface2)', borderRadius:'var(--radius)', border:'1px solid var(--border)', marginBottom:10 }}>
            <div style={{
              width:30, height:30, borderRadius:8, flexShrink:0,
              background:'linear-gradient(135deg,var(--teal),var(--teal-l))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:700, color:'var(--bg)',
            }}>
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize', marginTop:1 }}>{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={doLogout} style={{ width:'100%', justifyContent:'center', fontSize:12 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, overflowY:'auto', minHeight:'100vh' }}>
        {children}
      </main>
    </div>
  );
}
