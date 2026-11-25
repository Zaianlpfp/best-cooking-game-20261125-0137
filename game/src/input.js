// Keyboard and pointer input. WASD or the arrow keys steer the cook; E or
// Space is the interact button (hold it to chop); a click walks the cook to
// that spot, and a click on a station walks there and uses it on arrival.
// R restarts, P pauses, M mutes. One-shot presses are queued as flags and
// taken once by the loop, so a press between two frames is never lost and
// never counted twice. A click is reported separately from a key press: on
// the title screen it starts the game, in play it only sets the walk target
// (the station is used on arrival, not at the click).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['KeyE', 'Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let interact = false;
  let actions = 0;
  let clicked = false;
  /** Where a click asked the cook to walk, in logical 1280x720 coordinates. */
  let target = null;
  /** Use the station on arrival after a click. */
  let targetInteract = false;

  function keyDown(event) {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      interact = true;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  }

  function keyUp(event) {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (INTERACT.has(event.code)) interact = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    interact = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    target = { x, y };
    targetInteract = true;
    clicked = true;
  });

  return {
    /** -1/0/1 steering from the held keys. */
    direction() {
      return {
        mx: (right ? 1 : 0) - (left ? 1 : 0),
        my: (down ? 1 : 0) - (up ? 1 : 0),
      };
    },
    /** Whether E / Space is held down right now (for chopping). */
    interactHeld() {
      return interact;
    },
    /** The click target, or null when there is none. */
    clickTarget() {
      return target;
    },
    /** Clear the click target (called when the cook arrives). */
    clearTarget() {
      target = null;
      targetInteract = false;
    },
    /** Whether the click asked to use the station on arrival. */
    targetInteract() {
      return targetInteract;
    },
    /** Whether the canvas was clicked since the last call. */
    takeClick() {
      const taken = clicked;
      clicked = false;
      return taken;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
