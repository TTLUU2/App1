// Perry — the friendly cartoon-plane mascot that fronts the PH Copilot.
// Self-contained inline SVG with a CSS keyframe blink animation; no
// external assets, no Lottie, no images. Drop in anywhere as
// <PerryIcon size={N} />.
//
// Lifted verbatim (with minor formatting only) from the Points Genie
// project at chatbot PH files/points-genie/frontend/src/components/
// PerryIcon.tsx — same character so the brand reads continuously across
// surfaces. Used by:
//   - Ask Copilot header + per-answer avatar on /ask (via PerryAvatar
//     in @/components/lacquer/perry-avatar.tsx, which wraps this icon)
//   - /ask page header (when the user enters the chat)
//   - Other places we want to put a friendly face on Copilot responses

interface PerryIconProps {
  size?: number;
  className?: string;
}

export function PerryIcon({ size = 32, className = '' }: PerryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <style>{`
        @keyframes perry-blink {
          0%, 18% { transform: scaleY(1); }
          20% { transform: scaleY(0.05); }
          22% { transform: scaleY(1); }
          26% { transform: scaleY(0.05); }
          28%, 100% { transform: scaleY(1); }
        }
        .perry-eye {
          animation: perry-blink 5s ease-in-out infinite;
        }
      `}</style>

      {/* Tail fin — pink, visible behind body */}
      <path d="M30 14 L32 8 L34 14 Z" fill="#F9A8B8" />
      <path d="M30.5 14 L32 9.5 L33.5 14 Z" fill="#FBC4D0" />

      {/* Wings — silver/grey, extending from sides */}
      {/* Left wing */}
      <rect x="3" y="33" width="17" height="4" rx="2" fill="#B0BEC5" />
      <rect x="4" y="33.5" width="15" height="2.5" rx="1.2" fill="#CFD8DC" />
      {/* Wing stripe */}
      <rect x="5" y="34.5" width="12" height="0.8" rx="0.4" fill="#90A4AE" opacity="0.5" />
      {/* Right wing */}
      <rect x="44" y="33" width="17" height="4" rx="2" fill="#B0BEC5" />
      <rect x="45" y="33.5" width="15" height="2.5" rx="1.2" fill="#CFD8DC" />
      {/* Wing stripe */}
      <rect x="47" y="34.5" width="12" height="0.8" rx="0.4" fill="#90A4AE" opacity="0.5" />

      {/* Landing gear struts */}
      <line
        x1="26"
        y1="48"
        x2="24"
        y2="53"
        stroke="#78909C"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="38"
        y1="48"
        x2="40"
        y2="53"
        stroke="#78909C"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Wheels */}
      <circle cx="23.5" cy="54.5" r="2.5" fill="#455A64" />
      <circle cx="23.5" cy="54.5" r="1.3" fill="#37474F" />
      <circle cx="23.5" cy="54.5" r="0.5" fill="#78909C" />
      <circle cx="40.5" cy="54.5" r="2.5" fill="#455A64" />
      <circle cx="40.5" cy="54.5" r="1.3" fill="#37474F" />
      <circle cx="40.5" cy="54.5" r="0.5" fill="#78909C" />

      {/* Main body — white/cream round fuselage (nose) */}
      <circle cx="32" cy="34" r="16" fill="#F5F0EB" />
      <circle cx="32" cy="34" r="15" fill="#FAF6F1" />
      {/* Subtle top highlight for 3D roundness */}
      <ellipse cx="32" cy="28" rx="10" ry="7" fill="white" opacity="0.6" />

      {/* Blue visor stripe across top — windshield frame */}
      <path
        d="M19 27 Q22 21 32 20 Q42 21 45 27"
        stroke="#5B7FA5"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Visor cap top — subtle blue band */}
      <path d="M22 24 Q27 19 32 18.5 Q37 19 42 24" fill="#7BA3C9" opacity="0.3" />

      {/* Small windows on fuselage — pastel pink */}
      <rect x="14" y="35" width="2.5" height="1.5" rx="0.7" fill="#F9C4D0" opacity="0.7" />
      <rect x="14" y="38" width="2.5" height="1.5" rx="0.7" fill="#F9C4D0" opacity="0.6" />
      <rect x="14" y="41" width="2.5" height="1.5" rx="0.7" fill="#F9C4D0" opacity="0.5" />

      {/* Eyes — big, round, Pixar-style with blink animation */}
      {/* Left eye */}
      <g className="perry-eye" style={{ transformOrigin: '26px 30px' }}>
        <ellipse cx="26" cy="30" rx="5" ry="5.5" fill="white" />
        <ellipse
          cx="26"
          cy="30"
          rx="4.6"
          ry="5.1"
          fill="white"
          stroke="#D1D5DB"
          strokeWidth="0.3"
        />
        <circle cx="26.5" cy="30.5" r="3" fill="#4A5568" />
        <circle cx="26.5" cy="30.5" r="2.6" fill="#2D3748" />
        <circle cx="26.5" cy="30.5" r="1.5" fill="#1A202C" />
        <circle cx="25" cy="29" r="1" fill="white" />
        <circle cx="27.5" cy="31.5" r="0.5" fill="white" opacity="0.6" />
      </g>

      {/* Right eye */}
      <g className="perry-eye" style={{ transformOrigin: '38px 30px' }}>
        <ellipse cx="38" cy="30" rx="5" ry="5.5" fill="white" />
        <ellipse
          cx="38"
          cy="30"
          rx="4.6"
          ry="5.1"
          fill="white"
          stroke="#D1D5DB"
          strokeWidth="0.3"
        />
        <circle cx="37.5" cy="30.5" r="3" fill="#4A5568" />
        <circle cx="37.5" cy="30.5" r="2.6" fill="#2D3748" />
        <circle cx="37.5" cy="30.5" r="1.5" fill="#1A202C" />
        <circle cx="37" cy="29" r="1" fill="white" />
        <circle cx="39" cy="31.5" r="0.5" fill="white" opacity="0.6" />
      </g>

      {/* Eyebrow arches — dark, from windshield frame */}
      <path
        d="M21.5 25.5 Q26 23 30 25.5"
        stroke="#455A64"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 25.5 Q38 23 42.5 25.5"
        stroke="#455A64"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Rosy cheeks — soft pink circles */}
      <circle cx="20" cy="37" r="3" fill="#F9A8B8" opacity="0.45" />
      <circle cx="44" cy="37" r="3" fill="#F9A8B8" opacity="0.45" />

      {/* Nose / nose bridge — subtle */}
      <ellipse cx="32" cy="35" rx="1" ry="0.6" fill="#E8DDD4" />

      {/* Wide open mouth — dark interior with excitement */}
      <path d="M26 40 Q32 47 38 40" fill="#4A3728" />
      {/* Upper lip line */}
      <path d="M26 40 Q32 38 38 40" fill="#FAF6F1" />
      {/* Tongue hint */}
      <ellipse cx="32" cy="44" rx="3" ry="1.5" fill="#E8837C" opacity="0.7" />
      {/* Tooth edge / lip highlight */}
      <path d="M27.5 40.5 Q32 39 36.5 40.5" fill="white" opacity="0.8" />

      {/* Pastel globe/heart sticker on cheek */}
      <circle cx="42" cy="40" r="1.8" fill="#A8D8F0" opacity="0.5" />
      <circle cx="42" cy="40" r="1" fill="#7EC8E3" opacity="0.4" />

      {/* Subtle gold accent stripe on forehead */}
      <path
        d="M28 22 Q32 21 36 22"
        stroke="#E8C87A"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
