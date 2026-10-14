import test from "node:test";
import assert from "node:assert/strict";
import { stage7Simulation } from "./helpers/stage7-harness.mjs";
import { Dancer } from "../src/shaido.js";
import { callMoilan, stepStrike7 } from "../src/stage7-lifecycle.js";
import { playTrack, setVoiceFiles, stopSceneAudio } from "../src/audio.js";

const sources = [],
  fetches = [];
function node() {
  const param = {
    value: 1,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
  return {
    gain: param,
    frequency: param,
    Q: param,
    threshold: param,
    knee: param,
    ratio: param,
    attack: param,
    release: param,
    connect() {},
    disconnect() {},
    start() {
      this.started = true;
    },
    stop() {
      this.stops = (this.stops || 0) + 1;
    },
  };
}
class AudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = {};
    this.state = "running";
  }
  createGain() {
    return node();
  }
  createDynamicsCompressor() {
    return node();
  }
  createOscillator() {
    return node();
  }
  createBufferSource() {
    const n = node();
    for (const key of ["loopStart", "loopEnd"])
      Object.defineProperty(n, key, {
        get() {
          return this["_" + key];
        },
        set(v) {
          assert.ok(Number.isFinite(v), key);
          this["_" + key] = v;
        },
      });
    sources.push(n);
    return n;
  }
  createBiquadFilter() {
    return node();
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(8) };
  }
  decodeAudioData(bytes, done) {
    const b = { id: bytes.id, duration: 100 };
    done(b);
    return Promise.resolve(b);
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}
const settle = async () => {
  for (let i = 0; i < 5; i++)
    await new Promise((resolve) => setImmediate(resolve));
};

test("actual audio backend starts a finite boss loop and helper speech never cuts Riley mid-call", async () => {
  const oldContext = window.AudioContext,
    oldFetch = globalThis.fetch;
  window.AudioContext = AudioContext;
  globalThis.fetch = async (url) => {
    const id = String(url).split("/").pop().replace(".mp3", "");
    fetches.push(id);
    return { ok: true, arrayBuffer: async () => ({ id }) };
  };
  const ids = ["riley_st7_call_02", "st7_lan_call_02"];
  setVoiceFiles(ids, ids);
  const h = stage7Simulation({ mode: false }),
    s = h.s,
    k = s.kit;
  try {
    s.enemies = [];
    s.zoneI = 0;
    s.zone = s.zones[0];
    s.bounds = { l: 0, r: 1280 };
    s.riley.x = 400;
    s.enemies.push(new Dancer(s, 500, s.riley.y));
    assert.equal(callMoilan(k), true);
    await settle();
    const voice = sources.find(
      (n) => n.buffer?.id === "riley_st7_call_02" && n.started,
    );
    assert.ok(voice);
    stepStrike7(k, 0.46);
    await settle();
    assert.equal(voice.stops || 0, 0);
    assert.equal(
      fetches.includes("st7_lan_call_02"),
      false,
      "busy Riley has priority over helper speech",
    );
    playTrack("boss7", { fade: 0 });
    await settle();
    const loop = sources.find((n) => n.loop && n.buffer?.id === "music-boss6");
    assert.ok(loop);
    assert.equal(loop.loopStart, 0.25);
    assert.equal(loop.loopEnd, 72.977279);
  } finally {
    stopSceneAudio();
    h.destroy();
    setVoiceFiles(ids, []);
    window.AudioContext = oldContext;
    globalThis.fetch = oldFetch;
  }
});
