// src/utils/calculator.js
// Landing cost calculation engine — ported exactly from product team reference HTMLs.
// Used by ProposalBuilder (studio) and AdminProjectDetail (admin review).

// ── Duty rate tables ──────────────────────────────────────────────────────────

export const DUTY = {
  'Dresses':                 { W:{def:.120}, K:{def:.160}, def:.120 },
  'Tops':                    { W:{Women:.181,Men:.197,def:.18}, K:{def:.320}, def:.18 },
  'Shirts':                  { W:{Women:.254,Men:.197,def:.20}, K:{def:.20}, def:.20 },
  'T-shirts':                { def:.165 },
  'Tunics':                  { def:.180 },
  'Co-ord sets':             { def:.140 },
  'Jumpsuits':               { def:.140 },
  'Skirts':                  { W:{def:.185}, K:{def:.185}, def:.185 },
  'Shorts':                  { def:.114 },
  'Trousers / Pants':        { W:{Women:.266,Men:.136,def:.20}, K:{def:.150}, def:.20 },
  'Denim (Jeans / Jackets)': { def:.166 },
  'Blazers':                 { def:.269 },
  'Coats & Jackets':         { def:.269 },
  'Capes':                   { def:.120 },
  'Waistcoats / Vests':      { def:.269 },
  'Kaftans':                 { def:.120 },
  'Resortwear sets':         { def:.140 },
  'Loungewear / Sleepwear':  { def:.100 },
  'Activewear':              { W:{def:.200}, K:{def:.375}, def:.200 },
  'Kidswear':                { def:.140 },
  'Accessories (Scarves/Stoles)': { def:.105 },
};

export const HF_DUTY = {
  'Sheets / Fitted Sheets':.067,'Duvet Covers':.067,'Pillowcases':.067,
  'Comforters / Duvets':.091,'Bedspreads':.065,'Quilts':.084,'Blankets':.084,
  'Cushion Covers':.065,'Throw Pillows':.091,'Floor Cushions':.091,
  'Bolsters':.091,'Throw Blankets':.084,
  'Tablecloths':.064,'Table Runners':.064,'Placemats':.064,'Napkins':.064,'Coasters':.070,
  'Curtains':.115,'Drapes':.115,'Sheers':.115,'Valances':.115,'Fabric Blinds':.115,
  'Rugs':.038,'Carpets':.038,'Dhurries':.038,'Floor Runners':.038,
  'Wall Hangings':.047,'Tapestries':.047,'Decorative Panels':.047,
  'Bath Towels':.091,'Hand Towels':.091,'Washcloths':.091,'Bath Mats':.091,
  'Bathrobes':.089,'Shower Curtains':.115,
  'Tea / Dish Towels':.064,'Aprons':.082,'Oven Mitts':.070,'Pot Holders':.070,
  'Upholstery Fabric':.078,'Slipcovers':.065,'Furniture Throws':.084,
  'Lampshades':.065,'Table Décor':.070,'Fabric Baskets':.070,'Poufs':.065,
};

export const JEW_DUTY = {
  'Fashion / Imitation': 0.110,
  'Gold-plated / Demi':  0.110,
  'Silver (Fine)':       0.135,
  'Gold (Fine)':         0.055,
};

export const ACC_DUTY = {
  'Scarves & Wraps': 0.105,
  'Bags':            0.180,
  'Belts':           0.140,
  'Headwear':        0.068,
  'Footwear':        0.100,
  'Neckwear':        0.120,
};

// ── Category / option lists ───────────────────────────────────────────────────

