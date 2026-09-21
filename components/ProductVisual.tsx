import type { ProductShape } from "@/lib/types";

/**
 * Visual placeholder de producto, dibujado con SVG a partir de la categoría.
 * Reemplazable por fotografías reales más adelante (cambiar por <Image />).
 * Usa los colores de la marca/acento para que no se vea genérico.
 */
export function ProductVisual({
  shape,
  brandLabel,
  className,
  accent = "rgb(var(--color-accent))",
}: {
  shape: ProductShape;
  brandLabel?: string;
  className?: string;
  accent?: string;
}) {
  const navy = "rgb(var(--color-primary))";
  const navySoft = "rgb(var(--color-primary-soft))";

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Imagen de producto (placeholder)"
    >
      <defs>
        <linearGradient id={`bg-${shape}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--color-bg))" />
          <stop offset="100%" stopColor="rgb(var(--color-bg-soft))" />
        </linearGradient>
        <linearGradient id={`body-${shape}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={navySoft} />
          <stop offset="100%" stopColor={navy} />
        </linearGradient>
      </defs>

      <rect width="200" height="200" rx="14" fill={`url(#bg-${shape})`} />
      {/* piso/sombra */}
      <ellipse cx="100" cy="168" rx="52" ry="9" fill="rgb(15 27 42 / 0.08)" />

      {shape === "tub" && <Tub accent={accent} shape={shape} />}
      {shape === "jar" && <Jar accent={accent} shape={shape} />}
      {shape === "bottle" && <Bottle accent={accent} shape={shape} />}
      {shape === "pills" && <Pills accent={accent} shape={shape} />}
      {shape === "bar" && <Bar accent={accent} shape={shape} />}
      {shape === "combo" && <Combo accent={accent} shape={shape} />}

      {brandLabel && (
        <text
          x="100"
          y="112"
          textAnchor="middle"
          fontFamily="var(--font-display), sans-serif"
          fontSize="13"
          fontWeight="800"
          fill="#fff"
          opacity="0.95"
          letterSpacing="0.5"
        >
          {brandLabel}
        </text>
      )}
    </svg>
  );
}

function Tub({ accent, shape }: { accent: string; shape: string }) {
  return (
    <g>
      <rect x="62" y="70" width="76" height="82" rx="12" fill={`url(#body-${shape})`} />
      <rect x="58" y="56" width="84" height="20" rx="9" fill={accent} />
      <rect x="70" y="48" width="60" height="14" rx="7" fill={accent} opacity="0.8" />
      <rect x="70" y="122" width="60" height="18" rx="5" fill="#fff" opacity="0.14" />
    </g>
  );
}

function Jar({ accent, shape }: { accent: string; shape: string }) {
  return (
    <g>
      <rect x="66" y="78" width="68" height="74" rx="14" fill={`url(#body-${shape})`} />
      <rect x="62" y="62" width="76" height="22" rx="8" fill={accent} />
      <circle cx="100" cy="55" r="8" fill={accent} opacity="0.7" />
    </g>
  );
}

function Bottle({ accent, shape }: { accent: string; shape: string }) {
  return (
    <g>
      <rect x="74" y="74" width="52" height="78" rx="12" fill={`url(#body-${shape})`} />
      <rect x="82" y="52" width="36" height="26" rx="6" fill={`url(#body-${shape})`} />
      <rect x="80" y="44" width="40" height="12" rx="5" fill={accent} />
      <rect x="80" y="120" width="40" height="20" rx="4" fill="#fff" opacity="0.14" />
    </g>
  );
}

function Pills({ accent, shape }: { accent: string; shape: string }) {
  return (
    <g>
      <rect x="72" y="72" width="56" height="80" rx="12" fill={`url(#body-${shape})`} />
      <rect x="72" y="60" width="56" height="18" rx="6" fill={accent} />
      <rect x="84" y="50" width="32" height="14" rx="5" fill="#fff" opacity="0.9" />
      <circle cx="150" cy="132" r="12" fill={accent} />
      <circle cx="150" cy="132" r="12" fill="none" stroke="#fff" strokeOpacity="0.5" />
      <line x1="140" y1="132" x2="160" y2="132" stroke="#fff" strokeOpacity="0.6" />
    </g>
  );
}

function Bar({ accent, shape }: { accent: string; shape: string }) {
  return (
    <g>
      <rect
        x="46"
        y="86"
        width="108"
        height="42"
        rx="10"
        fill={`url(#body-${shape})`}
        transform="rotate(-8 100 107)"
      />
      <rect
        x="46"
        y="86"
        width="108"
        height="14"
        rx="7"
        fill={accent}
        transform="rotate(-8 100 107)"
      />
      <path
        d="M52 92 h96"
        stroke="#fff"
        strokeOpacity="0.2"
        strokeDasharray="3 6"
        transform="rotate(-8 100 107)"
      />
    </g>
  );
}

function Combo({ accent, shape }: { accent: string; shape: string }) {
  return (
    <g>
      <rect x="44" y="82" width="60" height="70" rx="11" fill={`url(#body-${shape})`} />
      <rect x="40" y="70" width="68" height="18" rx="8" fill={accent} />
      <rect x="106" y="94" width="52" height="58" rx="11" fill={`url(#body-${shape})`} />
      <rect x="102" y="82" width="60" height="16" rx="7" fill={accent} opacity="0.85" />
    </g>
  );
}
