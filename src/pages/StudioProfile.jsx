import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { discoveryAPI, chatAPI, buyerAPI } from '../api/client';
import qalaLogo from '../assets/qala-logo.png';
import { mediaUrl, mediaOnError } from '../utils/mediaUrl';
import UserAvatar from '../components/UserAvatar';
import { RESERVED_PATHS } from '../App';

/* ══════════════════════════════════════════════════════════════════════════════
   studio-profile-v3 stylesheet

   Ported from the studio-profile-v3.html prototype and scoped under `.studio-v3`
   so the prototype's generic class names (.section, .badge, .h-tab, .s-card)
   cannot collide with the seller dashboard or admin, which use the same words
   for different things. Everything the page needs lives here rather than in
   index.css for the same reason.

   Two deliberate departures from the prototype, both requested:
     1. Options the studio did NOT choose are not rendered at all. The prototype
        shows an unavailable collaboration mode dimmed at opacity 0.5 with a
        "Not currently available" note; we drop the card entirely, so there is
        no `.collab-card.off` rule below.
     2. The prototype's Quality Control block is gone. It was three steps
        hardcoded into the markup and shown identically on every profile, with
        no studio data behind it — the same problem as a dimmed unavailable
        card, just less visible. "How They Work" now covers collaboration modes
        and design capabilities only.

   The prototype ships no media queries — it is desktop-only. The responsive
   block at the bottom is ours and has no prototype counterpart.
   ══════════════════════════════════════════════════════════════════════════ */
