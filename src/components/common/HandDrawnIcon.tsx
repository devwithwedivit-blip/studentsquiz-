import React from 'react';
import { SubjectId } from '../../types/quiz';

interface IconProps {
  name:
    | SubjectId
    | 'pencil'
    | 'eraser'
    | 'quill'
    | 'ruler'
    | 'clock'
    | 'bookmark'
    | 'bookmark-filled'
    | 'scratchpad'
    | 'check'
    | 'cross'
    | 'sound-on'
    | 'sound-off'
    | 'sun'
    | 'moon'
    | 'print'
    | 'shuffle'
    | 'filter'
    | 'plus'
    | 'edit'
    | 'trash'
    | 'undo'
    | 'export'
    | 'import'
    | 'reset'
    | 'badge'
    | 'fire'
    | 'hint'
    | 'chevron-left'
    | 'chevron-right'
    | 'chevron-up'
    | 'chevron-down';
  size?: number;
  color?: string;
  className?: string;
}

export const HandDrawnIcon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = ''
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className
  };

  switch (name) {
    // SUBJECT ICONS
    case 'maths':
      return (
        <svg {...common}>
          {/* Compass / Triangle ruler */}
          <path d="M 3 21 L 12 3 L 21 21 Z" />
          <line x1="8" y1="15" x2="16" y2="15" />
          <circle cx="12" cy="7" r="1.5" fill={color} />
        </svg>
      );

    case 'physics':
      return (
        <svg {...common}>
          {/* Atomic orbital rings */}
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" />
          <circle cx="12" cy="12" r="2.5" fill={color} />
        </svg>
      );

    case 'chemistry':
      return (
        <svg {...common}>
          {/* Conical flask with liquid level */}
          <path d="M 10 3 L 14 3 M 11 3 L 11 8 L 5 19 A 2 2 0 0 0 7 21 L 17 21 A 2 2 0 0 0 19 19 L 13 8 L 13 3" />
          <path d="M 7.5 16 C 9 15, 12 17, 16.5 16" strokeDasharray="1,1" />
          <circle cx="10" cy="18" r="1" fill={color} />
          <circle cx="13" cy="16" r="1" fill={color} />
        </svg>
      );

    case 'biology':
      return (
        <svg {...common}>
          {/* Plant leaf with venation */}
          <path d="M 3 21 C 4 14, 9 6, 21 3 C 20 15, 12 20, 3 21 Z" />
          <line x1="3" y1="21" x2="14" y2="10" />
          <path d="M 8 16 Q 11 13 14 14" />
          <path d="M 10 12 Q 13 9 17 10" />
        </svg>
      );

    case 'cs':
      return (
        <svg {...common}>
          {/* Terminal prompt with blinking dash */}
          <rect x="3" y="4" width="18" height="15" rx="2" />
          <path d="M 7 9 L 10 11.5 L 7 14" />
          <line x1="12" y1="14" x2="16" y2="14" />
        </svg>
      );

    case 'english':
      return (
        <svg {...common}>
          {/* Feather quill pen */}
          <path d="M 20 4 C 15 4, 9 9, 6 15 L 4 20 L 9 18 C 15 15, 20 9, 20 4 Z" />
          <line x1="4" y1="20" x2="13" y2="11" />
        </svg>
      );

    case 'hindi':
      return (
        <svg {...common}>
          {/* Calligraphic Devanagari character marker */}
          <path d="M 5 6 L 19 6" />
          <path d="M 8 6 C 8 10, 11 11, 13 11 C 15 11, 16 10, 16 8" />
          <line x1="16" y1="6" x2="16" y2="18" />
          <path d="M 16 12 C 18 12, 20 14, 20 16" />
        </svg>
      );

    case 'gk':
      return (
        <svg {...common}>
          {/* Globe / Atlas */}
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      );

    // GENERAL STATIONERY & INTERFACE ICONS
    case 'pencil':
      return (
        <svg {...common}>
          <path d="M 17 3 L 21 7 L 7 21 L 3 21 L 3 17 Z" />
          <line x1="14" y1="6" x2="18" y2="10" />
        </svg>
      );

    case 'eraser':
      return (
        <svg {...common}>
          <path d="M 7 21 L 18 10 L 14 6 L 3 17 L 7 21 Z" />
          <line x1="10" y1="18" x2="14" y2="14" />
        </svg>
      );

    case 'quill':
      return (
        <svg {...common}>
          <path d="M 21 3 C 16 3, 11 7, 8 12 L 5 19 L 12 16 C 17 13, 21 8, 21 3 Z" />
        </svg>
      );

    case 'ruler':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="10" rx="1" />
          <line x1="7" y1="7" x2="7" y2="11" />
          <line x1="11" y1="7" x2="11" y2="12" />
          <line x1="15" y1="7" x2="15" y2="11" />
        </svg>
      );

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      );

    case 'bookmark':
      return (
        <svg {...common}>
          <path d="M 6 3 L 18 3 L 18 21 L 12 17 L 6 21 Z" />
        </svg>
      );

    case 'bookmark-filled':
      return (
        <svg {...common} fill={color}>
          <path d="M 6 3 L 18 3 L 18 21 L 12 17 L 6 21 Z" />
        </svg>
      );

    case 'scratchpad':
      return (
        <svg {...common}>
          <path d="M 4 4 H 20 V 20 H 4 Z" />
          <path d="M 8 2 V 6" />
          <path d="M 16 2 V 6" />
          <path d="M 8 11 Q 12 14 16 11" />
          <line x1="8" y1="16" x2="14" y2="16" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'cross':
      return (
        <svg {...common}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );

    case 'sound-on':
      return (
        <svg {...common}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M 15.5 8.5 A 5 5 0 0 1 15.5 15.5" />
          <path d="M 18.5 5.5 A 9 9 0 0 1 18.5 18.5" />
        </svg>
      );

    case 'sound-off':
      return (
        <svg {...common}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </svg>
      );

    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );

    case 'moon':
      return (
        <svg {...common}>
          <path d="M 21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z" />
        </svg>
      );

    case 'print':
      return (
        <svg {...common}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M 6 18 H 4 A 2 2 0 0 1 2 16 V 11 A 2 2 0 0 1 4 9 H 20 A 2 2 0 0 1 22 11 V 16 A 2 2 0 0 1 20 18 H 18" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );

    case 'shuffle':
      return (
        <svg {...common}>
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
      );

    case 'filter':
      return (
        <svg {...common}>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );

    case 'plus':
      return (
        <svg {...common}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );

    case 'edit':
      return (
        <svg {...common}>
          <path d="M 12 20 H 21" />
          <path d="M 16.5 3.5 A 2.121 2.121 0 0 1 19.5 6.5 L 7 19 L 3 20 L 4 16 Z" />
        </svg>
      );

    case 'trash':
      return (
        <svg {...common}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M 19 6 V 20 A 2 2 0 0 1 17 22 H 7 A 2 2 0 0 1 5 20 V 6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );

    case 'undo':
      return (
        <svg {...common}>
          <polyline points="1 4 1 10 7 10" />
          <path d="M 3.51 15 A 9 9 0 1 0 5.64 5.64 L 1 10" />
        </svg>
      );

    case 'export':
      return (
        <svg {...common}>
          <path d="M 21 15 V 19 A 2 2 0 0 1 19 21 H 5 A 2 2 0 0 1 3 19 V 15" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );

    case 'import':
      return (
        <svg {...common}>
          <path d="M 21 15 V 19 A 2 2 0 0 1 19 21 H 5 A 2 2 0 0 1 3 19 V 15" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );

    case 'reset':
      return (
        <svg {...common}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M 20.49 15 A 9 9 0 1 1 18.36 5.64 L 23 10" />
        </svg>
      );

    case 'badge':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="6" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );

    case 'fire':
      return (
        <svg {...common}>
          <path d="M 8.5 14.5 A 2.5 2.5 0 0 0 11 12 C 11 10 9 9.5 9 7.5 C 9 5.5 11.5 3 12 3 C 12.5 4 14 6 14 8 C 14 9 15 9.5 15.5 10.5 C 16.5 12 16.5 14 15.5 16 C 14.5 18 12.5 21 9 21 C 6 21 4 18.5 4 15.5 C 4 13.5 5 12 6.5 11 C 7 13 8 14.5 8.5 14.5 Z" />
        </svg>
      );

    case 'hint':
      return (
        <svg {...common}>
          <path d="M 9 18 H 15" />
          <path d="M 10 22 H 14" />
          <path d="M 12 2 A 6 6 0 0 0 6 8 C 6 11 9 13 9 15 H 15 C 15 13 18 11 18 8 A 6 6 0 0 0 12 2 Z" />
        </svg>
      );

    case 'chevron-left':
      return (
        <svg {...common}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );

    case 'chevron-right':
      return (
        <svg {...common}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );

    case 'chevron-up':
      return (
        <svg {...common}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
      );

    case 'chevron-down':
      return (
        <svg {...common}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );

    default:
      return null;
  }
};
