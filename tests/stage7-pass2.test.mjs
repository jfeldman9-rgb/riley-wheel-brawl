import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { stage7Simulation, withSeed } from "./helpers/stage7-harness.mjs";
import { Asmodean } from "../src/asmodean.js";
import { HUD } from "../src/hud.js";
import { q } from "../src/config.js";
import { bindStage7Hud } from "../src/stage7-hud.js";
import { callMoilan, stepStrike7, endStrike7, call7Context } from "../src/stage7-lifecycle.js";
import { canCall } from "../src/moilan-call.js";

function scene(fn, debug = false) {
  const old = q.get("s7debug");
  debug ? q.set("s7debug", "1") : q.delete("s7debug");
  return withSeed(1, () => {
    const h = stage7Simulation({ mode: false }), s = h.s;
    h.setController(null);
    s.started = s.locked = true;
    s.zoneI = 3; s.zone = s.zones[3];
    s.bounds = { l: 3920, r: 5200 }; s.camX = s.camMax = 3920;
    s.kit._zone = 3; s.kit.notes.next = 9999;
    s.riley.x = 4500; s.riley.y = 630;
    s.riley.setState("idle", "idle");
    const b = s.boss = new Asmodean(s, 5000, 630);
    b.phase = 3; b.hp = 150; b.bashAt = b.channelAt = 9999;
    s.enemies = [b];
    try { return fn(s, h, b); }
    finally { h.destroy(); old === null ? q.delete("s7debug") : q.set("s7debug", old); }
  });
}
const captionNode = () => ({ text: "", alpha: 0,
  setText(t) { this.text = t; return this; },
  setAlpha(a) { this.alpha = a; return this; } });

test("Esc dismisses the rendered boss caption, clears buffered presses, and next Esc pauses", () => scene((s, h) => {
  Object.assign(s.hud, { caption: HUD.prototype.caption,
    capWho: captionNode(), capText: captionNode(), capBg: captionNode(),
    drawCaptionBackground() { this.capWho.alpha = this.capText.alpha = this.capBg.alpha = 1; } });
  s.caption("ASMODEAN", "Listen — even the glass sings for me.");
  assert.ok(s.hud.capT > 0);
  s.inp.press("pause");
  assert.equal(s.paused, false);
  assert.equal(s.hud.capT, 0);
  for (const node of [s.hud.capWho, s.hud.capText, s.hud.capBg]) assert.equal(node.alpha, 0);
  assert.equal(s.inp.peek("pause"), false);
  h.step();
  s.inp.press("pause");
  assert.equal(s.paused, true);
}));

for (const kind of ["RILEY", "expired", "manual pause"])
  test(`Esc retains pause/resume for ${kind}`, () => scene(s => {
    s.caption(kind === "RILEY" ? "RILEY" : "ASMODEAN", "Test caption.");
    if (kind === "expired") s.kit.clock = s.kit.bossCaptionUntil + 0.01;
    if (kind === "manual pause") s.setPauseReason("manual", true);
    s.inp.press("pause");
    assert.equal(s.paused, kind !== "manual pause");
  }));

function callHud(s) {
  const pic = new EventEmitter();
  Object.assign(pic, { texture: { key: "loialPortrait" },
    setInteractive() { this.interactive = true; }, disableInteractive() { this.interactive = false; },
    setTexture(key) { this.texture.key = key; return this; }, setDisplaySize() { return this; }, setAlpha() { return this; } });
  const text = captionNode(); text.setColor = () => text;
  return { loialPic: pic, loialT: text, updateLoialLabel() {} };
}

test("keyboard and portrait select solo helpers; HUD, actual strike, and cleanup agree", () => scene((s, h, b) => {
  const hud = callHud(s), release = bindStage7Hud(hud, s.kit);
  const update = () => { s.kit.clock += 0.26; hud.updateLoialLabel(s, s.riley); };
  update(); assert.equal(hud.loialT.text, "CALL READY");
  s.inp.emit("key", "KeyO"); update();
  assert.equal(hud.loialT.text, "MOIRAINE READY");
  hud.loialPic.emit("pointerdown"); update();
  assert.equal(hud.loialT.text, "LAN READY");
  assert.equal(hud.loialPic.texture.key, "lanPortrait");
  assert.equal(callMoilan(s.kit), true);
  assert.equal(s.kit.strike.helper, "lan");
  hud.loialPic.emit("pointerdown");
  assert.equal(s.kit.helperChoice, "lan", "cannot change a strike in flight");
  const drawn = [], image = s.add.image;
  s.add.image = (...args) => { drawn.push(args[2]); return image(...args); };
  s.kit.view.sync(s.kit);
  assert.ok(drawn.includes("s7lan"));
  assert.equal(drawn.includes("s7moir"), false);
  stepStrike7(s.kit, 0.44); assert.equal(b.hp, 150);
  stepStrike7(s.kit, 0.02); assert.equal(b.hp, 114);
  assert.equal(b.state, "stagger");
  endStrike7(s.kit);
  assert.equal(s.kit.call.calls, 1);
  assert.equal(s.kit.call.charges, 0);
  assert.equal(canCall(s.kit.call, call7Context(s.kit)), false);
  hud.loialPic.emit("pointerdown"); update();
  assert.equal(s.kit.helperChoice, undefined);
  release();
  assert.equal(hud.loialPic.listenerCount("pointerdown"), 0);
  assert.equal(hud.loialPic.interactive, false);
  s.kit.destroy();
  s.inp.emit("key", "KeyO");
  assert.equal(s.kit.helperChoice, undefined);
}));

