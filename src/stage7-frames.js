// Frame numbers follow chars/*.json state fields; the images remain in source order.
import { isPainted } from './stage6-paint.js';

export const FRAMES7 = Object.freeze({
  s7dancer: { idle: [0], walk: [1,2,3,4], attack: [9], lunge: [6,7,8], thrown: [5], held: [10], hurt: [10], down: [12], yield: [11] },
  s7veiled: { idle: [0], walk: [1,2,3,4], aim: [5,6], attack: [5,6,7], held: [8], thrown: [8], hurt: [8], down: [10], yield: [9] },
  s7asmo: { idle: [0], play: [5,6,7,8], walk: [1,2,3,4], attack: [9,10,11], channel: [12,13], hurt: [14], stagger: [15], down: [16], bound: [16] },
  s7moir: { idle: [0], raise: [1,2], attack: [3,4] },
  s7lan: { run: [0,1,2], draw: [3], attack: [4,5], point: [6] },
});

export function frame7(scene, key, state, elapsed = 0, fallback = 0) {
  if (!isPainted(scene, key)) return fallback;
  const frames = FRAMES7[key]?.[state] || [0];
  const i = Math.max(0, Math.floor(elapsed * 8));
  const loop = ['walk', 'run', 'play', 'channel'].includes(state);
  return frames[loop ? i % frames.length : Math.min(i, frames.length - 1)];
}

// Crack -> three growth cells -> full spike at the 0.65 s hit -> crumble.
export function earthFrame7(scene, elapsed, duration = 1.6) {
  if (!isPainted(scene, 's7earth')) return 0;
  if (elapsed >= duration - 0.25) return 5;
  return Math.min(4, Math.max(0, Math.floor(elapsed / (0.65 / 4))));
}
