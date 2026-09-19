import { motion } from 'motion/react';

interface IllustrationProps {
  className?: string;
  size?: number;
}

/**
 * Memphis Character listening to music with headphones & floating geometric pastel shapes.
 * 100% SVG, Zero emojis, Zero ASCII.
 */
export function MemphisMusicCharacter({ className = '', size = 180 }: IllustrationProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={{ scale: 0.96, opacity: 0.9 }}
      animate={{ scale: [0.96, 1.02, 0.96], y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Background Memphis Geometric Blobs */}
      <circle cx="100" cy="100" r="82" fill="#FEF3C7" fillOpacity="0.6" />
      <path
        d="M30 140C30 115 50 95 75 95C100 95 120 115 120 140V165H30V140Z"
        fill="#A7F3D0"
      />
      <rect x="130" y="35" width="42" height="42" rx="14" fill="#FBCFE8" />

      {/* Floating Squiggle */}
      <path
        d="M25 60Q35 50 45 60T65 60T85 60"
        stroke="#F472B6"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Floating Vinyl/CD Disc */}
      <circle cx="150" cy="135" r="28" fill="#DDD6FE" />
      <circle cx="150" cy="135" r="10" fill="#8B5CF6" />
      <circle cx="150" cy="135" r="3" fill="#FFFFFF" />

      {/* Corporate Memphis Character Torso */}
      <path
        d="M60 180C60 135 85 110 115 110C145 110 165 135 165 180H60Z"
        fill="#60A5FA"
      />

      {/* Neck */}
      <rect x="108" y="90" width="16" height="22" rx="5" fill="#FBBF24" />

      {/* Head */}
      <ellipse cx="116" cy="74" rx="20" ry="24" fill="#FBBF24" />

      {/* Quirky Hair */}
      <path
        d="M96 70C96 52 110 42 126 42C138 42 144 48 144 58C136 56 128 60 126 68L96 70Z"
        fill="#1E293B"
      />

      {/* Over-ear Headphones (Corporate Memphis style) */}
      <path
        d="M96 72C96 54 105 45 116 45C127 45 136 54 136 72"
        stroke="#EC4899"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="91" y="66" width="10" height="18" rx="4" fill="#DB2777" />
      <rect x="131" y="66" width="10" height="18" rx="4" fill="#DB2777" />

      {/* Whimsical Extended Arm reaching to sound controls */}
      <path
        d="M142 125Q165 118 178 95Q182 88 178 82"
        stroke="#FBBF24"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />

      {/* Floating Sound Wave Dots */}
      <circle cx="168" cy="72" r="4" fill="#10B981" />
      <circle cx="178" cy="62" r="5" fill="#3B82F6" />
      <circle cx="186" cy="75" r="3" fill="#F59E0B" />
    </motion.svg>
  );
}

/**
 * Memphis Badge with abstract arches and geometry
 */
export function MemphisAbstractBadge({ className = '' }: { className?: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className={className}>
      <rect width="44" height="44" rx="12" fill="#E0F2FE" />
      <path d="M12 32C12 24 17 18 24 18C31 18 36 24 36 32H12Z" fill="#38BDF8" />
      <circle cx="28" cy="14" r="5" fill="#F472B6" />
      <rect x="10" y="10" width="8" height="8" rx="3" fill="#34D399" />
    </svg>
  );
}

/**
 * Memphis Soundwaves Visual Graphic
 */
export function MemphisSoundwaveGraphic({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <motion.div
        className="w-1.5 bg-emerald-400 rounded-full"
        animate={{ height: [8, 22, 12, 28, 8] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="w-1.5 bg-purple-400 rounded-full"
        animate={{ height: [18, 8, 30, 14, 18] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="w-1.5 bg-amber-400 rounded-full"
        animate={{ height: [12, 28, 16, 8, 12] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="w-1.5 bg-sky-400 rounded-full"
        animate={{ height: [24, 14, 8, 26, 24] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="w-1.5 bg-rose-400 rounded-full"
        animate={{ height: [10, 20, 14, 32, 10] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
