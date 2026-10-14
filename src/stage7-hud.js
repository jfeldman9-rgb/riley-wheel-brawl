// Moiraine/Lan readout in the existing Loial slot. hud.js stays untouched.
const NAME = 'STAGE 7 · RHUIDEAN — THE AIEL WASTE';
const VILLAIN = /ASMODEAN|SHAIDO/;

export function callReady(st, strike) {
  return !!(st && st.charges >= 1 && st.calls < 3 && !st.on && !strike);
}

export function syncCallReady(s) {
  const R = s?.riley, st = s?.kit?.call7;
  if (!R || !st || (s.stageNo || 0) !== 7) return;
  s.loial = null;
  R.loialReady = callReady(st, s.kit.strike);
}

function callLabel(st, strike, predicted) {
  const who = predicted === 'lan' ? 'LAN' : predicted === 'duo' ? 'CALL' : 'MOIRAINE';
  if (st.on || strike) return ['on:' + who, who + '!', '#8cf0ae', 1, predicted];
  if (st.calls >= 3) return ['spent', 'CALL SPENT', '#87909a', 0.35, predicted];
  if (callReady(st, strike)) return ['ready:' + who, who + ' READY', '#8cf0ae', 1, predicted];
  const wait = st.since >= 45;
  return ['k' + (st.kos | 0) + (wait ? 1 : 0) + ':' + who, who + ' ' + Math.min(10, st.kos | 0) + '/10', wait ? '#8cf0ae' : '#87909a', 0.45, predicted];
}

export function villainColor(who) {
  if (VILLAIN.test(who || '')) return '#ffb3a0';
  if (/NARRATOR/.test(who || '')) return '#ffe2a0';
  return '#9fd8ff';
}

/** Own-property label hook. Restoring it puts the Loial portrait and method back. */
export function bindCallLabel(hud) {
  if (!hud || hud._call7Bind) return hud?._call7Unbind;
  const prev = hud.updateLoialLabel;
  const own = Object.prototype.hasOwnProperty.call(hud, 'updateLoialLabel');
  const pic = hud.loialPic;
  const prevTex = pic?.texture?.key || 'loialPortrait';
  hud.updateLoialLabel = function (s, R) {
    const st = s?.kit?.call7;
    if (!st || (s.stageNo || 0) !== 7) return prev?.call(this, s, R);
    const predicted = s.kit.predicted || 'moiraine';
    const [key, label, col, dim] = callLabel(st, s.kit.strike, predicted);
    if (this._call7Key === key) return;
    this._call7Key = key;
    this._call7Sets = (this._call7Sets || 0) + 1;
    this.loialT?.setText(label)?.setColor(col);
    const want = predicted === 'lan' ? 'lanPortrait' : 'moiPortrait';
    if (this.loialPic && s.textures?.exists?.(want)) {
      const p = this.loialPic.setTexture(want);
      p?.setDisplaySize?.(44, 44);
      p?.setPosition?.(207, 83);
    }
    this.loialPic?.setAlpha?.(dim);
    void R;
  };
  hud._call7Bind = 1;
  hud._call7Unbind = () => {
    if (own) hud.updateLoialLabel = prev; else delete hud.updateLoialLabel;
    hud._call7Bind = 0; hud._call7Key = '';
    if (hud.loialPic?.setTexture) hud.loialPic.setTexture(prevTex);
    hud.loialPic?.setDisplaySize?.(30, 30);
    hud.loialPic?.setPosition?.(214, 83);
  };
  return hud._call7Unbind;
}

function paint(hud, s) {
  const n = s.titleSel || s.stageNo;
  if (n === 7 && hud.titleStageT && hud._s7n !== 7) { hud._s7n = 7; hud.titleStageT.setText(NAME); }
  fixHelp(hud, n === 7);
  fixBoss(hud, s);
}

function fixBoss(hud, s) {
  const name = s.stageDef?.boss?.name;
  if (!name || !hud.bossName || hud._s7boss === name) return;
  hud._s7boss = name;
  hud.bossName.setText(name);
  const pic = s.stageDef.boss.portrait;
  if (pic && s.textures?.exists?.(pic)) hud.bossPic?.setTexture?.(pic)?.setDisplaySize?.(68, 68);
}

function fixHelp(hud, on) {
  const list = hud.card?.list || hud.card?.getAll?.() || [];
  for (const node of list) {
    if (typeof node?.text !== 'string' || !node.setText) continue;
    if (on && node.text.includes('Loial') && !node._s7) { node._base7 = node.text; node._s7 = 1; node.setText(node.text.replace(/Loial/g, 'Moiraine / Lan')); }
    if (!on && node._s7 && node._base7) { node.setText(node._base7); node._s7 = 0; }
  }
}

export function installStage7Hud() {
  return import('./hud.js').then(m => {
    const p = m.HUD?.prototype;
    if (!p || p._s7hud) return;
    const update = p.update, title = p.titleSelect, card = p.titleCard, cap = p.caption, line = p.cutsceneLine;
    p.update = function(time, delta) {
      const out = update.apply(this, arguments);
      const s = this.stage;
      if (s && s.stageNo === 7) paint(this, s);
      return out;
    };
    p.titleSelect = function(n) { const out = title.apply(this, arguments); if (n === 7 && this.titleStageT) { this._s7n = 7; this.titleStageT.setText(NAME); } fixHelp(this, n === 7); return out; };
    p.titleCard = function() { const out = card.apply(this, arguments); const n = this.stage?.titleSel || this.stage?.stageNo; if (n === 7) { this.titleStageT?.setText(NAME); fixHelp(this, true); } return out; };
    if (typeof cap === 'function') p.caption = function(who, text) {
      const out = cap.apply(this, arguments);
      if ((this.stage?.stageNo || this.stage?.titleSel) === 7 && this.capWho?.setColor) this.capWho.setColor(villainColor(who));
      return out;
    };
    if (typeof line === 'function') p.cutsceneLine = function(l) {
      const out = line.apply(this, arguments);
      if ((this.stage?.stageNo || this.stage?.titleSel) === 7 && l && this.cut?.who?.setColor) this.cut.who.setColor(villainColor(l.who));
      return out;
    };
    p._s7hud = 1;
  });
}
