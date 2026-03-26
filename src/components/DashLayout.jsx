import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import qalaLogo from '../assets/qala-logo.png';

export function DashLayout({ children, nav: navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const doLogout = async () => { await logout(); navigate('/'); };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <style>{`
        .dash-sidebar {
          width: 240px; flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          position: sticky; top: 0; height: 100vh; overflow-y: auto;
          transition: transform 0.25s ease;
          z-index: 50;
        }
        .dash-hamburger { display: none; }
        .dash-overlay { display: none; }
        @media (max-width: 1024px) {
          .dash-sidebar {
            position: fixed; left: 0; top: 0;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }
          .dash-sidebar.open { transform: translateX(0); }
          .dash-hamburger {
            display: flex; align-items: center; justify-content: center;
            position: fixed; top: 14px; left: 14px; z-index: 40;
            width: 40px; height: 40px; border-radius: 8px;
            background: var(--surface); border: 1px solid var(--border);
            cursor: pointer; font-size: 18; color: var(--text);
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          .dash-overlay {
            display: block; position: fixed; inset: 0; z-index: 45;
            background: rgba(0,0,0,0.3);
          }
          .dash-main { padding-top: 60px; }
        }
      `}</style>

      {/* Mobile hamburger */}
      <button className="dash-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>

      {/* Overlay */}
      {sidebarOpen && <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid var(--border)' }}>
          <img src={qalaLogo} alt="Qala" className="qala-logo" style={{ marginBottom: 6 }} />
          <div style={{ fontSize:11, color:'var(--text4)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {user?.role === 'admin' ? 'Admin Panel' : 'Seller Studio'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end ?? false}
              onClick={() => setSidebarOpen(false)}
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
      <main className="dash-main" style={{ flex:1, overflowY:'auto', minHeight:'100vh' }}>
        {children}
      </main>
    </div>
  );
}
