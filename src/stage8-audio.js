// Set a presence flag only after dropping in and validating that commissioned loop.
export const MUSIC8_PRESENT=Object.freeze({stage8:false,boss8:false});
export function musicTrack8(state){if(state==='stage')return MUSIC8_PRESENT.stage8?'stage8':'stage5';if(state==='boss')return MUSIC8_PRESENT.boss8?'boss8':'boss6';return null;}
