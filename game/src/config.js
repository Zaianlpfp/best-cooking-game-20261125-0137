// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** A full shift lasts three minutes. */
export const SHIFT_SECONDS = 180;

export const COOK = {
  radius: 22,
  speed: 330,
  /** How close the cook must be to a station to use it. */
  reach: 46,
};

export const HEARTS = 3;

/** Chopping: hold E this long at the talenan. Cooking: time in a wajan. */
export const CHOP_SECONDS = 1.2;
export const COOK_SECONDS = 3;
/** After it is cooked, a wok item burns this many seconds later. */
export const BURN_SECONDS = 6;

export const TICKET = {
  /** First ticket appears this many seconds into the shift. */
  firstAt: 2,
  /** Gap between tickets: eases from the first value to the second. */
  intervalStart: 14,
  intervalEnd: 8,
  /** Ticket lifetime: eases from the first value to the second. */
  lifeStart: 70,
  lifeEnd: 45,
  maxOpen: 4,
};

/** Score: base price + remaining ticket seconds x this, times the combo. */
export const TIME_BONUS_PER_SECOND = 2;
export const COMBO_STEP = 0.1;
export const COMBO_CAP = 2;

export const PALETTE = {
  backdrop: '#171310',
  topbar: '#241a12',
  board: '#2b1e14',
  floor: '#3d2c1e',
  floorTile: '#46341f',
  wall: '#5b3a22',
  bin: '#6b4423',
  binEdge: '#8a5a2e',
  boardWood: '#7a4a21',
  wok: '#2e2a26',
  wokEdge: '#57504a',
  plate: '#f5efe2',
  serve: '#1f4d2e',
  serveEdge: '#2f7a44',
  trash: '#3a3f44',
  text: '#fff7e8',
  muted: '#d8c3a5',
  accent: '#ffb347',
  danger: '#e5534b',
  good: '#7dd87d',
  ticket: '#fff3d6',
  ticketEdge: '#c9a86a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';
