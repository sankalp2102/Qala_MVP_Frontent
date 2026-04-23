import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buyerAPI } from '../api/client';
import { Spinner } from '../components/Spinner';
import qalaLogo from '../assets/qala-logo.png';
import UserAvatar from '../components/UserAvatar';

// ── helpers ───────────────────────────────────────────────────────────────────

function journeyLabel(stage) {
  const map = {
    figuring_it_out:    'Figuring It Out',
    build_with_support: 'Build With Support',
    ready_to_produce:   'Ready to Produce',
  };
  return map[stage] || stage || '—';
}

function journeyColor(stage) {
  if (stage === 'ready_to_produce')   return { bg: 'var(--green-dim)',  text: 'var(--green)' };
  if (stage === 'build_with_support') return { bg: 'var(--gold-dim)',   text: 'var(--gold)' };
  return                                     { bg: 'var(--surface3)',   text: 'var(--text3)' };
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function chipList(arr) {
  if (!arr?.length) return null;
  return arr.slice(0, 3).map(v => (
    <span key={v} style={{
      display: 'inline-block', padding: '3px 10px',
      background: 'var(--surface3)', borderRadius: 'var(--radius-xl)',
      fontSize: 12, color: 'var(--text2)', marginRight: 4,
    }}>{v}</span>
  ));
}

// ── sub-components ────────────────────────────────────────────────────────────

function SessionCard({ session, onResume }) {
  const color = journeyColor(session.journey_stage);
  const products = session.product_types?.slice(0, 2) || [];
  const crafts   = session.crafts?.slice(0, 2) || [];

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'box-shadow 0.18s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 4 }}>
            {formatDate(session.created_at)}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {session.name || 'Discovery Session'}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          padding: '4px 10px', borderRadius: 'var(--radius-xl)',
          background: color.bg, color: color.text, textTransform: 'uppercase',
        }}>
          {journeyLabel(session.journey_stage)}
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chipList(products)}
        {chipList(crafts)}
        {(session.product_types?.length > 2 || session.crafts?.length > 2) && (
          <span style={{ fontSize: 12, color: 'var(--text4)', alignSelf: 'center' }}>
            +{Math.max(0, (session.product_types?.length || 0) - 2) + Math.max(0, (session.crafts?.length || 0) - 2)} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>
          {session.recommendation_count} studio{session.recommendation_count !== 1 ? 's' : ''} matched
        </span>
        <button
          onClick={() => onResume(session.session_token)}
          style={{
            fontSize: 13, fontWeight: 600, color: 'var(--gold)',
            background: 'var(--gold-dim)', border: '1px solid rgba(184,92,56,0.2)',
            borderRadius: 'var(--radius)', padding: '7px 16px', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-glow)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--gold-dim)'}
        >
          View Results →
        </button>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(profile?.full_name || '');
  const [phone, setPhone]     = useState(profile?.phone || '');
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ full_name: name, phone });
      setEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '24px 28px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Profile
        </h3>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            fontSize: 13, color: 'var(--text3)', background: 'none',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '5px 12px', cursor: 'pointer',
          }}>Edit</button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['Name',  profile?.full_name || '—'],
            ['Email', profile?.email     || '—'],
            ['Phone', profile?.phone     || '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text3)', width: 52, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AccessKeyCard ─────────────────────────────────────────────────────────────

function AccessKeyCard({ accessKey }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(accessKey.key_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const pct = accessKey.tokens_allocated > 0
    ? Math.min(100, (accessKey.tokens_used / accessKey.tokens_allocated) * 100)
    : 0;

  const statusColors = {
    active:  { bg: 'var(--green-dim)',  text: 'var(--green)',  label: 'Active'  },
    expired: { bg: 'var(--amber-dim)',  text: 'var(--amber)',  label: 'Expired' },
    revoked: { bg: 'var(--red-dim)',    text: 'var(--red)',    label: 'Revoked' },
  };
  const sc = statusColors[accessKey.status] || statusColors.active;

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Access Key
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          padding: '3px 10px', borderRadius: 'var(--radius-xl)',
          background: sc.bg, color: sc.text, textTransform: 'uppercase',
        }}>
          {sc.label}
        </span>
      </div>

      {/* Key code row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
      }}>
        <span style={{
          flex: 1, fontFamily: 'monospace', fontSize: 15,
          fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em',
        }}>
          {accessKey.key_code}
        </span>
        <button
          onClick={handleCopy}
          title="Copy key"
          style={{
            background: copied ? 'var(--green-dim)' : 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 12px',
            fontSize: 11, fontWeight: 500,
            color: copied ? 'var(--green)' : 'var(--text2)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      {/* Token usage bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Token usage</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {accessKey.tokens_used.toLocaleString()} / {accessKey.tokens_allocated.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${pct}%`,
            background: pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--teal)',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      buyerAPI.getSessions(),
      buyerAPI.getProfile(),
    ]).then(([sessRes, profRes]) => {
      setSessions(sessRes.data.sessions || []);
      setProfile(profRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleResume = (sessionToken) => {
    localStorage.setItem('qala_session_token', sessionToken);
    nav('/discover/results');
  };

  const handleSaveProfile = async (data) => {
    const res = await buyerAPI.updateProfile(data);
    setProfile(res.data);
  };

  if (loading) return <Spinner full />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)', height: 58,
      }}>
        <Link to="/">
          <img src={qalaLogo} alt="Qala" className="qala-logo" />
        </Link>
        <UserAvatar />
      </div>

      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 48px)',
      }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginBottom: 8,
          }}>
            {profile?.full_name
              ? <>Welcome, <em style={{ color: 'var(--gold)' }}>{profile.full_name.split(' ')[0]}</em></>
              : <>Your <em style={{ color: 'var(--gold)' }}>Dashboard</em></>
            }
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text3)' }}>
            Your discovery sessions and studio matches.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 280px',
          gap: 28,
          alignItems: 'start',
        }}
          className="buyer-grid"
        >
          {/* Left — sessions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                Past Sessions
              </h2>
              <button
                onClick={() => nav('/discover')}
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '8px 18px' }}
              >
                + New Search
              </button>
            </div>

            {sessions.length === 0 ? (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '40px 32px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
                  No sessions yet
                </div>
                <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>
                  Complete a discovery questionnaire to get matched with craft studios.
                </p>
                <button
                  onClick={() => nav('/discover')}
                  className="btn btn-primary"
                  style={{ fontSize: 14, padding: '10px 24px' }}
                >
                  Start Discovery →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sessions.map(s => (
                  <SessionCard key={s.session_token} session={s} onResume={handleResume} />
                ))}
              </div>
            )}
          </div>

          {/* Right — profile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ProfileCard profile={profile} onSave={handleSaveProfile} />

            {/* Access Key */}
            {profile?.access_key && (
              <AccessKeyCard accessKey={profile.access_key} />
            )}

            {/* Quick links */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '20px 24px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                Explore
              </div>
              {[
                ['Browse Studios',     '/directory'],
                ['Start New Search',   '/discover'],
              ].map(([label, path]) => (
                <Link key={path} to={path} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                  fontSize: 14, color: 'var(--text2)', textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                >
                  {label} <span style={{ fontSize: 18, fontWeight: 300 }}>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 700px) {
          .buyer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}