export const APPAREL_CATS = [
  'Dresses','Tops','Shirts','T-shirts','Tunics','Co-ord sets','Jumpsuits',
  'Skirts','Shorts','Trousers / Pants','Denim (Jeans / Jackets)','Blazers',
  'Coats & Jackets','Capes','Waistcoats / Vests','Kaftans','Resortwear sets',
  'Loungewear / Sleepwear','Activewear','Kidswear','Accessories (Scarves/Stoles)',
];
export const HF_CATS = [
  'Sheets / Fitted Sheets','Duvet Covers','Pillowcases','Comforters / Duvets','Bedspreads',
  'Quilts','Blankets','Cushion Covers','Throw Pillows','Floor Cushions','Bolsters',
  'Throw Blankets','Tablecloths','Table Runners','Placemats','Napkins','Coasters',
  'Curtains','Drapes','Sheers','Valances','Fabric Blinds','Rugs','Carpets','Dhurries',
  'Floor Runners','Wall Hangings','Tapestries','Decorative Panels','Bath Towels',
  'Hand Towels','Washcloths','Bath Mats','Bathrobes','Shower Curtains',
  'Tea / Dish Towels','Aprons','Oven Mitts','Pot Holders','Upholstery Fabric',
  'Slipcovers','Furniture Throws','Lampshades','Table Décor','Fabric Baskets','Poufs',
];
export const JEW_CATS = [
  'Earrings','Necklaces','Rings','Bracelets','Anklets & Toe Rings',
  'Hair & Head','Nose Jewellery','Brooches & Pins','Body & Other','Sets & Bridal',
];
export const JEW_MATERIALS = ['Fashion / Imitation','Gold-plated / Demi','Silver (Fine)','Gold (Fine)'];
export const ACC_CATS      = ['Scarves & Wraps','Bags','Belts','Headwear','Footwear','Neckwear'];
export const ACC_MATERIALS = ['Fabric','Leather','Canvas','Straw / Raffia','Jute','Other'];
export const GENDERS       = ['Women','Men'];
export const TECHNIQUES    = ['Woven','Knitted / Crocheted'];
export const MATERIALS     = ['Cotton','Silk','Linen','Hemp','Wool','Polyester','Viscose','Other'];
export const GST_OPTIONS   = [
  ['0','0%'],['0.0025','0.25%'],['0.03','3%'],['0.05','5%'],
  ['0.12','12%'],['0.18','18%'],['0.28','28%'],
];

export function getCats(domain) {
  if (domain === 'jewellery')       return JEW_CATS;
  if (domain === 'home_furnishings') return HF_CATS;
  if (domain === 'accessories')     return ACC_CATS;
  return APPAREL_CATS;
}

// ── Duty lookup ───────────────────────────────────────────────────────────────

export function getDuty(domain, gender, tech, cat, mat) {
  if (domain === 'jewellery')       return JEW_DUTY[mat] ?? 0.110;
  if (domain === 'home_furnishings') return HF_DUTY[cat] ?? 0.07;
  if (domain === 'accessories')     return ACC_DUTY[cat] ?? 0.12;
  const c = DUTY[cat];
  if (!c) return 0.15;
  const t = c[tech === 'Woven' ? 'W' : 'K'];
  if (t) {
    const r = t[gender] !== undefined ? t[gender] : t.def;
    return r !== undefined ? r : (c.def || 0.15);
  }
  return c.def !== undefined ? c.def : 0.15;
}

// ── Shipping rate functions ───────────────────────────────────────────────────

// DHL Express — calibrated from live data: 30kg=$330.55, 64kg=$621.47
// isProd=false (sampling) → 70% rate
export function dhlRate(chargeableFinal, isProd) {
  const wt = chargeableFinal <= 30
    ? Math.ceil(chargeableFinal * 2) / 2
    : Math.ceil(chargeableFinal);
  let r;
  if (wt <= 1)        r = 65;
  else if (wt <= 10)  r = 65    + (wt - 1)  * (200     - 65)    / 9;
  else if (wt <= 30)  r = 200   + (wt - 10) * (330.55  - 200)   / 20;
  else                r = 330.55 + (wt - 30) * (621.47  - 330.55) / 34;
  return isProd ? r : r * 0.70;
}

// ShipGlobal — INR incl. 18% GST, 0.5kg steps
const SG_RATES = [
  [0.5,1216.58],[1.0,1670.88],[1.5,2293.92],[2.0,2867.40],[2.5,3437.34],
  [3.0,4003.74],[3.5,4566.60],[4.0,5112.94],[4.5,5668.72],[5.0,6239.84],
  [5.5,5522.40],[6.0,5850.44],[6.5,6172.58],[7.0,6547.82],[7.5,6897.10],
  [8.0,7336.06],[8.5,7717.20],[9.0,8137.28],[9.5,8264.72],[10.0,8657.66],
  [10.5,9451.80],[11.0,9451.80],[11.5,10229.42],[12.0,10229.42],
  [12.5,11011.76],[13.0,11011.76],[13.5,11745.72],[14.0,11745.72],
  [14.5,12577.62],[15.0,12577.62],[15.5,13368.22],[16.0,13368.22],
  [16.5,14136.40],[17.0,14136.40],[17.5,14901.04],[18.0,14901.04],
  [18.5,15666.86],[19.0,15666.86],[19.5,16509.38],[20.0,16509.38],
  [20.5,17276.38],[21.0,17276.38],[21.5,18043.38],[22.0,18043.38],
  [22.5,18747.84],[23.0,18747.84],[23.5,19459.38],[24.0,19459.38],
  [24.5,20172.10],[25.0,20172.10],[25.5,20942.64],[26.0,20942.64],
  [26.5,21726.16],[27.0,21726.16],[27.5,22482.54],[28.0,22482.54],
  [28.5,23182.28],[29.0,23182.28],[29.5,23905.62],[30.0,23905.62],
];