const STUDIO_V3_CSS = `
.studio-v3 { font-family:'DM Sans',system-ui,sans-serif; background:#FFFFFF; color:#2C2822; font-size:14px; line-height:1.6; min-height:100vh; }
.studio-v3 h1,.studio-v3 h2,.studio-v3 h3,.studio-v3 h4 { font-family:'Cormorant Garamond',Georgia,serif; margin:0; }
.studio-v3 *,.studio-v3 *::before,.studio-v3 *::after { box-sizing:border-box; }

/* ── TOP NAV ── */
.studio-v3 .top-nav { position:fixed; top:0; left:0; right:0; height:50px; background:rgba(255,255,255,0.96); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:space-between; padding:0 28px; z-index:200; border-bottom:1px solid #EAE6E1; }
.studio-v3 .nav-left { display:flex; align-items:center; gap:16px; min-width:0; }
.studio-v3 .nav-back { display:flex; align-items:center; gap:6px; color:#7A8C6E; background:none; border:none; padding:0; font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer; flex-shrink:0; }
.studio-v3 .nav-back:hover { color:#2C2822; }
.studio-v3 .nav-studio-name { font-size:14px; font-weight:500; color:#2C2822; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.studio-v3 .nav-right { display:flex; align-items:center; gap:14px; flex-shrink:0; }
.studio-v3 .nav-right .qala-logo { height:22px; display:block; }

/* ── HERO ── */
.studio-v3 .hero { margin-top:50px; height:72vh; min-height:440px; position:relative; overflow:hidden; background:#E8E2DA; }
.studio-v3 .hero-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.studio-v3 .hero-bg-empty { position:absolute; inset:0; background:linear-gradient(160deg,#1a1510 0%,#2e2318 35%,#4a3428 65%,#6a4e3c 100%); display:flex; align-items:center; justify-content:center; font-size:72px; opacity:0.25; }
.studio-v3 .hero-overlay { position:absolute; bottom:0; left:0; right:0; background:linear-gradient(to top,rgba(10,6,4,0.82) 0%,rgba(10,6,4,0.2) 55%,transparent 100%); padding:80px 44px 44px; }
.studio-v3 .hero-name { font-size:58px; font-weight:400; color:#fff; line-height:1.0; margin-bottom:12px; letter-spacing:-0.01em; }
.studio-v3 .hero-tagline { font-size:15px; color:rgba(255,255,255,0.65); max-width:500px; font-weight:300; line-height:1.55; margin:0 0 12px; }
.studio-v3 .hero-location { display:inline-flex; align-items:center; gap:5px; font-size:12px; color:rgba(255,255,255,0.45); letter-spacing:0.04em; }

/* ── PAGE LAYOUT ── */
.studio-v3 .page-body { display:grid; grid-template-columns:1fr 292px; max-width:1140px; margin:0 auto; padding:0 24px; align-items:start; }
.studio-v3 .main-col { padding:44px 44px 120px 0; min-width:0; }
.studio-v3 .side-col { padding:32px 0 100px 16px; position:sticky; top:66px; max-height:calc(100vh - 66px); overflow-y:auto; scrollbar-width:none; min-width:0; }
.studio-v3 .side-col::-webkit-scrollbar { display:none; }

/* ── SECTION COMMON ── */
.studio-v3 .section { margin-bottom:0; padding:28px 0; }
.studio-v3 .sec-label { font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:#C97326; margin-bottom:16px; font-family:'DM Sans',sans-serif; font-weight:400; display:flex; align-items:center; gap:12px; }
.studio-v3 .sec-label::after { content:''; flex:1; height:1px; background:#C97326; opacity:0.35; }
.studio-v3 .sub-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:#9A8F82; margin:22px 0 10px; }

/* ── BADGES ── */
.studio-v3 .badge { display:inline-flex; align-items:center; border-radius:20px; font-size:10px; font-weight:500; letter-spacing:0.06em; padding:3px 9px; text-transform:uppercase; line-height:1; white-space:nowrap; }
.studio-v3 .badge-skilled { background:#EBF5E8; color:#5C845C; }
.studio-v3 .badge-expert  { background:#A8D4A8; color:#1A5C1A; }
.studio-v3 .badge-master  { background:#4A7C4A; color:#fff; }

/* ── PORTFOLIO ── */
.studio-v3 .portfolio-brief-context { display:flex; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.studio-v3 .portfolio-brief-label { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#9A8F82; white-space:nowrap; }
.studio-v3 .portfolio-brief-pill { font-size:11px; color:#4A7C4A; background:#EEF3EC; border:1px solid #BCCFB8; border-radius:20px; padding:2px 9px; }
.studio-v3 .portfolio-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
.studio-v3 .portfolio-item { position:relative; aspect-ratio:3/4; overflow:hidden; border-radius:4px; cursor:pointer; background:#E8E2DA; }
.studio-v3 .portfolio-img { width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.4s ease; }
.studio-v3 .portfolio-item:hover .portfolio-img { transform:scale(1.04); }
.studio-v3 .portfolio-hover { position:absolute; inset:0; background:linear-gradient(to top,rgba(10,6,4,0.78) 0%,transparent 55%); opacity:0; transition:opacity 0.25s; display:flex; flex-direction:column; justify-content:flex-end; padding:14px; pointer-events:none; }
.studio-v3 .portfolio-item:hover .portfolio-hover { opacity:1; }
.studio-v3 .portfolio-hover-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:15px; font-weight:500; color:#fff; margin-bottom:5px; }
.studio-v3 .portfolio-hover-tags { display:flex; flex-wrap:wrap; gap:4px; }
.studio-v3 .portfolio-hover-tag { font-size:10px; color:rgba(255,255,255,0.8); background:rgba(255,255,255,0.15); padding:2px 7px; border-radius:20px; backdrop-filter:blur(4px); }
.studio-v3 .portfolio-match-dot { position:absolute; top:7px; right:7px; width:7px; height:7px; border-radius:50%; background:#7A8C6E; box-shadow:0 0 0 2px rgba(255,255,255,0.7); }
.studio-v3 .portfolio-group-divider { grid-column:1 / -1; display:flex; align-items:center; gap:10px; padding:10px 0 4px; }
.studio-v3 .portfolio-group-label { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#B0A898; white-space:nowrap; }
.studio-v3 .portfolio-group-divider::after { content:''; flex:1; height:1px; background:#EAE6E1; }
.studio-v3 .portfolio-see-more { margin-top:14px; display:flex; align-items:center; gap:8px; cursor:pointer; background:none; border:none; font-family:'DM Sans',sans-serif; font-size:12px; color:#9A8F82; letter-spacing:0.06em; padding:0; transition:color 0.15s; width:100%; justify-content:center; }
.studio-v3 .portfolio-see-more:hover { color:#7A8C6E; }
.studio-v3 .portfolio-see-more svg { transition:transform 0.2s; }
.studio-v3 .portfolio-see-more.open svg { transform:rotate(180deg); }

/* ── USPs ── */
.studio-v3 .usp-box { background:#FEF5E8; border:1px solid #F0D4A4; border-radius:10px; padding:4px 0; }
.studio-v3 .usp-item { display:flex; gap:14px; align-items:flex-start; padding:14px 20px; border-bottom:1px solid #F0D4A4; }
.studio-v3 .usp-item:last-child { border-bottom:none; }
.studio-v3 .usp-bullet { color:#C97326; flex-shrink:0; margin-top:4px; display:flex; }
.studio-v3 .usp-text { font-size:14px; color:#3C3020; line-height:1.65; }

/* ── SHARED HORIZONTAL TABS ── */
.studio-v3 .h-tabs { display:flex; border-bottom:none; overflow-x:auto; scrollbar-width:none; margin-bottom:20px; }
.studio-v3 .h-tabs::-webkit-scrollbar { display:none; }
.studio-v3 .h-tab { padding:10px 18px; cursor:pointer; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:#9A8F82; border:none; border-bottom:2px solid transparent; background:none; font-family:'DM Sans',sans-serif; white-space:nowrap; transition:all 0.15s; flex-shrink:0; }
.studio-v3 .h-tab:hover { color:#2C2822; }
.studio-v3 .h-tab.active { color:#2C2822; border-bottom-color:#7A8C6E; }

/* ── CRAFTS WIDGET ── */
.studio-v3 .craft-widget { display:grid; grid-template-columns:1fr 188px; border:1px solid #E0D9D0; border-radius:10px; overflow:hidden; background:#fff; }
.studio-v3 .craft-detail { border-right:1px solid #E0D9D0; min-width:0; }
.studio-v3 .craft-detail-img { width:100%; height:200px; object-fit:cover; display:block; background:#E8E2DA; }
.studio-v3 .craft-detail-img-placeholder { width:100%; height:200px; display:flex; align-items:center; justify-content:center; font-size:32px; color:rgba(255,255,255,0.5); background:linear-gradient(160deg,#2C4A3A 0%,#1A3028 50%,#3A5C48 100%); }
.studio-v3 .craft-detail-body { padding:18px 20px; }
.studio-v3 .craft-detail-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:22px; font-weight:500; margin-bottom:6px; color:#2C2822; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.studio-v3 .craft-detail-approach { font-size:13px; color:#6B5F4A; line-height:1.65; margin:0 0 16px; }
.studio-v3 .craft-detail-stats { display:flex; gap:24px; border-top:1px solid #F0EBE3; padding-top:14px; flex-wrap:wrap; }
.studio-v3 .craft-stat-label { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#9A8F82; margin-bottom:3px; }
.studio-v3 .craft-stat-val { font-size:14px; font-weight:500; color:#2C2822; }
.studio-v3 .craft-list { overflow-y:auto; max-height:360px; }
.studio-v3 .craft-list-item { display:flex; flex-direction:column; gap:4px; width:100%; text-align:left; padding:13px 16px; border:none; border-bottom:1px solid #F0EBE3; background:none; font-family:'DM Sans',sans-serif; cursor:pointer; transition:background 0.12s; }
.studio-v3 .craft-list-item:last-child { border-bottom:none; }
.studio-v3 .craft-list-item:hover { background:#FAFAF8; }
.studio-v3 .craft-list-item.active { background:#F4F8F2; }
.studio-v3 .craft-list-name { font-size:13px; font-weight:500; color:#2C2822; }
.studio-v3 .craft-empty { font-size:13px; color:#B0A898; font-style:italic; padding:20px 16px; }

/* ── FABRICS & DYES ── */
.studio-v3 .fabric-tags { display:flex; flex-wrap:wrap; gap:8px; }
.studio-v3 .fabric-tag { display:inline-flex; align-items:center; gap:7px; font-size:13px; padding:6px 13px; background:#fff; border:1px solid #E0D9D0; border-radius:24px; color:#2C2822; }
.studio-v3 .dye-tag { display:inline-flex; align-items:center; gap:7px; font-size:13px; padding:6px 13px; background:#F5F1EB; border:1px solid #D8D0C8; border-radius:24px; color:#5A4E40; }

/* ── CATEGORIES ── */
.studio-v3 .cat-rows { display:flex; flex-direction:column; gap:0; border-left:2px solid #EAE6E1; padding-left:16px; }
.studio-v3 .cat-row { display:flex; flex-wrap:wrap; align-items:baseline; gap:0; margin-bottom:0; line-height:1; }
.studio-v3 .cat-row-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:#B0A898; margin-right:12px; white-space:nowrap; flex-shrink:0; padding:5px 0; }
.studio-v3 .cat-kw { font-size:13px; color:#3C3630; padding:4px 0; margin-right:0; }
.studio-v3 .cat-kw::after { content:' · '; color:#C8BFB6; margin:0 6px; }
.studio-v3 .cat-kw:last-child::after { display:none; }

/* ── HOW THEY WORK ── */
.studio-v3 .collab-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:28px; }
.studio-v3 .collab-card { background:#F4F8F2; border:1.5px solid #7A8C6E; border-radius:10px; padding:18px; }
.studio-v3 .collab-icon { margin-bottom:10px; line-height:1; display:flex; }
.studio-v3 .collab-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:#7A8C6E; margin-right:5px; vertical-align:middle; }
.studio-v3 .collab-title { font-size:13px; font-weight:500; margin-bottom:4px; color:#2C2822; }
.studio-v3 .collab-desc { font-size:12px; color:#8A8278; line-height:1.45; }
.studio-v3 .design-caps { display:flex; flex-wrap:wrap; gap:8px; }
.studio-v3 .design-cap { display:inline-flex; align-items:center; gap:7px; font-size:13px; padding:7px 14px; background:#fff; border:1px solid #E0D9D0; border-radius:7px; color:#3C3630; }

/* ── INSIDE THE STUDIO ── */
.studio-v3 .bts-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:thin; scrollbar-color:#D0C9C0 transparent; }
.studio-v3 .bts-thumb { flex-shrink:0; width:170px; height:125px; border-radius:8px; overflow:hidden; position:relative; background:#E8E2DA; cursor:pointer; transition:transform 0.15s; }
.studio-v3 .bts-thumb:hover { transform:scale(1.02); }
.studio-v3 .bts-thumb img,.studio-v3 .bts-thumb video { width:100%; height:100%; object-fit:cover; display:block; }
.studio-v3 .bts-play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.18); pointer-events:none; }
.studio-v3 .bts-play span { width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,0.8); display:flex; align-items:center; justify-content:center; font-size:10px; color:#1A1612; padding-left:2px; }

/* ── SUSTAINABILITY ── */
.studio-v3 .sustain-block { display:flex; flex-direction:column; gap:22px; }
.studio-v3 .sustain-q { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#9A8F82; margin-bottom:7px; }
.studio-v3 .sustain-a { font-size:14px; color:#3C3630; line-height:1.7; white-space:pre-line; }

/* ── RECOGNITION ── */
.studio-v3 .recog-list { display:flex; flex-direction:column; gap:8px; }
.studio-v3 .recog-item { display:flex; align-items:center; gap:12px; font-size:13.5px; padding:11px 14px; background:#fff; border:1px solid #E0D9D0; border-radius:8px; color:#3C3630; }
.studio-v3 .recog-item a { color:#3C3630; text-decoration:underline; text-decoration-color:rgba(181,147,90,0.5); }
.studio-v3 .recog-star { color:#B5935A; font-size:15px; flex-shrink:0; }
.studio-v3 .cert-tags { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:16px; }
.studio-v3 .cert-tag { display:inline-flex; align-items:center; gap:5px; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; padding:4px 10px; background:#EEF3EC; border:1px solid #BCCFB8; border-radius:20px; color:#4A7C4A; font-weight:500; }

/* ── TEAM ── */
.studio-v3 .team-card { display:flex; gap:18px; background:#fff; border:1px solid #E0D9D0; border-radius:10px; padding:20px; }
.studio-v3 .team-avatar { width:66px; height:66px; border-radius:50%; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#C8B49A,#8B7355); color:rgba(255,255,255,0.75); }
.studio-v3 .team-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
.studio-v3 .team-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-weight:500; margin-bottom:2px; }
.studio-v3 .team-role { font-size:12px; color:#9A8F82; margin-bottom:10px; }
.studio-v3 .team-contact-badge { display:inline-block; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; background:#EEF3EC; color:#4A7C4A; border-radius:4px; padding:2px 7px; margin-left:6px; }
.studio-v3 .team-bio { font-size:13px; line-height:1.6; color:#5A4E40; white-space:pre-line; }

/* ── SIDEBAR STATS BLOCK ── */
.studio-v3 .s-stats-block { display:flex; align-items:center; gap:0; margin-bottom:14px; background:#FAFAF8; border:1px solid #EAE6E1; border-radius:8px; overflow:hidden; }
.studio-v3 .s-stat { flex:1; padding:12px 14px; text-align:center; }
.studio-v3 .s-stat-num { font-family:'Cormorant Garamond',Georgia,serif; font-size:28px; font-weight:500; color:#2C2822; line-height:1; margin-bottom:4px; }
.studio-v3 .s-stat-label { font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:#9A8F82; }
.studio-v3 .s-stats-divider { width:1px; background:#EAE6E1; align-self:stretch; flex-shrink:0; }

/* ── SIDEBAR ── */
.studio-v3 .s-card { background:#fff; border:1px solid #E0D9D0; border-radius:12px; padding:20px; margin-bottom:14px; }
.studio-v3 .s-cta-studio { font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-weight:500; margin-bottom:5px; }
.studio-v3 .s-cta-sub { font-size:13px; color:#8A8278; line-height:1.5; margin-bottom:16px; }
.studio-v3 .btn-cta { display:block; width:100%; padding:12px; background:#7A8C6E; color:#fff; text-align:center; border:none; border-radius:8px; font-size:13.5px; font-family:'DM Sans',sans-serif; cursor:pointer; letter-spacing:0.04em; transition:background 0.2s; }
.studio-v3 .btn-cta:hover { background:#697C5D; }
.studio-v3 .s-glance-label { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#9A8F82; margin-bottom:14px; }
.studio-v3 .s-row { display:flex; justify-content:space-between; align-items:baseline; padding:9px 0; border-bottom:1px solid #F0EBE3; font-size:13px; }
.studio-v3 .s-row:last-child { border-bottom:none; }
.studio-v3 .s-key { color:#9A8F82; }
.studio-v3 .s-val { color:#2C2822; font-weight:500; text-align:right; max-width:55%; line-height:1.35; }
.studio-v3 .s-row-expandable { cursor:pointer; width:100%; background:none; border:none; border-bottom:1px solid #F0EBE3; font-family:'DM Sans',sans-serif; }
.studio-v3 .s-row-expandable:hover .s-key { color:#7A8C6E; }
.studio-v3 .s-moq-detail { background:#FAFAF8; border-radius:0 0 8px 8px; margin:-2px 0 6px; padding:10px 12px; border:1px solid #F0EBE3; border-top:none; }
.studio-v3 .s-moq-item { font-size:12px; color:#6B5F4A; padding:3px 0; }
.studio-v3 .s-moq-note { font-size:11px; color:#9A8F82; margin-top:8px; font-style:italic; }
.studio-v3 .s-pricing { display:flex; gap:1px; align-items:center; justify-content:flex-end; }
.studio-v3 .s-pricing-symbol { font-size:14px; font-weight:600; color:#7A8C6E; }
.studio-v3 .s-pricing-symbol.dim { color:#D0C9C0; font-weight:400; }

/* ── MODAL ── */
.studio-v3-modal-overlay { position:fixed; inset:0; background:rgba(30,22,14,0.55); z-index:8500; display:flex; align-items:center; justify-content:center; padding:24px; font-family:'DM Sans',system-ui,sans-serif; animation:sv3In 0.2s ease; }
.studio-v3-modal-box { background:#fff; border-radius:14px; padding:34px; max-width:460px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.18); position:relative; }
.studio-v3-modal-title { font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:500; margin-bottom:6px; color:#2C2822; line-height:1.2; }
.studio-v3-modal-sub { font-size:13.5px; color:#6B5F4A; line-height:1.55; margin:0 0 24px; }
.studio-v3-modal-field-label { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#9A8F82; margin-bottom:7px; display:block; }
.studio-v3-modal-select { width:100%; border:1px solid #D8D4CF; border-radius:7px; padding:10px 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#2C2822; background:#fff; outline:none; margin-bottom:22px; appearance:none; background-image:url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239A8F82' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:36px; }
.studio-v3-modal-select:focus { border-color:#7A8C6E; }
.studio-v3-modal-actions { display:flex; gap:10px; flex-direction:column; }
.studio-v3-btn-primary { padding:12px; background:#7A8C6E; color:#fff; border:none; border-radius:8px; font-size:13.5px; font-family:'DM Sans',sans-serif; cursor:pointer; transition:background 0.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
.studio-v3-btn-primary:hover:not(:disabled) { background:#697C5D; }
.studio-v3-btn-primary:disabled { background:#D8D4CF; cursor:not-allowed; }
.studio-v3-btn-secondary { padding:11px; background:#fff; color:#5A4E40; border:1px solid #D8D4CF; border-radius:8px; font-size:13px; font-family:'DM Sans',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
.studio-v3-btn-secondary:hover:not(:disabled) { border-color:#9A8F82; color:#2C2822; }
.studio-v3-modal-close { position:absolute; top:16px; right:18px; background:none; border:none; font-size:20px; color:#9A8F82; cursor:pointer; line-height:1; }
.studio-v3-modal-err { font-size:12px; color:#B4453C; margin-bottom:14px; padding:8px 12px; background:#FBEDEC; border-radius:6px; border:1px solid rgba(180,69,60,0.2); }
.studio-v3-spin { width:13px; height:13px; border-radius:50%; border:2px solid rgba(255,255,255,0.35); border-top-color:#fff; display:inline-block; animation:sv3Spin 0.7s linear infinite; }
.studio-v3-spin.dark { border-color:rgba(0,0,0,0.15); border-top-color:#2C2822; }

@keyframes sv3In { from { opacity:0 } to { opacity:1 } }
@keyframes sv3Spin { to { transform:rotate(360deg) } }
@keyframes sv3Shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
@keyframes sv3FadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
.studio-v3 .fade { animation:sv3FadeUp 0.5s ease both; }
.studio-v3 .fade-2 { animation-delay:0.12s; }
.studio-v3 .fade-3 { animation-delay:0.2s; }
.studio-v3 .fade-4 { animation-delay:0.28s; }

/* ── RESPONSIVE (ours — the prototype is desktop-only) ── */
@media (max-width: 980px) {
  .studio-v3 .page-body { grid-template-columns:1fr; }
  .studio-v3 .main-col { padding:32px 0 40px; }
  .studio-v3 .side-col { position:static; max-height:none; overflow:visible; padding:0 0 80px; }
  .studio-v3 .hero { height:auto; min-height:360px; }
  .studio-v3 .hero-overlay { padding:64px 24px 32px; }
  .studio-v3 .hero-name { font-size:42px; }
}
@media (max-width: 700px) {
  .studio-v3 .craft-widget { grid-template-columns:1fr; }
  .studio-v3 .craft-detail { border-right:none; border-bottom:1px solid #E0D9D0; }
  .studio-v3 .craft-list { max-height:240px; }
  .studio-v3 .collab-grid { grid-template-columns:1fr; }
  .studio-v3 .portfolio-grid { grid-template-columns:repeat(2,1fr); }
  .studio-v3 .top-nav { padding:0 16px; }
  .studio-v3 .hero-name { font-size:34px; }
  .studio-v3 .cat-row-label { width:100%; margin-right:0; }
}
@media (prefers-reduced-motion: reduce) {
  .studio-v3 .fade { animation:none; }
  .studio-v3 .portfolio-item:hover .portfolio-img { transform:none; }
  .studio-v3 .bts-thumb:hover { transform:none; }
}
`;

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const Svg = ({ size = 14, sw = 1.8, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const IconArrowLeft   = p => <Svg {...p}><path d="M19 12H5M5 12l7 7M5 12l7-7" /></Svg>;
const IconArrowRight  = p => <Svg {...p} sw={2}><path d="M5 12h14M12 5l7 7-7 7" /></Svg>;
const IconChevron     = p => <Svg {...p} sw={2}><path d="M6 9l6 6 6-6" /></Svg>;
const IconPin         = p => <Svg {...p}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></Svg>;
const IconStarOutline = p => <Svg {...p} sw={2}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></Svg>;
const IconPerson      = p => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></Svg>;
const IconLayers      = p => <Svg {...p}><path d="M12 3L2 9l10 6 10-6-10-6zM2 17l10 6 10-6M2 13l10 6 10-6" /></Svg>;
const IconCompass     = p => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5.5-5.5 2 2-5.5z" /></Svg>;

// Collaboration-mode glyphs — drawn on a 22px canvas, as in the prototype.
const IconGrid = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#7A8C6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="8" height="8" rx="1.5" /><rect x="12" y="2" width="8" height="8" rx="1.5" />
    <rect x="2" y="12" width="8" height="8" rx="1.5" /><rect x="12" y="12" width="8" height="8" rx="1.5" />
  </svg>
);
const IconPencil = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#7A8C6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 17.5l2.5-2.5 9.5-9.5a2.12 2.12 0 013 3L8 18.5 3 19z" />
    <path d="M13.5 6l2.5 2.5" /><path d="M6 19c1-1.5 1-3 0-4" />
  </svg>
);
const IconNodes = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#7A8C6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="5.5" r="2.5" /><circle cx="5.5" cy="16.5" r="2.5" />
    <line x1="8" y1="5.5" x2="19" y2="19" /><line x1="8" y1="16.5" x2="13.5" y2="11.5" />
    <line x1="8" y1="5.5" x2="14" y2="11" />
  </svg>
);