for (const helper of ["lan", "moiraine"])
  test(`${helper} solo respects boss gates and cannot finish Asmodean`, () => scene((s, h, b) => {
    s.kit.helperChoice = helper;
    b.phase = 1; b.hp = 400;
    assert.equal(callMoilan(s.kit), true);
    stepStrike7(s.kit, 0.7);
    assert.equal(b.hp, 396); assert.equal(b.phase, 2);
    endStrike7(s.kit);
    s.kit.call.charges = 1;
    assert.equal(callMoilan(s.kit), false, "phase transition invulnerability");
    b.phase = 3; b.hp = 20; b.beat = b.invuln = false;
    assert.equal(callMoilan(s.kit), true);
    stepStrike7(s.kit, 0.7);
    assert.equal(b.hp, 1); assert.equal(b.alive, true);
    endStrike7(s.kit);
    s.kit.call.charges = 1;
    assert.equal(callMoilan(s.kit), false, "one call per phase");
  }));

test("solo Lan refuses off-lane Asmodean without spending a charge", () => scene((s, h, b) => {
  s.kit.helperChoice = "lan"; s.riley.y = b.y - 40;
  assert.equal(callMoilan(s.kit), false);
  assert.equal(s.kit.call.charges, 1);
  s.riley.y = b.y - 39;
  assert.equal(callMoilan(s.kit), true);
}));

for (const dy of [-34, 0, 34, 35])
  test(`animated channel attacks at depth offset ${dy}`, () => scene((s, h, b) => {
    b.startChannel(); s.riley.x = b.x - 100; s.riley.y = b.y + dy; s.riley.facing = 1;
    for (let i = 0; i < 90 && b.state === "channel"; i++) {
      if (i % 10 === 0) s.inp.press("attack");
      h.step();
    }
    assert.equal(b.channelHits, dy === 35 ? 0 : 3);
    assert.equal(b.state, dy === 35 ? "channel" : "stagger");
  }));

test("channel debug hook is absent by default", () => scene(s => {
  const before = s.enemies.length;
  s.inp.emit("key", "KeyT");
  assert.equal(s.kit.debug, undefined); assert.equal(s.enemies.length, before);
}));

for (const offset of [0, 28, 30])
  test(`debug setup gives a real grabbable Trolloc; animated throw depth offset ${offset}`, () => scene((s, h, b) => {
    s.inp.emit("key", "KeyT");
    const e = s.enemies.at(-1);
    assert.equal(e.type, "grunt"); assert.equal(e.entering, false);
    assert.equal(b.state, "channel"); assert.equal(b.phase, 3);
    assert.equal(s.grabCandidate(s.riley), e);
    s.riley.y += offset;
    e.y = s.riley.y;
    // The production walk-in path initiates the grab, then Jump throws it.
    s.inp.held.right = true;
    for (let i = 0; i < 15; i++) h.step();
    s.inp.held.right = false;
    assert.equal(s.riley.state, "hold"); assert.equal(e.state, "held");
    s.inp.press("jump");
    let thrown = false;
    for (let i = 0; i < 55 && b.state === "channel"; i++) { h.step(); thrown ||= e.state === "thrown"; }
    assert.equal(thrown, true);
    assert.equal(b.channelHits, offset === 30 ? 0 : 1);
    if (offset !== 30) assert.equal(b.state, "stagger");
    s.kit.destroy(); assert.equal(s.kit.debug, undefined);
  }, true));

test("outro holds the shipped rear-view Riley pose through the clear screen", () => scene((s, h, b) => {
  const textures = [], sprite = s.riley.sprite;
  // The animation-clock harness has no stop method; model Phaser's contract.
  sprite.anims.stop = () => { sprite.anims.isPlaying = false; };
  sprite.setTexture = (key, frame) => { textures.push({ key, frame }); return sprite; };
  const sync = s.riley.sync;
  s.riley.sync(); assert.equal(textures.length, 0);
  s.riley.inv = 10; s.riley.x = s.camX + 1230;
  b.hp = 1; b.takeHit({ dmg: 2 });
  s.inp.held.right = true;
  for (let i = 0; i < 1000 && !s.clearShown; i++) h.step();
  assert.equal(s.clearShown, true);
  assert.ok(textures.length > 10);
  assert.ok(textures.every(t => t.key === "riley-0" && t.frame === "riley_combo3_01"));
  assert.equal(sprite.anims.isPlaying, false);
  assert.equal(sprite.alpha, 1);
  assert.ok(s.riley.x - s.camX <= 900);
  s.kit.destroy(); assert.notEqual(s.riley.sync, sync);
}));
