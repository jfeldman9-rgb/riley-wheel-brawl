'use strict';
// Prints the voice table as JSON (used by tools/make-voices.py and the recording list).
const { boot } = require('./soak.cjs');
const path = require('path');
const R = boot(path.resolve(__dirname, '..'));
const lines = Object.values(R.VOICE_LINES).map(l => ({ id: l.id, who: l.who, name: l.name, text: l.text, file: R.voiceFile(l.id), generated: !!(R.VOICE_TTS[l.who] || R.VOICE_LOCAL_CAST?.[l.who]), recorded: !!R.VOICE_RECORDED[l.who] }));
process.stdout.write(JSON.stringify({ tts: R.VOICE_TTS, localCast: R.VOICE_LOCAL_CAST, lines }, null, 1) + '\n');
