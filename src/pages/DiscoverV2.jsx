// src/pages/DiscoverV2.jsx
// V2 chat-based discovery page — redesigned to match Qala artifact UI.
//
// UI matches artifact exactly:
//   - Minimal header: avatar + "Qala Studio" + "production consultant"
//   - No role labels above bubbles
//   - Both bubble sides: subtle bg + thin border
//   - 3 animated typing dots (not spinner)
//   - Dynamic chips from Claude's [CHIPS: A | B | C] output
//   - Image attached: thumbnail inside message bubble, not separate strip
//   - No token counter, no nav "View Studios" button
//   - Brief card appears inside the AI message when matching done
//   - Studios panel still slides in after matching

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../api/client';
import ChatMessage from '../components/discovery/ChatMessage';
import ImageUpload from '../components/discovery/ImageUpload';
import StudiosPanel from '../components/discovery/StudiosPanel';
import qalaLogo from '../assets/qala-logo.png';

const CHAT_SESSION_KEY = 'qala_chat_session_id';

// ── Chip parser — reads [CHIPS: A | B | C] from Claude text ─────────────────
function parseChips(text) {
  if (!text) return [];
  const m = text.match(/\[CHIPS:\s*([^\]]+)\]/);
  return m ? m[1].split('|').map(s => s.trim()).filter(Boolean) : [];
}

