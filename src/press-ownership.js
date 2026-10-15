// Shared by every stage, story panel and video stub. Physical release, rather
// than a timeout or Input.clear(), ends ownership of a consumed keyboard press.
const owners = new WeakMap();
const pauseKey = code => code === 'Escape' || code === 'KeyP' || code === 'Enter';
const pauseAction = action => action === 'pause' || action === 'start';
const dispatching = state => state?.event?.eventPhase > 0;

export function installPressOwnership(input, root = globalThis) {
  if (owners.has(input)) return;
  const state = { down: new Set(), blocked: new Map(), event: null, consumed: false, press: null };
  owners.set(input, state);
  // Capture precedes Phaser's and Input's window bubble listeners, even though
  // those listeners were registered first. Do not intercept native controls.
  root.addEventListener?.('keydown', event => {
    state.event = event;
    state.consumed = false;
    if (state.down.has(event.code)) {
      if (state.blocked.has(event.code)) {
        state.consumed = true;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }
    state.down.add(event.code);
  }, true);
  root.addEventListener?.('keyup', event => {
    state.down.delete(event.code);
    state.blocked.delete(event.code);
    state.event = null;
    state.consumed = false;
  }, true);
  root.addEventListener?.('blur', () => {
    state.down.clear(); state.blocked.clear(); state.event = null; state.consumed = false;
  });
  const press = input.press;
  input.press = function (action) {
    if (pressConsumed(this, action)) return;
    const previous = state.press;
    state.press = { action, consumed: false };
    try { return press.call(this, action); }
    finally { state.press = previous; }
  };
  // Input.keydown writes keysDown/held AFTER press listeners return. Clear that
  // late write as well, so neither frame polling nor other listeners replay it.
  const emit = input.emit;
  input.emit = function (event, code) {
    if (event === 'key' && state.blocked.has(code)) {
      const action = state.blocked.get(code);
      this.keysDown.delete(code);
      delete this.held[action]; delete this.buf[action];
    }
    return emit.call(this, event, code);
  };
}

export function freshKeyboardPress(input) {
  const state = owners.get(input);
  return dispatching(state) && pauseKey(state.event.code) &&
    !state.consumed && !state.blocked.has(state.event.code);
}

export function pressConsumed(input, action) {
  const state = owners.get(input);
  if (!state) return false;
  if (state.press?.consumed || (dispatching(state) && state.consumed)) return true;
  // A frame callback or a second action listener may have lost the DOM event.
  // Pause/start must still wait for the consumed physical key to be released.
  return pauseAction(action) && !freshKeyboardPress(input) &&
    [...state.blocked.keys()].some(pauseKey);
}

export function consumePress(input, action) {
  const state = owners.get(input);
  if (!state) return;
  if (state.press) state.press.consumed = true;
  if (dispatching(state)) {
    state.consumed = true;
    state.blocked.set(state.event.code, action);
    state.event.preventDefault();
    state.event.stopImmediatePropagation();
  }
  delete input.buf[action];
  delete input.held[action];
}
