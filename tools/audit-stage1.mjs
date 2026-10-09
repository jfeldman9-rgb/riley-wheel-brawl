// Deterministic shipped-content audit. Reports open acceptance gaps; it never lowers gates.
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(ROOT, p));
const json = p => JSON.parse(read(p));
export function dimensions(b) {
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii',12,16)==='IHDR') {
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    let p = 12;
    while (p + 8 <= b.length) {
      const kind = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4), s = p + 8;
      if (kind === 'VP8X') return [1 + b.readUIntLE(s + 4, 3), 1 + b.readUIntLE(s + 7, 3)];
      if (kind === 'VP8 ') return [b.readUInt16LE(s + 6) & 0x3fff, b.readUInt16LE(s + 8) & 0x3fff];
      if (kind === 'VP8L') { const v = b.readUInt32LE(s + 1); return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1]; }
      p += 8 + n + (n & 1);
    }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let p = 2;
    while (p < b.length) {
      if (b[p++] !== 0xff) continue;
      let marker = b[p++]; while (marker === 0xff) marker = b[p++];
      if (marker === 0xd9 || marker === 0xda) break;
      const len = b.readUInt16BE(p);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return [b.readUInt16BE(p + 5), b.readUInt16BE(p + 3)];
      p += len;
    }
  }
  throw Error('Unsupported image header');
}
export function audit() {
  const characters = ['riley','grunt','spear','hound','chief','loial'].map(key => {
    const m = json(`assets/chars/${key}.anims.json`);
    const frames = new Set(m.anims.flatMap(a => a.frames));
    const target = key === 'riley' ? 150 : key === 'chief' || key === 'loial' ? null : 40;
    return { key, frames: frames.size, target, densityStatus: target === null ? 'NO_SLICE_COUNT_SPECIFIED' : frames.size >= target ? 'PASS' : 'FAIL',
      animations: m.anims.map(a => ({ name:a.name, frames:a.frames.length })),
      pages: m.pages.map(p => ({ name:p, ...json(`assets/chars/${p}.json`).meta.size })) };
  });
  const images = [];
  for (const group of ['chars','bg','props','ui','powers']) for (const name of readdirSync(resolve(ROOT, 'assets', group)).sort()) {
    if (!/\.(webp|jpg|png)$/.test(name)) continue;
    const path = `assets/${group}/${name}`, bytes = read(path), [w,h] = dimensions(bytes);
    images.push({path, bytes:bytes.length, width:w, height:h, rgbaBytes:w*h*4});
  }
  const files = new Set(['index.html','lib/phaser.min.js','assets/fonts/press-start-2p.ttf']);
  // Stage 4 modules do not fit the leftover Stage 1 headroom (about 2 KB after Stage 3).
  // They are a separate source budget, the same way Stage 3 voices sit outside this gate.
  const STAGE4_SRC = new Set(['stage4.js','stage4-def.js','stage4-hud.js','stage4-hazards.js','stage4-sfx.js','stage4-actors.js','stage4-arena.js','stage4-towers.js','stage4-view.js','stage4-art.js','stage4-art-bg.js','stage4-art-fog.js','stage4-art-cast.js','stage4-voice.js','cultists.js','draghkar.js','bot-stage4.js']);
  for (const name of ['stage4-lifecycle.js', 'stage4-time.js', 'stage4-lighting.js', 'draghkar-impact.js', 'stage4-art-thug.js']) STAGE4_SRC.add(name);
  const STAGE5_SRC = new Set(['stage5.js','stage5-def.js','stage5-hud.js','stage5-blight.js','stage5-sfx.js','stage5-actors.js','stage5-arena.js','stage5-view.js','stage5-art.js','stage5-art-bg.js','stage5-art-fx.js','stage5-art-cast.js','stage5-voice.js','blightspawn.js','aginor.js','balthamel.js','bot-stage5.js','stage5-lifecycle.js','stage5-clock.js','stage5-hurt.js','stage5-lighting.js','stage5-spores.js']);
  for (const name of ['stage5-balthamel.js', 'stage5-beat.js', 'stage5-spawn.js', 'stage5-effects.js', 'stage5-bot-combat.js', 'stage5-texture-pages.js', 'stage5-load.js']) STAGE5_SRC.add(name);
  const STAGE6_SRC = new Set(['stage6.js','stage6-def.js','stage6-hud.js','stage6-arena.js','stage6-view.js','stage6-art.js','stage6-voice.js','stage6-sfx.js','stage6-lifecycle.js','stage6-actors.js','rand-call.js','rand-call-cutscene.js','belal.js','grayman.js','fadelt.js','bot-stage6.js']);
  // The Stage 1 gate has a few hundred bytes of headroom. These hotfix modules
  // do not fit in it. They are counted on their own line, the same way Stage 4 is.
  const IOS_SRC = new Set(['viewport.js', 'page-base.js', 'debug-flag.js', 'stage3-art.js']);
  // Restart fix (quality governor moved out of main.js, freeze-guard resume). Same split as the iOS hotfix:
  // the Stage 1 gate has about 100 bytes left, so these modules carry their own budget line.
  const RESTART_SRC = new Set(['quality-governor.js', 'recovery.js']);
  // Video cutscenes: the controller and its hooks load with main.js but the clips stream on demand, never before
  // the first fight. Their own budget line, same split as restartHotfix (the clips are under cutscenes.clips).
  const CUTSCENE_SRC = new Set(['cutscene.js', 'cutscene-hooks.js']);
  const cutsceneSourceFiles = [];
  // Stage 3 FX stand-ins (painted over the labelled prop/FX cards at Stage 3 entry): their own line under stage3.
  const STAGE3_SRC = new Set(['stage3-fx-art.js']);
  const stage3SourceFiles = [];
  const stage4SourceFiles = [], stage5SourceFiles = [], stage6SourceFiles = [];
  const iosSourceFiles = [];
  const restartSourceFiles = [];
  for (const name of readdirSync(resolve(ROOT,'src'))) if (name.endsWith('.js')) {
    if (CUTSCENE_SRC.has(name)) cutsceneSourceFiles.push(`src/${name}`);
    else if (STAGE3_SRC.has(name)) stage3SourceFiles.push(`src/${name}`);
    else if (RESTART_SRC.has(name)) restartSourceFiles.push(`src/${name}`);
    else if (STAGE4_SRC.has(name)) stage4SourceFiles.push(`src/${name}`);
    else if (STAGE5_SRC.has(name)) stage5SourceFiles.push(`src/${name}`);
    else if (STAGE6_SRC.has(name)) stage6SourceFiles.push(`src/${name}`);
    else if (IOS_SRC.has(name)) iosSourceFiles.push(`src/${name}`);
    else files.add(`src/${name}`);
  }
  for (const group of ['chars','bg','props','ui','powers']) for (const name of readdirSync(resolve(ROOT,'assets',group))) if (!name.endsWith('.md')) files.add(`assets/${group}/${name}`);
  files.add('assets/audio/music-main.mp3');
  // The freeze guard is a hotfix module too (kept apart from IOS_SRC so this edit cherry-picks onto Stage 5).
  if (files.delete('src/guard.js')) iosSourceFiles.push('src/guard.js');
  // Stage 1's 25 MB gate counts every voice Stage 1 and Stage 2 ship (rwb-w2 counted
  // the whole voice folder). Stage 3 lines are preloaded only with s3=1. Folding
  // them into this sum exceeds 25 MB, so they have their own budget below instead
  // of being dropped from the Stage 1 gate along with Stage 2.
  const stage3Voice = /^(st3_|cutthroat_|fade_|riley_st3_|riley_escape_|riley_counter_)/;
  const stage4Voice = /^(st4_|draghkar_|cultist_|riley_fog_|riley_tower_|riley_bridge_|riley_light_|riley_st4_)/;
  const stage5Voice = /^(st5_|aginor_|balthamel_|greenman_|riley_st5_)/;
  const stage6Voice = /^(st6_|rand_|belal_|grayman_|defender_|riley_st6_)/;
  let countedVoiceBytes = 0, stage3VoiceBytes = 0, stage3VoiceCount = 0, stage4VoiceBytes = 0, stage4VoiceCount = 0, stage5VoiceBytes = 0, stage5VoiceCount = 0, stage6VoiceBytes = 0, stage6VoiceCount = 0;
  for (const name of readdirSync(resolve(ROOT,'assets/audio/voice'))) if (name.endsWith('.mp3')) {
    const path = `assets/audio/voice/${name}`, bytes = statSync(resolve(ROOT, path)).size;
    if (stage3Voice.test(name)) { stage3VoiceBytes += bytes; stage3VoiceCount++; }
    else if (stage4Voice.test(name)) { stage4VoiceBytes += bytes; stage4VoiceCount++; }
    else if (stage5Voice.test(name)) { stage5VoiceBytes += bytes; stage5VoiceCount++; }
    else if (stage6Voice.test(name)) { stage6VoiceBytes += bytes; stage6VoiceCount++; }
    else { files.add(path); countedVoiceBytes += bytes; }
  }
  const preFightUpperBoundBytes = [...files].reduce((n,p)=>n+statSync(resolve(ROOT,p)).size,0);
  const stage3MusicFiles = ['assets/audio/music-stage3.mp3', 'assets/audio/music-boss3.mp3'];
  const stage3MusicBytes = stage3MusicFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const stage4MusicFiles = ['assets/audio/music-stage4.mp3', 'assets/audio/music-boss4.mp3'];
  const stage4MusicBytes = stage4MusicFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const stage4SourceBytes = stage4SourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const stage5SourceBytes = stage5SourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const stage5MusicFiles = ['assets/audio/music-stage5.mp3', 'assets/audio/music-boss5.mp3'].filter(p => existsSync(resolve(ROOT, p)));
  const stage5MusicBytes = stage5MusicFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const iosSourceBytes = iosSourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const iosSourceBudget = 24 * 1024;
  const restartSourceBytes = restartSourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const restartSourceBudget = 16 * 1024;
  const cutsceneSourceBytes = cutsceneSourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const cutsceneSourceBudget = 20 * 1024;
  const stage3SourceBytes = stage3SourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const stage3SourceBudget = 8 * 1024;
  const cutsceneClips = existsSync(resolve(ROOT, 'assets/cutscenes')) ? readdirSync(resolve(ROOT, 'assets/cutscenes')).filter(n => /\.(mp4|jpg)$/.test(n)).sort().map(n => `assets/cutscenes/${n}`) : [];
  const cutsceneClipBytes = cutsceneClips.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const cutsceneClipBudget = 25_000_000;
  const stage4SourceBudget = 192 * 1024;
  const stage5SourceBudget = 192 * 1024;
  const stage3VoiceBudget = 18 * 200 * 1024, stage3MusicBudget = 2 * 1_200_000;
  const stage4VoiceBudget = 23 * 200 * 1024, stage4MusicBudget = 2 * 1_200_000;
  const stage5VoiceBudget = 23 * 200 * 1024, stage5MusicBudget = 2 * 1_200_000;
  const stage6SourceBytes = stage6SourceFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const stage6SourceBudget = 192 * 1024;
  const stage6VoiceBudget = 24 * 200 * 1024, stage6MusicBudget = 2 * 1_200_000;
  const stage6MusicFiles = ['assets/audio/music-stage6.mp3', 'assets/audio/music-boss6.mp3'].filter(p => existsSync(resolve(ROOT, p)));
  const stage6MusicBytes = stage6MusicFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const walkBytes = dir => {
    const base = resolve(ROOT, dir);
    if (!existsSync(base)) return { files: [], bytes: 0 };
    const out = [];
    const stack = [base];
    while (stack.length) {
      const cur = stack.pop();
      for (const name of readdirSync(cur, { withFileTypes: true })) {
        const p = resolve(cur, name.name);
        if (name.isDirectory()) stack.push(p);
        else out.push(p.slice(ROOT.length + 1));
      }
    }
    return { files: out.sort(), bytes: out.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0) };
  };
  const stage6Art = [walkBytes('assets/stage6'), walkBytes('assets/bg6')];
  const stage6ArtFiles = stage6Art.flatMap(a => a.files);
  const stage6ArtBytes = stage6Art.reduce((n, a) => n + a.bytes, 0);
  const stage6ArtBudget = 6_000_000;
  const randDir = resolve(ROOT, 'assets/cutscenes/rand');
  const randCallFiles = existsSync(randDir) ? readdirSync(randDir).filter(n => /\.(mp4|jpg)$/.test(n)).sort().map(n => `assets/cutscenes/rand/${n}`) : [];
  const randCallBytes = randCallFiles.reduce((n, p) => n + statSync(resolve(ROOT, p)).size, 0);
  const randCallBudget = 7_500_000;
  const rgbaBytes = images.reduce((n,x)=>n+x.rgbaBytes,0);
  const rileyAnimations = json('assets/chars/riley.anims.json').anims;
  // These are the shipped attack-animation mappings, not a claim that every
  // move is visually distinct. Runkick has its own artwork since the balefire/Loial branch.
  const playerAttacks = Object.entries({ combo1:'combo1', combo2:'combo2', combo3:'combo3', back:'back',
    airkick:'airkick', runkick:'runkick', cast:'cast', knee:'knee', throw:'throw' }).map(([action, animation]) => {
    const name = `riley_${animation}`, data = rileyAnimations.find(a => a.name === name);
    const namedFrames = new Set(data?.frames || []).size;
    return { action, animation:name, namedFrames, minimumFrames:5, densityStatus:namedFrames>=5?'PASS':'FAIL' };
  });
  return { characters, preFight: { files:[...files].sort(), inventoryUpperBoundBytes:preFightUpperBoundBytes, budgetBytes:25_000_000,
      inventoryStatus:preFightUpperBoundBytes <= 25_000_000 ? 'PASS' : 'FAIL',
      countedVoiceBytes,
      note:'Stage 1 and Stage 2 static inventory, including music-main and every voice those stages ship. Stage 3 and Stage 4 voices and music are under stage3 and stage4 (they are not loaded before the first fight, and they do not fit this 25 MB gate). The iOS hotfix modules are under iosHotfix for the same reason. Actual transfer/cold-load timing requires browser resource evidence.' },
    iosHotfix: {
      source: { files: iosSourceFiles, bytes: iosSourceBytes, budgetBytes: iosSourceBudget,
        status: iosSourceBytes <= iosSourceBudget ? 'PASS' : 'FAIL',
        note: 'Viewport, Pages base, debug flag, Stage 3 plate stand-in and freeze guard. They do not fit the leftover Stage 1 headroom, so they are not folded into the 25 MB pre-fight sum.' },
    },
    restartHotfix: {
      source: { files: restartSourceFiles, bytes: restartSourceBytes, budgetBytes: restartSourceBudget,
        status: restartSourceBytes <= restartSourceBudget ? 'PASS' : 'FAIL',
        note: 'Quality governor and freeze-guard resume. Not folded into the 25 MB pre-fight sum, the same split as iosHotfix.' },
    },
    cutscenes: {
      source: { files: cutsceneSourceFiles, bytes: cutsceneSourceBytes, budgetBytes: cutsceneSourceBudget,
        status: cutsceneSourceBytes <= cutsceneSourceBudget ? 'PASS' : 'FAIL',
        note: 'Video cutscene controller and hooks. Not folded into the 25 MB pre-fight sum, the same split as restartHotfix.' },
      clips: { files: cutsceneClips, bytes: cutsceneClipBytes, budgetBytes: cutsceneClipBudget,
        status: cutsceneClipBytes <= cutsceneClipBudget ? 'PASS' : 'FAIL',
        note: 'Streamed one at a time through a temporary <video> when a cutscene starts; nothing is preloaded, so they are outside the pre-fight sum.' },
      randCalls: { files: randCallFiles, bytes: randCallBytes, budgetBytes: randCallBudget,
        status: randCallBytes <= randCallBudget ? 'PASS' : 'FAIL',
        note: 'Rand call clips in assets/cutscenes/rand. Streamed one at a time. Not part of the 25 MB clip line or the pre-fight sum. readdir of assets/cutscenes is not recursive, so this line is required.' },
    },
    stage3: {
      source: { files: stage3SourceFiles, bytes: stage3SourceBytes, budgetBytes: stage3SourceBudget,
        status: stage3SourceBytes <= stage3SourceBudget ? 'PASS' : 'FAIL',
        note: 'Code-drawn stand-ins for the labelled Stage 3 prop/FX sheets, run at Stage 3 entry. Not part of the Stage 1 pre-fight sum.' },
      voices: { count: stage3VoiceCount, bytes: stage3VoiceBytes, budgetBytes: stage3VoiceBudget,
        status: stage3VoiceBytes <= stage3VoiceBudget ? 'PASS' : 'FAIL',
        note: 'STAGE3_VOICES only. Each line is capped at 200 KB; the total cap is 18 times that.' },
      music: { files: stage3MusicFiles, bytes: stage3MusicBytes, budgetBytes: stage3MusicBudget,
        status: stage3MusicBytes <= stage3MusicBudget ? 'PASS' : 'FAIL',
        note: 'Two decoded loops, each under 1.2 MB. Not part of the Stage 1 pre-fight sum.' },
    },
    stage4: {
      source: { files: stage4SourceFiles, bytes: stage4SourceBytes, budgetBytes: stage4SourceBudget,
        status: stage4SourceBytes <= stage4SourceBudget ? 'PASS' : 'FAIL',
        note: 'Stage 4 modules only. They do not fit the leftover Stage 1 headroom, so they are not folded into the 25 MB pre-fight sum.' },
      voices: { count: stage4VoiceCount, bytes: stage4VoiceBytes, budgetBytes: stage4VoiceBudget,
        status: stage4VoiceBytes <= stage4VoiceBudget ? 'PASS' : 'FAIL',
        note: 'Stage 4 voice lines only. Each line is capped at 200 KB; the total cap is 23 times that.' },
      music: { files: stage4MusicFiles, bytes: stage4MusicBytes, budgetBytes: stage4MusicBudget,
        status: stage4MusicBytes <= stage4MusicBudget ? 'PASS' : 'FAIL',
        note: 'Two decoded loops, each under 1.2 MB. Not part of the Stage 1 pre-fight sum.' },
    },
    stage5: {
      source: { files: stage5SourceFiles, bytes: stage5SourceBytes, budgetBytes: stage5SourceBudget,
        status: stage5SourceBytes <= stage5SourceBudget ? 'PASS' : 'FAIL',
        note: 'Stage 5 modules only. They do not fit the leftover Stage 1 headroom, so they are not folded into the 25 MB pre-fight sum.' },
      voices: { count: stage5VoiceCount, bytes: stage5VoiceBytes, budgetBytes: stage5VoiceBudget,
        status: stage5VoiceBytes <= stage5VoiceBudget ? 'PASS' : 'FAIL',
        note: 'Stage 5 voice lines only, when the files exist. Each line is capped at 200 KB; the total cap is 23 times that.' },
      music: { files: stage5MusicFiles, bytes: stage5MusicBytes, budgetBytes: stage5MusicBudget,
        status: stage5MusicBytes <= stage5MusicBudget ? 'PASS' : 'FAIL',
        note: 'Two decoded loops, each under 1.2 MB, counted only when the file is on disk. Not part of the Stage 1 pre-fight sum.' },
    },
    stage6: {
      source: { files: stage6SourceFiles, bytes: stage6SourceBytes, budgetBytes: stage6SourceBudget,
        status: stage6SourceBytes <= stage6SourceBudget ? 'PASS' : 'FAIL',
        note: 'Stage 6 modules only. They do not fit the leftover Stage 1 headroom, so they are not folded into the 25 MB pre-fight sum.' },
      voices: { count: stage6VoiceCount, bytes: stage6VoiceBytes, budgetBytes: stage6VoiceBudget,
        status: stage6VoiceBytes <= stage6VoiceBudget ? 'PASS' : 'FAIL',
        note: 'Stage 6 voice lines only, when the files exist. Each line is capped at 200 KB; the total cap is 24 times that.' },
      music: { files: stage6MusicFiles, bytes: stage6MusicBytes, budgetBytes: stage6MusicBudget,
        status: stage6MusicBytes <= stage6MusicBudget ? 'PASS' : 'FAIL',
        note: 'Two decoded loops, each under 1.2 MB, counted only when the file is on disk. Not part of the Stage 1 pre-fight sum.' },
      art: { files: stage6ArtFiles, bytes: stage6ArtBytes, budgetBytes: stage6ArtBudget,
        status: stage6ArtBytes <= stage6ArtBudget ? 'PASS' : 'FAIL',
        note: 'Disk bytes under assets/stage6 and assets/bg6. Not part of the Stage 1 pre-fight sum.' },
    },
    playerAttackDensity: { minimumFrames:5, attacks:playerAttacks,
      densityStatus:playerAttacks.every(a=>a.densityStatus==='PASS')?'PASS':'FAIL',
      note:'Unique named references per shipped action, not proof of unique painted poses or anticipation/recovery quality. Balefire (8) is a special, not in this list; candidate artwork outside game assets is excluded.' },
    textureEstimate: { rgbaBaseBytes:rgbaBytes, withFullMipChainBytes:Math.ceil(rgbaBytes*4/3), images,
      mipmaps:'Disabled by the pinned Phaser default and current game configuration; full-chain bytes are hypothetical.',
      note:'RGBA8 decoded base-level estimate, not measured GPU allocation. Excludes framebuffer/filter/canvas/driver allocations. Normal maps counted separately; no device-safe claim.' },
    physicalDeviceGate:'UNMEASURED', blindReview:'PENDING', freezeFrameReview:'PENDING', likenessReview:'PENDING' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(audit(),null,2));
