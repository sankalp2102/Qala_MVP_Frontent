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
import { chatAPI, discoveryAPI } from '../api/client';
import ChatMessage from '../components/discovery/ChatMessage';
import ImageUpload from '../components/discovery/ImageUpload';
import StudiosPanel from '../components/discovery/StudiosPanel';
import qalaLogo   from '../assets/qala-logo.png';
import UserAvatar from '../components/UserAvatar';

const CHAT_SESSION_KEY   = 'qala_chat_session_id';
const LANDING_FIRST_MSG  = 'qala_landing_first_msg';
const LANDING_FIRST_IMG  = 'qala_landing_first_img';
const LANDING_FIRST_MIME = 'qala_landing_first_mime';

// ── Chip parser — reads [CHIPS: A | B | C] from Claude text ─────────────────
function parseChips(text) {
  if (!text) return [];
  const m = text.match(/\[CHIPS:\s*([^\]]+)\]/);
  return m ? m[1].split('|').map(s => s.trim()).filter(Boolean) : [];
}

export default function DiscoverV2() {
  const { user, loginWithAccessKey, loading: authLoading } = useAuth();
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const taRef     = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  // Determine initial phase synchronously — never flash the gate for users
  // who are already authenticated or coming from the landing page.
  const hasLandingMsg = !!(sessionStorage.getItem(LANDING_FIRST_MSG) || sessionStorage.getItem(LANDING_FIRST_IMG));
  const hasLandingSession = !!sessionStorage.getItem(CHAT_SESSION_KEY);
  function _initPhase() {
    if (hasLandingMsg)                       return 'loading';
    if (hasLandingSession)                   return 'loading';
    if (localStorage.getItem('qala_token'))  return 'loading';
    return 'gate';
  }
  const [phase, setPhase] = useState(_initPhase);
  const [accessKey, setAccessKey]       = useState('');
  const [keyError, setKeyError]         = useState('');
  const [sessionId, setSessionId]       = useState(null);
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [pendingImages, setPendingImages] = useState([]);   // [{data: base64, mime, name}]
  const [sending, setSending]           = useState(false);
  const [starting, setStarting]         = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [extracted, setExtracted]       = useState({});
  const [showPanel, setShowPanel]       = useState(false);
  const [chips, setChips]               = useState([]);
  const [splitView, setSplitView]       = useState(false);
  const [chatOpen, setChatOpen]         = useState(false); // mobile chat drawer
  const [highlightBrief, setHighlightBrief] = useState(false);
  const [keyUsedEmail, setKeyUsedEmail]       = useState(null); // set when anon key accepted

  // ── Scroll on new messages ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Auth resolved — decide what to do ──────────────────────────────────────
  // Runs once when AuthContext finishes loading (authLoading flips false).
  // Uses a ref to ensure it only acts once, preventing double-fire from
  // user state updates (e.g. loginWithAccessKey enriching the profile).
  const authHandledRef = useRef(false);
  useEffect(() => {
    if (authLoading) return;                  // still loading — wait
    if (authHandledRef.current) return;       // already handled — don't re-run
    if (hasLandingMsg || hasLandingSession) return; // landing flow handles it

    authHandledRef.current = true;

    if (user) {
      sessionStorage.removeItem(CHAT_SESSION_KEY); // clear stale session
      startSession(null);
    } else {
      setPhase('gate');
    }
  }, [authLoading, user]);

  // ── Consume first message pre-loaded from Landing page ───────────────────
  // Landing.jsx saves the session_id + first message to sessionStorage before
  // navigating here. On mount we pick it up, skip the gate, and send it so
  // the chat opens already mid-conversation.
  useEffect(() => {
    const firstMsg  = sessionStorage.getItem(LANDING_FIRST_MSG);
    const firstImg  = sessionStorage.getItem(LANDING_FIRST_IMG);
    const firstMime = sessionStorage.getItem(LANDING_FIRST_MIME);
    const savedId   = sessionStorage.getItem(CHAT_SESSION_KEY);

    if (!firstMsg && !firstImg) return;  // nothing pre-loaded

    // Clear from storage immediately so it doesn't re-fire on refresh
    sessionStorage.removeItem(LANDING_FIRST_MSG);
    sessionStorage.removeItem(LANDING_FIRST_IMG);
    sessionStorage.removeItem(LANDING_FIRST_MIME);

    if (!savedId) return;

    // Session was already started by Landing — resume it then send first message
    (async () => {
      try {
        const res  = await chatAPI.getSession(savedId);
        const data = res.data;
        setSessionId(savedId);
        const openingMsg = { role: 'assistant', content: data.messages?.[0]?.content || '' };
        setMessages(openingMsg.content ? [openingMsg] : []);
        setPhase('chat');
        // Now send the first message with optional image
        if (firstMsg || firstImg) {
          const imgData = firstImg  || null;
          const imgMime = firstMime || 'image/jpeg';
          const userMsg = {
            role: 'user', content: firstMsg || '',
            attachedImage: imgData, attachedMime: imgMime,
          };
          setMessages(prev => [...prev, userMsg]);
          setSending(true);
          try {
            const r    = await chatAPI.sendMessage(savedId, firstMsg || '', imgData);
            const d    = r.data;
            const aiMsg = { role: 'assistant', content: d.message, hasBrief: d.has_brief || false };
            setMessages(prev => [...prev, aiMsg]);
            setChips(parseChips(d.message) || d.quick_replies || []);
          } finally {
            setSending(false);
          }
        }
      } catch {
        // Fall back to normal gate if anything goes wrong
        setPhase('gate');
      }
    })();
  }, []);

  // ── Resume session from sessionStorage ───────────────────────────────────
  // Skip if Landing pre-loaded a first message — that effect handles it.
  useEffect(() => {
    if (user) return;
    if (hasLandingMsg) return;
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
        role:     m.role,
        content:  m.content,
        // Restore hasBrief by detecting BRIEF_START in the stored content
        hasBrief: typeof m.content === 'string' &&
                  m.content.includes('BRIEF_START') &&
                  m.content.includes('BRIEF_END'),
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

      // Keys are anonymous — no login. Just open the chat.
      if (key) setKeyUsedEmail(key.trim());

      const openingMsg = { role: 'assistant', content: data.message };
      setMessages([openingMsg]);
      setChips(data.quick_replies || parseChips(data.message));
      setPhase('chat');
    } catch (err) {
      if (user) {
        // Logged-in user — never show the gate. Show an inline error instead.
        // The phase stays 'loading' briefly then we try again or stay.
        console.error('startSession failed for logged-in user:', err);
        // Show a minimal error state rather than the key gate
        setPhase('error');
      } else {
        setKeyError(err.response?.data?.error || 'Invalid access key.');
        setPhase('gate');
      }
    } finally {
      setStarting(false);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed && !pendingImages.length) return;
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

    const imgsCopy = pendingImages.slice();

    // Append user message to local state immediately
    const userMsg = {
      role:          'user',
      content:       trimmed,
      attachedImages: imgsCopy,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChips([]);
    setPendingImages([]);

    // Resize textarea
    if (taRef.current) {
      taRef.current.style.height = 'auto';
    }

    setSending(true);
    try {
      const res  = await chatAPI.sendMessage(
        sessionId, trimmed,
        imgsCopy.length ? imgsCopy : null
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

  function handleImageSelected(base64, name, mime) {
    setPendingImages(prev => [
      ...prev,
      { data: base64, mime: mime || 'image/jpeg', name: name || 'image' },
    ]);
  }

  function handleAdjust(text) {
    sendMessage(text || "I'd like to change something in the brief");
  }

  async function handleMatchComplete(token) {
    setSessionToken(token);
    setPhase('matched');
    setSplitView(true);

    // Poll until matching_complete=true (backend returns status:'ok' with data)
    // Retries up to 6 times with 1s between — handles the race where
    // ChatMatchView returns the session_token before run_matching has finished
    // writing all StudioRecommendation rows to the DB.
    let recs = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise(r => setTimeout(r, attempt === 0 ? 600 : 1000));
      try {
        const res = await discoveryAPI.getRecommendations(token);
        if (res.data?.status === 'ok' && res.data?.recommendations?.length > 0) {
          recs = res.data.recommendations
            .filter(r => !r.is_bonus_visual)
            .sort((a, b) => (a.rank_position ?? 99) - (b.rank_position ?? 99))
            .slice(0, 3);
          break; // got data — stop polling
        }
        // status:'pending' or status:'ok' with empty list — keep trying
      } catch {
        // network error — keep trying
      }
    }

    if (recs.length === 0) return; // gave up — panel still shows on right

    // Preload hero images in background
    recs.forEach(r => {
      const url = r.hero_images?.[0]?.url;
      if (url) {
        const img = new Image();
        img.src = url.startsWith('http') ? url
          : `${import.meta.env.VITE_API_URL || 'https://api.qala.studio'}${url}`;
      }
    });

    // Build chat summary message
    const lines = recs.map((r, i) => {
      const why = r.match_reasoning?.product_match
        ? r.match_reasoning.product_match.replace(/^Strong match for /i, 'Can make ')
        : (r.what_best_at?.[0] || '');
      const crafts  = (r.primary_crafts  || []).slice(0, 2).join(', ');
      const fabrics = (r.primary_fabrics || []).slice(0, 2).join(', ');
      const detail  = [why, crafts, fabrics].filter(Boolean).join(' · ');
      const loc = r.location ? ` — ${r.location}` : '';
      return `**${i + 1}. ${r.studio_name}${loc}**\n${detail}`;
    });

    const summaryMsg = {
      role: 'assistant',
      content:
        'Here are your top 3 matches — browse full profiles on the right:' +
        '\n\n———' +
        lines.map(l => '\n\n' + l).join('\n\n———') +
        '\n\n———\n\nWould you like help deciding between them, or are you happy to browse?',
      hasBrief: false,
    };
    setMessages(prev => [...prev, summaryMsg]);

    // Closing message — sent after the studio summary
    const closingMsg = {
      role: 'assistant',
      content: 'I have sent in your request to the Qala team, they will be contacting you in 24-48 hours time. Meanwhile feel free to explore the studios or ask me anything about the collection.',
      hasBrief: false,
    };
    setMessages(prev => [...prev, closingMsg]);
    setChips(['Help me decide', "I'll browse myself"]);
  }

  // ── ACCESS KEY GATE ───────────────────────────────────────────────────────
  // Show minimal spinner while auth resolves or session starts
  if (phase === 'loading') return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 18, height: 18,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--text3)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (phase === 'error') return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <p style={{ fontSize: 14, color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>
        Something went wrong starting your session.
      </p>
      <button
        onClick={() => { authHandledRef.current = false; setPhase('loading'); startSession(null); }}
        style={{
          padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'none', cursor: 'pointer', fontSize: 13,
          fontFamily: 'var(--font-body)', color: 'var(--text)',
        }}
      >
        Try again
      </button>
    </div>
  );

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
            onMouseEnter={e => { if (!starting && accessKey.trim()) e.currentTarget.style.background = '#8FA083'; }}
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
          /* On mobile in split view: studios take full screen, chat is a drawer */
          .chat-col-mobile-hidden { display: none !important; }
          .studios-col { width: 100% !important; flex: 1 !important; border-left: none !important; }
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
          {/* Qala logo */}
          <img
            src={qalaLogo}
            alt="Qala"
            style={{ height: 18, width: 'auto', flexShrink: 0, opacity: 0.9 }}
          />

          <div style={{ flex: 1 }} />

          <UserAvatar hideWhenLoggedOut />

          {/* View Studios button — shown when matched but split panel is closed */}
          {sessionToken && !splitView && (
            <button
              onClick={() => setSplitView(true)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: '0.5px solid #7A8C6E',
                background: 'rgba(196,86,58,0.07)',
                color: '#7A8C6E',
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
        {pendingImages.length > 0 && (
          <div style={{
            padding: '0 18px 8px',
            display: 'flex', flexWrap: 'wrap', gap: 8,
            flexShrink: 0,
          }}>
            {pendingImages.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img
                  src={`data:${img.mime};base64,${img.data}`}
                  alt=""
                  style={{
                    height: 44, borderRadius: 6,
                    border: '0.5px solid var(--border)',
                    display: 'block',
                  }}
                />
                <button
                  onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#1A1612', border: 'none',
                    color: '#fff', fontSize: 9, fontWeight: 700,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
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
            disabled={sending || (!input.trim() && !pendingImages.length)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '0.5px solid var(--border2)',
              background: 'var(--surface2)',
              fontSize: 13, color: 'var(--text)',
              cursor: sending || (!input.trim() && !pendingImages.length) ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              opacity: sending || (!input.trim() && !pendingImages.length) ? 0.35 : 1,
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

      {/* ── Studios column — desktop: 60% right column, mobile: full screen ── */}
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

      {/* ── Mobile: floating chat bubble + bottom drawer ── */}
      {splitView && sessionToken && (
        <>
          {/* Floating chat bubble — bottom right */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className="mobile-chat-fab"
            style={{
              display: 'none', // shown via media query below
              position: 'fixed', bottom: 20, right: 20,
              width: 52, height: 52, borderRadius: '50%',
              background: '#1A1612', border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              cursor: 'pointer', zIndex: 300,
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <style>{`
              @media (max-width: 767px) {
                .mobile-chat-fab { display: flex !important; }
                .chat-col { display: none !important; }
              }
            `}</style>
          </button>

          {/* Bottom drawer — slides up from bottom on mobile */}
          {chatOpen && (
            <>
              <div
                onClick={() => setChatOpen(false)}
                style={{
                  display: 'none',
                  position: 'fixed', inset: 0,
                  background: 'rgba(0,0,0,0.4)', zIndex: 301,
                }}
                className="mobile-drawer-backdrop"
              />
              <div
                className="mobile-chat-drawer"
                style={{
                  display: 'none',
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  height: '72vh',
                  background: 'var(--bg)',
                  borderRadius: '16px 16px 0 0',
                  zIndex: 302,
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'drawerUp 0.28s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
                }}
              >
                <style>{`
                  @keyframes drawerUp {
                    from { transform: translateY(100%); }
                    to   { transform: translateY(0); }
                  }
                  @media (max-width: 767px) {
                    .mobile-drawer-backdrop { display: block !important; }
                    .mobile-chat-drawer     { display: flex !important; }
                  }
                `}</style>

                {/* Drawer handle */}
                <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
                </div>

                {/* Reuse the chat column content inline */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px' }}>
                  <div style={{ maxWidth: 600, margin: '0 auto', padding: '8px 16px' }}>
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
                        attachedImages={msg.attachedImages}
                        highlightBrief={msg.hasBrief ? highlightBrief : false}
                      />
                    ))}
                  </div>
                </div>

                {/* Input bar inside drawer */}
                <div style={{
                  padding: '8px 12px 16px',
                  borderTop: '0.5px solid var(--border)',
                  display: 'flex', gap: 8, alignItems: 'flex-end',
                  background: 'var(--surface)', flexShrink: 0,
                }}>
                  <textarea
                    value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'; }}
                    onKeyDown={handleKey}
                    placeholder="Ask something…"
                    rows={1}
                    disabled={sending}
                    style={{
                      flex: 1, resize: 'none', padding: '8px 12px',
                      borderRadius: 8, border: '0.5px solid var(--border2)',
                      background: 'var(--surface2)', fontSize: 14,
                      color: 'var(--text)', fontFamily: 'var(--font-body)',
                      maxHeight: 80, outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={sending || !input.trim()}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      border: '0.5px solid var(--border2)',
                      background: 'var(--surface2)', fontSize: 13,
                      color: 'var(--text)', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                      opacity: sending || !input.trim() ? 0.35 : 1,
                      fontFamily: 'var(--font-body)', flexShrink: 0,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </>
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