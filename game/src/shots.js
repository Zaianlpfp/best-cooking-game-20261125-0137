// The screenshot scenes behind ?shot=cover|chop|serve|rush. Each one plays
// the real rules forward from a fresh world, steered by a short script of
// station visits (walk to the approach point, press E, hold E to chop), so
// the frame is what a real game really looks like and the same seed always
// gives the same frame. The scripts read the tickets that actually opened —
// the first ticket's recipe is cooked, whatever it is — instead of assuming
// one. A step that cannot finish in 10 seconds is skipped, so a bad script
// shows up as a wrong frame instead of a hang.

import { STEP } from './config.js';
import { INGREDIENTS, RECIPES, recipeById } from './recipes.js';
import { STATIONS } from './world.js';
import { SCREEN_PLAY } from './render.js';

const MAX_STEP_TICKS = 600;

/** Resolve a script's station reference to the station object. */
function resolveStation(reference) {
  if (reference.bin) return STATIONS.bins[INGREDIENTS[reference.bin].bin];
  if (reference.kind === 'talenan') return STATIONS.talenan;
  if (reference.kind === 'piring') return STATIONS.piring;
  if (reference.kind === 'sampah') return STATIONS.sampah;
  if (reference.kind === 'saji') return STATIONS.saji;
  if (reference.kind === 'wok') return reference.id === 0 ? STATIONS.wokA : STATIONS.wokB;
  return null;
}

function distanceTo(state, point) {
  return Math.hypot(point.x - state.cook.x, point.y - state.cook.y);
}

function toward(state, point) {
  const dx = point.x - state.cook.x;
  const dy = point.y - state.cook.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return { mx: 0, my: 0 };
  return { mx: dx / length, my: dy / length };
}

/** Run one script step. Returns when the step is done or its time is up. */
function runStep(world, step) {
  const state = world.state;
  if (step.wait !== undefined) {
    const until = state.time + step.wait;
    let ticks = 0;
    while (state.time < until && ticks < MAX_STEP_TICKS * 10) {
      world.step(STEP, { mx: 0, my: 0, interact: false, pressed: false });
      ticks += 1;
    }
    return;
  }
  const station = step.to ? resolveStation(step.to) : null;
  const point = step.to ? station.approach : step.point;
  let ticks = 0;
  while (ticks < MAX_STEP_TICKS) {
    ticks += 1;
    if (distanceTo(state, point) > 8) {
      const move = toward(state, point);
      world.step(STEP, { mx: move.mx, my: move.my, interact: false, pressed: false });
      continue;
    }
    if (step.act === 'press') {
      world.step(STEP, { mx: 0, my: 0, interact: false, pressed: true });
      return;
    }
    if (step.act === 'chop') {
      if (state.held !== null && state.held.state === 'chopped') return;
      world.step(STEP, { mx: 0, my: 0, interact: true, pressed: false });
      continue;
    }
    if (step.act === 'chopTo') {
      if (state.chopProgress >= step.progress) return;
      world.step(STEP, { mx: 0, my: 0, interact: true, pressed: false });
      continue;
    }
    return;
  }
}

/** Play a whole script, then keep stepping until stopWhen says stop. */
function play(world, steps, stopWhen, maxSeconds) {
  for (const step of steps) runStep(world, step);
  const until = world.state.time + maxSeconds;
  while (!stopWhen(world.state) && world.state.time < until && !world.state.over) {
    world.step(STEP, { mx: 0, my: 0, interact: false, pressed: false });
  }
}

const bin = (id) => ({ bin: id });
const wok = (id) => ({ kind: 'wok', id });
const talenan = { kind: 'talenan' };
const piring = { kind: 'piring' };
const saji = { kind: 'saji' };

/**
 * The steps that assemble one recipe on the plate, in order: take each
 * ingredient from its bin, chop it and/or cook it when its recipe needs it,
 * and put it on the plate. Two cooked needs use the two woks in turn.
 */
