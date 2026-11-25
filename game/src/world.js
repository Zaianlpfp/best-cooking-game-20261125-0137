// The kitchen rules: one cook, one item in hand, tickets on the board, two
// woks, one chopping board, one plate and one serving window. The world is
// pure logic — no drawing, no sound — so the same steps drive the live game
// and the screenshot scenes.

import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COOK,
  COOK_SECONDS,
  COMBO_CAP,
  COMBO_STEP,
  FIELD,
  HEARTS,
  SHIFT_SECONDS,
  STEP,
  TICKET,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import {
  INGREDIENTS,
  RECIPES,
  STATE_BURNT,
  STATE_CHOPPED,
  STATE_COOKED,
  STATE_DONE,
  finishedState,
  plateState,
} from './recipes.js';

export const EVENT_SERVED = 1;
export const EVENT_MISSED = 2;
export const EVENT_OVER = 4;
export const EVENT_BUZZ = 8;
export const EVENT_CHOP = 16;
export const EVENT_COOK = 32;
export const EVENT_PLATE = 64;
export const EVENT_PICKUP = 128;
export const EVENT_TRASH = 256;
export const EVENT_CHOP_TICK = 512;
export const EVENT_PLACE = 1024;

/** The kitchen layout. Bins run along the top wall; the work row sits below
 * them; the serving window is bottom-left. Approach points are where the
 * cook stands to use each station. */
export const STATIONS = {
  bins: Object.values(INGREDIENTS).map((ingredient) => ({
    kind: 'bin',
    id: ingredient.bin,
    ingredient: Object.keys(INGREDIENTS)[ingredient.bin],
    x: 16 + ingredient.bin * 140,
    y: 196,
    w: 128,
    h: 78,
    approach: { x: 16 + ingredient.bin * 140 + 64, y: 210 },
  })),
  talenan: { kind: 'talenan', x: 20, y: 300, w: 240, h: 110, approach: { x: 140, y: 420 } },
  wokA: { kind: 'wok', id: 0, x: 300, y: 300, w: 240, h: 110, approach: { x: 420, y: 420 } },
  wokB: { kind: 'wok', id: 1, x: 580, y: 300, w: 240, h: 110, approach: { x: 700, y: 420 } },
  piring: { kind: 'piring', x: 860, y: 300, w: 240, h: 110, approach: { x: 980, y: 420 } },
  sampah: { kind: 'sampah', x: 1140, y: 300, w: 120, h: 110, approach: { x: 1200, y: 420 } },
  saji: { kind: 'saji', x: 20, y: 440, w: 340, h: 130, approach: { x: 190, y: 600 } },
};

const ALL_STATIONS = [
  ...STATIONS.bins,
  STATIONS.talenan,
  STATIONS.wokA,
  STATIONS.wokB,
  STATIONS.piring,
  STATIONS.sampah,
  STATIONS.saji,
];

/** Distance from a point to a rectangle (0 when the point is inside it). */
function rectDistance(x, y, rect) {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.w));
  const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

/** The nearest station within reach of the cook, or null. */
export function nearestStation(x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of ALL_STATIONS) {
    const distance = rectDistance(x, y, station);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return bestDistance <= COOK.reach ? best : null;
}

/** Can this held item be chopped now? */
function canChop(held) {
  return held !== null && held.state === 'raw' && INGREDIENTS[held.id].prep.includes('chop');
}

/** Can this held item go into a wok now? */
function canCook(held) {
  if (held === null) return false;
  const prep = INGREDIENTS[held.id].prep;
  return (prep === 'cook' && held.state === 'raw') || (prep === 'chop+cook' && held.state === STATE_CHOPPED);
}

