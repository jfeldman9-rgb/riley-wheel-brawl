// Moiraine / Lan readout in the existing Loial slot. hud.js stays untouched.
const NAME = 'RHUIDEAN';
const PORTRAIT = { moiraine: 's7moiPort', lan: 's7lanPort', duo: 's7moiPort' };

export function callReady(st, strike) {
  return !!(st && st.charges >= 1 && st.calls < 3 && !st.on && !strike);
}

export function syncCallReady(s) {
  const R = s?.riley, st = s?.kit?.call;
  if (!R || !st || s.stageNo !== 7) return;
  s.loial = null;
  R.loialReady = callReady(st, s.kit.strike);
}

function labelFor(st, helper, strike) {
  if (st.on || strike) return ['on', helper === 'lan' ? 'LAN!' : helper === 'duo' ? 'CALL!' : 'MOIRAINE!', '#8fe3ff', 1];
  if (st.calls >= 3) return ['spent', 'CALL SPENT', '#87909a', 0.35];
  if (callReady(st, strike)) {
    if (helper === 'lan') return ['lan', 'LAN READY', '#d8d0c0', 1];
    if (helper === 'duo') return ['duo', 'CALL READY', '#8fe3ff', 1];
    return ['moi', 'MOIRAINE READY', '#8fb4ff', 1];
  }
  const wait = st.since >= 45;
  return ['k' + (st.kos | 0), 'CALL ' + Math.min(10, st.kos | 0) + '/10', wait ? '#8fe3ff' : '#87909a', 0.45];
}

function tintCaption(hud) {
  if (!hud?.caption || hud._s7cap) return;
  const prev = hud.caption;
  hud.caption = function (who, text) {
    const out = prev.apply(this, arguments);
    if (this.capWho?.setColor) this.capWho.setColor(/ASMODEAN|SHAIDO/.test(who || '') ? '#ffb3a0' : /NARRATOR/.test(who || '') ? '#ffe2a0' : '#9fd8ff');
    return out;
  };
  hud._s7cap = 1;
}

export function bindCallLabel(hud) {
  if (!hud || hud._s7bind) return hud?._s7unbind;
  tintCaption(hud);
  const prev = hud.updateLoialLabel;
  const own = Object.prototype.hasOwnProperty.call(hud, 'updateLoialLabel');
  const prevTex = hud.loialPic?.texture?.key || 'loialPortrait';
  hud.updateLoialLabel = function (s, R) {
    const st = s?.kit?.call;
    if (!st || s.stageNo !== 7) return prev?.call(this, s, R);
    const now = s.time?.now || 0;
    const helper = s.kit.helperNow?.() || 'moiraine';
    const [key, label, col, dim] = labelFor(st, helper, s.kit.strike);
    if (this._s7key === key && now - (this._s7at || 0) < 250) return;
    this._s7key = key; this._s7at = now;
    this.loialT?.setText(label)?.setColor(col);
    const tex = PORTRAIT[helper] || PORTRAIT.moiraine;
    if (this.loialPic && s.textures?.exists?.(tex)) this.loialPic.setTexture(tex)?.setDisplaySize?.(44, 44);
    this.loialPic?.setAlpha?.(dim);
    void R;
  };
  hud._s7bind = 1;
  hud._s7unbind = () => {
    if (own) hud.updateLoialLabel = prev; else delete hud.updateLoialLabel;
    hud._s7bind = 0; hud._s7key = '';
    if (hud.loialPic?.setTexture) hud.loialPic.setTexture(prevTex);
  };
  return hud._s7unbind;
}

function fixHelp(hud) {
  const list = hud.card?.list || hud.card?.getAll?.() || [];
  for (const node of list) {
    if (typeof node?.text !== 'string' || !node.setText) continue;
    if ((node.text.includes('Loial') || node.text.includes('Rand')) && !node._s7) {
      node._s7base = node._base || node.text; node._s7 = 1;
      node.setText(node.text.replace(/Loial|Rand/g, 'Moiraine / Lan'));
    }
  }
}

function paint(hud, s) {
  if ((s.titleSel || s.stageNo) === 7 && hud.titleStageT && hud._s7n !== 7) { hud._s7n = 7; hud.titleStageT.setText(NAME); }
  if (s.stageNo === 7) fixHelp(hud);
  const name = s.stageDef?.boss?.name;
  if (s.stageNo === 7 && name && hud.bossName && hud._s7boss !== name) {
    hud._s7boss = name; hud.bossName.setText(name);
    const pic = s.stageDef.boss.portrait;
    if (pic && s.textures?.exists?.(pic)) hud.bossPic?.setTexture?.(pic)?.setDisplaySize?.(68, 68);
  }
}

export function installStage7Hud() {
  return import('./hud.js').then(m => {
    const p = m.HUD?.prototype;
    if (!p || p._s7hud) return;
    const update = p.update, title = p.titleSelect, card = p.titleCard;
    p.update = function () {
      const out = update.apply(this, arguments);
      const s = this.stage;
      if (s && s.stageNo === 7) paint(this, s);
      return out;
    };
    p.titleSelect = function (n) {
      const out = title.apply(this, arguments);
      if (n === 7 && this.titleStageT) { this._s7n = 7; this.titleStageT.setText(NAME); fixHelp(this); }
      return out;
    };
    p.titleCard = function () {
      const out = card.apply(this, arguments);
      const n = this.stage?.titleSel || this.stage?.stageNo;
      if (n === 7) { this.titleStageT?.setText(NAME); fixHelp(this); }
      return out;
    };
    p._s7hud = 1;
  });
}
