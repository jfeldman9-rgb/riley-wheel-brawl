import { Input, PAD_MAP } from '../src/input.js';
import * as audio from '../src/audio.js';
import { MusicDirector } from '../src/music.js';

const root = globalThis;
root.WaygateInput = Input;
root.WAYGATE_PAD_MAP = PAD_MAP;
root.WaygateAudio = audio;
root.WaygateMusic = MusicDirector;

// Stage pages live at the repo root, so music URLs are `assets/audio/...`.
// This page is /bonus-waygate/, and the same files are one directory up.
// Node tests import this module with no #game, so they keep the original URLs.
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('game')) {
  for (const id of Object.keys(audio.MUSIC)) {
    const track = audio.MUSIC[id];
    const url = track && track.url;
    if (typeof url === 'string' && url.indexOf('assets/audio/') === 0) track.url = '../' + url;
  }
}

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('stick')) {
  root.__waygateInput = root.__waygateInput || new Input();
}
if (typeof root.bootWaygate === 'function') root.bootWaygate();
