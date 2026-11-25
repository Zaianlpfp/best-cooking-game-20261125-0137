// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over. A click walks the cook to that spot and uses
// the station on arrival; E or Space uses the nearest station at once and,
// held at the chopping board, chops.
//
// ?seed=N fixes the ticket order. ?shot=cover|chop|serve|rush (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, FIELD, HEARTS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUZZ, EVENT_CHOP, EVENT_CHOP_TICK, EVENT_COOK, EVENT_MISSED, EVENT_OVER, EVENT_PICKUP, EVENT_PLACE, EVENT_PLATE, EVENT_SERVED, nearestStation } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
// Fixed logical playfield: CSS scales it to the window, the bitmap stays 1280x720.
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { station: null });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let framePressed = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Main. ${HEARTS} nyawa. Sajikan pesanan sebelum waktunya habis.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift selesai. Skor ${world.state.score}. Terbaik ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicked = input.takeClick();
    framePressed = false;
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    if ((actions & ACTION_CONFIRM || clicked) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Lanjut main.');
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_PLAY) {
      framePressed = true;
    }
  }

  function playSound(events) {
    if (events & EVENT_CHOP_TICK) audio.chop();
    if (events & EVENT_CHOP) audio.chopDone();
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_COOK) audio.cookDone();
    if (events & EVENT_PLATE) audio.plate();
    if (events & EVENT_PICKUP) audio.plate();
    if (events & EVENT_SERVED) audio.serve();
    if (events & EVENT_BUZZ) audio.buzz();
    if (events & EVENT_MISSED) audio.missed();
  }

  function step() {
    // Steering: the keys win; otherwise the cook walks to the click target
    // and uses the station when it arrives.
    const keys = input.direction();
    let mx = keys.mx;
    let my = keys.my;
    const target = input.clickTarget();
    if ((mx !== 0 || my !== 0) && target !== null) input.clearTarget();
    if (target !== null && mx === 0 && my === 0) {
      const dx = target.x - world.state.cook.x;
      const dy = target.y - world.state.cook.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 14) {
        const use = input.targetInteract();
        input.clearTarget();
        if (use) framePressed = true;
      } else {
        mx = dx / distance;
        my = dy / distance;
      }
    }
    const events = world.step(STEP, { mx, my, interact: input.interactHeld(), pressed: framePressed });
    framePressed = false;
    playSound(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_MISSED) announce(`Satu pelanggan pergi! ${world.state.hearts} nyawa tersisa.`);
    else if (events & EVENT_SERVED) announce(`Disajikan! Skor ${world.state.score}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        if (screen === SCREEN_TITLE) {
          // The title screen shows the kitchen at rest; the clock does not run.
          accumulator -= STEP;
          continue;
        }
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, {
      station: screen === SCREEN_PLAY ? nearestStation(world.state.cook.x, world.state.cook.y) : null,
      muted: audio.isMuted(),
    });
  }

  // Leaving the tab pauses a running game rather than letting tickets run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Dapur Kilat. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