/** Does the plate hold exactly what this recipe needs (same items, any order)? */
function plateMatches(plate, recipe) {
  if (plate.length !== recipe.needs.length) return false;
  const counts = new Map();
  for (const item of plate) {
    const key = `${item.id}:${item.state}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const need of recipe.needs) {
    const key = `${need.id}:${need.state}`;
    const count = counts.get(key) ?? 0;
    if (count === 0) return false;
    counts.set(key, count - 1);
  }
  return true;
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    hearts: HEARTS,
    combo: 0,
    cook: { x: FIELD.width / 2, y: 560 },
    held: null,
    plate: [],
    tickets: [],
    nextTicketIn: TICKET.firstAt,
    woks: [
      { item: null },
      { item: null },
    ],
    chopProgress: 0,
    chopTickAt: 0,
    messages: [],
    popups: [],
    over: false,
    served: 0,
    missed: 0,
    ticketNumber: 0,
  };

  function say(text) {
    state.messages.push({ text, at: state.time });
    if (state.messages.length > 4) state.messages.shift();
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.hearts = HEARTS;
    state.combo = 0;
    state.cook.x = FIELD.width / 2;
    state.cook.y = 560;
    state.held = null;
    state.plate = [];
    state.tickets = [];
    state.nextTicketIn = TICKET.firstAt;
    state.woks[0].item = null;
    state.woks[1].item = null;
    state.chopProgress = 0;
    state.chopTickAt = 0;
    state.messages = [];
    state.popups = [];
    state.over = false;
    state.served = 0;
    state.missed = 0;
    state.ticketNumber = 0;
  }

  function spawnTicket() {
    const progress = Math.min(1, state.time / SHIFT_SECONDS);
    const life = TICKET.lifeStart + (TICKET.lifeEnd - TICKET.lifeStart) * progress;
    let recipe = RECIPES[Math.floor(random() * RECIPES.length)];
    const openIds = new Set(state.tickets.map((ticket) => ticket.recipeId));
    if (openIds.has(recipe.id)) {
      const others = RECIPES.filter((candidate) => !openIds.has(candidate.id));
      if (others.length > 0) recipe = others[Math.floor(random() * others.length)];
    }
    state.ticketNumber += 1;
    state.tickets.push({ id: state.ticketNumber, recipeId: recipe.id, left: life, total: life });
  }

  function servePlate(station) {
    const ticketIndex = state.tickets.findIndex((ticket) =>
      plateMatches(state.plate, RECIPES.find((recipe) => recipe.id === ticket.recipeId)),
    );
    if (ticketIndex < 0) return EVENT_BUZZ;
    const ticket = state.tickets[ticketIndex];
    const recipe = RECIPES.find((candidate) => candidate.id === ticket.recipeId);
    const multiplier = Math.min(COMBO_CAP, 1 + COMBO_STEP * state.combo);
    const gained = Math.round((recipe.price + Math.ceil(ticket.left) * TIME_BONUS_PER_SECOND) * multiplier);
    state.score += gained;
    state.combo += 1;
    state.served += 1;
    state.tickets.splice(ticketIndex, 1);
    state.plate = [];
    state.popups.push({ text: `+${gained}`, x: station.x + station.w / 2, y: station.y - 8, born: state.time });
    say(`${recipe.name} disajikan! +${gained}`);
    return EVENT_SERVED;
  }

  function press(station) {
    if (station === null) return 0;
    if (station.kind === 'bin') {
      if (state.held !== null) return EVENT_BUZZ;
      state.held = { id: station.ingredient, state: finishedState(station.ingredient) === STATE_DONE ? STATE_DONE : 'raw' };
      return EVENT_PICKUP;
    }
    if (station.kind === 'wok') {
      const wok = state.woks[station.id];
      if (wok.item !== null && wok.item.state !== 'cooking') {
        if (state.held !== null) return EVENT_BUZZ;
        state.held = { id: wok.item.id, state: wok.item.state === STATE_BURNT ? STATE_BURNT : STATE_COOKED };
        wok.item = null;
        return EVENT_PICKUP;
      }
      if (wok.item === null && canCook(state.held)) {
        wok.item = { id: state.held.id, state: 'cooking', t: 0 };
        state.held = null;
        return EVENT_PLACE;
      }
      return EVENT_BUZZ;
    }
    if (station.kind === 'piring') {
      if (state.held === null) return 0;
      if (state.held.state === STATE_BURNT) return EVENT_BUZZ;
      if (state.held.state !== plateState(state.held.id)) return EVENT_BUZZ;
      state.plate.push(state.held);
      state.held = null;
      return EVENT_PLATE;
    }
    if (station.kind === 'sampah') {
      if (state.held !== null) {
        state.held = null;
        return EVENT_TRASH;
      }
      if (state.plate.length > 0) {
        state.plate = [];
        return EVENT_TRASH;
      }
      return 0;
    }
    if (station.kind === 'saji') {
      if (state.plate.length === 0) return 0;
      return servePlate(station);
    }
    return 0;
  }

  function step(dt, input) {
    if (state.over) return 0;
    let events = 0;
    state.time += dt;

    // The cook moves with the keys or toward a click target.
    const length = Math.hypot(input.mx, input.my);
    if (length > 0) {
      const nx = input.mx / length;
      const ny = input.my / length;
      state.cook.x = Math.min(FIELD.width - 16 - COOK.radius, Math.max(16 + COOK.radius, state.cook.x + nx * COOK.speed * dt));
      state.cook.y = Math.min(636 - COOK.radius, Math.max(186 + COOK.radius, state.cook.y + ny * COOK.speed * dt));
    }

    const station = nearestStation(state.cook.x, state.cook.y);

    // Chopping answers while E is held at the board with something choppable.
    if (station !== null && station.kind === 'talenan' && input.interact && canChop(state.held)) {
      state.chopProgress += dt / CHOP_SECONDS;
      if (state.time - state.chopTickAt >= 0.25) {
        state.chopTickAt = state.time;
        events |= EVENT_CHOP_TICK;
      }
      if (state.chopProgress >= 1) {
        state.held.state = STATE_CHOPPED;
        state.chopProgress = 0;
        events |= EVENT_CHOP;
      }
    } else if (state.chopProgress > 0) {
      state.chopProgress = 0;
    }

    if (input.pressed) events |= press(station);

    // Woks cook on their own; a cooked dish burns if it is left too long.
    for (const wok of state.woks) {
      if (wok.item === null) continue;
      wok.item.t += dt;
      if (wok.item.state === 'cooking' && wok.item.t >= COOK_SECONDS) {
        wok.item.state = STATE_COOKED;
        events |= EVENT_COOK;
      }
      if (wok.item.state === STATE_COOKED && wok.item.t >= COOK_SECONDS + BURN_SECONDS) {
        wok.item.state = STATE_BURNT;
        say(`${INGREDIENTS[wok.item.id].name} gosong! Buang ke tong sampah.`);
      }
    }

    // New tickets arrive faster and live shorter as the shift goes on.
    state.nextTicketIn -= dt;
    if (state.nextTicketIn <= 0 && state.tickets.length < TICKET.maxOpen) {
      spawnTicket();
      const progress = Math.min(1, state.time / SHIFT_SECONDS);
      state.nextTicketIn = TICKET.intervalStart + (TICKET.intervalEnd - TICKET.intervalStart) * progress;
    }

    // A ticket that runs out costs a heart and breaks the combo.
    for (let index = state.tickets.length - 1; index >= 0; index -= 1) {
      const ticket = state.tickets[index];
      ticket.left -= dt;
      if (ticket.left <= 0) {
        const recipe = RECIPES.find((candidate) => candidate.id === ticket.recipeId);
        state.tickets.splice(index, 1);
        state.hearts -= 1;
        state.combo = 0;
        state.missed += 1;
        say(`${recipe.name} hangus — pelanggan pergi!`);
        events |= EVENT_MISSED;
      }
    }

    state.popups = state.popups.filter((popup) => state.time - popup.born < 1.4);

    if (state.hearts <= 0 || state.time >= SHIFT_SECONDS) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, nearestStation };
}
