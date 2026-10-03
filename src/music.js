// Music state machine. The stage reports what is happening (title, fighting, boss, cutscene, victory, game over)
// and the director picks the track and crossfade; the audio backend (audio.js playTrack) does the WebAudio work.
// Pure logic with an injectable backend so the transitions are unit-tested without a browser.
export const STAGE_MUSIC = Object.freeze({ 1: Object.freeze({ stage: 'stage1', boss: 'boss1' }), 2: Object.freeze({ stage: 'stage2', boss: 'boss2' }) });
// seconds for each kind of change
export const FADES = Object.freeze({ toBoss: 1.2, toCutscene: 1.0, fromCutscene: 1.4, toStage: 2.0, toTitle: 2.0, victory: 2.5, gameOver: 1.5, resume: 1.0 });
export const MUSIC_STATES = Object.freeze(['silent', 'title', 'stage', 'boss', 'cutscene', 'victory', 'clear', 'gameover']);
export class MusicDirector {
  /** backend(trackId | null, { fade, restart }) */
  constructor(backend, stageNo = 1) {
    this.backend = backend; this.stageNo = STAGE_MUSIC[stageNo] ? stageNo : 1;
    this.state = 'silent'; this.track = undefined; this.fightState = null; this.log = [];
  }
  trackFor(state) {
    const m = STAGE_MUSIC[this.stageNo];
    switch (state) {
      case 'title': case 'cutscene': case 'clear': return 'title';   // "The Wheel Turns": menus, story beats, the Twix campfire
      case 'stage': return m.stage;
      case 'boss': return m.boss;
      default: return null;                                          // silent, victory (fanfare SFX plays), game over
    }
  }
  fadeFor(from, to) {
    if (to === 'boss') return FADES.toBoss;
    if (to === 'cutscene') return FADES.toCutscene;
    if (from === 'cutscene' && (to === 'stage' || to === 'boss')) return FADES.fromCutscene;
    if (from === 'gameover') return FADES.resume;
    if (to === 'victory') return FADES.victory;
    if (to === 'gameover') return FADES.gameOver;
    if (to === 'title' || to === 'clear') return FADES.toTitle;
    return FADES.toStage;
  }
  set(state) {
    if (!MUSIC_STATES.includes(state) || state === this.state) return false;
    const from = this.state, track = this.trackFor(state), fade = this.fadeFor(from, state);
    // A boss track always starts from its intro; returning from a cutscene or a continue resumes where it left off.
    const restart = state === 'boss' && from !== 'cutscene' && from !== 'gameover';
    if (state === 'stage' || state === 'boss') this.fightState = state;
    this.state = state;
    if (track !== this.track) { this.track = track; this.log.push({ from, to: state, track, fade, restart }); this.backend(track, { fade, restart }); }
    return true;
  }
  /** the stage's fight music again (after a cutscene or a continue) */
  resumeFight() { return this.set(this.fightState || 'stage'); }
  setStage(n) { if (STAGE_MUSIC[n]) this.stageNo = n; }
}
