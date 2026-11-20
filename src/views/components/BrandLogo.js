let nextClipId = 0;

/**
 * Creates the shared, theme-aware Q'atu brand logo.
 * @param {{ size?: 'sm'|'md'|'lg' }} [options]
 * @returns {SVGElement}
 */
export function createBrandLogo({ size = 'md' } = {}) {
  const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const clipId = `qatu-brand-logo-clip-${++nextClipId}`;

  logo.setAttribute('viewBox', '0 0 142 40');
  logo.setAttribute('role', 'img');
  logo.setAttribute('aria-label', 'Q’atu');
  logo.classList.add('q-brand-logo', 'q-brand-logo-svg', `q-brand-logo--${size}`);
  logo.innerHTML = `
    <defs>
      <clipPath id="${clipId}">
        <rect x="1" y="1" width="38" height="38" rx="10" />
      </clipPath>
    </defs>
    <g clip-path="url(#${clipId})">
      <rect x="1" y="1" width="38" height="38" fill="#ef6b73" />
      <rect x="1" y="10.5" width="38" height="9.5" fill="#f3a5bd" />
      <rect x="1" y="20" width="38" height="9.5" fill="#91b5ed" />
      <rect x="1" y="29.5" width="38" height="9.5" fill="#f2d47b" />
    </g>
    <polygon points="20,11.5 28.5,20 20,28.5 11.5,20" fill="#fff" />
    <text
      x="49"
      y="29"
      fill="currentColor"
      font-family="GeistSans, Inter, system-ui, sans-serif"
      font-size="29"
      font-weight="700"
      letter-spacing="-1.1">Q<tspan fill="var(--q-accent, #e11d74)">’</tspan>atu</text>
  `;

  return logo;
}
