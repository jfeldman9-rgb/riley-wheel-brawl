// Shared constants for Riley Wheel Brawl 2.0 (Stage 1 vertical slice).
export const VW = 1280, VH = 720;
export const LANE_TOP = 572, LANE_BOT = 690;      // walkable depth band (screen y of feet)
export const WORLD_W = 5200;
export const q = new URLSearchParams(location.search);
export const DPR = window.devicePixelRatio || 1;
// render scale: 2 on retina, overridable with ?rs=1|1.5|2. Quality governor may lower it at runtime.
export const RS0 = Math.max(1, Math.min(+q.get('rs') || Math.min(2, DPR), 2));
export const HITSTOP = { light: 4, medium: 6, heavy: 9, finisher: 14 };   // frames @60
export const SHAKE = { light: 0.16, medium: 0.28, heavy: 0.5, finisher: 0.75 };
export const DEBUG = !!q.get('debug');
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
