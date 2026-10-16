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
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI, discoveryAPI } from '../api/client';
import ChatMessage from '../components/discovery/ChatMessage';
import QalawatiAvatar from '../components/discovery/QalawatiAvatar';
import ImageUpload from '../components/discovery/ImageUpload';
import StudiosPanel from '../components/discovery/StudiosPanel';
import QalawatiIntro, { QUICK_START_CHIPS } from '../components/discovery/QalawatiIntro';
import ReferenceCards, { isReferenceChipSet } from '../components/discovery/ReferenceCards';
import UploadDropzone from '../components/discovery/UploadDropzone';
import { CHECKLIST_STEPS } from '../components/discovery/MatchingChecklist';
import qalaLogo   from '../assets/qala-logo.png';
import UserAvatar from '../components/UserAvatar';
 
const CHAT_SESSION_KEY   = 'qala_chat_session_id';
const LANDING_FIRST_MSG  = 'qala_landing_first_msg';
const LANDING_FIRST_IMG  = 'qala_landing_first_img';
const LANDING_FIRST_MIME = 'qala_landing_first_mime';

// Bug fix (Oct 2026) — "back from a studio profile lands on the empty
// Qalawati welcome screen" / "wrong scroll position, should land on the
// matches." Root cause: /discover and /studio/:id are separate top-level
// routes (see App.jsx), so every trip to a studio profile and back fully
// UNMOUNTS this component. Coming back was relying entirely on
// resumeSession()'s network round-trip to rebuild phase/messages/splitView/
// chips/sessionToken/extracted from scratch — so for as long as that fetch
// is in flight (and on any hiccup along the way) the buyer saw whatever the
// synchronous initial state computed, which was the bare 'gate'/'loading'
// screen, not their actual in-progress conversation or match results.
//
// Fix: mirror the live chat UI state into sessionStorage as it changes, and
// hydrate the component's initial state SYNCHRONOUSLY from that cache on
// mount (read in the useState initializers below, before first paint) —
// the server fetch in resumeSession() still runs in the background and is
// still the authoritative source once it resolves, but the buyer is never
// shown a blank/reset screen while waiting for it.
const UI_CACHE_KEY = 'qala_chat_ui_cache';

