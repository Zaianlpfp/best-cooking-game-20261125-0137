// Everything the player sees: the top bar (logo, shift timer, score, combo,
// hearts), the order board (ticket cards with countdown bars), the kitchen
// (bins, chopping board, woks, plate, trash, serving window), the cook, and
// the bottom bar (held item, plate, hints, message feed). All drawing is
// plain canvas 2D in the fixed 1280x720 logical area.

import { CHOP_SECONDS, FIELD, PALETTE, FONT, SHIFT_SECONDS, TICKET } from './config.js';
import { INGREDIENTS, RECIPES, STATE_BURNT, STATE_CHOPPED, STATE_COOKED, recipeById } from './recipes.js';
import { STATIONS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function formatTime(seconds) {
  const left = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function heart(ctx, x, y, size, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/** One ingredient, drawn as a small vector icon. State changes the look:
 * chopped comes as pieces, cooked steams, burnt is black with smoke. */
function drawIngredient(ctx, id, x, y, radius, state) {
  const ingredient = INGREDIENTS[id];
  ctx.save();
  ctx.translate(x, y);
  if (state === STATE_BURNT) {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,120,120,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, -radius * 0.8);
    ctx.quadraticCurveTo(-radius * 0.7, -radius * 1.5, -radius * 0.3, -radius * 1.9);
    ctx.moveTo(radius * 0.3, -radius * 0.8);
    ctx.quadraticCurveTo(radius * 0.6, -radius * 1.4, radius * 0.2, -radius * 1.8);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (state === STATE_CHOPPED) {
    ctx.fillStyle = ingredient.color;
    for (const [dx, dy, r] of [[-0.45, 0.25, 0.42], [0.4, 0.3, 0.38], [0, -0.4, 0.4]]) {
      ctx.beginPath();
      ctx.arc(dx * radius, dy * radius, r * radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = ingredient.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  if (id === 'nasi') {
    ctx.beginPath();
    ctx.arc(0, radius * 0.15, radius * 0.85, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -radius * 0.1, radius * 0.55, Math.PI, 0);
    ctx.fill();
  } else if (id === 'mie') {
    ctx.lineWidth = 3;
    ctx.strokeStyle = ingredient.color;
    for (const dy of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.8, dy * radius);
      ctx.quadraticCurveTo(-radius * 0.3, (dy - 0.5) * radius, radius * 0.2, dy * radius);
      ctx.quadraticCurveTo(radius * 0.6, (dy + 0.5) * radius, radius * 0.8, dy * radius);
      ctx.stroke();
    }
  } else if (id === 'telur') {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.9, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2a541';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'ayam') {
    ctx.beginPath();
    ctx.arc(-radius * 0.15, -radius * 0.1, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f5f0e0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(radius * 0.3, radius * 0.3);
    ctx.lineTo(radius * 0.85, radius * 0.85);
    ctx.stroke();
  } else if (id === 'cabai') {
    ctx.lineWidth = radius * 0.5;
    ctx.strokeStyle = ingredient.color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.6, -radius * 0.5);
    ctx.quadraticCurveTo(0, radius * 0.9, radius * 0.7, radius * 0.3);
    ctx.stroke();
    ctx.strokeStyle = '#3f7a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.6, -radius * 0.5);
    ctx.lineTo(-radius * 0.9, -radius * 0.85);
    ctx.stroke();
  } else if (id === 'sayur') {
    for (const angle of [-0.6, 0, 0.6]) {
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -radius * 0.45, radius * 0.32, radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (id === 'kecap') {
    ctx.fillRect(-radius * 0.35, -radius * 0.2, radius * 0.7, radius * 0.9);
    ctx.fillRect(-radius * 0.2, -radius * 0.8, radius * 0.4, radius * 0.65);
    ctx.fillStyle = '#d8c3a5';
    ctx.fillRect(-radius * 0.35, -radius * 0.05, radius * 0.7, radius * 0.3);
  } else if (id === 'teh') {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.7, -radius * 0.5);
    ctx.lineTo(radius * 0.7, -radius * 0.5);
    ctx.lineTo(radius * 0.5, radius * 0.7);
    ctx.lineTo(-radius * 0.5, radius * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = ingredient.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(radius * 0.75, 0, radius * 0.35, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  } else if (id === 'es') {
    ctx.fillStyle = '#bfe3f5';
    ctx.save();
    ctx.rotate(0.3);
    ctx.fillRect(-radius * 0.7, -radius * 0.7, radius * 0.75, radius * 0.75);
    ctx.restore();
    ctx.save();
    ctx.rotate(-0.25);
    ctx.fillRect(-radius * 0.05, -radius * 0.1, radius * 0.75, radius * 0.75);
    ctx.restore();
  }
  if (state === STATE_COOKED) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.3, -radius * 1.1);
    ctx.quadraticCurveTo(-radius * 0.5, -radius * 1.5, -radius * 0.3, -radius * 1.9);
    ctx.moveTo(radius * 0.3, -radius * 1.1);
    ctx.quadraticCurveTo(radius * 0.5, -radius * 1.5, radius * 0.3, -radius * 1.9);
    ctx.stroke();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawTopBar(state, best) {
    ctx.fillStyle = PALETTE.topbar;
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = '800 30px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DAPUR KILAT', 20, 34);
    const titleW = ctx.measureText('DAPUR KILAT').width;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 13px ' + FONT;
    ctx.fillText('WARUNG RUSH', 20 + titleW + 12, 36);

    const left = SHIFT_SECONDS - state.time;
    ctx.fillStyle = left < 30 ? PALETTE.danger : PALETTE.text;
    ctx.font = '800 34px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(left), FIELD.width / 2, 34);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 12px ' + FONT;
    ctx.fillText('SHIFT', FIELD.width / 2, 56);

    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.accent;
    ctx.font = '800 28px ' + FONT;
    ctx.fillText(`${state.score}`, FIELD.width - 130, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 12px ' + FONT;
    ctx.fillText(`TERBAIK ${Math.max(best, state.score)}`, FIELD.width - 130, 52);
    for (let index = 0; index < 3; index += 1) {
      heart(ctx, FIELD.width - 96 + index * 30, 30, 22, index < state.hearts ? '#e5534b' : '#4a3a2c');
    }
    if (state.combo >= 2) {
      ctx.fillStyle = '#ffd166';
      ctx.font = '800 20px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${Math.min(2, 1 + 0.1 * state.combo).toFixed(1)}`, FIELD.width - 240, 34);
    }
  }

  function drawTickets(state) {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 64, FIELD.width, 112);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '700 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('PESANAN', 20, 84);
    for (let index = 0; index < TICKET.maxOpen; index += 1) {
      const x = 16 + index * 316;
      const y = 76;
      const w = 300;
      const h = 92;
      const ticket = state.tickets[index];
      roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = ticket ? PALETTE.ticket : 'rgba(255,243,214,0.12)';
      ctx.fill();
      if (!ticket) continue;
      const recipe = recipeById(ticket.recipeId);
      const fraction = Math.max(0, ticket.left / ticket.total);
      ctx.fillStyle = '#2b1e14';
      ctx.font = '800 19px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, x + 12, y + 22);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText(`Rp${recipe.price}`, x + w - 12, y + 22);
      let chipX = x + 12;
      for (const need of recipe.needs) {
        const done = state.plate.some((item) => item.id === need.id && item.state === need.state);
        ctx.globalAlpha = done ? 1 : 0.45;
        drawIngredient(ctx, need.id, chipX + 13, y + 52, 12, need.state);
        ctx.globalAlpha = 1;
        chipX += 34;
      }
      ctx.fillStyle = fraction > 0.5 ? '#2f7a44' : fraction > 0.25 ? '#c98a2e' : '#e5534b';
      roundRect(ctx, x + 12, y + h - 16, (w - 24) * fraction, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#2b1e14';
      ctx.font = '700 11px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(ticket.left)} dtk`, x + w - 12, y + h - 22);
    }
  }

  function drawStationLabel(text, x, y, w) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y);
  }

  function drawKitchen(state, station) {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 176, FIELD.width, 472);
    ctx.fillStyle = PALETTE.floorTile;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(col * 160, 200 + row * 110, 160, 110);
      }
    }
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 176, FIELD.width, 16);

    // Ingredient bins along the top wall.
    for (const bin of STATIONS.bins) {
      roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 8);
      ctx.fillStyle = PALETTE.bin;
      ctx.fill();
      ctx.strokeStyle = PALETTE.binEdge;
      ctx.lineWidth = 2;
      ctx.stroke();
      drawIngredient(ctx, bin.ingredient, bin.x + bin.w / 2, bin.y + 30, 17, 'raw');
      drawStationLabel(INGREDIENTS[bin.ingredient].name.toUpperCase(), bin.x, bin.y + bin.h - 12, bin.w);
    }

    // Chopping board.
    const board = STATIONS.talenan;
    roundRect(ctx, board.x, board.y, board.w, board.h, 10);
    ctx.fillStyle = PALETTE.boardWood;
    ctx.fill();
    ctx.strokeStyle = '#5a3410';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawStationLabel('TALENAN — TAHAN E', board.x, board.y + board.h - 10, board.w);
    if (state.chopProgress > 0 && state.held !== null) {
      drawIngredient(ctx, state.held.id, board.x + board.w / 2, board.y + 44, 20, STATE_CHOPPED);
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(board.x + board.w / 2, board.y + 44, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.chopProgress);
      ctx.stroke();
    }

    // Woks.
    for (const wokStation of [STATIONS.wokA, STATIONS.wokB]) {
      const wok = state.woks[wokStation.id];
      ctx.fillStyle = PALETTE.wok;
      ctx.beginPath();
      ctx.ellipse(wokStation.x + wokStation.w / 2, wokStation.y + 58, 104, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.wokEdge;
      ctx.lineWidth = 3;
      ctx.stroke();
      drawStationLabel(wokStation.id === 0 ? 'WAJAN 1' : 'WAJAN 2', wokStation.x, wokStation.y + wokStation.h - 10, wokStation.w);
      if (wok.item !== null) {
        const shown = wok.item.state === 'cooking' ? 'raw' : wok.item.state;
        drawIngredient(ctx, wok.item.id, wokStation.x + wokStation.w / 2, wokStation.y + 52, 20, shown);
        if (wok.item.state === 'cooking') {
          const fraction = Math.min(1, wok.item.t / 3);
          ctx.strokeStyle = '#ffb347';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(wokStation.x + wokStation.w / 2, wokStation.y + 52, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
          ctx.stroke();
        }
      }
    }

    // Plating counter.
    const plate = STATIONS.piring;
    roundRect(ctx, plate.x, plate.y, plate.w, plate.h, 10);
    ctx.fillStyle = '#e8dcc0';
    ctx.fill();
    ctx.strokeStyle = '#b09a6a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(plate.x + plate.w / 2, plate.y + 48, 84, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9b98a';
    ctx.stroke();
    state.plate.forEach((item, index) => {
      drawIngredient(ctx, item.id, plate.x + 52 + index * 44, plate.y + 48, 15, item.state);
    });
    drawStationLabel('PIRING', plate.x, plate.y + plate.h - 10, plate.w);

    // Trash.
    const trash = STATIONS.sampah;
    roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 10);
    ctx.fillStyle = PALETTE.trash;
    ctx.fill();
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawStationLabel('SAMPAH', trash.x, trash.y + trash.h - 10, trash.w);

    // Serving window.
    const saji = STATIONS.saji;
    roundRect(ctx, saji.x, saji.y, saji.w, saji.h, 12);
    ctx.fillStyle = PALETTE.serve;
    ctx.fill();
    ctx.strokeStyle = PALETTE.serveEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#eaffea';
    ctx.font = '800 26px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('JENDELA SAJI', saji.x + saji.w / 2, saji.y + 46);
    ctx.fillStyle = '#bfe3c0';
    ctx.font = '600 14px ' + FONT;
    ctx.fillText('antar piring yang cocok ke sini', saji.x + saji.w / 2, saji.y + 76);
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 13px ' + FONT;
    ctx.fillText('E = SAJIKAN', saji.x + saji.w / 2, saji.y + 104);

    // Nearest station gets a highlight and an E hint.
    if (station !== null) {
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 3;
      roundRect(ctx, station.x - 4, station.y - 4, station.w + 8, station.h + 8, 12);
      ctx.stroke();
      ctx.fillStyle = PALETTE.accent;
      ctx.beginPath();
      ctx.arc(station.x + station.w / 2, station.y - 12, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241a12';
      ctx.font = '800 14px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('E', station.x + station.w / 2, station.y - 7);
    }
  }

  function drawCook(state, time) {
    const cook = state.cook;
    const bob = Math.sin(time * 10) * 2;
    ctx.save();
    ctx.translate(cook.x, cook.y + bob);
    // Body: teal shirt, white apron.
    ctx.fillStyle = '#0e7c7b';
    roundRect(ctx, -18, -6, 36, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#f5f0e0';
    roundRect(ctx, -13, 2, 26, 26, 6);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath();
    ctx.arc(0, -20, 15, 0, Math.PI * 2);
    ctx.fill();
    // Chef hat.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-9, -32, 8, 0, Math.PI * 2);
    ctx.arc(0, -36, 9, 0, Math.PI * 2);
    ctx.arc(9, -32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-14, -34, 28, 8);
    // Eyes and smile.
    ctx.fillStyle = '#241a12';
    ctx.beginPath();
    ctx.arc(-5, -21, 2, 0, Math.PI * 2);
    ctx.arc(5, -21, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#241a12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -16, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Held item floats above the hat.
    if (state.held !== null) {
      ctx.fillStyle = 'rgba(255,247,232,0.95)';
      ctx.beginPath();
      ctx.arc(0, -58, 17, 0, Math.PI * 2);
      ctx.fill();
      drawIngredient(ctx, state.held.id, 0, -58, 12, state.held.state);
    }
    ctx.restore();
  }

  function drawPopups(state) {
    ctx.textAlign = 'center';
    for (const popup of state.popups) {
      const age = state.time - popup.born;
      ctx.globalAlpha = Math.max(0, 1 - age / 1.4);
      ctx.fillStyle = '#ffd166';
      ctx.font = '800 30px ' + FONT;
      ctx.fillText(popup.text, popup.x, popup.y - age * 40);
    }
    ctx.globalAlpha = 1;
  }

  function drawBottomBar(state) {
    ctx.fillStyle = PALETTE.topbar;
    ctx.fillRect(0, 648, FIELD.width, 72);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '700 13px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('DI TANGAN:', 20, 668);
    if (state.held !== null) {
      const ingredient = INGREDIENTS[state.held.id];
      drawIngredient(ctx, state.held.id, 150, 684, 16, state.held.state);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 15px ' + FONT;
      ctx.fillText(`${ingredient.name} (${state.held.state})`, 176, 684);
    } else {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '600 14px ' + FONT;
      ctx.fillText('— kosong —', 176, 684);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '700 13px ' + FONT;
    ctx.fillText('PIRING:', 430, 668);
    if (state.plate.length === 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '600 14px ' + FONT;
      ctx.fillText('— kosong —', 500, 684);
    } else {
      state.plate.forEach((item, index) => {
        drawIngredient(ctx, item.id, 516 + index * 36, 684, 14, item.state);
      });
    }
    const message = state.messages[state.messages.length - 1];
    if (message) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = '600 15px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(message.text, FIELD.width - 20, 684);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('WASD/←↑↓→ gerak • E ambil / taruh / sajikan • tahan E untuk cincang • klik = jalan ke sana • P jeda • R ulang • M suara', 20, 706);
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(23,19,16,0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = '800 64px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 20px ' + FONT;
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, 320 + index * 34);
    });
  }

  function draw(state, screen, best, options = {}) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textBaseline = 'middle';
    drawTopBar(state, best);
    drawTickets(state);
    drawKitchen(state, options.station ?? null);
    drawCook(state, state.time);
    drawPopups(state);
    drawBottomBar(state);

    if (screen === SCREEN_TITLE) {
      overlay('DAPUR KILAT', [
        'Warung Rush — masak pesanan sebelum pelanggan pergi!',
        'Ambil bahan dari rak, cincang di talenan, masak di wajan,',
        'susun di piring, sajikan di jendela. Satu tangan, satu bahan.',
        '',
        'Tekan SPASI atau klik untuk mulai',
        `Skor terbaik: ${best}`,
      ], PALETTE.accent);
    } else if (screen === SCREEN_PAUSED) {
      overlay('JEDA', ['Tekan P atau Spasi untuk lanjut', 'R untuk mulai dari awal'], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      const served = state.served;
      overlay('SHIFT SELESAI', [
        `Skor: ${state.score}   •   Pesanan disajikan: ${served}   •   Terlewat: ${state.missed}`,
        state.hearts <= 0 ? 'Tiga pelanggan pergi — warung tutup lebih awal.' : 'Warung tutup tepat waktu. Kerja bagus!',
        '',
        'Tekan R untuk main lagi',
        `Skor terbaik: ${Math.max(best, state.score)}`,
      ], PALETTE.accent);
    }
    if (options.muted) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '700 13px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText('SUARA MATI (M)', FIELD.width - 16, 700);
    }
  }

  return { draw };
}
