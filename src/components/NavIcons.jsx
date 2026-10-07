// Outline nav icons for the admin sidebar. Inline SVG (no icon-library
// dependency); stroke uses currentColor so they pick up the nav link's
// normal / hover / active colour automatically.

const Svg = ({ children, size = 18 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false"
  >
    {children}
  </svg>
);

export const NavIcons = {
  overview: (
    <Svg>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Svg>
  ),
  projects: (
    <Svg>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </Svg>
  ),
  orders: (
    <Svg>
      <path d="M4 7h16M4 12h10M4 17h6" />
    </Svg>
  ),
  booth: (
    <Svg>
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0 2.67 2.67 0 0 0 5.33 0" />
      <path d="M5.5 12.5V20h13v-7.5" />
      <path d="M10 20v-4.5h4V20" />
    </Svg>
  ),
  discovery: (
    <Svg>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </Svg>
  ),
  inquiries: (
    <Svg>
      <path d="M20.5 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.6A7.5 7.5 0 1 1 20.5 12Z" />
    </Svg>
  ),
  review: (
    <Svg>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4V3h6v1M9 13l2 2 4-4.5" />
    </Svg>
  ),
  createSeller: (
    <Svg>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8v5M16.5 10.5h5" />
    </Svg>
  ),
  descriptions: (
    <Svg>
      <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8a1 1 0 0 1 0 1.4l-7.6 7.6a1 1 0 0 1-1.4 0l-8-8Z" />
      <circle cx="8" cy="8" r="1.2" />
    </Svg>
  ),
  contacts: (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Svg>
  ),
  accessRequests: (
    <Svg>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" />
    </Svg>
  ),
  introductions: (
    <Svg>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.2a6.2 6.2 0 0 1 3.2 5.3" />
    </Svg>
  ),
  library: (
    <Svg>
      <path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19.5v15H6.5a2 2 0 0 0-2 2V5.5Z" />
      <path d="M4.5 18.5a2 2 0 0 1 2-2h13M9 8h6" />
    </Svg>
  ),
  accessKeys: (
    <Svg>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />
    </Svg>
  ),
};