function _readUiCache() {
  try {
    const raw = sessionStorage.getItem(UI_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    // Only trust the cache if it's for the session sessionStorage currently
    // points at — a different/newer session id means this cache is stale
    // (e.g. a brand new passcode entered in the same tab) and must not be
    // used to paint someone else's conversation.
    if (!cache || cache.sessionId !== sessionStorage.getItem(CHAT_SESSION_KEY)) return null;
    if (cache.phase !== 'chat' && cache.phase !== 'matched') return null;
    if (!Array.isArray(cache.messages) || cache.messages.length === 0) return null;
    return cache;
  } catch {
    return null;
  }
}

function _writeUiCache(snapshot) {
  try {
    sessionStorage.setItem(UI_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort only (private mode, quota, etc.) — never block the UI on this.
  }
}

// ── Chip parser — reads [CHIPS: A | B | C] from Claude text ─────────────────
function parseChips(text) {
  if (!text) return [];
  const m = text.match(/\[CHIPS:\s*([^\]]+)\]/);
  return m ? m[1].split('|').map(s => s.trim()).filter(Boolean) : [];
}

// Reads mechanics.py's [SKIPPABLE]/[REQUIRED] tag (see qalawati/mechanics.py's
// "SKIP TAG FORMAT" block) off the end of a Stage 3 question — tells us
// whether the Skip button should show for whatever question Qalawati just
// asked. Returns null when neither tag is present (OPENING, brief, upload/
// scratch intros, post-match — none of those are a numbered question).
function parseSkippable(text) {
  if (!text) return null;
  if (/\[SKIPPABLE\]/.test(text)) return true;
  if (/\[REQUIRED\]/.test(text)) return false;
  return null;
}

const MATCH_SUMMARY_CHIPS = ['Tell me more about these studios', 'I want to connect with one', 'Show me more studios', "I don't see what I'm looking for"];

// Bug fix (Aug 2026): the match-summary message shown right after Find
// Studios completes is built entirely client-side (from the recommendations
// endpoint, not from Claude) and was never saved to the backend — so it only
// ever existed in this component's React state. The moment a buyer navigated
// away (e.g. "View Profile →" to a studio's full page, a real route change
// that unmounts this component) and came back, resumeSession() rebuilt
// `messages` purely from session.messages in the DB — which never had this
// message — and it silently vanished, even though matching had genuinely
// completed and the studios were still showing on the right. Extracted here
// (unchanged logic) so both handleMatchComplete (the first time) and
// resumeSession (every time after) build the exact same message from the
// same source data.
//
// Bug fix (Oct 2026) — "remove the numbered list of 3 studios from the chat
// panel, the right panel already shows them": this used to repeat every
// studio's name, location, crafts and fabrics as a numbered list in the chat
// bubble, duplicating exactly what StudiosPanel already renders on the
// right. Now it's the one closing line only — `recs` is kept as a parameter
// (still needed by callers to know matching actually produced results) but
// is no longer read for content.
function buildMatchSummaryMessage(recs) {
  return {
    role: 'assistant',
    content: 'Would you like help deciding between them, or are you happy to browse?',
    hasBrief: false,
  };
}

// Re-fetches the same recommendations handleMatchComplete used, and
// re-derives the identical summary message from them — best-effort, never
// throws, since a resume must never hard-fail just because this
// reconstruction couldn't complete.
async function fetchMatchSummaryMessage(token) {
  try {
    const res = await discoveryAPI.getRecommendations(token);
    if (res.data?.status !== 'ok' || !res.data?.recommendations?.length) return null;
    const recs = res.data.recommendations
      .filter(r => !r.is_bonus_visual)
      .sort((a, b) => (a.rank_position ?? 99) - (b.rank_position ?? 99))
      .slice(0, 3);
    if (recs.length === 0) return null;
    return buildMatchSummaryMessage(recs);
  } catch {
    return null;
  }
}
 
export default function DiscoverV2() {
  const { user, loginWithAccessKey, loading: authLoading } = useAuth();
  const navigate  = useNavigate();
  const bottomRef      = useRef(null);
  const drawerBottomRef = useRef(null);
  const taRef     = useRef(null);
  const resumeIdRef = useRef(null);   // last session id resumeSession() tried — see its catch block
 
  // ── State ─────────────────────────────────────────────────────────────────
  // Determine initial phase synchronously — never flash the gate for users
  // who are already authenticated or coming from the landing page.
  const hasLandingMsg = !!(sessionStorage.getItem(LANDING_FIRST_MSG) || sessionStorage.getItem(LANDING_FIRST_IMG));
  const hasLandingSession = !!sessionStorage.getItem(CHAT_SESSION_KEY);
  // Read once per mount — used by several initializers below so the first
  // paint already reflects an in-progress conversation (see UI_CACHE_KEY note
  // above) instead of flashing the gate/greeting while resumeSession() fetches.
  const _cache = _readUiCache();
  function _initPhase() {
    if (_cache)                              return _cache.phase;
    if (hasLandingMsg)                       return 'loading';
    if (hasLandingSession)                   return 'loading';
    if (localStorage.getItem('qala_token'))  return 'loading';
    return 'gate';
  }
  const [phase, setPhase] = useState(_initPhase);
  // Stage 1 welcome screen's own input — kept separate from the main chat
  // `input` state below so the two screens never cross-wire.
  const [welcomeInput, setWelcomeInput] = useState('');
  const [welcomeIntroDone, setWelcomeIntroDone] = useState(false);
  const [accessKey, setAccessKey]       = useState('');
  const [keyError, setKeyError]         = useState('');
  const [sessionId, setSessionId]       = useState(() => _cache?.sessionId ?? null);
  const [messages, setMessages]         = useState(() => _cache?.messages ?? []);
  const [input, setInput]               = useState('');
  const [pendingImages,  setPendingImages]  = useState([]);   // [{data: base64, mime, name}]
  // Stage 2's upload dropzone (qala-brief-spec.docx Section 4) — opened
  // after an upload-path reference card is picked, closed again once the
  // buyer continues past it (with files) or just types a description instead.
  const [uploadZoneOpen, setUploadZoneOpen] = useState(false);
  // Whether Qalawati's current question is skippable — drives the Skip
  // button (see parseSkippable above). null = no numbered question is
  // active right now (opening, brief, post-match, etc.) — no Skip button.
  const [currentSkippable, setCurrentSkippable] = useState(null);
  // Index of the single most-recently-streamed-in assistant message — the
  // only one allowed to play the char-by-char typing animation. Historical
  // messages (resumed sessions, Landing's pre-seeded intro) never set this,
  // so they render instantly instead of re-typing on every reload.
  const [freshAiIndex, setFreshAiIndex] = useState(null);
  const [briefImages,    setBriefImages]    = useState(() => _cache?.briefImages ?? []);   // images from last user msg before brief
  const [skipContactForm, setSkipContactForm] = useState(
    () => _cache?.skipContactForm ?? (localStorage.getItem('qala_has_contact') === 'true')
  );
  const [sending, setSending]           = useState(false);
  // Bug fix (Aug 2026) — "can we stop Qalawati from processing, feels
  // like I have no control": there was no way to cancel an in-flight
  // message send at all — sendMessage() guarded with
  // `if (!sessionId || sending) return`, so while a response was
  // pending, every other action (typing something else, clicking
  // anything) just silently did nothing. Combined with no request
  // timeout on the API layer, a genuinely slow response (the Voyage
  // rate limiter waiting on a chat message's RAG lookup — fixed
  // separately on the backend, see embeddings.py's
  // QUERY_MAX_WAIT_SECONDS) could leave someone staring at "..." with
  // no way out at all. sendAbortRef holds the AbortController for the
  // current in-flight request so the Stop button (in the input area
  // below) can actually cancel it.
  const sendAbortRef                     = useRef(null);
  const [starting, setStarting]         = useState(false);
  const [sessionToken, setSessionToken] = useState(() => _cache?.sessionToken ?? null);
  const [extracted, setExtracted]       = useState(() => _cache?.extracted ?? {});
  const [showPanel, setShowPanel]       = useState(false);
  const [chips, setChips]               = useState(() => _cache?.chips ?? []);
  const [splitView, setSplitView]       = useState(() => _cache?.splitView ?? false);
  const [chatOpen, setChatOpen]         = useState(false); // mobile chat drawer
  const [drawerTranslate, setDrawerTranslate] = useState(0); // swipe-down tracking
  const touchStartY   = useRef(null);
  const touchCurrentY = useRef(null);
  const [highlightBrief, setHighlightBrief] = useState(false);
  const [keyUsedEmail, setKeyUsedEmail]       = useState(null); // set when anon key accepted
 
  // ── Scroll on new messages ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Bug fix (Oct 2026) — keep the UI-state cache (see UI_CACHE_KEY above) in
  // sync so a remount (e.g. returning from a studio profile) can hydrate its
  // very first paint from here instead of showing a blank/reset screen while
  // resumeSession()'s network fetch is still in flight. Only written once
  // there's a real, resumable conversation on screen — never during
  // 'gate'/'loading'/'error'/'resume-error', so a transient state never
  // overwrites a good cached one.
  useEffect(() => {
    if ((phase !== 'chat' && phase !== 'matched') || !sessionId || messages.length === 0) return;
    _writeUiCache({
      sessionId, phase, splitView, messages, chips,
      sessionToken, extracted, briefImages, skipContactForm,
    });
  }, [sessionId, phase, splitView, messages, chips, sessionToken, extracted, briefImages, skipContactForm]);

  // Bug fix (Oct 2026) — "wrong scroll position returning from a studio
  // profile, should land on the matches, not below them." Both the chat
  // column and the studios column manage their own internal scroll
  // (overflow: hidden on the shared root, overflowY: auto on each column
  // individually) and neither carries a stale position across a remount —
  // but the browser's own native scroll-restoration can still apply a
  // leftover window.scrollY from history when navigating back, on top of
  // that. Force it to a known, empty state so there's nothing left for the
  // browser to "restore" out from under the two internal scroll areas.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // Bug fix (Aug 2026): abort any in-flight send if the component
  // unmounts (navigating away mid-response) — otherwise the request
  // keeps running to completion in the background for no reason, and a
  // late setState from its .then()/.catch() against an unmounted
  // component is exactly the kind of thing that produces a confusing
  // React warning with no obvious cause.
  useEffect(() => () => sendAbortRef.current?.abort(), []);
 
  // Scroll drawer to bottom when it opens
  useEffect(() => {
    if (chatOpen) {
      setDrawerTranslate(0);
      setTimeout(() => {
        drawerBottomRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 320); // after drawer slide-up animation
    }
  }, [chatOpen]);
 
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

        // Bug fix: this used to be an unconditional setMessages([]) —
        // getSession's real prior history (data.messages) was fetched but
        // never used. For a brand-new session that's harmless (nothing to
        // lose), but for a returning buyer reusing their passcode, this
        // silently discarded their entire real conversation and replaced
        // it with just the new message — indistinguishable from the chat
        // having reset to brand new, which is exactly what was reported.
        const resumed = (data.messages || []).map(m => ({
          role:           m.role,
          content:        m.content,
          hasBrief:       typeof m.content === 'string' &&
                          m.content.includes('BRIEF_START') &&
                          m.content.includes('BRIEF_END'),
          attachedImages: m.images || [],
        }));
        // The one case still worth skipping: a genuinely fresh session
        // whose only "history" is the single default opening line nobody's
        // replied to yet — Landing's own intro screen already greeted them,
        // showing that generic welcome again here would just be redundant.
        // Anything with real back-and-forth (more than one message, or a
        // user message present) is real history and must never be dropped.
        const isJustDefaultWelcome = resumed.length <= 1 && resumed[0]?.role !== 'user';

        setSessionId(savedId);
        setMessages(isJustDefaultWelcome ? [] : resumed);
        setPhase('chat');
        // Same gap as messages above — resumeSession() restores these,
        // this path never did, so a returning buyer's brief progress and
        // reference images silently vanished too.
        if (!isJustDefaultWelcome) {
          const lastWithImages = [...resumed].reverse().find(m => m.role === 'user' && m.attachedImages?.length);
          if (lastWithImages) setBriefImages(lastWithImages.attachedImages);
          setExtracted(data.extracted || {});
        }
        // Now send the first message with optional image
        if (firstMsg || firstImg) {
          // Bug fix (Aug 2026): this sent the raw base64 STRING directly
          // as `images` — chatAPI.sendMessage's `images` param is meant
          // to be an ARRAY of {data, mime, name} objects (see the regular
          // in-chat sendMessage() below, which correctly passes
          // pendingImages as that array). A bare string still has a
          // `.length` (its character count), so the client-side "is
          // there an image" check passed anyway — but the backend's
          // `for img in images_raw:` then iterated the string CHARACTER
          // BY CHARACTER, and `img.get('data')` on a single character
          // threw an AttributeError. Every first message with an image
          // hit this and failed outright; a first message with text only
          // never touched this path and always worked — exactly the
          // reported symptom. Wrapped into the same array shape the
          // working path already uses.
          const imgArray = firstImg ? [{ data: firstImg, mime: firstMime || 'image/jpeg', name: 'image' }] : null;
          const userMsg = {
            role: 'user', content: firstMsg || '',
            attachedImages: imgArray || [],
          };
          setMessages(prev => [...prev, userMsg]);
          setSending(true);
          try {
            const r    = await chatAPI.sendMessage(savedId, firstMsg || '', imgArray);
            const d    = r.data;
            const aiMsg = { role: 'assistant', content: d.message, hasBrief: d.has_brief || false };
            setMessages(prev => [...prev, aiMsg]);
            setChips(parseChips(d.message) || d.quick_replies || []);
          } catch {
            // Bug fix (Oct 2026) — same "chat restarts on any error" class
            // of bug as resumeSession()'s catch below. By this point the
            // real resumed history is already on screen (setMessages(resumed)
            // ran above) — a failure sending just this one follow-up
            // message must not fall through to the outer catch's
            // setPhase('gate'), which would wipe an already-successfully-
            // loaded real conversation off the screen over a single failed
            // send. Show it as an inline error instead, same as the regular
            // sendMessage() flow does, and stay on 'chat'.
            setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong sending that — please try again.' }]);
          } finally {
            setSending(false);
          }
        }
      } catch {
        // Only reached if chatAPI.getSession(savedId) itself failed, before
        // anything was ever shown — nothing real is on screen yet to lose,
        // so falling back to the gate here is a genuine fresh start, not a
        // silent wipe of an in-progress conversation.
        setPhase('gate');
      }
    })();
  }, []);
 
  // ── Resume session from sessionStorage ───────────────────────────────────
  // Skip if Landing pre-loaded a first message — that effect handles it.
  // Bug fix: this used to also skip `if (user) return`, on the assumption
  // the auth-effect above would handle logged-in users instead. It doesn't
  // — that effect explicitly bails whenever hasLandingSession is true,
  // deferring to "the landing flow." Each effect assumed the other had it
  // covered, so a logged-in buyer with a saved session (exactly this
  // scenario: came from Landing, already has an account, navigates to a
  // studio profile and back) hit neither path — resumeSession() (and the
  // chip-restoration fix inside it) never actually ran.
  useEffect(() => {
    if (hasLandingMsg) return;
    const saved = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (saved) resumeSession(saved);
  }, []);
 
  // ── Resume ────────────────────────────────────────────────────────────────
  // Bug fix (Oct 2026) — "Qalawati is restarting the chat if there is any
  // error." The old catch below unconditionally did
  // sessionStorage.removeItem(CHAT_SESSION_KEY) + setPhase('gate') the
  // moment ANYTHING in this function threw — a transient network blip or a
  // one-off 500 from chatAPI.getSession (or even fetchMatchSummaryMessage
  // further down) looked, from the buyer's side, exactly like their whole
  // conversation had been wiped: dumped back to the "enter your access
  // code" gate with no messages on screen. The real ChatSession and its
  // full message history were never actually touched server-side — this
  // was purely the frontend throwing away its only reference to it. Now:
  // retry once after a short pause (covers the common transient case
  // invisibly), and only on a second failure fall back to a dedicated
  // "couldn't load, try again" state that still remembers which session to
  // retry and never deletes it from storage — so a real retry (or a page
  // refresh) still finds and resumes the exact same conversation, instead
  // of forcing the buyer to re-enter a code and start over.
  async function resumeSession(id, isRetry = false) {
    resumeIdRef.current = id;
    try {
      const res  = await chatAPI.getSession(id);
      const data = res.data;
      setSessionId(id);
      const resumed = (data.messages || []).map(m => ({
        role:           m.role,
        content:        m.content,
        // Restore hasBrief by detecting BRIEF_START in stored content
        hasBrief:       typeof m.content === 'string' &&
                        m.content.includes('BRIEF_START') &&
                        m.content.includes('BRIEF_END'),
        // Restore images stored in DB — survives page refresh
        attachedImages: m.images || [],
      }));

      // Reconstruct the match-summary message (see buildMatchSummaryMessage
      // above) when matching completed for this session but the summary
      // isn't part of the real transcript — true for every session today,
      // since it was never persisted. Inserted right after the last
      // hasBrief message: that's always where it originally appeared, and
      // anything the buyer said/heard AFTER matching (a real, persisted
      // message) has to stay after it, not get pushed behind it.
      let withSummary = resumed;
      let insertedSummaryAtEnd = false;
      if (data.session_token) {
        const alreadyPresent = resumed.some(
          m => typeof m.content === 'string' &&
               m.content.startsWith('Would you like help deciding between them')
        );
        if (!alreadyPresent) {
          const summaryMsg = await fetchMatchSummaryMessage(data.session_token);
          if (summaryMsg) {
            let insertAt = resumed.length;
            for (let i = resumed.length - 1; i >= 0; i--) {
              if (resumed[i].hasBrief) { insertAt = i + 1; break; }
            }
            withSummary = resumed.slice();
            withSummary.splice(insertAt, 0, summaryMsg);
            insertedSummaryAtEnd = insertAt === resumed.length;
          }
        }
      }
      setMessages(withSummary);

      // Bug fix: chips were never restored here at all — resumeSession
      // rehydrates messages/extracted/images/phase but had no setChips call,
      // so navigating away (e.g. opening a studio profile) and back always
      // came back to an empty suggested-replies row, even though the same
      // chips would still be valid for the last message. Same rule as
      // everywhere else in this file: no chips once a brief card is showing,
      // since the card has its own CTAs.
      const lastMsg = withSummary[withSummary.length - 1];
      if (insertedSummaryAtEnd) {
        // The reconstructed summary IS the last message — same chips
        // handleMatchComplete shows the first time matching completes.
        setChips(MATCH_SUMMARY_CHIPS);
      } else if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.hasBrief) {
        setChips(parseChips(lastMsg.content));
      } else {
        setChips([]);
      }
 
      // Restore briefImages from the last user message that had images
      const lastWithImages = [...resumed].reverse().find(m => m.role === 'user' && m.attachedImages?.length);
      if (lastWithImages) setBriefImages(lastWithImages.attachedImages);
      setExtracted(data.extracted || {});

      // Bug fix: same class of issue as chips above — this never corrected
      // skipContactForm against the CURRENT session's real state, only
      // ever trusting whatever was cached in qala_has_contact from
      // whichever session last wrote to it (possibly a different one
      // entirely). Now that the backend actually returns has_contact here
      // (see ChatSessionView), sync against it every time a session loads.
      if (data.has_contact) {
        localStorage.setItem('qala_has_contact', 'true');
        setSkipContactForm(true);
      } else {
        localStorage.removeItem('qala_has_contact');
        setSkipContactForm(false);
      }
      if (data.session_token) {
        setSessionToken(data.session_token);
        setPhase('matched');
        setSplitView(true);
      } else {
        setPhase('chat');
      }
    } catch {
      if (!isRetry) {
        // One silent retry after a short pause — absorbs the common
        // transient blip without the buyer ever seeing anything happen.
        await new Promise(r => setTimeout(r, 1200));
        return resumeSession(id, true);
      }
      // Still failing after a retry: don't touch CHAT_SESSION_KEY (the real
      // session is untouched and still there to resume) and don't force the
      // gate — show a small "couldn't load, try again" state instead that
      // keeps the same session id in reach.
      setPhase('resume-error');
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
 
      // Bug fix: this used to only ever handle the `true` case, meaning
      // skipContactForm could get stuck true forever from a stale
      // `qala_has_contact` flag left over from a completely different
      // earlier session on this browser (e.g. testing multiple passcodes)
      // — nothing ever corrected it back to false for a session whose real
      // backend state says contact details are NOT actually on file. That
      // silently skipped the Find Studios contact-form popup for buyers
      // who genuinely needed to see it.
      if (data.has_contact) {
        localStorage.setItem('qala_has_contact', 'true');
        setSkipContactForm(true);
      } else {
        localStorage.removeItem('qala_has_contact');
        setSkipContactForm(false);
      }
 
      // Resume previous session if one exists for this key
      if (data.existing_session_id) {
        sessionStorage.setItem(CHAT_SESSION_KEY, data.existing_session_id);
        await resumeSession(data.existing_session_id);
        return;
      }
 
      // Spec addition (qala-brief-spec.docx, Stage 1): a brand-new session
      // now gets its own welcome capture — avatar + typed lines + the
      // buyer's own open-ended input + 5 idea chips — BEFORE the existing
      // canned "Where are you starting from?" opener. We deliberately don't
      // seed `messages`/`chips` from data.message here: once the buyer
      // submits their idea, the normal sendMessage() flow below sends it
      // as their real first turn, and the backend's own next reply (which
      // already follows mechanics.py's OPENING instruction to ask about
      // references) arrives naturally — no need to hand-splice the canned
      // opener in as a fake extra bubble.
      setPhase('welcome');
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
  async function sendMessage(text, overrideImages) {
    const rawText = (text || input).trim();
    const effectiveImages = overrideImages || pendingImages;
    if (!rawText && !effectiveImages.length) return;
    // Use 'IMAGE' as default message when only images are sent (no text)
    const trimmed = rawText || (effectiveImages.length ? 'IMAGE' : '');
    if (!sessionId || sending) return;
    // Any real message closes the upload dropzone — whether the buyer
    // continued past it with files, or typed a description instead.
    if (uploadZoneOpen) setUploadZoneOpen(false);
 
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
 
    const imgsCopy = effectiveImages.slice();
 
    // Append user message to local state immediately
    const userMsg = {
      role:          'user',
      // Don't show 'IMAGE' placeholder text in the chat bubble
      content:       trimmed === 'IMAGE' ? '' : trimmed,
      attachedImages: imgsCopy,
    };
    // Track images for the brief card — kept until a new brief is generated
    if (imgsCopy.length) setBriefImages(imgsCopy);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChips([]);
    setPendingImages([]);
 
    // Resize textarea
    if (taRef.current) {
      taRef.current.style.height = 'auto';
    }
 
    setSending(true);
    const controller = new AbortController();
    sendAbortRef.current = controller;
    try {
      const res  = await chatAPI.sendMessage(
        sessionId, trimmed,
        imgsCopy.length ? imgsCopy : null,
        null, controller.signal
      );
      const data = res.data;
 
      const aiMsg = {
        role:         'assistant',
        content:      data.message,
        hasBrief:         data.has_brief || false,
        sessionToken:     data.session_token || null,
        // Attach the images from the conversation to the brief card
        referenceImages:  data.has_brief ? briefImages : [],
      };
      setMessages(prev => {
        const next = [...prev, aiMsg];
        setFreshAiIndex(next.length - 1); // only this one plays the typing animation
        return next;
      });
      // Don't show chips when brief card is present — card has its own CTAs
      if (!data.has_brief) {
        setChips(parseChips(data.message) || data.quick_replies || []);
      } else {
        setChips([]);
      }
      setCurrentSkippable(data.has_brief ? null : parseSkippable(data.message));
 
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
      // Bug fix (Aug 2026): a user-initiated Stop click surfaces here as
      // a cancellation, not a real failure — axios.isCancel() (or the
      // newer AbortController-driven err.code, depending on axios
      // version) is how to tell the two apart. Showing "Something went
      // wrong" for a stop the person asked for would be actively
      // confusing — they know why it stopped, they don't need to be
      // told it's broken. Silently remove their own message instead,
      // as if it was never sent, so they can just try something else.
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessages(prev => prev.slice(0, -1));
      } else {
        const errText = err.response?.data?.error
          || (err.code === 'ECONNABORTED' ? "That's taking longer than expected — please try again." : null)
          || 'Something went wrong — please try again.';
        setMessages(prev => [...prev, { role: 'assistant', content: errText }]);
      }
    } finally {
      sendAbortRef.current = null;
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  // Bug fix (Aug 2026): the actual fix for "feels like I have no
  // control" — lets the person cancel an in-flight message send instead
  // of being stuck watching "..." with no way out. Aborting the request
  // is enough on its own; the catch block above (axios.isCancel) handles
  // cleanup — removing the optimistically-added user message and
  // resetting `sending` — so this only needs to fire the abort itself.
  function stopSending() {
    sendAbortRef.current?.abort();
  }

  // ── Welcome capture (Stage 1) → first real message ──────────────────────
  // Called from the new welcome screen's input or one of its 5 idea chips.
  // Flips straight into the normal 'chat' phase and reuses sendMessage() as-
  // is — the buyer's idea becomes their real first turn, same pipeline as
  // every message after it.
  function handleWelcomeSubmit(text) {
    const val = (text || '').trim();
    if (!val) return;
    setPhase('chat');
    sendMessage(val);
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
 
  // Called from Brief.jsx the moment contact details are confirmed (or
  // immediately, if already on file) — this now owns the ENTIRE match
  // sequence: firing chatAPI.match, polling for recommendations, AND the
  // progress animation while that happens. Two things this fixes vs. the
  // old split (Brief.jsx ran its own ~4.2s checklist in a modal, then
  // handed off to this function which did a SEPARATE, invisible poll
  // afterward): (1) the "Finding your studios…" progress now renders as an
  // actual Qalawati chat message (via ChatMessage's matchingStep prop),
  // not a box inside the brief card; (2) there's exactly one wait, run
  // concurrently with the real request, so the animation only ever ends
  // once results are already in hand — no more silent gap after it closes.
  async function handleMatchComplete(sid) {
    // Append the "finding your studios" bubble as a real Qalawati message —
    // ChatMessage renders `matchingStep` as the MatchingChecklist animation.
    let matchMsgIndex = -1;
    setMessages(prev => {
      const next = [...prev, { role: 'assistant', matchingStep: 0 }];
      matchMsgIndex = next.length - 1;
      return next;
    });

    // Cosmetic step-ticking so the checklist visibly progresses while the
    // real work runs — capped one step short of "done", which is only ever
    // reached once results genuinely arrive, below.
    const tick = setInterval(() => {
      setMessages(prev => prev.map((m, i) => (
        i === matchMsgIndex && m.matchingStep != null
          ? { ...m, matchingStep: Math.min(m.matchingStep + 1, CHECKLIST_STEPS.length - 2) }
          : m
      )));
    }, 700);

    async function doMatch() {
      let token = null;
      try {
        const res = await chatAPI.match(sid);
        token = res.data?.session_token || null;
      } catch {
        // fall through to the real-state check below
      }
      if (!token) {
        // Bug fix (Sep 2026), preserved: a dropped match response doesn't
        // always mean matching failed — the backend can have genuinely
        // completed it anyway. Check the session's real state before
        // giving up, same as the old proceedToMatch() in Brief.jsx did.
        const real = await chatAPI.getSession(sid).catch(() => null);
        token = real?.data?.session_token || null;
      }
      if (!token) return { token: null, recs: [] };

      discoveryAPI.saveSession(token);

      // Poll until matching_complete=true (backend returns status:'ok' with
      // data). Retries up to 6 times with 1s between — handles the race
      // where ChatMatchView returns the session_token before run_matching
      // has finished writing all StudioRecommendation rows to the DB.
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
      return { token, recs };
    }

    // A short floor so the checklist gets to visibly tick a couple of
    // steps even when the backend is fast — runs CONCURRENTLY with the
    // real work, never after it, so there's no dead time once it's ready.
    const minWait = new Promise(r => setTimeout(r, 1800));
    const [, { token, recs }] = await Promise.all([minWait, doMatch()]);

    clearInterval(tick);

    if (!token) {
      setMessages(prev => prev.map((m, i) => (
        i === matchMsgIndex
          ? { role: 'assistant', content: "I couldn't find a match just now — want to adjust the brief and try again?" }
          : m
      )));
      return;
    }

    if (recs.length === 0) {
      // Matched, but nothing to summarise yet — drop the animation bubble
      // and open the panel anyway; StudiosPanel does its own fetch too and
      // may still find something.
      setMessages(prev => prev.filter((_, i) => i !== matchMsgIndex));
      setSessionToken(token);
      setPhase('matched');
      setSplitView(true);
      return;
    }

    // Preload hero images in background
    recs.forEach(r => {
      const url = r.hero_images?.[0]?.url;
      if (url) {
        const img = new Image();
        img.src = url.startsWith('http') ? url
          : `${import.meta.env.VITE_API_URL || 'https://api.qala.studio'}${url}`;
      }
    });

    // Replace the animation bubble with the real summary IN THE SAME SLOT —
    // this is the "animation ends exactly when results appear" fix: there's
    // no separate append-after-the-fact, the bubble just becomes the result.
    const summaryMsg = buildMatchSummaryMessage(recs);
    setMessages(prev => {
      const next = prev.slice();
      next[matchMsgIndex] = summaryMsg;
      return next;
    });
    setChips(MATCH_SUMMARY_CHIPS);
    setSessionToken(token);
    setPhase('matched');
    setSplitView(true);
  }
 
  // ── WELCOME (Stage 1) ─────────────────────────────────────────────────────
  // Shown once, right after a brand-new session starts — before the real
  // chat begins. Typed welcome lines, then the buyer's own open-ended input
  // plus 5 idea chips fade in. Submitting either sends the real first
  // message via handleWelcomeSubmit (see above) and moves into normal chat.
  if (phase === 'welcome') {
    const canSend = welcomeInput.trim().length > 0;
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '0 22px', height: 60,
          borderBottom: '0.5px solid var(--border-warm)', flexShrink: 0, background: '#fff',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--ink-warm)' }}>
            Qala
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <QalawatiIntro onComplete={() => setWelcomeIntroDone(true)} />

          <div style={{
            width: '100%', maxWidth: 480, margin: '10px auto 0',
            opacity: welcomeIntroDone ? 1 : 0, transform: welcomeIntroDone ? 'none' : 'translateY(8px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease', pointerEvents: welcomeIntroDone ? 'auto' : 'none',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: '0.5px solid var(--border-warm-s)', borderRadius: 28,
              padding: '6px 6px 6px 16px', background: '#fff',
              boxShadow: '0 8px 28px rgba(42,36,32,0.07)',
            }}>
              <input
                value={welcomeInput}
                onChange={e => setWelcomeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canSend) { e.preventDefault(); handleWelcomeSubmit(welcomeInput); } }}
                placeholder="Share your ideas — I'll shape them and find the right manufacturing studio."
                autoFocus={welcomeIntroDone}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-warm)', padding: '12px 0',
                }}
              />
              <button
                onClick={() => canSend && handleWelcomeSubmit(welcomeInput)}
                disabled={!canSend}
                aria-label="Send"
                style={{
                  width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: 'none',
                  background: 'var(--qw)', color: '#fff', cursor: canSend ? 'pointer' : 'not-allowed',
                  opacity: canSend ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="13" x2="8" y2="3"/><polyline points="4,7 8,3 12,7"/>
                </svg>
              </button>
            </div>

            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14,
            }}>
              {QUICK_START_CHIPS.map(c => (
                <button
                  key={c}
                  onClick={() => handleWelcomeSubmit(c)}
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink-warm-mid)',
                    background: '#fff', border: '0.5px solid var(--border-warm-s)', borderRadius: 20,
                    padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--qw-b)'; e.currentTarget.style.background = 'var(--qw-l)'; e.currentTarget.style.color = 'var(--qw)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-warm-s)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--ink-warm-mid)'; }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, fontSize: 10.5, color: 'var(--ink-warm-mute)', letterSpacing: '0.03em', textAlign: 'center' }}>
              Your ideas stay private — never shared without your consent.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ACCESS KEY GATE ───────────────────────────────────────────────────────
  // While auth resolves or the session starts, introduce Qalawati instead
  // of a bare spinner — same wait, but it now says something.
  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '0 22px', height: 60,
        borderBottom: '0.5px solid var(--border-warm)', flexShrink: 0, background: '#fff',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--ink-warm)' }}>
          Qala
        </div>
      </div>
      <QalawatiIntro />
    </div>
  );
 
  if (phase === 'error') return (
    <div style={{
      minHeight: '100vh', background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <p style={{ fontSize: 14, color: 'var(--ink-warm-mid)', fontFamily: 'var(--font-body)' }}>
        Something went wrong starting your session.
      </p>
      <button
        onClick={() => { authHandledRef.current = false; setPhase('loading'); startSession(null); }}
        style={{
          padding: '9px 20px', borderRadius: 'var(--r-8)', border: '1px solid var(--border-warm-s)',
          background: '#fff', cursor: 'pointer', fontSize: 13,
          fontFamily: 'var(--font-body)', color: 'var(--ink-warm)',
        }}
      >
        Try again
      </button>
    </div>
  );
 
  if (phase === 'resume-error') return (
    <div style={{
      minHeight: '100vh', background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 14, color: 'var(--ink-warm-mid)', fontFamily: 'var(--font-body)' }}>
        We couldn't load your chat just now — your conversation is safe, this was just a connection hiccup.
      </p>
      <button
        onClick={() => { setPhase('loading'); resumeSession(resumeIdRef.current); }}
        style={{
          padding: '9px 20px', borderRadius: 'var(--r-8)', border: '1px solid var(--border-warm-s)',
          background: '#fff', cursor: 'pointer', fontSize: 13,
          fontFamily: 'var(--font-body)', color: 'var(--ink-warm)',
        }}
      >
        Try again
      </button>
    </div>
  );

  if (phase === 'gate') {
    const canGo = accessKey.trim().length > 0 && !starting;
    return (
      <div style={{
        minHeight: '100vh', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'var(--font-body)',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 500,
            fontSize: 'clamp(30px,4.2vw,46px)', color: 'var(--ink-warm)',
            lineHeight: 1.1, margin: '8px 0 14px',
          }}>
            Get inside.
          </h1>
          <p style={{
            fontSize: 15, color: 'var(--ink-warm-mid)', lineHeight: 1.65,
            marginBottom: 28,
          }}>
            Qala stays invite-only, so the network stays curated and the studios stay yours.
          </p>

          {/* Key input */}
          <div style={{
            width: '100%', border: `1.5px solid ${keyError ? 'var(--red)' : 'rgba(122,140,110,0.5)'}`,
            borderRadius: 14, background: '#F9F9F8',
            display: 'flex', alignItems: 'center', padding: '6px 6px 6px 18px', height: 55,
            boxSizing: 'border-box', transition: 'border-color 0.18s',
          }}>
            <input
              type="text"
              value={accessKey}
              onChange={e => { setAccessKey(e.target.value); setKeyError(''); }}
              onKeyDown={e => e.key === 'Enter' && accessKey.trim() && startSession(accessKey)}
              placeholder="QS-0000"
              autoFocus
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: 14, color: 'var(--text)',
                fontFamily: 'var(--font-body)', outline: 'none',
                padding: '0 8px', letterSpacing: '1.4px',
              }}
            />
            <button
              onClick={() => startSession(accessKey)}
              disabled={!canGo}
              aria-label="Enter"
              style={{
                width: 42, height: 42, borderRadius: 10, border: 'none',
                background: canGo ? '#7A8C6E' : 'rgba(122,140,110,0.25)',
                cursor: canGo ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (canGo) e.currentTarget.style.background = '#6B7D5F'; }}
              onMouseLeave={e => { if (canGo) e.currentTarget.style.background = '#7A8C6E'; }}
            >
              {starting
                ? <div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          </div>
          {keyError && (
            <p style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 14 }}>{keyError}</p>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border-warm)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-warm-mute)' }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border-warm)' }} />
          </div>

          {/* Login path */}
          <button
            onClick={() => navigate('/login?redirect=/discover')}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 14,
              border: '1px solid var(--border-warm-s)',
              background: '#fff', color: 'var(--ink-warm)',
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'border-color 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(122,140,110,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-warm-s)'; }}
          >
            Log in to your account
          </button>

          <p style={{ fontSize: 12, color: 'var(--ink-warm-mute)', marginTop: 18 }}>
            Don't have a key?{' '}
            <a href="mailto:hello@qala.studio" style={{ color: 'var(--qw)' }}>Contact us</a>
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
          background: var(--qw-b);
          animation: blink 1.2s ease-in-out infinite;
        }
        .tdot:nth-child(2) { animation-delay: .15s; }
        .tdot:nth-child(3) { animation-delay: .3s; }
        .qchip {
          padding: 6px 14px; border-radius: var(--r-20);
          border: 0.5px solid var(--border-warm-s);
          background: #fff;
          font-size: 12.5px; color: var(--ink-warm-mid);
          cursor: pointer; font-family: var(--font-body);
          transition: border-color 0.12s, background 0.12s, color 0.12s; white-space: nowrap;
        }
        .qchip:hover { border-color: var(--qw-b); background: var(--qw-l); color: var(--qw); }
        .msgs-scroll::-webkit-scrollbar { width: 3px; }
        .msgs-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--r-2); }
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
                borderRadius: 'var(--r-8)',
                border: '0.5px solid var(--sage)',
                background: 'rgba(196,86,58,0.07)',
                color: 'var(--sage)',
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

        {/* ── Qalawati presence header — spec Section 5: "Persistent Qalawati
            presence header... fixed, not repeated per message." Shown only
            during the pre-brief/pre-match conversation (not once studios
            have been matched — that's a different screen entirely). */}
        {phase === 'chat' && !sessionToken && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 18px', flexShrink: 0,
            borderBottom: '0.5px solid var(--border-warm)', background: '#fff',
          }}>
            <QalawatiAvatar size={28} pulse />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500,
              color: 'var(--ink-warm)', letterSpacing: '0.04em',
            }}>
              Qalawati
            </span>
          </div>
        )}

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
                attachedImages={msg.attachedImages}
                referenceImages={msg.referenceImages}
                skipContactForm={skipContactForm}
                highlightBrief={msg.hasBrief ? highlightBrief : false}
                animate={i === freshAiIndex}
                matchingStep={msg.matchingStep}
              />
            ))}
 
            {sending && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <QalawatiAvatar size={30} />
                <div style={{
                  display: 'inline-flex', gap: 4, padding: '11px 14px',
                  alignItems: 'center',
                  background: 'var(--cream)',
                  borderRadius: 18,
                }}>
                  <div className="tdot" />
                  <div className="tdot" />
                  <div className="tdot" />
                </div>
                {/* Bug fix (Aug 2026) — "feels like I have no control":
                    the actual fix. Lets someone stop waiting on a slow
                    response instead of being stuck with no way out. */}
                <button
                  onClick={stopSending}
                  style={{
                    fontSize: 12, color: 'var(--text3)', background: 'var(--cream)',
                    border: '1px solid var(--border)', borderRadius: 14,
                    padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => { e.target.style.color = 'var(--text)'; e.target.style.borderColor = 'var(--text3)'; }}
                  onMouseLeave={e => { e.target.style.color = 'var(--text3)'; e.target.style.borderColor = 'var(--border)'; }}
                >
                  Stop
                </button>
              </div>
            )}
 
            <div ref={bottomRef} />
          </div>
        </div>
 
        {/* ── Chips — Qalawati's opening 4-path branch (Moodboard/Sketches/
            Sample/Scratch) renders as the spec's 2x2 icon-card grid; any
            other chip set keeps the existing plain pill row. Same chips,
            same sendMessage(c) call either way — only the opening set's
            presentation changes. */}
        {/* Upload dropzone — opened after an upload-path reference card
            (moodboard/sketches/sample) is picked. Not shown for the
            "starting from scratch" card, which has no upload step. */}
        {uploadZoneOpen && !sending && (
          <div style={{ padding: '2px 18px 10px', display: 'flex', justifyContent: 'center' }}>
            <UploadDropzone
              onContinue={(images, text) => sendMessage(text || 'Here are my references.', images)}
              onDescribeInstead={() => setUploadZoneOpen(false)}
            />
          </div>
        )}

        {chips.length > 0 && !sending && (
          isReferenceChipSet(chips) ? (
            <div style={{ padding: '2px 18px 10px', display: 'flex', justifyContent: 'center' }}>
              <ReferenceCards
                chips={chips}
                onSelect={(c, isScratch) => {
                  sendMessage(c);
                  if (!isScratch) setUploadZoneOpen(true);
                }}
              />
            </div>
          ) : (
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
          )
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
                    height: 44, borderRadius: 'var(--r)',
                    border: '0.5px solid var(--border)',
                    display: 'block',
                  }}
                />
                <button
                  onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--text)', border: 'none',
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
          padding: '10px 18px 6px',
          borderTop: '0.5px solid var(--border-warm)',
          flexShrink: 0,
          background: '#fff',
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 680, margin: '0 auto' }}>
            <ImageUpload
              onImage={handleImageSelected}
              disabled={sending}
              round
            />
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              borderRadius: 999,
              border: '1px solid var(--border-warm-s)',
              background: '#fff',
              padding: '0 6px 0 16px',
              transition: 'border-color 0.15s',
            }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--qw-b)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-warm-s)'; }}
            >
              <textarea
                ref={taRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
                onKeyDown={handleKey}
                placeholder="Reply…"
                rows={1}
                disabled={sending}
                style={{
                  flex: 1, resize: 'none', border: 'none', outline: 'none',
                  padding: '11px 0',
                  background: 'transparent',
                  fontSize: 14, color: 'var(--ink-warm)',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-body)',
                  maxHeight: 100,
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || (!input.trim() && !pendingImages.length)}
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  border: 'none',
                  background: (sending || (!input.trim() && !pendingImages.length)) ? 'var(--qw-b)' : 'var(--qw)',
                  cursor: sending || (!input.trim() && !pendingImages.length) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: sending || (!input.trim() && !pendingImages.length) ? 0.5 : 1,
                  transition: 'background 0.12s, opacity 0.12s',
                  margin: '4px 0',
                }}
                onMouseEnter={e => { if (input.trim() || pendingImages.length) e.currentTarget.style.background = '#B05A42'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--qw)'; }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13V3M3 7l5-5 5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Skip — spec Section 5's "Skip →" affordance. Sends a plain
              skip signal rather than hardcoding which questions are
              skippable (the real conversation decides that — mechanics.py
              already treats a "not sure / skip" answer as a cue to accept
              and move on, so this needs no backend change). Hidden once
              chips are showing (a discrete-choice question has its own
              answer buttons, not a skip) or mid-send. */}
          {phase === 'chat' && !sending && currentSkippable === true && messages.length > 0 && (
            <div style={{ textAlign: 'center', margin: '2px 0 0' }}>
              <button
                onClick={() => sendMessage('Not sure — skip this one.')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--ink-warm-mute)', fontFamily: 'var(--font-body)', padding: '4px 6px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-warm-mid)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-warm-mute)'; }}
              >
                Skip →
              </button>
            </div>
          )}

          <p style={{
            textAlign: 'center', fontSize: 11, color: 'var(--ink-warm-mute)',
            margin: '4px 0 4px', fontFamily: 'var(--font-body)',
          }}>
            Your references and brief stay private — never shared with anyone without your consent.
          </p>

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
            onEditBrief={() => { setSplitView(false); handleAdjust(); }}
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
              background: 'var(--text)', border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              cursor: 'pointer', zIndex: 300,
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--surface2)" strokeWidth="1.8" strokeLinecap="round">
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
                onTouchStart={e => {
                  touchStartY.current   = e.touches[0].clientY;
                  touchCurrentY.current = e.touches[0].clientY;
                }}
                onTouchMove={e => {
                  const dy = e.touches[0].clientY - touchStartY.current;
                  touchCurrentY.current = e.touches[0].clientY;
                  if (dy > 0) setDrawerTranslate(dy);
                }}
                onTouchEnd={() => {
                  const dy = (touchCurrentY.current || 0) - (touchStartY.current || 0);
                  if (dy > 80) {
                    setChatOpen(false);
                    setDrawerTranslate(0);
                  } else {
                    setDrawerTranslate(0);
                  }
                  touchStartY.current   = null;
                  touchCurrentY.current = null;
                }}
                style={{
                  display: 'none',
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  height: '72vh',
                  background: 'var(--bg)',
                  borderRadius: '16px 16px 0 0',
                  zIndex: 302,
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: drawerTranslate > 0 ? 'none' : 'drawerUp 0.28s cubic-bezier(0.4,0,0.2,1)',
                  transform: drawerTranslate > 0 ? `translateY(${drawerTranslate}px)` : 'none',
                  transition: drawerTranslate === 0 ? 'transform 0.25s ease' : 'none',
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
 
                {/* Drawer handle — tap to close, swipe down to dismiss */}
                <div
                  onClick={() => setChatOpen(false)}
                  style={{ padding: '12px 0 8px', display: 'flex', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', minHeight: 44 }}
                >
                  <div style={{ width: 36, height: 4, borderRadius: 'var(--r-2)', background: 'var(--border2)' }} />
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
                        matchingStep={msg.matchingStep}
                      />
                    ))}
                    <div ref={drawerBottomRef} />
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
                      borderRadius: 'var(--r-8)', border: '0.5px solid var(--border2)',
                      background: 'var(--surface2)', fontSize: 14,
                      color: 'var(--text)', fontFamily: 'var(--font-body)',
                      maxHeight: 80, outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={sending || !input.trim()}
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--r-8)',
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
          onEditBrief={() => { setShowPanel(false); handleAdjust(); }}
          buyerSummary={extracted}
        />
      )}
    </div>
  );
}