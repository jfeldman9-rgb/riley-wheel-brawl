// Test-only WebAudio clock adapter for a host without Chromium Unix sockets.
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process'), Module = require('module');
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'tools/soak.cjs'), 'utf8').replace('return sandbox.RWB;', 'sandbox.RWB.testWindow = sandbox; return sandbox.RWB;');
const mod = new Module(path.join(root, 'tools/voice-test-boot.cjs'), module); mod.filename = path.join(root, 'tools/voice-test-boot.cjs'); mod.paths = module.paths; mod._compile(source, mod.filename);
const R = mod.exports.boot(root), win = R.testWindow; delete R.testWindow;
const origin = performance.now(), now = () => (performance.now() - origin) / 1000;
const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
class Source {
  connect() {} disconnect() {}
  start(t) { const dur = this.buffer ? this.buffer.duration : 30; this.timer = setTimeout(() => this.onended && this.onended(), Math.max(0, (t || now()) - now() + dur) * 1000); }
  stop(t) { clearTimeout(this.timer); if (t != null) this.timer = setTimeout(() => this.onended && this.onended(), Math.max(0, t - now()) * 1000); }
}
class AudioContext {
  get currentTime() { return now(); }
  get state() { return this._state || 'running'; }
  get sampleRate() { return 24000; }
  resume() { this._state = 'running'; return Promise.resolve(); }
  suspend() { this._state = 'suspended'; return Promise.resolve(); }
  createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {} }; }
  createBufferSource() { return new Source(); }
  createOscillator() { return Object.assign(new Source(), { frequency: param(), detune: param() }); }
  createBiquadFilter() { return { frequency: param(), Q: param(), connect() {} }; }
  createBuffer(n, len, sr) { return { duration: len / sr, getChannelData: () => new Float32Array(len) }; }
  decodeAudioData(data, success) { success(data); return Promise.resolve(data); }
}
win.AudioContext = AudioContext; win.performance = performance; win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
const durations = new Map();
win.fetch = async url => {
  const file = path.join(root, String(url).split('?')[0]);
  if (String(url).includes('sequence-test=slow')) await new Promise(resolve => setTimeout(resolve, 350));
  if (!fs.existsSync(file)) return { ok: false };
  if (file.endsWith('.json')) return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
  if (!durations.has(file)) durations.set(file, +cp.execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' }).trim());
  return { ok: true, arrayBuffer: async () => ({ duration: durations.get(file) }) };
};
const evaluate = async fn => { const value = await vm.runInContext('(' + fn.toString() + ')()', win); return value == null ? value : JSON.parse(JSON.stringify(value)); };
const page = { on() {}, addInitScript: evaluate, goto: async () => {}, waitForFunction: evaluate, evaluate, route: async () => {} };
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'playwright') { console.log('TEST MODE: deterministic WebAudio clock using ffprobe MP3 durations (not a browser decode)'); return { chromium: { launch: async () => ({ newPage: async () => page, close: async () => {} }) } }; }
  return originalLoad.call(this, name, ...args);
};
