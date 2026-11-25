// Ingredients and recipes. An ingredient is raw until it is chopped, cooked,
// or both; some (kecap, teh, es) need no prep and go straight on the plate.
// A recipe lists, for each slot, the ingredient and the state it must be in.

export const INGREDIENTS = {
  nasi: { name: 'Nasi', short: 'NASI', color: '#f5f0e0', prep: 'cook', bin: 0 },
  mie: { name: 'Mie', short: 'MIE', color: '#f2c94c', prep: 'cook', bin: 1 },
  telur: { name: 'Telur', short: 'TELUR', color: '#fdf3d0', prep: 'cook', bin: 2 },
  ayam: { name: 'Ayam', short: 'AYAM', color: '#e8a06a', prep: 'chop+cook', bin: 3 },
  cabai: { name: 'Cabai', short: 'CABAI', color: '#e5534b', prep: 'chop', bin: 4 },
  sayur: { name: 'Sayur', short: 'SAYUR', color: '#7dd87d', prep: 'chop', bin: 5 },
  kecap: { name: 'Kecap', short: 'KECAP', color: '#5a3a1a', prep: 'none', bin: 6 },
  teh: { name: 'Teh', short: 'TEH', color: '#c98a2e', prep: 'none', bin: 7 },
  es: { name: 'Es', short: 'ES', color: '#a8d8f0', prep: 'none', bin: 8 },
};

/** Ingredient states, in order: raw -> chopped -> cooked (or straight to done). */
export const STATE_RAW = 'raw';
export const STATE_CHOPPED = 'chopped';
export const STATE_COOKED = 'cooked';
export const STATE_DONE = 'done';
export const STATE_BURNT = 'burnt';

/** The state an ingredient reaches when its prep is finished. */
export function finishedState(id) {
  const prep = INGREDIENTS[id].prep;
  if (prep === 'chop+cook') return STATE_COOKED;
  if (prep === 'chop') return STATE_CHOPPED;
  if (prep === 'cook') return STATE_COOKED;
  return STATE_DONE;
}

/** The state a held ingredient must be in before it can go on a plate. */
export function plateState(id) {
  return finishedState(id);
}

export const RECIPES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    price: 120,
    needs: [
      { id: 'nasi', state: STATE_COOKED },
      { id: 'telur', state: STATE_COOKED },
      { id: 'kecap', state: STATE_DONE },
      { id: 'cabai', state: STATE_CHOPPED },
    ],
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    price: 100,
    needs: [
      { id: 'mie', state: STATE_COOKED },
      { id: 'telur', state: STATE_COOKED },
      { id: 'sayur', state: STATE_CHOPPED },
    ],
  },
  {
    id: 'sate-ayam',
    name: 'Sate Ayam',
    price: 90,
    needs: [
      { id: 'ayam', state: STATE_COOKED },
      { id: 'kecap', state: STATE_DONE },
    ],
  },
  {
    id: 'ayam-geprek',
    name: 'Ayam Geprek',
    price: 140,
    needs: [
      { id: 'ayam', state: STATE_COOKED },
      { id: 'cabai', state: STATE_CHOPPED },
      { id: 'nasi', state: STATE_COOKED },
    ],
  },
  {
    id: 'es-teh',
    name: 'Es Teh Manis',
    price: 60,
    needs: [
      { id: 'teh', state: STATE_DONE },
      { id: 'es', state: STATE_DONE },
    ],
  },
];

/** The recipe with this id, or undefined. */
export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}
