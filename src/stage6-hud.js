// Rand readout in the existing Loial slot. hud.js stays untouched.
const NAME = 'THE STONE OF TEAR';

export function randReady(st, strike) {
  return !!(st && st.charges >= 1 && st.calls < 3 && !st.on && !strike);
}

/** Mirror readiness onto Riley so hud.js can toggle #tbL without a source edit. */
export function syncRandReady(s) {
  const R = s?.riley, st = s?.kit?.rand;
  if (!R || !st || (s.stageNo || 0) < 6) return;
  s.loial = null;
  R.loialReady = randReady(st, s.kit.strike);
}

function randLabel(st, strike) {
  if (st.on || strike) return ['on', 'RAND!', '#8cf0ae', 1];
  if (st.calls >= 3) return ['spent', 'RAND SPENT', '#87909a', 0.35];
  if (randReady(st, strike)) return ['ready', 'RAND READY', '#8cf0ae', 1];
  const wait = st.since >= 45;
  return ['k' + (st.kos | 0) + (wait ? 1 : 0), 'RAND ' + Math.min(10, st.kos | 0) + '/10', wait ? '#8cf0ae' : '#87909a', 0.45];
}

/** Own-property label hook. Restoring it puts the Loial portrait and method back. */
export function bindRandLabel(hud) {
  if (!hud || hud._randBind) return hud?._randUnbind;
  const prev = hud.updateLoialLabel;
  const own = Object.prototype.hasOwnProperty.call(hud, 'updateLoialLabel');
  const pic = hud.loialPic;
  const prevTex = pic?.texture?.key || 'loialPortrait';
  hud.updateLoialLabel = function (s, R) {
    const st = s?.kit?.rand;
    if (!st || (s.stageNo || 0) < 6) return prev?.call(this, s, R);
    const [key, label, col, dim] = randLabel(st, s.kit.strike);
    if (this._randKey === key) return;
    this._randKey = key;
    this._randSets = (this._randSets || 0) + 1;
    this.loialT?.setText(label)?.setColor(col);
    if (this.loialPic && s.textures?.exists?.('randPortrait')) this.loialPic.setTexture('randPortrait')?.setDisplaySize?.(30, 30);
    this.loialPic?.setAlpha?.(dim);
    void R;
  };
  hud._randBind = 1;
  hud._randUnbind = () => {
    if (own) hud.updateLoialLabel = prev; else delete hud.updateLoialLabel;
    hud._randBind = 0; hud._randKey = '';
    if (hud.loialPic?.setTexture) hud.loialPic.setTexture(prevTex);
  };
  return hud._randUnbind;
}

function paint(hud, s) {
  const n = s.titleSel || s.stageNo;
  if (n === 6 && hud.titleStageT && hud._s6n !== 6) { hud._s6n = 6; hud.titleStageT.setText(NAME); }
  fixHelp(hud, n >= 6);
  fixBoss(hud, s);
}

function fixBoss(hud, s) {
  const name = s.stageDef?.boss?.name;
  if (!name || !hud.bossName || hud._s6boss === name) return;
  hud._s6boss = name;
  hud.bossName.setText(name);
  const pic = s.stageDef.boss.portrait;
  if (pic && s.textures?.exists?.(pic)) hud.bossPic?.setTexture?.(pic)?.setDisplaySize?.(68, 68);
}

function fixHelp(hud, on) {
  const list = hud.card?.list || hud.card?.getAll?.() || [];
  for (const node of list) {
    if (typeof node?.text !== 'string' || !node.setText) continue;
    if (on && node.text.includes('Loial') && !node._s6) { node._base = node.text; node._s6 = 1; node.setText(node.text.replace(/Loial/g, 'Rand')); }
    if (!on && node._s6 && node._base) { node.setText(node._base); node._s6 = 0; }
  }
}

export function installStage6Hud() {
  return import('./hud.js').then(m => {
    const p = m.HUD?.prototype;
    if (!p || p._s6hud) return;
    const update = p.update, title = p.titleSelect, card = p.titleCard;
    p.update = function(time, delta) {
      const out = update.apply(this, arguments);
      const s = this.stage;
      if (s && s.stageNo >= 6) paint(this, s);
      return out;
    };
    p.titleSelect = function(n) { const out = title.apply(this, arguments); if (n === 6 && this.titleStageT) { this._s6n = 6; this.titleStageT.setText(NAME); } fixHelp(this, n === 6); return out; };
    p.titleCard = function() { const out = card.apply(this, arguments); const n = this.stage?.titleSel || this.stage?.stageNo; if (n === 6) { this.titleStageT?.setText(NAME); fixHelp(this, true); } return out; };
    p._s6hud = 1;
  });
}
