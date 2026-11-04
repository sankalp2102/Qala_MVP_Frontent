// src/constants/countryCodes.js
//
// ITU E.164 country calling codes — a stable, long-established standard,
// not something that changes. Sorted by country name for a predictable,
// alphabetical dropdown. +1 (US/Canada) covers both under the shared
// North American Numbering Plan, listed once rather than duplicated.
//
// Originally built (Sep 2026) inline in AdminDashboard.jsx for the trade-
// show "Order Booth" buyer-phone field. Pulled out here (Nov 2026) so
// Brief.jsx's buyer-contact modal (qalawati discovery flow) can use the
// exact same list and dropdown pattern instead of duplicating a ~90-entry
// array. Import this one list from both places rather than re-adding it
// inline anywhere else.
export const COUNTRY_CODES = [
  { name: 'Afghanistan', code: '+93' }, { name: 'Albania', code: '+355' },
  { name: 'Algeria', code: '+213' }, { name: 'Argentina', code: '+54' },
  { name: 'Armenia', code: '+374' }, { name: 'Australia', code: '+61' },
  { name: 'Austria', code: '+43' }, { name: 'Azerbaijan', code: '+994' },
  { name: 'Bahrain', code: '+973' }, { name: 'Bangladesh', code: '+880' },
  { name: 'Belarus', code: '+375' }, { name: 'Belgium', code: '+32' },
  { name: 'Bolivia', code: '+591' }, { name: 'Brazil', code: '+55' },
  { name: 'Bulgaria', code: '+359' }, { name: 'Cambodia', code: '+855' },
  { name: 'Canada', code: '+1' }, { name: 'Chile', code: '+56' },
  { name: 'China', code: '+86' }, { name: 'Colombia', code: '+57' },
  { name: 'Costa Rica', code: '+506' }, { name: 'Croatia', code: '+385' },
  { name: 'Cyprus', code: '+357' }, { name: 'Czech Republic', code: '+420' },
  { name: 'Denmark', code: '+45' }, { name: 'Ecuador', code: '+593' },
  { name: 'Egypt', code: '+20' }, { name: 'Estonia', code: '+372' },
  { name: 'Ethiopia', code: '+251' }, { name: 'Finland', code: '+358' },
  { name: 'France', code: '+33' }, { name: 'Georgia', code: '+995' },
  { name: 'Germany', code: '+49' }, { name: 'Ghana', code: '+233' },
  { name: 'Greece', code: '+30' }, { name: 'Hong Kong', code: '+852' },
  { name: 'Hungary', code: '+36' }, { name: 'Iceland', code: '+354' },
  { name: 'India', code: '+91' }, { name: 'Indonesia', code: '+62' },
  { name: 'Iran', code: '+98' }, { name: 'Iraq', code: '+964' },
  { name: 'Ireland', code: '+353' }, { name: 'Israel', code: '+972' },
  { name: 'Italy', code: '+39' }, { name: 'Japan', code: '+81' },
  { name: 'Jordan', code: '+962' }, { name: 'Kazakhstan', code: '+7' },
  { name: 'Kenya', code: '+254' }, { name: 'Kuwait', code: '+965' },
  { name: 'Latvia', code: '+371' }, { name: 'Lebanon', code: '+961' },
  { name: 'Lithuania', code: '+370' }, { name: 'Luxembourg', code: '+352' },
  { name: 'Malaysia', code: '+60' }, { name: 'Malta', code: '+356' },
  { name: 'Mexico', code: '+52' }, { name: 'Morocco', code: '+212' },
  { name: 'Nepal', code: '+977' }, { name: 'Netherlands', code: '+31' },
  { name: 'New Zealand', code: '+64' }, { name: 'Nigeria', code: '+234' },
  { name: 'Norway', code: '+47' }, { name: 'Oman', code: '+968' },
  { name: 'Pakistan', code: '+92' }, { name: 'Panama', code: '+507' },
  { name: 'Peru', code: '+51' }, { name: 'Philippines', code: '+63' },
  { name: 'Poland', code: '+48' }, { name: 'Portugal', code: '+351' },
  { name: 'Qatar', code: '+974' }, { name: 'Romania', code: '+40' },
  { name: 'Russia', code: '+7' }, { name: 'Saudi Arabia', code: '+966' },
  { name: 'Serbia', code: '+381' }, { name: 'Singapore', code: '+65' },
  { name: 'Slovakia', code: '+421' }, { name: 'Slovenia', code: '+386' },
  { name: 'South Africa', code: '+27' }, { name: 'South Korea', code: '+82' },
  { name: 'Spain', code: '+34' }, { name: 'Sri Lanka', code: '+94' },
  { name: 'Sweden', code: '+46' }, { name: 'Switzerland', code: '+41' },
  { name: 'Taiwan', code: '+886' }, { name: 'Thailand', code: '+66' },
  { name: 'Turkey', code: '+90' }, { name: 'Ukraine', code: '+380' },
  { name: 'United Arab Emirates', code: '+971' }, { name: 'United Kingdom', code: '+44' },
  { name: 'United States', code: '+1' }, { name: 'Uruguay', code: '+598' }, { name: 'Venezuela', code: '+58' },
  { name: 'Vietnam', code: '+84' },
];