/**
 * A permanent round button on the map which opens a small panel to its left.
 * The panel closes via the button, a click outside or Esc (so only one panel is open at a time).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { type ReactNode, useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function MapPanel({
    label,
    icon,
    spin = false,
    children,
}: {
    label: string;
    icon: ReactNode;
    /** turn the icon a little while open (e.g. a gear) */
    spin?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointer = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);

        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div className="map-panel" ref={root}>
            <button
                type="button"
                className={spin ? "map-panel-toggle spin" : "map-panel-toggle"}
                title={label}
                aria-label={label}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                {icon}
            </button>
            {open && (
                <section className="map-panel-body" aria-label={label}>
                    {children}
                </section>
            )}
        </div>
    );
}
