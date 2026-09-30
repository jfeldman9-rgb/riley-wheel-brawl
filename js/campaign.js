'use strict';
(function () {
  const R = window.RWB;
  R.VOICE_LINES = {
    op_moiraine_01: {
      id: 'op_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'Riley, the Shadow has taken Twinkle Toes.',
    },
    op_riley_01: {
      id: 'op_riley_01',
      who: 'riley',
      name: 'RILEY',
      text: 'Then we bring her home.',
    },
    op_kenzie_01: {
      id: 'op_kenzie_01',
      who: 'kenzie',
      name: 'TWINKLE TOES',
      text: 'You picked the wrong dancer!',
    },
    op_taim_01: {
      id: 'op_taim_01',
      who: 'taim',
      name: 'MAZRIM TAIM',
      text: 'Bring the child to the Black Tower.',
    },
    st1_moiraine_01: {
      id: 'st1_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'Winternight has begun. Stay sharp.',
    },
    st1_riley_01: { id: 'st1_riley_01', who: 'riley', name: 'RILEY', text: "I'll guard our home." },
    st2_moiraine_01: {
      id: 'st2_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'The Fade fled toward Caemlyn.',
    },
    st2_riley_01: { id: 'st2_riley_01', who: 'riley', name: 'RILEY', text: "It won't lose me." },
    st2_fade_01: { id: 'st2_fade_01', who: 'fade', name: 'FADE', text: 'The Shadow sees you.' },
    st3_moiraine_01: {
      id: 'st3_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'Mashadar hunts anything that moves.',
    },
    st3_riley_01: { id: 'st3_riley_01', who: 'riley', name: 'RILEY', text: "Then I'll move fast." },
    st3_draghkar_01: {
      id: 'st3_draghkar_01',
      who: 'draghkar',
      name: 'DRAGHKAR',
      text: 'Come closer, little spark.',
    },
    st4_forsaken_01: {
      id: 'st4_forsaken_01',
      who: 'forsaken',
      name: "BE'LAL",
      text: 'Callandor belongs to me.',
    },
    st4_riley_01: { id: 'st4_riley_01', who: 'riley', name: 'RILEY', text: 'Not today.' },
    st4_kenzie_01: {
      id: 'st4_kenzie_01',
      who: 'kenzie',
      name: 'TWINKLE TOES',
      text: 'Riley! I can see the lightning!',
    },
    st4_moiraine_01: {
      id: 'st4_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'Twinkle Toes, guide the spark.',
    },
    st4_kenzie_02: {
      id: 'st4_kenzie_02',
      who: 'kenzie',
      name: 'TWINKLE TOES',
      text: 'Like a dance step. Got it!',
    },
    st5_taim_01: {
      id: 'st5_taim_01',
      who: 'taim',
      name: 'MAZRIM TAIM',
      text: 'The Black Tower is mine.',
    },
    st5_riley_01: { id: 'st5_riley_01', who: 'riley', name: 'RILEY', text: 'Twinkle Toes is not.' },
    st5_kenzie_01: {
      id: 'st5_kenzie_01',
      who: 'kenzie',
      name: 'TWINKLE TOES',
      text: 'Ready when you are, big brother!',
    },
    st5_riley_02: { id: 'st5_riley_02', who: 'riley', name: 'RILEY', text: 'Together!' },
    st5_kenzie_02: {
      id: 'st5_kenzie_02',
      who: 'kenzie',
      name: 'TWINKLE TOES',
      text: 'Twinkle Toes thunder!',
    },
    end_moiraine_01: {
      id: 'end_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'The Wheel turned in our favor.',
    },
    end_riley_01: { id: 'end_riley_01', who: 'riley', name: 'RILEY', text: "Let's go home." },
    end_kenzie_01: {
      id: 'end_kenzie_01',
      who: 'kenzie',
      name: 'TWINKLE TOES',
      text: 'After one victory dance!',
    },
    riley_super_01: { id: 'riley_super_01', who: 'riley', name: 'RILEY', text: 'Balefire!' },
    moiraine_heal_01: {
      id: 'moiraine_heal_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'Rise, Riley, Rise!',
    },
    riley_fire_01: { id: 'riley_fire_01', who: 'riley', name: 'RILEY', text: 'Fire!' },
    riley_combo_01: { id: 'riley_combo_01', who: 'riley', name: 'RILEY', text: 'Front kick!' },
    riley_combo_02: { id: 'riley_combo_02', who: 'riley', name: 'RILEY', text: 'Roundhouse!' },
    riley_combo_03: { id: 'riley_combo_03', who: 'riley', name: 'RILEY', text: 'Spin!' },
    riley_juggle_01: { id: 'riley_juggle_01', who: 'riley', name: 'RILEY', text: 'Up you go!' },
    riley_grab_01: { id: 'riley_grab_01', who: 'riley', name: 'RILEY', text: 'Not so fast!' },
    riley_throw_01: { id: 'riley_throw_01', who: 'riley', name: 'RILEY', text: 'Over there!' },
    riley_low_01: { id: 'riley_low_01', who: 'riley', name: 'RILEY', text: 'I need a moment.' },
    riley_respawn_01: {
      id: 'riley_respawn_01',
      who: 'riley',
      name: 'RILEY',
      text: 'Back on my feet.',
    },
    riley_saidin_full_01: {
      id: 'riley_saidin_full_01',
      who: 'riley',
      name: 'RILEY',
      text: 'Saidin is full!',
    },
    moiraine_taint_01: {
      id: 'moiraine_taint_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'Spend the power, Riley!',
    },
    riley_angreal_01: {
      id: 'riley_angreal_01',
      who: 'riley',
      name: 'RILEY',
      text: 'The fire burns brighter!',
    },
    riley_call_01: { id: 'riley_call_01', who: 'riley', name: 'RILEY', text: 'Loial, now!' },
    loial_charge_01: {
      id: 'loial_charge_01',
      who: 'loial',
      name: 'LOIAL',
      text: 'For my friends!',
    },
    loial_done_01: { id: 'loial_done_01', who: 'loial', name: 'LOIAL', text: 'That should help!' },
    riley_call_spent_01: {
      id: 'riley_call_spent_01',
      who: 'riley',
      name: 'RILEY',
      text: 'Loial needs a rest.',
    },
    riley_callandor_01: {
      id: 'riley_callandor_01',
      who: 'riley',
      name: 'RILEY',
      text: 'Callandor answers!',
    },
    riley_victory_01: {
      id: 'riley_victory_01',
      who: 'riley',
      name: 'RILEY',
      text: 'The way is clear.',
    },
    riley_victory_02: {
      id: 'riley_victory_02',
      who: 'riley',
      name: 'RILEY',
      text: "Twinkle Toes, I'm coming.",
    },
    trolloc_intro_01: {
      id: 'trolloc_intro_01',
      who: 'trolloc',
      name: 'TROLLOC',
      text: 'The Shadow is hungry!',
    },
    trolloc_heavy_intro_01: {
      id: 'trolloc_heavy_intro_01',
      who: 'trolloc-chieftain',
      name: 'TROLLOC CHIEFTAIN',
      text: 'Break the village!',
    },
    darkfriend_intro_01: {
      id: 'darkfriend_intro_01',
      who: 'darkfriend',
      name: 'DARKFRIEND',
      text: 'You cannot hide!',
    },
    fade_intro_01: { id: 'fade_intro_01', who: 'fade', name: 'FADE', text: 'No road is safe.' },
    draghkar_intro_01: {
      id: 'draghkar_intro_01',
      who: 'draghkar',
      name: 'DRAGHKAR',
      text: 'Listen to my song.',
    },
    stone_guard_intro_01: {
      id: 'stone_guard_intro_01',
      who: 'stone-guard',
      name: 'STONE GUARD',
      text: 'None may pass!',
    },
    forsaken_intro_01: {
      id: 'forsaken_intro_01',
      who: 'forsaken',
      name: "BE'LAL",
      text: "Kneel, little Asha'man.",
    },
    ashaman_intro_01: {
      id: 'ashaman_intro_01',
      who: "turned-asha'man",
      name: "TURNED ASHA'MAN",
      text: "Obey the M'Hael.",
    },
    taim_phase_01: {
      id: 'taim_phase_01',
      who: 'taim',
      name: 'MAZRIM TAIM',
      text: 'You are outmatched.',
    },
    taim_phase_02: {
      id: 'taim_phase_02',
      who: 'taim',
      name: 'MAZRIM TAIM',
      text: 'I command the storm!',
    },
    taim_phase_03: {
      id: 'taim_phase_03',
      who: 'taim',
      name: 'MAZRIM TAIM',
      text: 'This is not over!',
    },
    st1_clear_moiraine_01: {
      id: 'st1_clear_moiraine_01',
      who: 'moiraine',
      name: 'MOIRAINE',
      text: 'The road is open. The Shadow fled east.',
    },
    st1_clear_riley_01: {
      id: 'st1_clear_riley_01',
      who: 'riley',
      name: 'RILEY',
      text: 'Twinkle Toes, I am coming.',
    },
  };
  Object.assign(R.CAPTIONS, {
    stage2: [
      {
        id: 'st2_moiraine_01',
        who: 'moiraine',
        name: 'MOIRAINE',
        text: 'The Fade fled toward Caemlyn.',
      },
      { id: 'st2_riley_01', who: 'riley', name: 'RILEY', text: "It won't lose me." },
    ],
    stage3: [
      {
        id: 'st3_moiraine_01',
        who: 'moiraine',
        name: 'MOIRAINE',
        text: 'Mashadar hunts anything that moves.',
      },
      { id: 'st3_riley_01', who: 'riley', name: 'RILEY', text: "Then I'll move fast." },
    ],
    stage4: [
      {
        id: 'st4_forsaken_01',
        who: 'forsaken',
        name: "BE'LAL",
        text: 'Callandor belongs to me.',
      },
      { id: 'st4_riley_01', who: 'riley', name: 'RILEY', text: 'Not today.' },
    ],
    callandor: [
      {
        id: 'st4_kenzie_01',
        who: 'kenzie',
        name: 'TWINKLE TOES',
        text: 'Riley! I can see the lightning!',
      },
      {
        id: 'st4_moiraine_01',
        who: 'moiraine',
        name: 'MOIRAINE',
        text: 'Twinkle Toes, guide the spark.',
      },
      {
        id: 'st4_kenzie_02',
        who: 'kenzie',
        name: 'TWINKLE TOES',
        text: 'Like a dance step. Got it!',
      },
    ],
    stage5: [
      { id: 'st5_taim_01', who: 'taim', name: 'MAZRIM TAIM', text: 'The Black Tower is mine.' },
      { id: 'st5_riley_01', who: 'riley', name: 'RILEY', text: 'Twinkle Toes is not.' },
    ],
    freed: [
      { id: 'taim_phase_03', who: 'taim', name: 'MAZRIM TAIM', text: 'This is not over!' },
      {
        id: 'st5_kenzie_01',
        who: 'kenzie',
        name: 'TWINKLE TOES',
        text: 'Ready when you are, big brother!',
      },
    ],
    joint: [
      { id: 'st5_riley_02', who: 'riley', name: 'RILEY', text: 'Together!' },
      { id: 'st5_kenzie_02', who: 'kenzie', name: 'TWINKLE TOES', text: 'Twinkle Toes thunder!' },
    ],
    ending: [
      {
        id: 'end_moiraine_01',
        who: 'moiraine',
        name: 'MOIRAINE',
        text: 'The Wheel turned in our favor.',
      },
      { id: 'end_riley_01', who: 'riley', name: 'RILEY', text: "Let's go home." },
      {
        id: 'end_kenzie_01',
        who: 'kenzie',
        name: 'TWINKLE TOES',
        text: 'After one victory dance!',
      },
    ],
  });
  R.LEVELS.push(
    ...[
      {
        name: 'CAEMLYN',
        sub: "THE FADE'S TRAIL",
        boss: 'MYRDDRAAL',
        kind: 'fade',
        attacks: ['SHADOW BLINK', 'SWORD COMBO', 'FEAR STUN'],
        mix: [
          ['darkfriend', 'axe'],
          ['darkfriend', 'darkfriend', 'spear'],
          ['darkfriend', 'hound', 'darkfriend'],
          ['spear', 'darkfriend', 'darkfriend', 'axe'],
          ['darkfriend', 'spear', 'darkfriend', 'hound'],
          ['boss'],
        ],
        index: 1,
        length: 4240,
        waves: [0, 1, 2, 3, 4, 5],
        wavePoints: [0, 720, 1440, 2160, 2880, 3600],
      },
      {
        name: 'SHADAR LOGOTH',
        sub: 'MASHADAR RISES',
        boss: 'DRAGHKAR',
        kind: 'draghkar',
        attacks: ['SWOOP', 'HYPNOTIC KISS', 'WING GUST'],
        mix: [
          ['cultist', 'hound'],
          ['cultist', 'darkfriend', 'cultist'],
          ['hound', 'cultist', 'spear'],
          ['cultist', 'cultist', 'hound', 'darkfriend'],
          ['cultist', 'hound', 'cultist', 'spear'],
          ['boss'],
        ],
        index: 2,
        length: 4240,
        waves: [0, 1, 2, 3, 4, 5],
        wavePoints: [0, 720, 1440, 2160, 2880, 3600],
      },
      {
        name: 'STONE OF TEAR',
        sub: 'THE SWORD THAT IS NOT A SWORD',
        boss: "BE'LAL",
        kind: 'forsaken',
        attacks: ['SWORD FLURRY', 'BALEFIRE', 'WEAVE SNARE'],
        mix: [
          ['guard', 'darkfriend'],
          ['guard', 'guard', 'spear'],
          ['darkfriend', 'guard', 'ashaman'],
          ['guard', 'ashaman', 'guard'],
          ['guard', 'guard', 'ashaman', 'darkfriend'],
          ['boss'],
        ],
        index: 3,
        length: 4240,
        waves: [0, 1, 2, 3, 4, 5],
        wavePoints: [0, 720, 1440, 2160, 2880, 3600],
      },
      {
        name: 'BLACK TOWER',
        sub: 'STORM ON THE ROOF',
        boss: 'MAZRIM TAIM',
        kind: 'taim',
        attacks: ['DARK BALEFIRE', 'STORM STRIKES', 'SHADOW SURGE'],
        mix: [
          ['ashaman', 'darkfriend'],
          ['ashaman', 'ashaman', 'darkfriend'],
          ['darkfriend', 'ashaman', 'darkfriend', 'ashaman'],
          ['ashaman', 'guard', 'ashaman'],
          ['ashaman', 'darkfriend', 'ashaman', 'darkfriend'],
          ['boss'],
        ],
        index: 4,
        length: 4240,
        waves: [0, 1, 2, 3, 4, 5],
        wavePoints: [0, 720, 1440, 2160, 2880, 3600],
      },
    ],
  );
  R.LEVELS.forEach((level, i) => {
    level.banner = ["EMOND'S FIELD", 'CAEMLYN', 'SHADAR LOGOTH', 'TEAR - CALLANDOR', 'THE BLACK TOWER'][i];
    level.length = R.SCROLL.length;
    level.wavePoints = [0, 1, 2, 3, 4, 5].map(zone => R.SCROLL.left(zone));
    level.sections = R.SCROLL.names[i];
  });
  // Natural-play pressure is stage-specific: later bosses retain their full
  // move sets and health, while their hits leave a fair three-life margin.
  R.LEVELS.forEach((level, i) => { level.damageScale = [1.15, 1.925, 0.68, 1.75, 1.20][i]; level.maxAttackers=2; });
  R.LEVELS[0].wavePoints = [0, 1, 2, 3, 4, 5].map(zone => R.SCROLL.left(zone));
  R.LEVELS[0].mix = R.Stage1.waveTable;
  R.LEVELS[0].kind = 'chieftain';
  R.storyArt = function (id) {
    if (id.startsWith('op_'))
      return id.includes('kenzie')
        ? 'cut-opening-02-v2'
        : id.includes('taim')
          ? 'cut-opening-03-v2'
          : id.includes('riley')
            ? 'cut-opening-04'
            : 'cut-opening-01';
    if (id.startsWith('end_')) return 'cut-homecoming';
    if (id.startsWith('st5_') || id === 'taim_phase_03') return 'cut-stage5-finale';
    const stage = (id.match(/^st(\d)_/) || [])[1];
    return stage ? 'cut-stage' + stage : null;
  };
  R.drawArtFailure = function (ctx) {
    if (!R.assets.failed().some((key) => !key.startsWith('cut-'))) return;
    ctx.fillStyle = '#b82235';
    ctx.fillRect(0, 164, 640, 20);
    R.drawText(ctx, 'ART LOAD FAILED - USING DRAWN ART', 320, 175, 7, '#fff', 'center');
  };
  R.paint = function (ctx, key, x, y, w, h) {
    let img = R.assets.get(key);
    if (!img && typeof key === 'string' && key.startsWith('portrait-')) {
      const who=key.slice(9),def=R.Puppet && R.Puppet.defs[who === 'trolloc-chieftain' ? 'chieftain' : who];
      img=R.assets.get(who==='forsaken'?'cg-turned-ashaman':'cg-'+who);
      if(img && def) {const b=def.head;ctx.drawImage(img,b[0]*img.width,b[1]*img.height,(b[2]-b[0])*img.width,(b[3]-b[1])*img.height,x,y,w,h);return true;}
      if(img) {ctx.drawImage(img,0,0,img.width,img.height*.65,x,y,w,h);return true;}
    }
    if (!img) return false;
    ctx.drawImage(img, x, y, w, h);
    return true;
  };
  for (const [key, src] of Object.entries(R.ART_FILES))
    R.assets.register(key, src, { lazy: key.startsWith('cut-') || key.includes('transition-') });
})();
