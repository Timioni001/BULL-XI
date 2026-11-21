/** Motion tokens. Mirror of the CSS variables in globals.css. */
export const ease = [0.2, 0.8, 0.2, 1] as const;

export const dur = { fast: 0.15, base: 0.2, slow: 0.25 } as const;

export const spring = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } as const;
export const softSpring = { type: "spring", stiffness: 300, damping: 30 } as const;

export const tap = { scale: 0.96 } as const;
