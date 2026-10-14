// Serve this repository first. RWB_URL and PLAYWRIGHT_PATH may override the defaults.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PATH || "/home/box/.local/lib/node_modules/playwright",
);
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const rows = [];
const base = process.env.RWB_URL || "http://localhost:8088/";
try {
  for (const debug of [false, true]) {
    const page = await browser.newPage(),
      errors = [],
      logs = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.text().startsWith("[s7dbg]")) logs.push(msg.text());
    });
    await page.goto(
      `${base}index.html?stage=7&s7=1&skip=boss&story=0&autostart=1${debug ? "&s7debug=1" : ""}`,
    );
    await page.waitForFunction(
      () => window.__game?.scene.getScene("stage1")?.started,
      null,
      { timeout: 60000 },
    );
    const veil = await page.evaluate(() => {
      const g = window.__game,
        s = g.scene.getScene("stage1");
      g.loop.sleep();
      g.loop.callback = g.headlessStep.bind(g);
      let t = g.loop.lastTime;
      const tick = () => {
        t += 100;
        g.loop.step(t);
      };
      s.enemies.forEach((e) => e.destroy());
      s.enemies = [];
      s.pending = [];
      s.zoneI = s.kit._zone = 2;
      s.zone = s.zones[2];
      s.locked = true;
      s.waveGap = 100;
      s.camX = s.camMax = 2560;
      s.bounds = { l: 2560, r: 3840 };
      s.riley.x = 2900;
      s.caption(
        "MOIRAINE",
        "The veil. Whatever you see in there, keep moving.",
      );
      const start = s.riley.x;
      window.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyD", bubbles: true }),
      );
      let dismissed = null;
      for (let i = 1; i <= 20; i++) {
        tick();
        if (dismissed === null && s.hud.capT <= 0) dismissed = i * 0.1;
      }
      window.dispatchEvent(
        new KeyboardEvent("keyup", { code: "KeyD", bubbles: true }),
      );
      window.__manualTick = tick;
      return {
        distance: s.riley.x - start,
        dismissed,
        paused: s.paused,
        smoothStep: g.loop.smoothStep,
        rawDelta: g.loop.rawDelta,
        deliveredDelta: g.loop.delta,
      };
    });
    assert.ok(Math.abs(veil.distance - 410) < 1e-6);
    assert.ok(veil.dismissed <= 3);
    assert.equal(veil.paused, false);
    assert.equal(veil.smoothStep, false);
    assert.equal(veil.rawDelta, 100);
    assert.equal(veil.deliveredDelta, 100);
    await page.keyboard.press("KeyB");
    await page.evaluate((debug) => {
      const s = window.__game.scene.getScene("stage1");
      if (!debug) {
        s.zoneI = 2;
        s.zone = null;
        s.locked = false;
        s.riley.x = 4200;
        s.camX = s.camMax = 3920;
        s.bounds = { l: 3920, r: 5200 };
      }
      window.__manualTick();
    }, debug);
    await page.waitForFunction(
      () => {
        for (let i = 0; i < 5; i++) window.__manualTick();
        return !!window.__game.scene.getScene("stage1").boss;
      },
      null,
      { timeout: 30000, polling: 100 },
    );
    const intro = await page.evaluate(() => {
      const s = window.__game.scene.getScene("stage1");
      return { boss: !!s.boss, who: s.hud.capWho.text, power: s.riley.state };
    });
    assert.ok(intro.boss);
    assert.equal(intro.who, "ASMODEAN");
    await page.keyboard.press("Escape");
    const dismissed = await page.evaluate(() => {
      const s = window.__game.scene.getScene("stage1");
      return { paused: s.paused, capT: s.hud.capT };
    });
    assert.equal(dismissed.paused, false);
    assert.equal(dismissed.capT, 0);
    const damage = await page.evaluate(() => {
      const s = window.__game.scene.getScene("stage1"),
        b = s.boss,
        r = s.riley;
      b.entering = false;
      b.x = 4800;
      b.y = 630;
      b.phase = 3;
      b.hp = 190;
      b.clock = 10;
      b.bashAt = 0;
      b.channelAt = 10.8;
      s.kit.notes.clock = 0;
      s.kit.notes.next = 0;
      s.kit.notes.clear();
      r.inv = 0;
      const hp = r.hp;
      for (let i = 0; i < 30; i++) {
        r.x = b.x - 62;
        r.y = b.y;
        r.z = r.vz = 0;
        window.__manualTick();
      }
      b.startChannel();
      for (let i = 0; i < 3; i++) b.takeHit({ dmg: 1 });
      for (let i = 0; i < 15; i++) window.__manualTick();
      return { amount: hp - r.hp, hp: r.hp, lives: r.lives };
    });
    assert.ok(damage.amount <= 72);
    assert.deepEqual(errors, []);
    if (debug) {
      for (const name of [
        "dmg src=",
        "stagger start t=",
        "stagger end t=",
        "channel start t=",
        "channel end t=",
      ])
        assert.ok(
          logs.some((x) => x.includes(name)),
          name,
        );
    } else assert.deepEqual(logs, []);
    rows.push({ debug, veil, intro, damage, errors, logs });
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(
    process.argv[2] || "/tmp/rwb-r9-browser.json",
    JSON.stringify(rows, null, 2),
  );
  console.log(JSON.stringify(rows));
}