export function sgRate(chargeableFinal, isProd) {
  const wt = chargeableFinal <= 30
    ? Math.ceil(chargeableFinal * 2) / 2
    : Math.ceil(chargeableFinal);
  let rINR;
  if (wt <= 30) {
    const entry = SG_RATES.find(r => r[0] >= wt);
    rINR = entry ? entry[1] : SG_RATES[SG_RATES.length - 1][1];
  } else {
    const perKg = SG_RATES[SG_RATES.length - 1][1] - SG_RATES[SG_RATES.length - 3][1];
    rINR = SG_RATES[SG_RATES.length - 1][1] + (wt - 30) * perKg;
  }
  return isProd ? rINR : rINR * 0.70;
}

// 5-ply corrugated carton weight: ~1100 gsm = 1.1 kg/m²
export function cartonWeight(l, w, h) {
  return Math.round(2 * (l * w + l * h + w * h) / 10000 * 1.1 * 10) / 10;
}

// ── Main calculation engine ───────────────────────────────────────────────────

/**
 * Compute the full landing cost breakdown.
 *
 * @param {object} params
 * @param {Array}  params.lineItems   - array of item objects from state
 * @param {Array}  params.boxes       - array of box objects from state
 * @param {string} params.domain      - 'apparel' | 'home_furnishings' | 'jewellery' | 'accessories'
 * @param {string} params.orderType   - 'designing' | 'sampling' | 'production'
 * @param {string} params.shipping    - 'dhl' | 'shipglobal'
 * @param {number} params.forex       - USD/INR rate
 * @param {number} params.pfPct       - platform fee 0–0.15 (default 0.15)
 * @param {number} params.advancePct  - advance split 0–1 (default 0.5)
 *
 * @returns {object} result with all breakdown values
 */
