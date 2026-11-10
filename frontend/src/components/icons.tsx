/**
 * Small line icons (inline SVG, `currentColor`), so no icon library is needed.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { ReactNode } from "react";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function Gear() {
    return (
        <Icon size={20}>
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="6.5" />
            {ANGLES.map((angle) => (
                <line key={angle} x1="12" y1="2.5" x2="12" y2="5.5" transform={`rotate(${angle} 12 12)`} />
            ))}
        </Icon>
    );
}

export function Database() {
    return (
        <Icon size={20}>
            <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
            <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
            <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
        </Icon>
    );
}

export function Plus() {
    return (
        <Icon>
            <path d="M12 5v14M5 12h14" />
        </Icon>
    );
}

export function Pencil() {
    return (
        <Icon>
            <path d="M4 20h4L19 9l-4-4L4 16z" />
        </Icon>
    );
}

export function Trash() {
    return (
        <Icon>
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </Icon>
    );
}

export function Star() {
    return (
        <Icon size={12}>
            <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
        </Icon>
    );
}

/**
 * Chevron pointing left (or right, if `flip`).
 */
export function Chevron({ flip = false }: { flip?: boolean }) {
    return (
        <Icon>
            <path d={flip ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
        </Icon>
    );
}

// ----------------------------------------------------------------
// AUXILIARY COMPONENTS
// ----------------------------------------------------------------

function Icon({ size = 16, children }: { size?: number; children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}
