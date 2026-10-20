import { canCall, pickHelper } from "./moilan-call.js";
import { call7Context, cycleHelper7 } from "./stage7-lifecycle.js";
import { q } from "./config.js";
import { syncStage7Phone } from "./stage7-phone.js";
import { CHANNEL_BANNER } from "./asmodean.js";
export function bindStage7Hud(hud, k) {
  if (!hud || hud._s7bind) return () => {};
  const prev = hud.updateLoialLabel,
    own = Object.prototype.hasOwnProperty.call(hud, "updateLoialLabel"),
    pic = hud.loialPic,
    texture = pic?.texture?.key || "loialPortrait";
  let at = -1,
    last = "";
  const choose = () => cycleHelper7(k);
  const flash = hud.flashText,
    ownsFlash = Object.prototype.hasOwnProperty.call(hud, "flashText");
  if (typeof flash === "function") hud.flashText = function (text) {
    // A previous phase/debug banner's fade must not erase a new channel tell.
    this.tweens?.killTweensOf?.(this.flashPair || this.flash);
    const out = flash.call(this, text);
    this._s7channelBanner = text === CHANNEL_BANNER;
    if (this._s7channelBanner) this.tweens?.killTweensOf?.(this.flash);
    return out;
  };
  pic?.setInteractive?.({ useHandCursor: true });
  pic?.on?.("pointerdown", choose);
  hud.updateLoialLabel = function (s, R) {
    if (s.stageNo !== 7) return prev?.call(this, s, R);
    const ready = canCall(k.call, call7Context(k));
    R.loialReady = ready;
    if (k.clock < at) return;
    at = k.clock + 0.25;
    const helper = pickHelper(call7Context(k)),
      label = helper === "duo" ? "CALL" : helper.toUpperCase(),
      st = k.call;
    const text = st.on
      ? label + "!"
      : st.calls >= 3
        ? "CALL SPENT"
        : ready
          ? label + " READY"
          : st.charges
            ? label + " CHARGED"
            : st.kos >= 10
              ? "CALL WAIT " + Math.max(0, Math.ceil(45 - st.since)) + "s"
              : label + " " + Math.min(10, st.kos) + "/10";
    if (text === last) return;
    last = text;
    this.loialT?.setText?.(text)?.setColor?.(ready ? "#8fe3ff" : "#87909a");
    this.loialPic
      ?.setTexture?.(helper === "lan" ? "lanPortrait" : "moiPortrait")
      ?.setDisplaySize?.(44, 44);
    this.loialPic?.setAlpha?.(ready ? 1 : 0.4);
  };
  hud._s7bind = true;
  return () => {
    pic?.off?.("pointerdown", choose);
    pic?.disableInteractive?.();
    if (own) hud.updateLoialLabel = prev;
    else delete hud.updateLoialLabel;
    if (ownsFlash) hud.flashText = flash;
    else delete hud.flashText;
    delete hud._s7channelBanner;
    hud._s7bind = false;
    pic?.setTexture?.(texture)?.setDisplaySize?.(30, 30);
  };
}
function help(hud, on) {
  for (const n of hud.card?.list || []) {
    if (typeof n.text !== "string" || !n.setText) continue;
    if (on && n.text.includes("Loial")) {
      n._s7base = n.text;
      n.setText(n.text.replace(/Loial/g, "Moiraine / Lan"));
    }
    if (!on && n._s7base) {
      n.setText(n._s7base);
      delete n._s7base;
    }
  }
}
export function paintStage7Hud(hud, s) {
  if (!s) return;
  syncStage7Phone(s);
  if (s.stageNo === 7 && s.kit && !hud._s7bind)
    s.kit.cleanups?.push(bindStage7Hud(hud, s.kit));
  if (hud._s7channelBanner && s.boss?.state !== "channel") {
    hud._s7channelBanner = false;
    hud.tweens?.add?.({ targets: hud.flash, alpha: 0, duration: 600 });
  }
  const n = s.titleSel || s.stageNo;
  if (n === 7 && hud.titleStageT?.text !== "RHUIDEAN — THE AIEL WASTE")
    hud.titleStageT?.setText?.("RHUIDEAN — THE AIEL WASTE");
  help(hud, n === 7);
  const title = !s.started && !s.ended && (s.stageNo === 7 || s.stageData?.stage7Return);
  if (title) {
    const saved = hud._s7titleNodes ||= new Map();
    for (const node of hud.children?.list || []) {
      if (node === hud.card || !node.setVisible) continue;
      if (!saved.has(node)) saved.set(node, node.visible !== false);
      node.setVisible(false);
    }
  } else if (hud._s7titleNodes) {
    for (const [node, visible] of hud._s7titleNodes)
      if (node.active !== false) node.setVisible?.(visible);
    delete hud._s7titleNodes;
  }
  if (s.stageNo === 7 && hud.bossName && hud._s7boss !== hud.bossName) {
    hud._s7boss = hud.bossName;
    hud.bossName.setText?.("ASMODEAN");
    hud.bossPic?.setTexture?.("asmoPortrait")?.setDisplaySize?.(68, 68);
  }
}
export function fixClear7(hud, stats) {
  const s = hud.stage;
  const next = s?.stageDef?.next?.(q)?.stage;
  if (!((stats.stage === 6 && next === 7) || stats.stage === 7)) return;
  const verb = hud.game?.inp?.isTouch ? "TAP KICK" : "PRESS ATTACK";
  const line =
    stats.stage === 7 && next !== 8
      ? verb + " TO RETURN TO THE TITLE"
      : verb + " TO CONTINUE TO STAGE " + next;
  for (const node of hud.card?.list || [])
    if (
      typeof node.text === "string" &&
      /^(PRESS ATTACK|TAP KICK) TO /.test(node.text)
    )
      node.setText(line);
}
export function installStage7Hud() {
  return import("./hud.js").then(({ HUD }) => {
    const p = HUD?.prototype;
    if (!p || p._s7hud) return;
    for (const key of ["update", "titleCard", "titleSelect"]) {
      const old = p[key];
      p[key] = function () {
        const out = old.apply(this, arguments);
        paintStage7Hud(this, this.stage);
        return out;
      };
    }
    const clear = p.stageClear;
    p.stageClear = function (stats) {
      const out = clear.apply(this, arguments);
      fixClear7(this, stats);
      return out;
    };
    const cap = p.caption;
    p.caption = function (who, text) {
      const out = cap.apply(this, arguments);
      if (this.stage?.stageNo === 7 && /^(ASMODEAN|SHAIDO)/.test(who || ""))
        this.capWho?.setColor?.("#ef997e");
      return out;
    };
    p._s7hud = true;
  });
}