export function calcLandingCost({
  lineItems = [],
  boxes     = [],
  domain    = 'apparel',
  orderType = 'production',
  shipping  = 'dhl',
  forex     = 91.62,
  pfPct     = 0.15,
  advancePct = 0.5,
}) {
  const isProd = orderType === 'production';
  const isSG   = shipping  === 'shipglobal';

  // ── Process line items ──────────────────────────────────────────────────────
  const items = lineItems
    .filter(it => it.qty > 0 && it.cost_per_pc_inr > 0)
    .map(it => {
      const prodUSD  = it.cost_per_pc_inr * it.qty / forex;
      const dutyPct  = getDuty(domain, it.gender || 'Women', it.technique || 'Woven', it.category || getCats(domain)[0], it.material || '');
      const dutyBase = isProd ? prodUSD : (it.declared_value_usd || 0);
      const gstRate  = parseFloat(it.gst_rate) || 0;
      return { ...it, prodUSD, dutyPct, dutyBase, gstRate };
    });

  // ── Weight calculation ──────────────────────────────────────────────────────
  let cartWt = 0, volWt = 0;
  for (const b of boxes) {
    cartWt += cartonWeight(b.length_cm, b.width_cm, b.height_cm) * b.qty;
    volWt  += (b.length_cm * b.width_cm * b.height_cm / 5000) * b.qty;
  }
  const itemsActWt = items.reduce((s, it) => s + (it.weight_per_pc || 0) * it.qty, 0);
  const totalActWt = itemsActWt + cartWt;
  const chargeBase = Math.max(totalActWt, volWt);
  const chargeMgn  = chargeBase * 0.10;
  const chargeFin  = chargeBase + chargeMgn;

  // ── Shipping ────────────────────────────────────────────────────────────────
  let shippingUSD = 0;
  let shippingINR = 0;
  if (chargeBase > 0) {
    if (isSG) {
      shippingINR = sgRate(chargeFin, isProd);
      shippingUSD = shippingINR / forex;
    } else {
      // DHL: multiply by 1.10 for fuel/surcharge
      shippingUSD = dhlRate(chargeFin, isProd) * 1.10;
      shippingINR = shippingUSD * forex;
    }
  }

  // ── Import duties (DHL only; ShipGlobal = duties included) ─────────────────
  let totalDutyUSD = 0;
  let procFee = 0;
  if (!isSG) {
    const totalDutyBase = items.reduce((s, it) => s + it.dutyBase, 0);
    procFee = totalDutyBase < 2500
      ? 2.0
      : Math.max(totalDutyBase * 0.003464, 33.58);
    for (const it of items) {
      const ps     = totalDutyBase > 0 ? (it.dutyBase / totalDutyBase) * procFee : 0;
      it.dutyUSD   = it.dutyBase * it.dutyPct + ps;
    }
    totalDutyUSD = items.reduce((s, it) => s + (it.dutyUSD || 0), 0);
  }

  // ── Platform fee + landing cost ─────────────────────────────────────────────
  const totalProdUSD = items.reduce((s, it) => s + it.prodUSD, 0);
  const pfBase       = totalProdUSD + shippingUSD + totalDutyUSD;
  // Platform fee is applied as % of landing cost (gross margin model)
  const subtotal     = pfPct < 1 ? pfBase / (1 - pfPct) : pfBase;
  const pfTotal      = subtotal * pfPct;
  const bpAmt        = subtotal * pfPct * (10 / 15);
  const tcAmt        = subtotal * pfPct * (3.5 / 15);
  const pgcAmt       = subtotal * pfPct * (1.5 / 15);
  const pgBuyer      = subtotal * 0.05;       // 5% card surcharge (buyer pays separately)
  const totalWithPG  = subtotal + pgBuyer;

  // ── Studio payout ───────────────────────────────────────────────────────────
  const payoutBaseINR = items.reduce((s, it) => s + it.cost_per_pc_inr * it.qty, 0);
  const payoutGSTINR  = items.reduce((s, it) => s + it.cost_per_pc_inr * it.qty * it.gstRate, 0);
  const payoutTotalINR = payoutBaseINR + payoutGSTINR;

  // ── Advance / balance ───────────────────────────────────────────────────────
  const advanceINR  = payoutTotalINR * advancePct;
  const balanceINR  = payoutTotalINR * (1 - advancePct);

  return {
    // Items with per-item duty
    items,
    // Weights
    itemsActWt, cartWt, totalActWt, volWt, chargeBase, chargeMgn, chargeFin,
    // Shipping
    shippingUSD, shippingINR,
    // Duties
    totalDutyUSD, procFee,
    // Cost build-up
    totalProdUSD, pfBase, subtotal, pfTotal, bpAmt, tcAmt, pgcAmt,
    pgBuyer, totalWithPG,
    // Platform fee breakdown rates
    bpRate: pfPct * (10 / 15),
    tcRate: pfPct * (3.5 / 15),
    pgcRate: pfPct * (1.5 / 15),
    // Studio payout
    payoutBaseINR, payoutGSTINR, payoutTotalINR, advanceINR, balanceINR,
    // Convenience
    landingCostUSD: subtotal,
    hasItems: items.length > 0,
    isSG,
  };
}

// ── Forex fetch ───────────────────────────────────────────────────────────────

export async function fetchForex() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const d = await r.json();
    if (d.result === 'success' && d.rates?.INR) {
      // Reference uses live rate - 3 as conservative estimate
      return Math.round((d.rates.INR - 3) * 100) / 100;
    }
  } catch {}
  return 91.62; // fallback
}

// ── Formatters ────────────────────────────────────────────────────────────────

export const fmtUSD = (x, dp = 2) =>
  x == null || isNaN(x) ? '—' : '$' + x.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const fmtINR = x =>
  x == null || isNaN(x) ? '—' : '₹' + Math.round(x).toLocaleString('en-IN');

export const fmtKg = x =>
  !x || isNaN(x) ? '—' : x.toFixed(2) + ' kg';

export const fmtPct = x => (x * 100).toFixed(1).replace('.0', '') + '%';