function stepsForRecipe(recipe) {
  const steps = [];
  let wokId = 0;
  for (const need of recipe.needs) {
    const prep = INGREDIENTS[need.id].prep;
    steps.push({ to: bin(need.id), act: 'press' });
    if (prep.includes('chop')) steps.push({ to: talenan, act: 'chop' });
    if (prep.includes('cook')) {
      const id = wokId;
      wokId = 1 - wokId;
      steps.push({ to: wok(id), act: 'press' });
      steps.push({ wait: 3.5 });
      steps.push({ to: wok(id), act: 'press' });
    }
    steps.push({ to: piring, act: 'press' });
  }
  return steps;
}

/** The recipe of the first open ticket, or null when the board is empty. */
function firstTicketRecipe(state) {
  if (state.tickets.length === 0) return null;
  return recipeById(state.tickets[0].recipeId);
}

/** The first open ticket whose recipe needs something chopped, or null. */
function firstChoppableRecipe(state) {
  for (const ticket of state.tickets) {
    const recipe = recipeById(ticket.recipeId);
    if (recipe.needs.some((need) => INGREDIENTS[need.id].prep.includes('chop'))) return recipe;
  }
  return null;
}

const SCENES = {
  // Mid-rush: cook the first ticket's dish onto the plate and leave it ready
  // to serve, then start the next dish in a wok. Plate ready to serve, wok
  // cooking, tickets on the board, shift timer running.
  cover(world) {
    play(world, [{ wait: 3 }], () => true, 0);
    const recipe = firstTicketRecipe(world.state) ?? RECIPES[0];
    const steps = stepsForRecipe(recipe);
    steps.push({ to: bin('nasi'), act: 'press' });
    steps.push({ to: wok(0), act: 'press' });
    play(world, steps, () => true, 0);
    return { screen: SCREEN_PLAY, best: 0 };
  },
  // The chop in progress: a nasi cooking in a wok behind, a choppable
  // ingredient held at the board at 70% through the chop, ring visible.
  chop(world) {
    play(world, [{ wait: 3 }], () => true, 0);
    const recipe = firstChoppableRecipe(world.state);
    const ingredient = recipe
      ? recipe.needs.find((need) => INGREDIENTS[need.id].prep.includes('chop')).id
      : 'cabai';
    const steps = [
      { to: bin('nasi'), act: 'press' },
      { to: wok(0), act: 'press' },
      { to: bin(ingredient), act: 'press' },
      { to: talenan, act: 'chopTo', progress: 0.7 },
    ];
    play(world, steps, () => true, 0);
    return { screen: SCREEN_PLAY, best: 0 };
  },
  // The serve: the first ticket's dish built on the plate and handed in at
  // the window — stop the instant the +score popup appears.
  serve(world) {
    play(world, [{ wait: 3 }], () => true, 0);
    const recipe = firstTicketRecipe(world.state) ?? RECIPES[0];
    const steps = [...stepsForRecipe(recipe), { to: saji, act: 'press' }];
    play(world, steps, (state) => state.popups.length > 0, 2);
    return { screen: SCREEN_PLAY, best: 0 };
  },
  // The late-shift rush: serve one ticket, leave a wok to burn, then stand
  // still while tickets run out — one heart left, a full board, a burnt wok.
  rush(world) {
    play(world, [{ wait: 3 }], () => true, 0);
    const recipe = firstTicketRecipe(world.state) ?? RECIPES[0];
    const steps = [
      ...stepsForRecipe(recipe),
      { to: saji, act: 'press' },
      { to: bin('nasi'), act: 'press' },
      { to: wok(0), act: 'press' },
      { wait: 10 },
    ];
    play(world, steps, (state) => state.hearts <= 1 || state.time >= 152, 120);
    return { screen: SCREEN_PLAY, best: 0 };
  },
};

/**
 * Set `world` to the named scene (cover, chop, serve or rush; any other name
 * is cover) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const scene = SCENES[name] ?? SCENES.cover;
  return scene(world);
}