/* ── Badge helpers ─────────────────────────────────────────────────────────────
   Resolution logic unchanged; prototype styling (solid fills, no border):
     qala_badge set → show that value (admin-assigned, overrides everything)
     else is_primary → auto-show "Expert"
     else → no badge                                                           */
function resolveBadge(craft) {
  if (craft.qala_badge) return String(craft.qala_badge).toLowerCase();
  if (craft.is_primary) return 'expert';
  return null;
}

const BADGE_LABELS = { skilled: 'Skilled', expert: 'Expert', master: 'Master' };

function CraftBadge({ badge }) {
  const label = BADGE_LABELS[badge];
  if (!label) return null;
  return <span className={`badge badge-${badge}`}>{label}</span>;
}

/* ── Fabric category labels ───────────────────────────────────────────────── */
const FABRIC_CATEGORY_LABELS = {
  cotton:      'Cotton',
  silk:        'Silk',
  linen:       'Linen & Bast',
  wool:        'Wool',
  regenerated: 'Regenerated',
  handcrafted: 'Handcrafted',
  other:       'Other',
};

// Studios can define their own fabric family in Section C, stored as a slug
// (e.g. "re-cycled_fabrics"). Render those as readable tab labels.
const prettyCategory = (slug) =>
  String(slug || '').replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());

