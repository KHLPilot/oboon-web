export default function ConditionMapSvgBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 460 480"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <pattern
            id="dots"
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" fill="var(--oboon-map-dot)" opacity="0.7" />
          </pattern>
          <pattern
            id="hatch"
            x="0"
            y="0"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0,4 L4,0"
              stroke="var(--oboon-map-hatch)"
              strokeWidth="0.6"
              opacity="0.5"
            />
          </pattern>
        </defs>

        <rect width="460" height="480" fill="var(--oboon-map-bg)" />
        <rect width="460" height="480" fill="url(#dots)" />

        <rect x="0" y="0" width="98" height="72" fill="var(--oboon-map-block-a)" rx="0" />
        <rect x="0" y="0" width="98" height="72" fill="url(#hatch)" />
        <rect x="4" y="4" width="88" height="62" fill="var(--oboon-map-block-b)" rx="2" opacity="0.6" />
        <rect x="128" y="0" width="80" height="55" fill="var(--oboon-map-block-a)" />
        <rect x="128" y="0" width="80" height="55" fill="url(#hatch)" />
        <rect x="230" y="0" width="70" height="55" fill="var(--oboon-map-block-a)" />
        <rect x="230" y="0" width="70" height="55" fill="url(#hatch)" />
        <rect x="320" y="0" width="140" height="55" fill="var(--oboon-map-block-b)" opacity="0.8" />
        <rect x="0" y="100" width="70" height="90" fill="var(--oboon-map-block-a)" />
        <rect x="0" y="100" width="70" height="90" fill="url(#hatch)" />
        <rect x="0" y="200" width="70" height="70" fill="var(--oboon-map-block-c)" />
        <rect x="90" y="90" width="85" height="65" fill="var(--oboon-map-block-a)" />
        <rect x="90" y="90" width="85" height="65" fill="url(#hatch)" />
        <rect x="90" y="170" width="85" height="55" fill="var(--oboon-map-block-b)" opacity="0.7" />
        <rect x="185" y="90" width="65" height="65" fill="var(--oboon-map-block-c)" />
        <rect x="185" y="170" width="65" height="55" fill="var(--oboon-map-block-a)" />
        <rect x="185" y="170" width="65" height="55" fill="url(#hatch)" />
        <rect x="270" y="78" width="90" height="75" fill="var(--oboon-map-block-a)" />
        <rect x="270" y="78" width="90" height="75" fill="url(#hatch)" />
        <rect x="370" y="78" width="90" height="75" fill="var(--oboon-map-block-c)" opacity="0.8" />
        <rect x="270" y="165" width="90" height="55" fill="var(--oboon-map-block-b)" />
        <rect x="370" y="165" width="90" height="55" fill="var(--oboon-map-block-a)" />
        <rect x="370" y="165" width="90" height="55" fill="url(#hatch)" />
        <rect x="0" y="290" width="85" height="85" fill="var(--oboon-map-block-a)" />
        <rect x="0" y="290" width="85" height="85" fill="url(#hatch)" />
        <rect x="0" y="385" width="85" height="95" fill="var(--oboon-map-block-c)" />
        <rect x="95" y="290" width="80" height="85" fill="var(--oboon-map-block-b)" opacity="0.7" />
        <rect x="95" y="385" width="80" height="95" fill="var(--oboon-map-block-a)" />
        <rect x="95" y="385" width="80" height="95" fill="url(#hatch)" />
        <rect x="185" y="245" width="65" height="55" fill="var(--oboon-map-block-a)" />
        <rect x="185" y="310" width="65" height="75" fill="var(--oboon-map-block-b)" />
        <rect x="185" y="395" width="65" height="85" fill="var(--oboon-map-block-c)" opacity="0.7" />
        <rect x="260" y="240" width="90" height="60" fill="var(--oboon-map-block-a)" />
        <rect x="260" y="240" width="90" height="60" fill="url(#hatch)" />
        <rect x="260" y="312" width="90" height="80" fill="var(--oboon-map-block-b)" />
        <rect x="260" y="402" width="90" height="78" fill="var(--oboon-map-block-a)" />
        <rect x="260" y="402" width="90" height="78" fill="url(#hatch)" />
        <rect x="362" y="240" width="98" height="60" fill="var(--oboon-map-block-c)" />
        <rect x="362" y="312" width="98" height="80" fill="var(--oboon-map-block-a)" />
        <rect x="362" y="312" width="98" height="80" fill="url(#hatch)" />
        <rect x="362" y="402" width="98" height="78" fill="var(--oboon-map-block-b)" opacity="0.6" />

        <line x1="0" y1="78" x2="460" y2="78" stroke="var(--oboon-map-road)" strokeWidth="7" />
        <line x1="0" y1="235" x2="460" y2="235" stroke="var(--oboon-map-road)" strokeWidth="7" />
        <line x1="0" y1="392" x2="460" y2="392" stroke="var(--oboon-map-road)" strokeWidth="5" />
        <line x1="108" y1="0" x2="108" y2="480" stroke="var(--oboon-map-road)" strokeWidth="7" />
        <line x1="260" y1="0" x2="260" y2="480" stroke="var(--oboon-map-road)" strokeWidth="7" />
        <line x1="370" y1="0" x2="370" y2="480" stroke="var(--oboon-map-road)" strokeWidth="5" />

        <line x1="0" y1="160" x2="260" y2="160" stroke="var(--oboon-map-road)" strokeWidth="3" />
        <line x1="0" y1="280" x2="260" y2="280" stroke="var(--oboon-map-road)" strokeWidth="3" />
        <line x1="260" y1="160" x2="460" y2="160" stroke="var(--oboon-map-road)" strokeWidth="3" />
        <line x1="260" y1="310" x2="460" y2="310" stroke="var(--oboon-map-road)" strokeWidth="3" />
        <line x1="0" y1="375" x2="260" y2="375" stroke="var(--oboon-map-road)" strokeWidth="2.5" />
        <line x1="185" y1="78" x2="185" y2="480" stroke="var(--oboon-map-road)" strokeWidth="3" />
        <line x1="70" y1="78" x2="70" y2="480" stroke="var(--oboon-map-road)" strokeWidth="3" />
        <line x1="360" y1="235" x2="360" y2="480" stroke="var(--oboon-map-road)" strokeWidth="2.5" />

        <line x1="108" y1="235" x2="185" y2="160" stroke="var(--oboon-map-road)" strokeWidth="2" />
        <line x1="185" y1="235" x2="260" y2="160" stroke="var(--oboon-map-road)" strokeWidth="2" />

        <line
          x1="0"
          y1="78"
          x2="460"
          y2="78"
          stroke="var(--oboon-map-road-dash)"
          strokeWidth="1"
          strokeDasharray="6,5"
          opacity="0.5"
        />
        <line
          x1="108"
          y1="0"
          x2="108"
          y2="480"
          stroke="var(--oboon-map-road-dash)"
          strokeWidth="1"
          strokeDasharray="6,5"
          opacity="0.5"
        />
        <line
          x1="260"
          y1="0"
          x2="260"
          y2="480"
          stroke="var(--oboon-map-road-dash)"
          strokeWidth="1"
          strokeDasharray="6,5"
          opacity="0.5"
        />

        <text
          x="130"
          y="73"
          fontSize="8"
          fill="var(--oboon-map-road-label)"
          fontFamily="sans-serif"
          fontWeight="600"
          letterSpacing="0.5"
        >
          강남대로
        </text>
        <text
          x="270"
          y="73"
          fontSize="8"
          fill="var(--oboon-map-road-label)"
          fontFamily="sans-serif"
          fontWeight="600"
          letterSpacing="0.5"
        >
          테헤란로
        </text>
        <text
          x="103"
          y="130"
          fontSize="7.5"
          fill="var(--oboon-map-road-label)"
          fontFamily="sans-serif"
          fontWeight="600"
          letterSpacing="0.3"
          transform="rotate(90, 103, 130)"
        >
          서초대로
        </text>
        <text
          x="255"
          y="140"
          fontSize="7.5"
          fill="var(--oboon-map-road-label)"
          fontFamily="sans-serif"
          fontWeight="600"
          letterSpacing="0.3"
          transform="rotate(90, 255, 140)"
        >
          반포대로
        </text>
        <text
          x="2"
          y="232"
          fontSize="7.5"
          fill="var(--oboon-map-road-label)"
          fontFamily="sans-serif"
          fontWeight="600"
          letterSpacing="0.3"
        >
          양재천로
        </text>
      </svg>
    </div>
  );
}