export default function DiscoverV2() {
  const { user, loginWithAccessKey } = useAuth();
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const taRef     = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState('gate');
  const [accessKey, setAccessKey]       = useState('');
  const [keyError, setKeyError]         = useState('');
  const [sessionId, setSessionId]       = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [pendingImage, setPendingImage] = useState(null);   // {data: base64, mime}
  const [sending, setSending]           = useState(false);
  const [starting, setStarting]         = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [extracted, setExtracted]       = useState({});
  const [showPanel, setShowPanel]       = useState(false);
  const [chips, setChips]               = useState([]);
  const [splitView, setSplitView]       = useState(false);
  const [highlightBrief, setHighlightBrief] = useState(false);

  // ── Scroll on new messages ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Auto-start for logged-in users ────────────────────────────────────────
  useEffect(() => {
    if (user) startSession(null);
  }, [user]);

  // ── Resume session from sessionStorage ───────────────────────────────────
  useEffect(() => {
    if (user) return;
    const saved = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (saved) resumeSession(saved);
  }, []);

  // ── Resume ────────────────────────────────────────────────────────────────
  async function resumeSession(id) {
    try {
      const res  = await chatAPI.getSession(id);
      const data = res.data;
      setSessionId(id);
      setMessages((data.messages || []).map(m => ({
        role: m.role, content: m.content,
      })));
      setExtracted(data.extracted || {});
      if (data.session_token) {
        setSessionToken(data.session_token);
        setPhase('matched');
        setSplitView(true);
      } else {
        setPhase('chat');
      }
    } catch {
      sessionStorage.removeItem(CHAT_SESSION_KEY);
      setPhase('gate');
    }
  }

  // ── Start session ─────────────────────────────────────────────────────────
  async function startSession(key) {
    setStarting(true);
    setKeyError('');
    try {
      const res  = await chatAPI.start(key || null);
      const data = res.data;
      const id   = data.session?.session_id;
      setSessionId(id);
      sessionStorage.setItem(CHAT_SESSION_KEY, id);

      // If the backend issued a signed token for this key owner, log them in
      // directly — no SuperTokens flow needed.
      if (data.access_token && data.user) {
        loginWithAccessKey(data.access_token, data.user);
      }

      const openingMsg = { role: 'assistant', content: data.message };
      setMessages([openingMsg]);
      setChips(data.quick_replies || parseChips(data.message));
      setPhase('chat');
    } catch (err) {
      setKeyError(err.response?.data?.error || 'Invalid access key.');
    } finally {
      setStarting(false);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed && !pendingImage) return;
    if (!sessionId || sending) return;

    // Intercept brief-confirmation chips — don't send to Claude,
    // just pulse the Find Studios button to guide the user.
    const confirmPhrases = [
      'this looks right', 'this sounds right', 'looks right',
      'sounds right', 'looks good', 'that looks right',
    ];
    if (confirmPhrases.includes(trimmed.toLowerCase())) {
      setHighlightBrief(true);
      setTimeout(() => setHighlightBrief(false), 2500);
      setChips([]);
      return;
    }

    const imgCopy  = pendingImage;

    // Append user message to local state immediately
    const userMsg = {
      role:          'user',
      content:       trimmed,
      attachedImage: imgCopy?.data || null,
      attachedMime:  imgCopy?.mime || 'image/jpeg',
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChips([]);
    setPendingImage(null);

    // Resize textarea
    if (taRef.current) {
      taRef.current.style.height = 'auto';
    }

    setSending(true);
    try {
      const res  = await chatAPI.sendMessage(
        sessionId, trimmed, imgCopy?.data || null
      );
      const data = res.data;

      const aiMsg = {
        role:         'assistant',
        content:      data.message,
        hasBrief:     data.has_brief || false,
        sessionToken: data.session_token || null,
      };
      setMessages(prev => [...prev, aiMsg]);
      setChips(parseChips(data.message) || data.quick_replies || []);

      if (data.extracted) {
        setExtracted(prev => ({ ...prev, ...data.extracted }));
      }

      if (data.session_token) {
        setSessionToken(data.session_token);
        setPhase('matched');
        // Panel opens only when user explicitly clicks "View Studios"
        // Matching now happens via Brief card "Find Studios" CTA
      }
    } catch (err) {
      const errText = err.response?.data?.error || 'Something went wrong — please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errText }]);
    } finally {
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleImageSelected(base64, _name, mime) {
    setPendingImage({ data: base64, mime: mime || 'image/jpeg' });
  }

  function handleAdjust(text) {
    sendMessage(text || "I'd like to change something in the brief");
  }

  async function handleMatchComplete(token) {
    setSessionToken(token);
    setPhase('matched');
    setSplitView(true);

    // Fetch top 3 recs and add a summary message to the chat
    try {
      const res  = await discoveryAPI.getRecommendations(token);
      const recs = (res.data?.recommendations || []).filter(r => !r.is_bonus_visual).slice(0, 3);
      if (recs.length > 0) {
        const lines = recs.map((r, i) => {
          const why = r.match_reasoning?.product_match
            ? r.match_reasoning.product_match.replace(/^Strong match for /i, 'Can make ')
            : (r.what_best_at?.[0] || '');
          const crafts  = (r.primary_crafts  || []).slice(0, 2).join(', ');
          const fabrics = (r.primary_fabrics || []).slice(0, 2).join(', ');
          const detail  = [why, crafts, fabrics].filter(Boolean).join(' · ');
          return `**${i + 1}. ${r.studio_name}**${r.location ? ' — ' + r.location : ''}\n${detail}`;
        });
        const summaryMsg = {
          role: 'assistant',
          content:
            'Here are your top matches — you can explore the full profiles on the right:\n\n' +
            lines.join('\n\n') +
            '\n\nWould you like help deciding between them, or are you happy to browse?',
          hasBrief: false,
        };
        setMessages(prev => [...prev, summaryMsg]);
        setChips(['Help me decide', 'I\'ll browse myself']);
      }
    } catch {
      // Non-fatal — studios panel still shows on the right
    }
  }

  // ── ACCESS KEY GATE ───────────────────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16, padding: '40px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <img src={qalaLogo} alt="Qala" style={{ height: 22, width: 'auto' }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500,
            color: 'var(--text)', marginBottom: 8, textAlign: 'center',
          }}>
            Find your studio
          </h1>
          <p style={{
            fontSize: 13, color: 'var(--text3)', lineHeight: 1.6,
            textAlign: 'center', marginBottom: 28,
          }}>
            Tell us what you want to make and we'll match you with the right craft studio.
          </p>

          {/* Key input */}
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              value={accessKey}
              onChange={e => { setAccessKey(e.target.value); setKeyError(''); }}
              onKeyDown={e => e.key === 'Enter' && accessKey.trim() && startSession(accessKey)}
              placeholder="Enter your access key  —  QALA-XXXX-XXXX"
              autoFocus
              style={{
                width: '100%', padding: '11px 14px',
                border: `1px solid ${keyError ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 8, background: 'var(--surface)',
                fontSize: 14, color: 'var(--text)',
                fontFamily: 'var(--font-body)', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.18s',
                letterSpacing: '0.04em',
              }}
              onFocus={e  => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
              onBlur={e   => { e.currentTarget.style.borderColor = keyError ? 'var(--red)' : 'var(--border)'; }}
            />
            {keyError && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 5 }}>{keyError}</p>
            )}
          </div>

          <button
            onClick={() => startSession(accessKey)}
            disabled={!accessKey.trim() || starting}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 8, border: 'none',
              background: '#1A1612', color: '#F5F0E8',
              fontSize: 14, fontWeight: 500,
              cursor: !accessKey.trim() || starting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              opacity: !accessKey.trim() || starting ? 0.5 : 1,
              transition: 'background 0.18s, opacity 0.18s',
            }}
            onMouseEnter={e => { if (!starting && accessKey.trim()) e.currentTarget.style.background = '#C46E49'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; }}
          >
            {starting ? 'Starting…' : 'Continue →'}
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text4)' }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
          </div>

          {/* Login path */}
          <button
            onClick={() => navigate('/login?redirect=/discover')}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)',
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'background 0.18s, border-color 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Log in to your account
          </button>

          <p style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', marginTop: 18 }}>
            Don't have a key?{' '}
            <a href="mailto:hello@qala.studio" style={{ color: 'var(--text3)' }}>Contact us</a>
          </p>
        </div>
      </div>
    );
  }

  // ── CHAT (+ optional 40:60 split) ────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'row',
      height: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-body)',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: .2; transform: scale(.7); }
          50%       { opacity: 1; transform: scale(1); }
        }
        .tdot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--text3);
          animation: blink 1.2s ease-in-out infinite;
        }
        .tdot:nth-child(2) { animation-delay: .15s; }
        .tdot:nth-child(3) { animation-delay: .3s; }
        .qchip {
          padding: 6px 14px; border-radius: 20px;
          border: 0.5px solid var(--border2);
          background: var(--surface);
          font-size: 12.5px; color: var(--text);
          cursor: pointer; font-family: var(--font-body);
          transition: background 0.12s; white-space: nowrap;
        }
        .qchip:hover { background: var(--surface2); }
        .msgs-scroll::-webkit-scrollbar { width: 3px; }
        .msgs-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        textarea:focus { outline: none; }
        textarea { scrollbar-width: none; }
        textarea::-webkit-scrollbar { display: none; }
        @media (max-width: 767px) {
          .split-root { flex-direction: column !important; }
          .chat-col   { width: 100% !important; flex: none !important; height: 55vh !important; }
          .studios-col { width: 100% !important; flex: none !important; height: 45vh !important; border-left: none !important; border-top: 0.5px solid var(--border) !important; }
        }
      `}</style>

      {/* ── Chat column (always present, 40% when split, 100% otherwise) ── */}
      <div
        className="chat-col"
        style={{
          display: 'flex', flexDirection: 'column',
          flex: splitView ? '0 0 40%' : '1',
          width: splitView ? '40%' : '100%',
          minWidth: 0,
          transition: 'flex 0.35s cubic-bezier(0.4,0,0.2,1), width 0.35s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '13px 20px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--surface2)',
            border: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5C4.5 1.5 2.5 3.2 2.5 5.5c0 2.8 2.8 5.2 4.5 6.2 1.7-1 4.5-3.4 4.5-6.2C11.5 3.2 9.5 1.5 7 1.5z"
                stroke="var(--text3)" strokeWidth="1.1" fill="none"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              Qala Studio
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -1 }}>
              production consultant
            </div>
          </div>

          {/* View Studios button — shown when matched but split panel is closed */}
          {sessionToken && !splitView && (
            <button
              onClick={() => setSplitView(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '0.5px solid #C4563A',
                background: 'rgba(196,86,58,0.07)',
                color: '#C4563A',
                fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,86,58,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(196,86,58,0.07)'; }}
            >
              View Studios →
            </button>
          )}
        </div>

        {/* ── Messages ── */}
        <div
          className="msgs-scroll"
          style={{
            flex: 1, overflowY: 'auto',
            padding: '20px 18px 8px',
          }}
        >
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                hasBrief={msg.hasBrief}
                sessionToken={sessionToken}
                sessionId={sessionId}
                onAdjust={handleAdjust}
                onMatchComplete={handleMatchComplete}
                attachedImage={msg.attachedImage}
                attachedMime={msg.attachedMime}
                highlightBrief={msg.hasBrief ? highlightBrief : false}
              />
            ))}

            {sending && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'inline-flex', gap: 4, padding: '9px 13px',
                  alignItems: 'center',
                  background: 'var(--surface2)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '3px 14px 14px 14px',
                }}>
                  <div className="tdot" />
                  <div className="tdot" />
                  <div className="tdot" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Chips ── */}
        {chips.length > 0 && !sending && (
          <div style={{
            padding: '2px 18px 10px',
            display: 'flex', flexWrap: 'wrap', gap: 6,
            flexShrink: 0,
            maxWidth: 680 + 36,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            {chips.map((c, i) => (
              <button key={i} className="qchip" onClick={() => sendMessage(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* ── Pending image preview ── */}
        {pendingImage && (
          <div style={{
            padding: '0 18px 8px',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <img
              src={`data:${pendingImage.mime};base64,${pendingImage.data}`}
              alt=""
              style={{
                height: 44, borderRadius: 6,
                border: '0.5px solid var(--border)',
              }}
            />
            <button
              onClick={() => setPendingImage(null)}
              style={{
                fontSize: 12, color: 'var(--text3)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              remove
            </button>
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{
          padding: '10px 14px 14px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', gap: 8, alignItems: 'flex-end',
          flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <ImageUpload
            onImage={handleImageSelected}
            disabled={sending}
            iconOnly
          />
          <textarea
            ref={taRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
            onKeyDown={handleKey}
            placeholder="Tell me what you're looking to make..."
            rows={1}
            disabled={sending}
            style={{
              flex: 1, resize: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              border: '0.5px solid var(--border2)',
              background: 'var(--surface2)',
              fontSize: 14, color: 'var(--text)',
              lineHeight: 1.5,
              fontFamily: 'var(--font-body)',
              maxHeight: 100,
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || (!input.trim() && !pendingImage)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '0.5px solid var(--border2)',
              background: 'var(--surface2)',
              fontSize: 13, color: 'var(--text)',
              cursor: sending || (!input.trim() && !pendingImage) ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              opacity: sending || (!input.trim() && !pendingImage) ? 0.35 : 1,
              transition: 'background 0.12s, opacity 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
          >
            Send
          </button>
        </div>
      </div>

      {/* ── Studios column — only shown in split view ── */}
      {splitView && sessionToken && (
        <div
          className="studios-col"
          style={{
            flex: '0 0 60%',
            width: '60%',
            minWidth: 0,
            overflow: 'hidden',
            animation: 'slideInStudios 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <style>{`
            @keyframes slideInStudios {
              from { opacity: 0; transform: translateX(40px); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <StudiosPanel
            sessionToken={sessionToken}
            onClose={() => setSplitView(false)}
            buyerSummary={extracted}
            inline
          />
        </div>
      )}

      {/* Legacy overlay panel (kept for any other showPanel triggers) */}
      {showPanel && !splitView && sessionToken && (
        <StudiosPanel
          sessionToken={sessionToken}
          onClose={() => setShowPanel(false)}
          buyerSummary={extracted}
        />
      )}
    </div>
  );
}