const isVideoAsset = (item) =>
  item?.mime_type?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(item?.url || '');

/* ── Lightbox ─────────────────────────────────────────────────────────────────
   Carried over unchanged. The prototype has no lightbox because it has no real
   media; removing ours would be a functional regression, not parity.          */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx]     = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const videoRef          = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [idx]);

  const current = images[idx];
  const isVideo = isVideoAsset(current);
  // Serve compressed derivatives — originals stay stored, just not served here.
  const lbSrc = isVideo
    ? (current?.compressed_video_url || current?.url)
    : (current?.thumbnail_url || current?.url);

  const ctrl = {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', borderRadius: '50%', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(15,10,8,0.95)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'sv3In 0.2s ease',
    }}>
      <button onClick={onClose} style={{ ...ctrl, position: 'absolute', top: 20, right: 24, width: 40, height: 40, fontSize: 18 }}>×</button>

      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
        {idx + 1} / {images.length}
      </div>

      {isVideo && (
        <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          title={muted ? 'Unmute' : 'Mute'}
          style={{ ...ctrl, position: 'absolute', top: 20, left: 24, width: 40, height: 40, fontSize: 15 }}>
          {muted ? '🔇' : '🔊'}
        </button>
      )}

      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ ...ctrl, position: 'absolute', left: 20, width: 44, height: 44, fontSize: 20 }}>‹</button>
      )}

      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isVideo ? (
          <video ref={videoRef} key={lbSrc} src={mediaUrl(lbSrc)} autoPlay loop muted={muted} playsInline
            style={{ maxWidth: '88vw', maxHeight: '80vh', borderRadius: 8, display: 'block', outline: 'none' }} />
        ) : (
          <img src={mediaUrl(lbSrc)} alt=""
            style={{ maxWidth: '88vw', maxHeight: '80vh', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', borderRadius: 8 }} />
        )}
      </div>

      {idx < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ ...ctrl, position: 'absolute', right: 20, width: 44, height: 44, fontSize: 20 }}>›</button>
      )}

      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, maxWidth: '90vw', overflowX: 'auto', padding: '4px 0' }}>
        {images.map((img, i) => {
          const isVid = isVideoAsset(img);
          const stripSrc = isVid ? (img?.compressed_video_url || img?.url) : (img?.thumbnail_url || img?.url);
          const frame = {
            width: 52, height: 40, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
            border: i === idx ? '2px solid #7A8C6E' : '2px solid transparent',
            opacity: i === idx ? 1 : 0.5, transition: 'all 0.15s',
          };
          return isVid ? (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ ...frame, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: '#fff' }}>▶</span>
            </div>
          ) : (
            <img key={i} src={mediaUrl(stripSrc)} alt="" onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ ...frame, objectFit: 'cover' }} />
          );
        })}
      </div>
    </div>,
    document.body
  );
}

