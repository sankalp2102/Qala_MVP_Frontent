// src/pages/DiscoverV2.jsx
// V2 chat-based discovery page.
// Replaces the V1 questionnaire at /discover on the v2 branch.
//
// Flow:
//   1. Access key gate (anonymous users) or auto-start (logged-in)
//   2. Chat with Claude agent
//   3. When matching complete → BriefCard appears, StudiosPanel slides in

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../api/client';
import { Spinner } from '../components/Spinner';
import ChatMessage from '../components/discovery/ChatMessage';
import ImageUpload from '../components/discovery/ImageUpload';
import StudiosPanel from '../components/discovery/StudiosPanel';
import qalaLogo from '../assets/qala-logo.png';

// ── Session storage key (persist across page refresh) ─────────────────────
const CHAT_SESSION_KEY = 'qala_chat_session_id';

export default function DiscoverV2() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── State ──────────────────────────────────────────────────────────────
  const [phase, setPhase]             = useState('gate');     // gate | chat | matched
  const [accessKey, setAccessKey]     = useState('');
  const [keyError, setKeyError]       = useState('');
  const [sessionId, setSessionId]     = useState(null);
  const [messages, setMessages]       = useState([]);         // {role, content, showImages, sessionToken, extracted, attachedImage}
  const [input, setInput]             = useState('');
  const [pendingImage, setPendingImage] = useState(null);     // base64
  const [pendingImageIds, setPendingImageIds] = useState([]); // from InlineImageGrid
  const [sending, setSending]         = useState(false);
  const [starting, setStarting]       = useState(false);
  const [sessionToken, setSessionToken] = useState(null);     // BuyerProfile token
  const [extracted, setExtracted]     = useState({});
  const [showPanel, setShowPanel]     = useState(false);
  const [tokensRemaining, setTokensRemaining] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);

  // ── Scroll to bottom on new messages ──────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // ── Auto-start if user is logged in (no access key needed) ───────────
  useEffect(() => {
    if (user) startSession(null);
  }, [user]);

  // ── Resume session from localStorage on page load ─────────────────────
  useEffect(() => {
    const savedId = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (savedId && !user) {
      setSessionId(savedId);
      resumeSession(savedId);
    }
  }, []);

  // ── Resume an existing session ─────────────────────────────────────────
  async function resumeSession(id) {
    try {
      const res = await chatAPI.getSession(id);
      const data = res.data;
      const msgs = (data.messages || []).map(m => ({
        role:    m.role,
        content: m.content,
      }));
      setMessages(msgs);
      setExtracted(data.extracted || {});
      if (data.session_token) {
        setSessionToken(data.session_token);
        setPhase('matched');
      } else {
        setPhase('chat');
      }
      if (data.session?.tokens_remaining != null) {
        setTokensRemaining(data.session.tokens_remaining);
      }
    } catch {
      // Session expired or invalid — start fresh
      sessionStorage.removeItem(CHAT_SESSION_KEY);
      setPhase('gate');
    }
  }

  // ── Start a new session ────────────────────────────────────────────────
  async function startSession(key) {
    setStarting(true);
    setKeyError('');
    try {
      const res = await chatAPI.start(key || null);
      const data = res.data;
      const id = data.session?.session_id;
      setSessionId(id);
      sessionStorage.setItem(CHAT_SESSION_KEY, id);
      setMessages([{
        role:    'assistant',
        content: data.message,
      }]);
      setQuickReplies(data.quick_replies || []);
      setTokensRemaining(data.session?.tokens_remaining ?? null);
      setPhase('chat');
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid access key.';
      setKeyError(msg);
    } finally {
      setStarting(false);
    }
  }

  // ── Send a message ─────────────────────────────────────────────────────
  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed && !pendingImage) return;
    if (!sessionId || sending) return;

    // Append user message locally immediately
    const userMsg = {
      role:          'user',
      content:       trimmed,
      attachedImage: pendingImage,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setQuickReplies([]);
    const imageCopy   = pendingImage;
    const idsCopy     = pendingImageIds.length ? [...pendingImageIds] : null;
    setPendingImage(null);
    setPendingImageIds([]);

    setSending(true);
    try {
      const res = await chatAPI.sendMessage(
        sessionId, trimmed, imageCopy, idsCopy
      );
      const data = res.data;

      const aiMsg = {
        role:         'assistant',
        content:      data.message,
        showImages:   data.show_images?.length ? data.show_images : null,
        sessionToken: data.session_token || null,
        extracted:    data.session_token ? (data.extracted || extracted) : null,
      };
      setMessages(prev => [...prev, aiMsg]);
      setQuickReplies(data.quick_replies || []);

      if (data.session?.tokens_remaining != null) {
        setTokensRemaining(data.session.tokens_remaining);
      }

      if (data.session_token) {
        setSessionToken(data.session_token);
        setPhase('matched');
        // Auto-open studios panel after short delay
        setTimeout(() => setShowPanel(true), 600);
      }

      if (data.extracted) {
        setExtracted(prev => ({ ...prev, ...data.extracted }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: errMsg,
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleImageSelected(base64) {
    setPendingImage(base64);
  }

  function handleImageIdsSelected(ids) {
    setPendingImageIds(ids);
  }

  // ── Render: access key gate ────────────────────────────────────────────
  if (phase === 'gate') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '40px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <img src={qalaLogo} alt="Qala" style={{ height: 24, width: 'auto' }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28, fontWeight: 500,
            color: 'var(--text)', marginBottom: 8,
            textAlign: 'center',
          }}>
            Find your studio
          </h1>
          <p style={{
            fontSize: 14, color: 'var(--text3)', lineHeight: 1.6,
            textAlign: 'center', marginBottom: 28,
          }}>
            Tell us what you want to make and we'll match you with the right craft studio.
          </p>

          <div className="field" style={{ marginBottom: 16 }}>
            <label>Access Key</label>
            <input
              type="text"
              value={accessKey}
              onChange={e => { setAccessKey(e.target.value); setKeyError(''); }}
              onKeyDown={e => e.key === 'Enter' && startSession(accessKey)}
              placeholder="QALA-XXXX-XXX"
              autoFocus
              style={{
                padding: '12px 16px',
                border: keyError ? '1.5px solid var(--red)' : '1.5px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                outline: 'none',
                width: '100%',
                transition: 'border-color 0.18s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = keyError ? 'var(--red)' : 'var(--border)'; }}
            />
            {keyError && (
              <span style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                {keyError}
              </span>
            )}
          </div>

          <button
            onClick={() => startSession(accessKey)}
            disabled={!accessKey.trim() || starting}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {starting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Starting…</> : 'Start →'}
          </button>

          <p style={{
            fontSize: 11, color: 'var(--text4)', textAlign: 'center',
            marginTop: 16, lineHeight: 1.5,
          }}>
            Don't have a key?{' '}
            <a href="mailto:hello@qala.studio" style={{ color: 'var(--text3)' }}>
              Contact us
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Render: chat ───────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <img src={qalaLogo} alt="Qala" style={{ height: 20, width: 'auto' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tokensRemaining != null && (
            <div style={{
              fontSize: 11, color: 'var(--text4)',
              background: 'var(--surface2)',
              padding: '4px 10px', borderRadius: 20,
              border: '1px solid var(--border)',
            }}>
              {(tokensRemaining / 1000).toFixed(0)}k tokens left
            </div>
          )}
          {phase === 'matched' && (
            <button
              onClick={() => setShowPanel(true)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                background: '#1A1612', color: '#F5F0E8',
                border: 'none', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.05em', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#C46E49'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; }}
            >
              View Studios →
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '24px 20px',
        display: 'flex', flexDirection: 'column', gap: 20,
        maxWidth: 680, width: '100%', margin: '0 auto', alignSelf: 'center',
        boxSizing: 'border-box',
      }}>
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            showImages={msg.showImages}
            sessionToken={msg.sessionToken}
            extracted={msg.extracted || extracted}
            onImageSelect={handleImageIdsSelected}
            attachedImage={msg.attachedImage}
          />
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '4px 16px 16px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--text4)',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !sending && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          padding: '0 20px 12px',
          maxWidth: 680, width: '100%', margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          {quickReplies.map((r, i) => (
            <button
              key={i}
              onClick={() => sendMessage(r)}
              className="chip"
              style={{ fontSize: 13 }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Pending image preview */}
      {pendingImage && (
        <div style={{
          padding: '0 20px 8px',
          maxWidth: 680, width: '100%', margin: '0 auto',
          boxSizing: 'border-box',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 10px',
          }}>
            <img
              src={`data:image/jpeg;base64,${pendingImage}`}
              alt="Preview"
              style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 4 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Image attached</span>
            <button
              onClick={() => setPendingImage(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', fontSize: 16, padding: '0 2px',
                lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <ImageUpload
            onImage={handleImageSelected}
            disabled={sending}
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to make…"
            rows={1}
            disabled={sending}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              minHeight: 44,
              maxHeight: 120,
              overflowY: 'auto',
              transition: 'border-color 0.18s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />

          <button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !pendingImage) || sending}
            style={{
              width: 44, height: 44, borderRadius: 10,
              background: (!input.trim() && !pendingImage) || sending
                ? 'var(--surface2)' : '#1A1612',
              color: (!input.trim() && !pendingImage) || sending
                ? 'var(--text4)' : '#F5F0E8',
              border: '1.5px solid var(--border)',
              cursor: (!input.trim() && !pendingImage) || sending
                ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.18s, color 0.18s, border-color 0.18s',
            }}
          >
            {sending ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>

        <p style={{
          fontSize: 10, color: 'var(--text4)', textAlign: 'center',
          marginTop: 8, letterSpacing: '0.04em',
        }}>
          Press Enter to send · Shift+Enter for new line · Attach images with 📎
        </p>
      </div>

      {/* Studios panel */}
      {showPanel && sessionToken && (
        <StudiosPanel
          sessionToken={sessionToken}
          onClose={() => setShowPanel(false)}
          buyerSummary={extracted}
        />
      )}

      {/* Bounce animation for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%           { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}