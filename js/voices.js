/* Voice lines: who says what, when, and which file plays it.
   - Villains and the narrator use generated (text-to-speech) clips that ship in
     assets/audio/voice/<id>.mp3 (made by tools/make-voices.py).
   - Riley and Twinkle Toes are real kids. Their voices are NEVER generated.
     Jason records them. Every kid line already has a tiny silent placeholder
     (assets/audio/voice/riley_<id>.mp3 / tt_<id>.mp3, under 0.25 s), so nothing
     404s. Dropping a real recording over the placeholder is all it takes: the game
     plays any clip 0.25 s or longer. Until then the line shows as a speech bubble /
     subtitle with a short chirp.
   Every line has on-screen text (Reel caption, bottom subtitle or bubble). */
'use strict';
(function () {
  const R = window.RWB;
  const DIR = 'assets/audio/voice/';

  /* Generated speakers. The generator reads this table. */
  const TTS = {
    narrator: { voice: 'en-GB-RyanNeural', rate: '-10%', pitch: '-3Hz', fx: 'hall', label: 'Narrator (warm, epic)' },
    taim: { voice: 'en-US-ChristopherNeural', rate: '-12%', pitch: '-14Hz', fx: 'menace', label: 'Mazrim Taim (deep, menacing)' },
    fade: { voice: 'en-GB-ThomasNeural', rate: '-22%', pitch: '-8Hz', fx: 'cold', label: 'Myrddraal / Fade (cold, slow hiss)' },
    draghkar: { voice: 'en-IE-ConnorNeural', rate: '-15%', pitch: '+4Hz', fx: 'eerie', label: 'Draghkar (eerie, sing-song)' },
    forsaken: { voice: 'en-GB-SoniaNeural', rate: '-8%', pitch: '-4Hz', fx: 'regal', label: "Be'lal (proud Forsaken woman)" },
    'trolloc-chieftain': { voice: 'en-US-GuyNeural', rate: '-6%', pitch: '-6Hz', fx: 'beast', label: 'Trolloc Chieftain (growly)' },
    trolloc: { voice: 'en-US-RogerNeural', rate: '-4%', pitch: '-4Hz', fx: 'beast', label: 'Trolloc (growly)' },
    darkfriend: { voice: 'en-US-BrianNeural', rate: '+4%', pitch: '-2Hz', fx: 'room', label: 'Darkfriend (sneaky)' },
    'stone-guard': { voice: 'en-US-SteffanNeural', rate: '-6%', pitch: '-6Hz', fx: 'hall', label: 'Stone guard (stern)' },
    "turned-asha'man": { voice: 'en-CA-LiamNeural', rate: '-6%', pitch: '-7Hz', fx: 'cold', label: "Turned Asha'man (hollow)" }
  };
  /* Recorded by Jason: file prefix per speaker. */
  const RECORDED = { riley: 'riley_', kenzie: 'tt_' };

  /* New lines for this pass. Existing lines live in campaign.js (VOICE_LINES). */
  const NEW = {
    // Narrator: one per stage intro card, before the story beat.
    st1_narrator_01: { who: 'narrator', name: 'NARRATOR', text: "Emond's Field, on Winternight. The Two Rivers sleeps, but the Shadow is on the road." },
    st2_narrator_01: { who: 'narrator', name: 'NARRATOR', text: 'Caemlyn, the great city of Andor. Somewhere in its crowded streets, a Fade is hiding.' },
    st3_narrator_01: { who: 'narrator', name: 'NARRATOR', text: 'Shadar Logoth. A city lost long ago, where the silver fog still creeps.' },
    st4_narrator_01: { who: 'narrator', name: 'NARRATOR', text: 'The Stone of Tear. No army has ever taken it. Deep inside, Callandor waits.' },
    st5_narrator_01: { who: 'narrator', name: 'NARRATOR', text: 'The roof of the Black Tower. The storm is gathering. The Wheel turns, and the last battle begins.' },
    // Boss mid-fight (half health) and defeat lines.
    chieftain_mid_01: { who: 'trolloc-chieftain', name: 'TROLLOC CHIEFTAIN', text: 'Grrr! Small human kicks hard!' },
    chieftain_defeat_01: { who: 'trolloc-chieftain', name: 'TROLLOC CHIEFTAIN', text: 'Retreat! Back to the Blight!' },
    fade_mid_01: { who: 'fade', name: 'FADE', text: 'Run, boy. The Eyeless are patient.' },
    fade_defeat_01: { who: 'fade', name: 'FADE', text: 'The shadows will remember you.' },
    draghkar_mid_01: { who: 'draghkar', name: 'DRAGHKAR', text: "Why won't you sleep, little one?" },
    draghkar_defeat_01: { who: 'draghkar', name: 'DRAGHKAR', text: 'My song is fading.' },
    belal_mid_01: { who: 'forsaken', name: "BE'LAL", text: 'You dare strike one of the Chosen?' },
    belal_defeat_01: { who: 'forsaken', name: "BE'LAL", text: 'Impossible! Beaten by a child!' },
    taim_defeat_01: { who: 'taim', name: 'MAZRIM TAIM', text: 'No! My tower!' },
    // Riley and Twinkle Toes (recorded later by Jason).
    riley_bighit_01: { who: 'riley', name: 'RILEY', text: 'Oof! That one hurt!' },
    riley_bighit_02: { who: 'riley', name: 'RILEY', text: "I'm okay! Keep going!" },
    riley_bosswin_05: { who: 'riley', name: 'RILEY', text: 'We did it!' },
    st5_kenzie_03: { who: 'kenzie', name: 'TWINKLE TOES', text: 'Riley! You came for me!' }
  };
  for (const id of Object.keys(NEW)) NEW[id].id = id;
  if (R.VOICE_LINES) Object.assign(R.VOICE_LINES, NEW);

  /* Narrator opens each stage intro card. */
  const introKeys = ['intro', 'stage2', 'stage3', 'stage4', 'stage5'];
  if (R.CAPTIONS) introKeys.forEach((key, i) => {
    const list = R.CAPTIONS[key], line = NEW['st' + (i + 1) + '_narrator_01'];
    if (list && list[0] !== line) list.unshift(line);
  });
  // Twinkle Toes thanks Riley the moment she is freed (rescueReady still waits for st5_kenzie_01).
  if (R.CAPTIONS && R.CAPTIONS.freed && !R.CAPTIONS.freed.includes(NEW.st5_kenzie_03)) R.CAPTIONS.freed.splice(1, 0, NEW.st5_kenzie_03);

  /* Where each trigger point picks its line. */
  R.VOICE_TRIGGERS = {
    bossEntry: [['trolloc_heavy_intro_01'], ['fade_intro_01', 'st2_fade_01'], ['draghkar_intro_01', 'st3_draghkar_01'], ['forsaken_intro_01'], ['taim_phase_01']],
    bossMid: ['chieftain_mid_01', 'fade_mid_01', 'draghkar_mid_01', 'belal_mid_01', null], // Taim uses taim_phase_02 (his shield breaks)
    bossDefeat: ['chieftain_defeat_01', 'fade_defeat_01', 'draghkar_defeat_01', 'belal_defeat_01', 'taim_defeat_01'],
    bossWin: ['riley_victory_01', 'riley_victory_02', 'riley_victory_01', 'riley_victory_02', 'riley_bosswin_05'],
    bigHit: ['riley_bighit_01', 'riley_bighit_02'],
    // Lines worth warming when a fight starts (generated ones load; recorded ones are probed).
    combat: ['riley_super_01', 'riley_fire_01', 'riley_grab_01', 'riley_throw_01', 'riley_respawn_01', 'riley_callandor_01', 'riley_bighit_01', 'riley_bighit_02', 'riley_call_01']
  };

  /** File name for a line, or null when nobody records it (Moiraine, Loial). */
  function voiceFile(id) {
    const line = R.VOICE_LINES && R.VOICE_LINES[id];
    if (!line) return null;
    if (TTS[line.who]) return id + '.mp3';
    const prefix = RECORDED[line.who];
    if (!prefix) return null;
    const token = line.who === 'kenzie' ? 'kenzie' : 'riley';
    return prefix + id.split('_').filter(part => part !== token).join('_') + '.mp3';
  }
  const isGenerated = id => { const line = R.VOICE_LINES && R.VOICE_LINES[id]; return !!(line && TTS[line.who]); };
  const LOAD_OPTS = { minDuration: 0.25 }; // shorter = silent placeholder, not recorded yet
  const url = id => { const f = voiceFile(id); return f ? DIR + f + '?v=' + (R.ASSET_VER || '1') : null; };

  /** Start fetching clips (lazy, cached for the session). Recorded kid lines are probed. */
  function preload(ids) {
    const A = R.audio;
    if (!A || !A.loadClip) return;
    for (const id of ids || []) { const u = url(id); if (u) A.loadClip(id, u, LOAD_OPTS); }
  }
  /** Warm a stage's lines after entry settles, so it never costs the cold enter. */
  function preloadStage(levelIndex) {
    const T = R.VOICE_TRIGGERS, i = levelIndex | 0;
    const ids = [].concat(T.bossEntry[i] || [], T.bossMid[i] || [], T.bossDefeat[i] || [], T.bossWin[i] || [], T.combat,
      i === 1 ? ['darkfriend_intro_01'] : i === 3 ? ['stone_guard_intro_01'] : i === 4 ? ['ashaman_intro_01', 'taim_phase_02', 'taim_phase_03', 'st5_kenzie_03', 'st5_kenzie_01', 'st5_riley_02', 'st5_kenzie_02'] : ['trolloc_intro_01']);
    preload(ids.filter(Boolean));
  }

  /* Speak a line. opts.quiet: the caller already shows the text (Reel / subtitle queue).
     Otherwise the text shows as a speech bubble in the live fight. */
  R.voice = function (id, opts) {
    opts = opts || {};
    const A = R.audio, line = R.VOICE_LINES && R.VOICE_LINES[id];
    if (!opts.quiet && line) { const s = R.game && R.game.scene; if (s && s.showBark) s.showBark(line); }
    if (A.playClip && A.playClip(id, { voice: true })) return true;
    const u = url(id);
    if (u && A.loadClip) {
      const asked = A.now ? A.now() : 0, generated = isGenerated(id);
      // A generated clip that is still loading plays when it lands (if still timely).
      A.loadClip(id, u, LOAD_OPTS).then(buf => {
        if (!buf) return;
        const late = (A.now ? A.now() : 0) - asked;
        if (late < (generated ? 1.2 : 0.35)) A.playClip(id, { voice: true });
      });
      if (generated) return false;
    }
    if (A.sfx.voLine) A.sfx.voLine(line && line.who);
    return false;
  };
  R.voiceFile = voiceFile;
  R.voiceUrl = url;
  R.voicePreload = preload;
  R.voicePreloadStage = preloadStage;
  R.VOICE_TTS = TTS;
  R.VOICE_RECORDED = RECORDED;
}());