/* ── Section block ────────────────────────────────────────────────────────────
   The prototype uses one label treatment everywhere — orange with a matching
   rule. The old `orange` prop is gone: it is now the only style.              */
function Section({ title, id, className = '', children }) {
  return (
    <div className={`section ${className}`} id={id}>
      <div className="sec-label">{title}</div>
      {children}
    </div>
  );
}

/* ── Portfolio ────────────────────────────────────────────────────────────────
   The brief-gated match layer (context pills, match dots, "other work" divider)
   renders only when a buyer brief is present. It arrives as `active_brief`,
   resolved server-side from the session token, so a buyer landing here from a
   Qalawati recommendation sees matched work first; anonymous visitors get a
   plain grid in upload order.                                                 */
const PORTFOLIO_VISIBLE = 9;

function scoreWork(item, brief) {
  if (!brief) return 0;
  let score = 0;
  const crafts  = (item.crafts_used  || []).map(x => String(x).toLowerCase());
  const fabrics = (item.fabrics_used || []).map(x => String(x).toLowerCase());
  const has = (arr, needle) => arr.some(x => x.includes(needle) || needle.includes(x));
  (brief.crafts  || []).forEach(c => { if (has(crafts,  String(c).toLowerCase())) score += 8; });
  (brief.fabrics || []).forEach(f => { if (has(fabrics, String(f).toLowerCase())) score += 4; });
  return score;
}

