'use strict';
(function () {
  const R = window.RWB;
  R.ASSET_VER = '20260927-scroll3';
  // One-way Streets of Rage layout. Six fight screens, a short walk between
  // them, camera only moves forward. Whale Lance (3991948) did the same with
  // camX = max(camX, target), a lock at each wave.x, and goArrowT.
  R.SCROLL = {
    fight: 640,
    stride: 720,
    zones: 6,
    get length() { return (this.zones - 1) * this.stride + this.fight; },
    left(zone) { return zone * this.stride; },
    names: [
      ['VILLAGE EDGE', 'WINESPRING INN', 'FOREST ROAD'],
      ['CAEMLYN GATES', 'THE STREETS', 'THE PALACE'],
      ['THE RUINS', 'MASHADAR FOG', 'THE SQUARE'],
      ['STONE HALLS', 'INNER STONE', 'HEART OF THE STONE'],
      ['TOWER GROUNDS', 'THE YARD', 'THE ROOF']
    ]
  };
  R.TUNE = {
    stageLength: 4240,
    playerSpeed: 128,
    laneSpeed: 84,
    jumpSpeed: 340,
    gravity: 980,
    comboWindow: 0.48,
    attackBuffer: 0.2,
    fireCooldown: 0.62,
    angrealFireCooldown: 0.3,
    taintGrace: 4,
    taintTell: 0.65,
    taintInterval: 2.1,
    healAmount: 35,
    angrealSeconds: 10,
    bossHp: 2200
  };
  R.MOVES = {
    front: { name: 'FRONT KICK', duration: 0.36, active: [0.1, 0.18], reach: 46, back: 5, height: 32, depth: 26, damage: 9, knockback: 72, meter: 7 },
    round: { name: 'ROUNDHOUSE', duration: 0.4, active: [0.12, 0.22], reach: 54, back: 8, height: 40, depth: 28, damage: 12, knockback: 92, meter: 8 },
    back: { name: 'BACK KICK', duration: 0.5, active: [0.18, 0.28], reach: 64, back: 8, height: 38, depth: 30, damage: 16, knockback: 240, knockdown: true, meter: 11 },
    jump: { name: 'FLYING KICK', duration: 0.48, active: [0.08, 0.3], reach: 58, back: 6, height: 34, depth: 28, damage: 15, knockback: 200, knockdown: true, meter: 10 },
    spin: { name: 'SPINNING KICK', duration: 0.64, active: [0.18, 0.38], reach: 54, back: 54, height: 42, depth: 32, damage: 16, knockback: 220, knockdown: true, meter: 11 },
    knee: { name: 'KNEE', duration: 0.28, active: [0.08, 0.15], reach: 28, back: 3, height: 32, depth: 22, damage: 8, knockback: 40, meter: 6 },
    throw: { name: 'THROW', duration: 0.52, active: [0.22, 0.3], reach: 46, back: 8, height: 48, depth: 30, damage: 22, knockback: 280, knockdown: true, meter: 12 }
  };
  R.RILEY_POSES = {
    idle: [
      { hip: [-5, 5], knee: [3, -3], shoulder: [7, -7], elbow: [-12, 12], bob: 0 },
      { hip: [-4, 4], knee: [2, -2], shoulder: [6, -6], elbow: [-10, 10], bob: -1 }
    ],
    walk: [
      { hip: [-31, 26], knee: [20, 5], shoulder: [25, -25], elbow: [-16, 16], bob: 0 },
      { hip: [-8, 9], knee: [32, -10], shoulder: [7, -7], elbow: [-11, 11], bob: -2 },
      { hip: [27, -30], knee: [4, 21], shoulder: [-25, 25], elbow: [16, -16], bob: 0 },
      { hip: [9, -8], knee: [-10, 32], shoulder: [-7, 7], elbow: [11, -11], bob: -2 }
    ],
    rise: [{ hip: [-12, 15], knee: [28, 26], shoulder: [-25, 35], elbow: [35, -25], bob: 0 }],
    fall: [{ hip: [20, -18], knee: [15, 25], shoulder: [34, -30], elbow: [-20, 22], bob: 0 }],
    front: [{ hip: [-6, 8], knee: [8, 25], shoulder: [16, -20], elbow: [-20, 20], bob: 0 }, { hip: [-7, 78], knee: [5, 3], shoulder: [28, -28], elbow: [-28, 28], bob: -1 }, { hip: [-4, 25], knee: [7, 40], shoulder: [12, -12], elbow: [-15, 15], bob: 0 }],
    round: [{ hip: [-20, 30], knee: [18, 55], shoulder: [35, -40], elbow: [-25, 30], bob: -2 }, { hip: [-15, 96], knee: [8, 0], shoulder: [55, -50], elbow: [-35, 35], bob: -3 }, { hip: [-5, 20], knee: [5, 28], shoulder: [12, -16], elbow: [-12, 12], bob: 0 }],
    back: [{ hip: [15, -35], knee: [20, 45], shoulder: [-55, 48], elbow: [28, -30], bob: -2 }, { hip: [5, -103], knee: [5, 0], shoulder: [-70, 65], elbow: [20, -20], bob: -4 }, { hip: [-5, -20], knee: [12, 28], shoulder: [-20, 17], elbow: [12, -12], bob: 0 }],
    spin: [{ hip: [-20, 30], knee: [20, 35], shoulder: [70, -70], elbow: [-20, 20], bob: -2 }, { hip: [-105, 102], knee: [0, 0], shoulder: [-75, 75], elbow: [12, -12], bob: -4 }, { hip: [22, -20], knee: [28, 20], shoulder: [40, -40], elbow: [-18, 18], bob: -1 }],
    hurt: [{ hip: [-18, 12], knee: [35, 25], shoulder: [-48, 30], elbow: [45, -30], bob: 2 }],
    knockdown: [{ hip: [-70, 65], knee: [25, -25], shoulder: [-80, 80], elbow: [20, -20], bob: 12 }],
    lying: [{ hip: [-88, 85], knee: [2, -2], shoulder: [-90, 90], elbow: [5, -5], bob: 18 }],
    getup: [{ hip: [-45, 40], knee: [70, 65], shoulder: [-55, 55], elbow: [65, -65], bob: 8 }],
    channel: [{ hip: [-10, 10], knee: [5, -5], shoulder: [-72, 72], elbow: [-25, 25], bob: -2 }],
    victory: [{ hip: [-15, 15], knee: [7, -7], shoulder: [-150, 150], elbow: [15, -15], bob: -4 }]
  };
  R.CAPTIONS = {
    opening: [
      { id: 'op_moiraine_01', who: 'moiraine', name: 'MOIRAINE', text: 'Riley, the Shadow has taken Twinkle Toes.' },
      { id: 'op_kenzie_01', who: 'kenzie', name: 'TWINKLE TOES', text: 'You picked the wrong dancer!' },
      { id: 'op_taim_01', who: 'taim', name: 'MAZRIM TAIM', text: 'Bring the child to the Black Tower.' },
      { id: 'op_riley_01', who: 'riley', name: 'RILEY', text: 'Then we bring her home.' }
    ],
    intro: [
      { id: 'st1_moiraine_01', who: 'moiraine', name: 'MOIRAINE', text: "Winternight has begun. Stay sharp." },
      { id: 'st1_riley_01', who: 'riley', name: 'RILEY', text: "I'll guard our home." }
    ],
    clear: [
      { id: 'st1_clear_moiraine_01', who: 'moiraine', name: 'MOIRAINE', text: 'The road is open. The Shadow fled east.' },
      { id: 'st1_clear_riley_01', who: 'riley', name: 'RILEY', text: 'Twinkle Toes, I am coming.' }
    ]
  };
  R.LEVELS = [{
    index: 0,
    name: "EMOND'S FIELD",
    sub: 'WINTERNIGHT',
    length: 4240,
    waves: [0, 1, 2, 3, 4, 5],
    boss: 'TROLLOC CHIEFTAIN',
    attacks: ['AXE CRASH', 'HORN CHARGE', 'GROUND STOMP']
  }];
  R.voice = function (id) {
    if (R.audio.playClip && R.audio.playClip(id)) return;
    if (R.audio.sfx.voLine) R.audio.sfx.voLine();
  };
  R.keyPressed = function (input, action) {
    return !!(input && input.pressed && input.pressed[action]);
  };
  R.drawText = function (ctx, value, x, y, size, color, align) {
    ctx.save();
    ctx.font = (size || 8) + 'px "Press Start 2P", monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(value, x, y);
    ctx.restore();
  };
  R.drawPanel = function (ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(5, 9, 20, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d7bd63';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  };
}());
