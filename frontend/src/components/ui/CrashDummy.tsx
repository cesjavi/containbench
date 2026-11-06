import React from 'react';

export type DummyMood = 'idle' | 'testing' | 'contained' | 'breached' | 'unsure';

interface CrashDummyProps {
  mood?: DummyMood;
  size?: number;
  className?: string;
  title?: string;
}

const INK = '#0f172a';
const SKIN = '#fcd34d';
const SKIN_SHADE = '#f59e0b';
const BELT = '#14b8a6';

/** Crash-test target marker: a circle with two opposite black quadrants. */
function Target({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fef3c7" stroke={INK} strokeWidth={1.5} />
      <path d={`M${x} ${y} L${x} ${y - r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`} fill={INK} />
      <path d={`M${x} ${y} L${x} ${y + r} A${r} ${r} 0 0 1 ${x - r} ${y} Z`} fill={INK} />
    </g>
  );
}

function Face({ mood }: { mood: DummyMood }) {
  if (mood === 'breached') {
    return (
      <g stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none">
        <path d="M47 33 l6 6 M53 33 l-6 6" />
        <path d="M67 33 l6 6 M73 33 l-6 6" />
        <path d="M49 50 l4 -3 l4 3 l4 -3 l4 3 l4 -3" />
      </g>
    );
  }
  const eyes = (
    <g fill={INK}>
      <circle cx={50} cy={36} r={3.4} />
      <circle cx={70} cy={36} r={3.4} />
      <circle cx={51.2} cy={34.8} r={1} fill="#fff" />
      <circle cx={71.2} cy={34.8} r={1} fill="#fff" />
    </g>
  );
  const mouth =
    mood === 'contained' ? (
      <path d="M50 46 Q60 55 70 46" />
    ) : mood === 'unsure' ? (
      <path d="M52 49 Q56 47 60 49 T68 49" />
    ) : mood === 'testing' ? (
      <ellipse cx={60} cy={49} rx={3.5} ry={4} fill={INK} />
    ) : (
      <path d="M52 47 Q60 52 68 47" />
    );
  return (
    <g>
      {eyes}
      <g stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none">
        {mouth}
      </g>
    </g>
  );
}

/**
 * ContainBench's mascot: a crash-test dummy wearing a teal seat belt (the containment).
 * The mood mirrors a run's outcome: contained (PASS), breached (FAIL), unsure (INCONCLUSIVE).
 */
export function CrashDummy({ mood = 'idle', size = 120, className = '', title }: CrashDummyProps) {
  return (
    <svg
      viewBox="0 0 120 150"
      width={size}
      height={(size * 150) / 120}
      className={className}
      role="img"
      aria-label={title ?? 'ContainBench crash-test dummy'}
    >
      <title>{title ?? 'ContainBench crash-test dummy'}</title>

      {/* Legs */}
      <g stroke={INK} strokeWidth={2}>
        <rect x={42} y={110} width={15} height={32} rx={6} fill={SKIN} />
        <rect x={63} y={110} width={15} height={32} rx={6} fill={SKIN} />
        <path d="M42 126 h15 M63 126 h15" strokeWidth={1.5} />
        <rect x={39} y={138} width={20} height={8} rx={4} fill={INK} />
        <rect x={61} y={138} width={20} height={8} rx={4} fill={INK} />
      </g>

      {/* Arms (raised in alarm when breached) */}
      <g stroke={INK} strokeWidth={2} fill={SKIN}>
        {mood === 'breached' ? (
          <>
            <rect x={14} y={52} width={14} height={34} rx={7} transform="rotate(35 21 69)" />
            <rect x={92} y={52} width={14} height={34} rx={7} transform="rotate(-35 99 69)" />
          </>
        ) : (
          <>
            <rect x={22} y={70} width={14} height={36} rx={7} />
            <rect x={84} y={70} width={14} height={36} rx={7} />
          </>
        )}
      </g>

      {/* Torso */}
      <rect x={34} y={66} width={52} height={50} rx={12} fill={SKIN} stroke={INK} strokeWidth={2} />
      <path d="M38 108 h44" stroke={SKIN_SHADE} strokeWidth={3} strokeLinecap="round" />
      <Target x={46} y={100} r={6} />

      {/* Seat belt: the containment */}
      <g>
        <path d="M37 70 L83 112" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <path d="M37 70 L83 112" stroke={BELT} strokeWidth={8} strokeLinecap="round" />
        <rect x={55} y={85} width={11} height={9} rx={2} fill="#e2e8f0" stroke={INK} strokeWidth={1.5}
              transform="rotate(42 60.5 89.5)" />
      </g>

      {/* Neck and head */}
      <rect x={53} y={58} width={14} height={10} rx={3} fill={SKIN_SHADE} stroke={INK} strokeWidth={2} />
      <circle cx={60} cy={38} r={24} fill={SKIN} stroke={INK} strokeWidth={2} />
      <path d="M36 38 h48" stroke={INK} strokeWidth={1.2} strokeDasharray="2 3" opacity={0.35} />
      <Target x={82} y={30} r={6.5} />
      <Face mood={mood} />

      {/* Outcome badge */}
      {mood === 'contained' && (
        <g transform="translate(88 6)">
          <path d="M14 3 L24 7 V14 C24 21 19 25 14 27 C9 25 4 21 4 14 V7 Z" fill={BELT} stroke={INK} strokeWidth={2} />
          <path d="M9.5 15 l3 3 l6 -6" stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {mood === 'breached' && (
        <g transform="translate(90 4)">
          <path d="M12 2 L24 24 H0 Z" fill="#f43f5e" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d="M12 9 v7 M12 20 v0.5" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      )}
      {mood === 'unsure' && (
        <text x={96} y={24} fontSize={24} fontWeight={800} fill="#fbbf24" stroke={INK} strokeWidth={1}
              fontFamily="Plus Jakarta Sans, sans-serif">
          ?
        </text>
      )}
    </svg>
  );
}
