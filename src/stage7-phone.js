// Stage 7 phone layout. Injected beside the shared viewport CSS so Stages 1–6
// keep their own canvas, stick and button geometry.
export const STAGE7_PHONE_CSS = `
body.stage-7 #game canvas { margin-top: 0 !important; margin-bottom: 0 !important; }
body.stage-7.s7-story #touch { visibility: hidden !important; }
@media (orientation: portrait) {
  body.stage-7 #stick { width: min(34vw, 26vh, 168px); height: min(34vw, 26vh, 168px); }
  body.stage-7 .tb { width: min(12vh, 72px); height: min(12vh, 72px); }
}
`;

export function installStage7PhoneCss(doc) {
  if (!doc || doc.getElementById?.("rwb-stage7-phone")) return;
  const style = doc.createElement?.("style");
  if (!style) return;
  style.id = "rwb-stage7-phone";
  style.textContent = STAGE7_PHONE_CSS;
  (doc.head || doc.documentElement || doc.body)?.appendChild(style);
}

// Move the stick knob with left/top. A transform on the percent-centered knob
// stays visually put on some mobile browsers.
export function placeKnob(stick, knob, clientX, clientY) {
  if (!stick || !knob || typeof stick.getBoundingClientRect !== "function") return null;
  const r = stick.getBoundingClientRect();
  const radius = r.width / 2 || 1;
  let dx = clientX - (r.left + radius);
  let dy = clientY - (r.top + radius);
  const mag = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, mag / radius);
  dx = (dx / mag) * k;
  dy = (dy / mag) * k;
  const travel = radius * 0.55;
  const w = knob.offsetWidth || radius * 0.84;
  const h = knob.offsetHeight || radius * 0.84;
  const left = radius + dx * travel - w / 2;
  const top = radius + dy * travel - h / 2;
  knob.style.margin = "0";
  knob.style.transform = "none";
  knob.style.left = left + "px";
  knob.style.top = top + "px";
  const axis = {
    x: Math.abs(dx) > 0.28 ? Math.sign(dx) : 0,
    y: Math.abs(dy) > 0.38 ? Math.sign(dy) : 0,
    run: k > 0.92 && Math.abs(dx) > 0.8,
  };
  return { left, top, axis };
}

export function resetKnob(knob) {
  if (!knob) return;
  knob.style.left = "50%";
  knob.style.top = "50%";
  knob.style.margin = "";
  knob.style.transform = "";
}

function bindKnob(doc) {
  const stick = doc.getElementById?.("stick");
  const knob = doc.getElementById?.("knob");
  if (!stick || !knob || stick._s7knob) return;
  stick._s7knob = true;
  const aim = (x, y) => {
    const placed = placeKnob(stick, knob, x, y);
    const inp = globalThis.__game?.inp;
    if (placed && inp) inp.touchAxis = placed.axis;
  };
  stick.addEventListener("pointerdown", (e) => {
    stick.setPointerCapture?.(e.pointerId);
    aim(e.clientX, e.clientY);
  });
  stick.addEventListener("pointermove", (e) => {
    if (e.buttons) aim(e.clientX, e.clientY);
  });
  const end = () => resetKnob(knob);
  stick.addEventListener("pointerup", end);
  stick.addEventListener("pointercancel", end);
  stick.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (t) aim(t.clientX, t.clientY);
    },
    { passive: true },
  );
  stick.addEventListener(
    "touchmove",
    (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (t) aim(t.clientX, t.clientY);
    },
    { passive: true },
  );
  stick.addEventListener("touchend", end);
  stick.addEventListener("touchcancel", end);
}

export function syncStage7Phone(scene) {
  const doc = globalThis.document;
  if (!doc?.body?.classList) return;
  installStage7PhoneCss(doc);
  const on = scene?.stageNo === 7;
  doc.body.classList.toggle("stage-7", !!on);
  doc.body.classList.toggle("s7-story", !!(on && scene.cutscene));
  if (on) bindKnob(doc);
}

export function releaseStage7Phone() {
  const doc = globalThis.document;
  if (!doc?.body?.classList) return;
  doc.body.classList.remove("stage-7", "s7-story");
  resetKnob(doc.getElementById?.("knob"));
}