function PortfolioCard({ item, topMatch, onClick }) {
  const isVideo      = isVideoAsset(item);
  const cardSrc      = !isVideo ? (item.thumbnail_url || item.url) : item.url;
  const cardVideoSrc = isVideo ? (item.compressed_video_url || item.url) : null;
  const tags = [...(item.crafts_used || []), ...(item.fabrics_used || [])].slice(0, 4);

  return (
    <div className="portfolio-item" onClick={onClick}
      onMouseEnter={e => { const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
      onMouseLeave={e => { const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}
    >
      {isVideo
        ? <video className="portfolio-img" src={mediaUrl(cardVideoSrc)} muted playsInline preload="metadata" loop />
        : <img className="portfolio-img" src={mediaUrl(cardSrc)} alt={item.product_name || ''} loading="lazy" />}

      {topMatch && <div className="portfolio-match-dot" title="Strong match for your brief" />}

      {(item.product_name || tags.length > 0) && (
        <div className="portfolio-hover">
          {item.product_name && <div className="portfolio-hover-name">{item.product_name}</div>}
          {tags.length > 0 && (
            <div className="portfolio-hover-tags">
              {tags.map((t, i) => <span key={i} className="portfolio-hover-tag">{t}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PortfolioGrid({ items, brief = null }) {
  const [lb, setLb]     = useState(null);
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;

  // Score + split only when a brief is present; otherwise keep upload order.
  let matched = items, other = [];
  if (brief) {
    const scored = items.map(it => ({ it, score: scoreWork(it, brief) }))
      .sort((a, b) => b.score - a.score);
    matched = scored.filter(x => x.score > 0).map(x => x.it);
    other   = scored.filter(x => x.score === 0).map(x => x.it);
  }
  const ordered      = brief ? [...matched, ...other] : items;
  const dividerAt    = brief && matched.length > 0 && other.length > 0 ? matched.length : -1;
  const visibleCount = open ? ordered.length : PORTFOLIO_VISIBLE;
  const briefPills   = brief ? [...(brief.crafts || []), ...(brief.fabrics || [])] : [];

  return (
    <>
      {lb !== null && <Lightbox images={ordered} startIndex={lb} onClose={() => setLb(null)} />}

      {briefPills.length > 0 && (
        <div className="portfolio-brief-context">
          <span className="portfolio-brief-label">Matched to your brief</span>
          {briefPills.map((p, i) => <span key={i} className="portfolio-brief-pill">{p}</span>)}
        </div>
      )}

      <div className="portfolio-grid">
        {ordered.slice(0, visibleCount).map((item, i) => (
          <Fragment key={i}>
            {i === dividerAt && (
              <div className="portfolio-group-divider">
                <span className="portfolio-group-label">Other work from this studio</span>
              </div>
            )}
            <PortfolioCard item={item} topMatch={brief && i < 3 && i < matched.length} onClick={() => setLb(i)} />
          </Fragment>
        ))}
      </div>

      {ordered.length > PORTFOLIO_VISIBLE && (
        <button className={`portfolio-see-more${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
          {open ? 'See less' : `See ${ordered.length - PORTFOLIO_VISIBLE} more`}
          <IconChevron size={14} />
        </button>
      )}
    </>
  );
}

/* ── Crafts widget ────────────────────────────────────────────────────────────
   Prototype layout: horizontal group tabs above a two-pane widget — detail on
   the left (image, name + badge, approach, stats), technique list on the right.

   Differences from the previous implementation, all matching the prototype:
     • the list shows names only; the badge lives on the detail pane, not per row
     • the list always renders, even for a single technique
     • an empty group shows `.craft-empty` instead of vanishing
     • the detail image is a fixed 200px band, not a 16/9 box
     • the stats row is back, fed from the craft's own sampling / production
       figures, and rendered only when the studio supplied at least one         */
const CRAFT_GROUPS = [
  { key: 'printing', label: 'Printing & Dyeing', types: ['printing', 'dyeing'] },
  { key: 'surface',  label: 'Surface Work',      types: ['surface'] },
  { key: 'weaving',  label: 'Weaving',           types: ['weaving', 'spinning'] },
];

function craftStats(craft) {
  const out = [];
  if (craft.sampling_time_weeks) {
    const n = craft.sampling_time_weeks;
    out.push(['Sampling', `${n} ${n === 1 ? 'week' : 'weeks'}`]);
  }
  if (craft.production_timeline_months_100units) {
    const n = craft.production_timeline_months_100units;
    out.push(['Production (100 units)', `${n} ${n === 1 ? 'month' : 'months'}`]);
  }
  return out;
}

function CraftWidget({ crafts }) {
  const known  = new Set(CRAFT_GROUPS.flatMap(g => g.types));
  const groups = CRAFT_GROUPS
    .map(g => ({ ...g, items: crafts.filter(c => g.types.includes(c.technique_type)) }))
    .filter(g => g.items.length > 0);

  // Anything with an unrecognised technique_type lands in a fallback group so a
  // craft is never silently dropped.
  const leftover = crafts.filter(c => !known.has(c.technique_type));
  if (leftover.length) groups.push({ key: 'other', label: 'Other', items: leftover });

  const [gIdx, setGIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);

  if (groups.length === 0) return null;

  const group = groups[Math.min(gIdx, groups.length - 1)];
  const list  = group.items;
  const c     = list[Math.min(cIdx, list.length - 1)] || null;

  const imageUrl = c ? mediaUrl(c.thumbnail_url || c.image_url) : null;
  const badge    = c ? resolveBadge(c) : null;
  const stats    = c ? craftStats(c) : [];

  return (
    <div>
      {groups.length > 1 && (
        <div className="h-tabs" style={{ marginBottom: 14 }}>
          {groups.map((g, i) => (
            <button key={g.key} type="button"
              className={`h-tab${gIdx === i ? ' active' : ''}`}
              onClick={() => { setGIdx(i); setCIdx(0); }}>
              {g.label}
            </button>
          ))}
        </div>
      )}

      <div className="craft-widget">
        {/* Left — detail */}
        <div className="craft-detail">
          {imageUrl
            ? <img className="craft-detail-img" key={imageUrl} src={imageUrl} alt={c?.craft_name || ''} loading="eager" />
            : <div className="craft-detail-img-placeholder" />}
          <div className="craft-detail-body">
            <div className="craft-detail-name">
              {c ? c.craft_name : '—'}
              {badge && <CraftBadge badge={badge} />}
            </div>
            {c?.specialization && <p className="craft-detail-approach">{c.specialization}</p>}
            {stats.length > 0 && (
              <div className="craft-detail-stats">
                {stats.map(([label, val]) => (
                  <div key={label}>
                    <div className="craft-stat-label">{label}</div>
                    <div className="craft-stat-val">{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — technique list */}
        <div className="craft-list">
          {list.length === 0 ? (
            <div className="craft-empty">No techniques listed in this category.</div>
          ) : list.map((craft, i) => (
            <button key={craft.id ?? i} type="button"
              className={`craft-list-item${cIdx === i ? ' active' : ''}`}
              onClick={() => setCIdx(i)}>
              <span className="craft-list-name">{craft.craft_name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Fabrics & Dyes ───────────────────────────────────────────────────────────
   Fibre-type tabs with a Dyes tab appended. Per the prototype, fabrics and dyes
   get distinct chip treatments and there is no primary-fabric highlight.      */
function FabricTabs({ fabrics, dyes }) {
  const hasFabrics = fabrics?.length > 0;
  const hasDyes    = dyes?.length > 0;

  const categoryOrder = [];
  const categoryMap   = {};
  (fabrics || []).forEach(f => {
    const cat = f.category || 'other';
    if (!categoryMap[cat]) { categoryMap[cat] = []; categoryOrder.push(cat); }
    categoryMap[cat].push(f);
  });

  const tabs = [...categoryOrder];
  if (hasDyes) tabs.push('dyes');

  const [activeTab, setActiveTab] = useState(tabs[0] || 'other');
  if (!hasFabrics && !hasDyes) return null;

  return (
    <div>
      <div className="h-tabs">
        {tabs.map(cat => (
          <button key={cat} type="button"
            className={`h-tab${activeTab === cat ? ' active' : ''}`}
            onClick={() => setActiveTab(cat)}>
            {cat === 'dyes' ? 'Dyes' : (FABRIC_CATEGORY_LABELS[cat] || prettyCategory(cat))}
          </button>
        ))}
      </div>
      <div className="fabric-tags">
        {activeTab === 'dyes'
          ? dyes.map(d => <span key={d.dye_name} className="dye-tag">{d.dye_name}</span>)
          : (categoryMap[activeTab] || []).map(f => <span key={f.fabric_name} className="fabric-tag">{f.fabric_name}</span>)}
      </div>
    </div>
  );
}

/* ── Get Introduced modal ─────────────────────────────────────────────────── */
function IntroPopup({ studio, onClose }) {
  const [sessions,     setSessions]     = useState([]);
  const [loadingSess,  setLoadingSess]  = useState(true);
  const [selectedSess, setSelectedSess] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [err,          setErr]          = useState('');

  useEffect(() => {
    buyerAPI.getSessions()
      .then(r => setSessions(r.data?.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSess(false));
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const introduce = async (withSession) => {
    setErr('');
    setSubmitting(true);
    try {
      await chatAPI.getIntroduced(withSession ? selectedSess : null, studio.studio_id);
      setDone(true);
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSessions = !loadingSess && sessions.length > 0;

  return createPortal(
    <div className="studio-v3-modal-overlay" onClick={onClose}>
      <div className="studio-v3-modal-box" onClick={e => e.stopPropagation()}>
        <button className="studio-v3-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: '#7A8C6E' }}>✓</div>
            <div className="studio-v3-modal-title">Introduction requested</div>
            <p className="studio-v3-modal-sub">
              The Qala team will get you introduced to {studio.studio_name} soon.
            </p>
            <div className="studio-v3-modal-actions">
              <button className="studio-v3-btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="studio-v3-modal-title">Share your project with {studio.studio_name}?</div>
            <p className="studio-v3-modal-sub">They'll know exactly what you're looking for.</p>

            {hasSessions && (
              <>
                <label className="studio-v3-modal-field-label" htmlFor="sv3-project">Select a project</label>
                <select id="sv3-project" className="studio-v3-modal-select"
                  value={selectedSess} onChange={e => setSelectedSess(e.target.value)}>
                  <option value="">— Choose a project brief —</option>
                  {sessions.map(s => (
                    <option key={s.session_token} value={s.session_token}>
                      {s.name || s.product_types?.slice(0, 2).join(', ') || 'Discovery session'} · {new Date(s.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </>
            )}

            {err && <div className="studio-v3-modal-err">{err}</div>}

            <div className="studio-v3-modal-actions">
              {hasSessions && (
                <button className="studio-v3-btn-primary"
                  disabled={submitting || !selectedSess}
                  onClick={() => introduce(true)}>
                  {submitting ? <><span className="studio-v3-spin" /> Sending…</> : 'Send Project Details'}
                </button>
              )}
              <button className="studio-v3-btn-secondary" disabled={submitting} onClick={() => introduce(false)}>
                {submitting ? <><span className="studio-v3-spin dark" /> Sending…</> : 'Connect Without Brief'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 16, r = 6, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#EEEEEC 25%,#E6E6E3 50%,#EEEEEC 75%)',
      backgroundSize: '200% 100%', animation: 'sv3Shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function StudioProfile() {
  // Supports both /studio/:id (legacy) and /:studioSlug (v3)
  const { id, studioSlug } = useParams();
  const nav = useNavigate();

  const [studio,  setStudio]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [introOpen,   setIntroOpen]   = useState(false);
  const [moqExpanded, setMoqExpanded] = useState(false);
  const [btsLightboxOpen, setBtsLightboxOpen] = useState(false);
  const [btsStartIndex,   setBtsStartIndex]   = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, [id, studioSlug]);

  useEffect(() => {
    // Guard: a reserved path must never be treated as a studio slug.
    if (studioSlug && RESERVED_PATHS.has(studioSlug)) {
      nav('/', { replace: true });
      return;
    }

    setLoading(true);
    setError('');

    const req = studioSlug
      ? discoveryAPI.getStudioProfileBySlug(studioSlug)
      : discoveryAPI.getStudioProfile(id);

    req
      .then(r => setStudio(r.data))
      .catch(e => {
        if (e.response?.status === 404) setError('This studio profile is not available.');
        else setError('Could not load studio profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id, studioSlug]);

  // ── Loading ──
  if (loading) return (
    <div className="studio-v3">
      <style>{STUDIO_V3_CSS}</style>
      <div style={{ height: 50, background: '#fff', borderBottom: '1px solid #EAE6E1' }} />
      <div style={{ height: '48vh', minHeight: 320, background: '#EEEEEC' }} />
      <div className="page-body">
        <div className="main-col" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton h={44} w="60%" r={8} />
          <Skeleton h={20} w="40%" />
          <Skeleton h={16} w="80%" />
          <Skeleton h={16} w="72%" />
          <Skeleton h={16} w="65%" />
        </div>
        <div className="side-col"><Skeleton h={260} r={12} /></div>
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="studio-v3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: '100vh' }}>
      <style>{STUDIO_V3_CSS}</style>
      <div style={{ fontSize: 48, opacity: 0.3 }}>🏛</div>
      <p style={{ color: '#8A8278', fontSize: 15 }}>{error}</p>
      <button className="studio-v3-btn-secondary" style={{ width: 'auto', padding: '10px 22px' }} onClick={() => nav(-1)}>← Go back</button>
    </div>
  );

  const s        = studio;
  const heroUrl  = s.hero_image?.url;
  const hasWork  = s.work_images?.length > 0;
  const hasBts   = s.bts_images?.length  > 0;
  const location = [s.location_city, s.location_state].filter(Boolean).join(', ');

  // ── Categories — a row appears only when the studio selected something ──
  const catRows = [
    ['Occasions',        s.occasions],
    ['Gender',           s.gender_focus],
    ['Garment Styles',   s.garment_types],
    ['Accessories',      s.accessory_types],
    ['Home Furnishings', s.home_furnishings],
  ].filter(([, arr]) => arr?.length > 0);

  const hasFabricsOrDyes = s.fabrics?.length > 0 || s.dyes?.length > 0;

  // ── How They Work ────────────────────────────────────────────────────────
  // Only modes the studio actually turned ON are rendered. `=== true` matters:
  // the API returns null for "never answered" and false for "explicitly no",
  // and a loose check would let both through as a card.
  const cd = s.collab_design;
  const collabModes = cd ? [
    { key: 'catalogue_collab', title: 'Catalog',          icon: <IconGrid />,   on: cd.catalogue_collab === true,
      desc: 'Browse existing designs and adapt colourway, fabric, or detail for your label.' },
    { key: 'co_creation',      title: 'Co-creation',      icon: <IconPencil />, on: cd.co_creation === true,
      desc: 'Bring a direction or moodboard — they co-develop the design with their material expertise.' },
    { key: 'production_house', title: 'Production House', icon: <IconNodes />,  on: cd.production_house === true,
      desc: 'Execute from a ready tech pack or physical samples.' },
  ].filter(m => m.on) : [];

  const designCaps = cd ? [
    { key: 'fashion', label: 'In-house fashion designer', icon: <IconPerson size={13} />,  on: cd.has_fashion_designer === true },
    { key: 'textile', label: 'Textile design expertise',  icon: <IconLayers size={13} />,  on: cd.has_textile_design === true },
    { key: 'scratch', label: 'Design from scratch',       icon: <IconCompass size={13} />, on: cd.has_design_from_scratch === true },
  ].filter(c => c.on) : [];

  // "How They Work" now covers collaboration modes and design capabilities
  // only. The Quality Control block was removed: it was three hardcoded steps
  // shown identically on every profile, with no studio data behind it.
  const hasHowTheyWork = collabModes.length > 0 || designCaps.length > 0;

  // ── Recognition ──────────────────────────────────────────────────────────
  const certs = (() => {
    const raw = s.production?.certifications;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [String(raw)]; }
    catch { return String(raw).split(',').map(x => x.trim()).filter(Boolean); }
  })();
  const hasRecognition = s.awards?.length > 0 || certs.length > 0;

  // ── Sustainability & Ethics — fixed questions, studio answers ────────────
  const sustainRows = [
    ['How they approach sustainable production', s.sustainability],
    ['How they take care of their team',         s.team_care],
  ].filter(([, a]) => a && String(a).trim());

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const prod = s.production || {};
  const weeksRange = (min, max, fallback) => {
    if (min && max) return min === max ? `${min} weeks` : `${min}–${max} weeks`;
    if (min) return `${min}+ weeks`;
    return fallback || null;
  };
  const samplingLabel   = weeksRange(prod.sampling_time_weeks_min, prod.sampling_time_weeks_max, prod.avg_sampling_time_range);
  const productionLabel = weeksRange(prod.production_time_weeks_min, prod.production_time_weeks_max, null);
  const pricingFilled   = prod.pricing_tier ? (String(prod.pricing_tier).match(/\$/g) || []).length : 0;

  // Prefer the real number the studio entered (F.6). Falls back to the old
  // Fixed / Flexible label for studios that never filled it in.
  const minimumsLabel = prod.moq_per_batch
    ? `${prod.moq_per_batch} pcs / batch`
    : (prod.has_strict_minimums == null ? null : (prod.has_strict_minimums ? 'Fixed' : 'Flexible'));
  const moqDetail = prod.moq_entries?.length > 0 || prod.moq_flexible;
  const hasStats  = prod.monthly_capacity_units != null || prod.artisan_count != null;

  return (
    <div className="studio-v3">
      <style>{STUDIO_V3_CSS}</style>

      {/* ── TOP NAV ── */}
      <nav className="top-nav">
        <div className="nav-left">
          <button className="nav-back" onClick={() => nav(-1)}>
            <IconArrowLeft size={15} />
            Back
          </button>
          {s.studio_name && <span className="nav-studio-name">{s.studio_name}</span>}
        </div>
        <div className="nav-right">
          <Link to="/"><img src={qalaLogo} alt="Qala" className="qala-logo" /></Link>
          <UserAvatar hideWhenLoggedOut />
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        {heroUrl
          ? <img className="hero-bg" src={mediaUrl(heroUrl)} alt={s.studio_name} fetchpriority="high" />
          : <div className="hero-bg-empty">🏛</div>}
        <div className="hero-overlay">
          <h1 className="hero-name fade fade-2">{s.studio_name}</h1>
          {s.short_description && <p className="hero-tagline fade fade-3">{s.short_description}</p>}
          {location && (
            <span className="hero-location fade fade-3">
              <IconPin size={11} />
              {location}
            </span>
          )}
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div className="page-body">
        <div className="main-col">

          {/* PORTFOLIO */}
          {hasWork && (
            <Section title="Portfolio" id="portfolio" className="fade fade-2">
              <PortfolioGrid items={s.work_images} brief={s.active_brief || null} />
            </Section>
          )}

          {/* WHAT THEY'RE KNOWN FOR */}
          {s.usps?.length > 0 && (
            <Section title="What They're Known For" id="about" className="fade fade-2">
              <div className="usp-box">
                {s.usps.slice(0, 3).map((usp, i) => (
                  <div className="usp-item" key={i}>
                    <span className="usp-bullet"><IconArrowRight size={14} /></span>
                    <span className="usp-text">{usp}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* CRAFTS & SPECIALISATIONS */}
          {s.crafts?.length > 0 && (
            <Section title="Crafts & Specialisations" id="crafts" className="fade fade-3">
              <CraftWidget crafts={s.crafts} />
            </Section>
          )}

          {/* FABRICS & DYES */}
          {hasFabricsOrDyes && (
            <Section title="Fabrics & Dyes" id="fabrics" className="fade">
              <FabricTabs fabrics={s.fabrics} dyes={s.dyes} />
            </Section>
          )}

          {/* CATEGORIES */}
          {catRows.length > 0 && (
            <Section title="Categories" id="categories" className="fade fade-4">
              <div className="cat-rows">
                {catRows.map(([label, arr]) => (
                  <div className="cat-row" key={label}>
                    <span className="cat-row-label">{label}</span>
                    {arr.map((x, i) => <span className="cat-kw" key={i}>{x}</span>)}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* RECOGNITION */}
          {hasRecognition && (
            <Section title="Recognition" id="recognition" className="fade">
              {certs.length > 0 && (
                <div className="cert-tags">
                  {certs.map((cert, i) => (
                    <span className="cert-tag" key={i}>
                      <IconStarOutline size={10} />
                      {cert}
                    </span>
                  ))}
                </div>
              )}
              {s.awards?.length > 0 && (
                <div className="recog-list">
                  {s.awards.map((a, i) => (
                    <div className="recog-item" key={i}>
                      <span className="recog-star">★</span>
                      {a.link
                        ? <a href={a.link} target="_blank" rel="noopener noreferrer">{a.award_name}</a>
                        : <span>{a.award_name}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* SUSTAINABILITY & ETHICS */}
          {sustainRows.length > 0 && (
            <Section title="Sustainability & Ethics" id="sustainability" className="fade">
              <div className="sustain-block">
                {sustainRows.map(([label, answer], i) => (
                  <div key={i}>
                    <div className="sustain-q">{label}</div>
                    <div className="sustain-a">{answer}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* INSIDE THE STUDIO */}
          {hasBts && (
            <Section title="Inside the Studio" id="studio" className="fade">
              <div className="bts-strip">
                {s.bts_images.slice(0, 8).map((img, i) => {
                  const isVideo      = isVideoAsset(img);
                  const tileSrc      = !isVideo ? (img.thumbnail_url || img.url) : img.url;
                  const tileVideoSrc = isVideo ? (img.compressed_video_url || img.url) : null;
                  return (
                    <div className="bts-thumb" key={i}
                      onClick={() => { setBtsStartIndex(i); setBtsLightboxOpen(true); }}
                      onMouseEnter={e => { const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
                      onMouseLeave={e => { const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}
                    >
                      {isVideo ? (
                        <>
                          <video src={mediaUrl(tileVideoSrc)} muted playsInline preload="metadata" loop onError={mediaOnError(img.url)} />
                          <div className="bts-play"><span>▶</span></div>
                        </>
                      ) : (
                        <img src={mediaUrl(tileSrc)} alt="" onError={mediaOnError(img.url)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* HOW THEY WORK */}
          {hasHowTheyWork && (
            <Section title="How They Work" id="how-they-work" className="fade">

              {collabModes.length > 0 && (
                <>
                  <div className="sub-label" style={{ marginTop: 0 }}>Collaboration Modes</div>
                  <div className="collab-grid">
                    {collabModes.map(m => (
                      <div className="collab-card" key={m.key}>
                        <div className="collab-icon">{m.icon}</div>
                        <div className="collab-title"><span className="collab-dot" />{m.title}</div>
                        <div className="collab-desc">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {designCaps.length > 0 && (
                <>
                  <div className="sub-label" style={{ marginTop: 0 }}>Design Capabilities</div>
                  <div className="design-caps">
                    {designCaps.map(cap => (
                      <span className="design-cap" key={cap.key}>
                        {cap.icon}
                        {cap.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Section>
          )}

          {/* WHO YOU'LL BE WORKING WITH */}
          {s.coordinator && (
            <Section title="Who You'll Be Working With" id="team" className="fade">
              <div className="team-card">
                <div className="team-avatar">
                  {s.coordinator.image_url
                    ? <img src={mediaUrl(s.coordinator.image_url)} alt={s.coordinator.name} />
                    : <IconPerson size={28} sw={1.4} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="team-name">
                    {s.coordinator.name}
                    <span className="team-contact-badge">Your contact</span>
                  </div>
                  {s.coordinator.position && <div className="team-role">{s.coordinator.position}</div>}
                  {s.coordinator.writeup && <div className="team-bio">{s.coordinator.writeup}</div>}
                </div>
              </div>
            </Section>
          )}

        </div>{/* /main-col */}

        {/* ── SIDEBAR ── */}
        <div className="side-col">

          {/* CTA */}
          <div className="s-card">
            <div className="s-cta-studio">Connect with studio</div>
            <div className="s-cta-sub">Found them interesting? Let's get you introduced.</div>
            <button className="btn-cta" onClick={() => setIntroOpen(true)}>Get Introduced</button>
          </div>

          {/* STUDIO AT A GLANCE */}
          <div className="s-card">
            <div className="s-glance-label">Studio at a Glance</div>

            {hasStats && (
              <div className="s-stats-block">
                {prod.monthly_capacity_units != null && (
                  <div className="s-stat">
                    <div className="s-stat-num">{prod.monthly_capacity_units.toLocaleString()}</div>
                    <div className="s-stat-label">Units / mo</div>
                  </div>
                )}
                {prod.monthly_capacity_units != null && prod.artisan_count != null && (
                  <div className="s-stats-divider" />
                )}
                {prod.artisan_count != null && (
                  <div className="s-stat">
                    <div className="s-stat-num">{prod.artisan_count}</div>
                    <div className="s-stat-label">Artisans</div>
                  </div>
                )}
              </div>
            )}

            {minimumsLabel && (
              moqDetail ? (
                <>
                  <button className="s-row s-row-expandable" onClick={() => setMoqExpanded(x => !x)}>
                    <span className="s-key">Minimums</span>
                    <span className="s-val">
                      {minimumsLabel}
                      <span style={{ fontSize: 10, color: '#9A8F82', marginLeft: 5, display: 'inline-block', transition: 'transform 0.2s', transform: moqExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </span>
                  </button>
                  {moqExpanded && (
                    <div className="s-moq-detail">
                      {prod.moq_entries?.length > 0
                        ? prod.moq_entries.map((m, i) => (
                            <div className="s-moq-item" key={i}>
                              <span style={{ fontWeight: 500, color: '#4A4440' }}>{m.craft_or_category}</span>
                              {m.moq_condition && ` — ${m.moq_condition}`}
                            </div>
                          ))
                        : <div className="s-moq-item">No craft-specific minimums listed.</div>}
                      {prod.moq_flexible && <div className="s-moq-note">*minimums are flexible as per availability</div>}
                    </div>
                  )}
                </>
              ) : (
                <div className="s-row">
                  <span className="s-key">Minimums</span>
                  <span className="s-val">{minimumsLabel}</span>
                </div>
              )
            )}

            {samplingLabel && (
              <div className="s-row">
                <span className="s-key">Avg. sampling time</span>
                <span className="s-val">{samplingLabel}</span>
              </div>
            )}

            {productionLabel && (
              <div className="s-row">
                <span className="s-key">Production (100 pcs)</span>
                <span className="s-val">{productionLabel}</span>
              </div>
            )}

            {s.establishment_year && (
              <div className="s-row">
                <span className="s-key">Established</span>
                <span className="s-val">{s.establishment_year}</span>
              </div>
            )}

            {prod.pricing_tier && (
              <div className="s-row">
                <span className="s-key">Pricing</span>
                <span className="s-val">
                  <span className="s-pricing">
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} className={`s-pricing-symbol${i < pricingFilled ? '' : ' dim'}`}>$</span>
                    ))}
                  </span>
                </span>
              </div>
            )}
          </div>

        </div>{/* /side-col */}
      </div>{/* /page-body */}

      {btsLightboxOpen && (
        <Lightbox images={s.bts_images} startIndex={btsStartIndex} onClose={() => setBtsLightboxOpen(false)} />
      )}

      {introOpen && <IntroPopup studio={s} onClose={() => setIntroOpen(false)} />}
    </div>
  );
}