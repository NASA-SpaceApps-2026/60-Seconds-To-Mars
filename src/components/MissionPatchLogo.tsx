import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Emblema ORIGINAL del juego (parche de misión estilo aeroespacial). No es el logotipo de la NASA
 * (uso restringido, 14 CFR 1221): planeta Marte con volumen, anillo orbital en diagonal, estrellas
 * y doble aro azul/rojo. También sirve de insignia coleccionable (texto propio + icono central).
 *
 * Geometría del texto circular (viewBox 200×200, centro 100,100; banda roja entre r=62 y r=88):
 *  - Arriba: línea base en r=70 recorrida en sentido horario → las letras crecen hacia fuera (70→~81).
 *  - Abajo: línea base en r=80 recorrida en sentido antihorario → las letras crecen hacia dentro (80→~70).
 *  El tamaño de letra se calcula según la longitud del texto para que nunca pise las estrellas laterales.
 */
const ARC_TOP_R = 70;
const ARC_BOTTOM_R = 80;
/** Longitud de arco disponible (≈ ±74° arriba, ±58° abajo): deja libres las estrellas de las 3 y las 9. */
const ARC_TOP_LEN = 180;
const ARC_BOTTOM_LEN = 162;
/** Ancho medio de una mayúscula de Orbitron (em) + tracking (em). */
const CHAR_EM = 0.8;
const TRACK_EM = 0.14;

function fitFont(text: string, arcLen: number, max: number) {
  const fs = arcLen / (text.length * (CHAR_EM + TRACK_EM));
  return Math.min(max, fs);
}

interface Props {
  size?: number;
  className?: string;
  /** Texto del arco superior. */
  top?: string;
  /** Texto del arco inferior. */
  bottom?: string;
  /** Icono central en lugar de Marte (insignias). */
  icon?: LucideIcon;
  /** Insignia bloqueada: en gris. */
  muted?: boolean;
  label?: string;
}

export default function MissionPatchLogo({
  size = 56,
  className = '',
  top = 'MISIÓN ARES IV',
  bottom = 'NASA · CADETES',
  icon: Icon,
  muted = false,
  label,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const topFs = fitFont(top, ARC_TOP_LEN, 15);
  const bottomFs = fitFont(bottom, ARC_BOTTOM_LEN, 13);

  const blue = muted ? '#64748b' : '#0b3d91';
  const red = muted ? '#94a3b8' : '#fc3d21';

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? `Emblema ${top} · ${bottom}`}
      style={muted ? { filter: 'grayscale(1)', opacity: 0.55 } : undefined}
    >
      <defs>
        <path id={id('top')} d={`M${100 - ARC_TOP_R} 100 A${ARC_TOP_R} ${ARC_TOP_R} 0 0 1 ${100 + ARC_TOP_R} 100`} />
        <path id={id('bottom')} d={`M${100 - ARC_BOTTOM_R} 100 A${ARC_BOTTOM_R} ${ARC_BOTTOM_R} 0 0 0 ${100 + ARC_BOTTOM_R} 100`} />
        <radialGradient id={id('mars')} cx="35%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="35%" stopColor="#f97316" />
          <stop offset="75%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={id('space')} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1e4fb5" />
          <stop offset="100%" stopColor={blue} />
        </radialGradient>
        <clipPath id={id('planet')}>
          <circle cx={100} cy={104} r={27} />
        </clipPath>
      </defs>

      {/* Doble aro: blanco + azul exterior, banda roja */}
      <circle cx={100} cy={100} r={97} fill="#ffffff" />
      <circle cx={100} cy={100} r={94} fill={blue} />
      <circle cx={100} cy={100} r={89} fill="#ffffff" />
      <circle cx={100} cy={100} r={87.5} fill={red} />

      {/* Texto circular */}
      <text
        fontSize={topFs}
        fontWeight={800}
        fill="#ffffff"
        letterSpacing={topFs * TRACK_EM}
        fontFamily="Orbitron, 'Arial Black', sans-serif"
      >
        <textPath href={`#${id('top')}`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <text
        fontSize={bottomFs}
        fontWeight={800}
        fill="#ffffff"
        letterSpacing={bottomFs * TRACK_EM}
        fontFamily="Orbitron, 'Arial Black', sans-serif"
      >
        <textPath href={`#${id('bottom')}`} startOffset="50%" textAnchor="middle">
          {bottom}
        </textPath>
      </text>
      {/* Estrellas separadoras a las 3 y a las 9 */}
      {[100 - 75, 100 + 75].map((x) => (
        <path key={x} d={`M${x} 94 L${x + 2} 98 L${x + 6} 100 L${x + 2} 102 L${x} 106 L${x - 2} 102 L${x - 6} 100 L${x - 2} 98 Z`} fill="#ffffff" />
      ))}

      {/* Disco central de espacio profundo */}
      <circle cx={100} cy={100} r={61} fill={`url(#${id('space')})`} stroke="#ffffff" strokeWidth={2.5} />
      {[
        [66, 70, 1.6],
        [130, 62, 1.3],
        [144, 112, 1.5],
        [62, 128, 1.2],
        [118, 142, 1.4],
        [86, 56, 1],
        [150, 86, 1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.9} />
      ))}

      {Icon ? (
        <g>
          <circle cx={100} cy={102} r={30} fill={red} stroke="#ffffff" strokeWidth={2.5} />
          <Icon x={82} y={84} size={36} color="#ffffff" strokeWidth={1.75} aria-hidden />
        </g>
      ) : (
        <g>
          {/* Órbita (mitad trasera) */}
          <g transform="rotate(-22 100 104)">
            <path d="M50 104 A50 15 0 0 1 150 104" fill="none" stroke="#ffffff" strokeWidth={2.6} opacity={0.75} />
          </g>
          {/* Marte con volumen, cráteres y casquete polar */}
          <circle cx={100} cy={104} r={27} fill={`url(#${id('mars')})`} />
          <g clipPath={`url(#${id('planet')})`}>
            <ellipse cx={100} cy={78} rx={13} ry={4} fill="#fff7ed" opacity={0.85} />
            <circle cx={92} cy={102} r={4} fill="#9a3412" opacity={0.45} />
            <circle cx={110} cy={113} r={3} fill="#9a3412" opacity={0.4} />
            <circle cx={104} cy={95} r={2} fill="#9a3412" opacity={0.35} />
            <path d="M74 110 Q100 102 128 116" stroke="#7c2d12" strokeWidth={3} fill="none" opacity={0.35} />
            {/* Terminador (lado en sombra) */}
            <circle cx={112} cy={112} r={27} fill="#431407" opacity={0.28} />
          </g>
          {/* Órbita (mitad delantera) + cohete */}
          <g transform="rotate(-22 100 104)">
            <path d="M50 104 A50 15 0 0 0 150 104" fill="none" stroke="#ffffff" strokeWidth={2.6} />
            <g transform="translate(138 112) rotate(-60)">
              <path d="M0 -8 L3.4 1 L-3.4 1 Z" fill="#ffffff" />
              <rect x={-1.8} y={1} width={3.6} height={4} fill="#e2e8f0" />
              <path d="M-1.6 5 L0 9 L1.6 5 Z" fill={red} />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
