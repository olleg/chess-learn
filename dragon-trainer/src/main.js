import { Chess } from 'chess.js';
import { initBoard, setPosition } from './chess/board.js';
import { playSound, setSoundEnabled, isSoundEnabled } from './audio.js';
import './style.css';
import moves from '../data/dragon-main-line.json';

const state = {
  moveIndex: 0,
  chess: new Chess(),
  hintLevel: 0,
};

let cg = null;
let runComplete = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLegalDests() {
  const dests = new Map();
  for (const m of state.chess.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push(m.to);
  }
  return dests;
}

function getLastMoveCoords() {
  const history = state.chess.history({ verbose: true });
  if (!history.length) return [];
  const last = history[history.length - 1];
  return [last.from, last.to];
}

// ─── Move list ────────────────────────────────────────────────────────────────

function updateMoveList() {
  const el = document.getElementById('move-list');
  const history = state.chess.history();
  if (!history.length) {
    el.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 0; i < history.length; i++) {
    const isLast = i === history.length - 1;
    if (i % 2 === 0) {
      html += `<span class="move-item${isLast ? ' current' : ''}">${Math.floor(i / 2) + 1}. ${history[i]}</span> `;
    } else {
      html += `<span class="move-item${isLast ? ' current' : ''}">${history[i]}</span>  `;
    }
  }
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

// ─── Status ───────────────────────────────────────────────────────────────────

function setStatus(text) {
  document.getElementById('status-text').textContent = text;
}

// ─── Flash ────────────────────────────────────────────────────────────────────

function flashError() {
  const wrap = document.getElementById('board-wrap');
  wrap.classList.remove('error-flash');
  void wrap.offsetWidth;
  wrap.classList.add('error-flash');
  setTimeout(() => wrap.classList.remove('error-flash'), 500);
}

// ─── White move playback ──────────────────────────────────────────────────────

function playWhiteMove() {
  const move = moves[state.moveIndex];
  if (!move || move.player !== 'white') return;

  state.chess.move({ from: move.from, to: move.to, promotion: 'q' });
  const lastMove = [move.from, move.to];

  setPosition(cg, {
    fen: state.chess.fen(),
    lastMove,
    movableColor: 'none',
    dests: new Map(),
  });

  state.moveIndex++;
  updateMoveList();

  if (state.moveIndex < moves.length && moves[state.moveIndex].player === 'white') {
    setTimeout(playWhiteMove, 700);
    return;
  }

  if (state.moveIndex >= moves.length) {
    handleComplete();
    return;
  }

  setTimeout(() => {
    setPosition(cg, {
      fen: state.chess.fen(),
      lastMove,
      movableColor: 'black',
      dests: getLegalDests(),
    });
    setStatus(`Move ${Math.ceil(state.moveIndex / 2)} — your turn`);
  }, 150);
}

// ─── User move handler ────────────────────────────────────────────────────────

function handleUserMove(from, to) {
  if (runComplete) return;

  const expected = moves[state.moveIndex];
  if (!expected || expected.player !== 'black') return;

  if (from === expected.from && to === expected.to) {
    state.chess.move({ from, to, promotion: 'q' });
    state.hintLevel = 0;
    state.moveIndex++;

    setPosition(cg, {
      fen: state.chess.fen(),
      lastMove: [from, to],
      movableColor: 'none',
      dests: new Map(),
    });

    cg.setAutoShapes([]);
    updateMoveList();
    playSound('correct');

    if (state.moveIndex >= moves.length) {
      handleComplete();
    } else {
      setTimeout(playWhiteMove, 700);
    }
  } else {
    // Wrong move — lock board, flash, then restart
    setPosition(cg, {
      fen: state.chess.fen(),
      lastMove: getLastMoveCoords(),
      movableColor: 'none',
      dests: new Map(),
    });

    flashError();
    playSound('wrong');
    setStatus('Wrong move — restarting...');
    setTimeout(resetGame, 1200);
  }
}

// ─── Hint ─────────────────────────────────────────────────────────────────────

function handleHint() {
  if (runComplete) return;
  const expected = moves[state.moveIndex];
  if (!expected || expected.player !== 'black') return;

  state.hintLevel++;

  if (state.hintLevel === 1) {
    cg.setAutoShapes([{ orig: expected.from, brush: 'blue' }]);
    setStatus('Hint: move this piece');
  } else if (state.hintLevel === 2) {
    cg.setAutoShapes([{ orig: expected.from, dest: expected.to, brush: 'blue' }]);
    setStatus('Hint: move here');
  } else {
    handleUserMove(expected.from, expected.to);
  }
}

// ─── Complete ─────────────────────────────────────────────────────────────────

function handleComplete() {
  runComplete = true;
  playSound('complete');
  setStatus('Well done! Line complete!');

  setPosition(cg, {
    fen: state.chess.fen(),
    lastMove: getLastMoveCoords(),
    movableColor: 'none',
    dests: new Map(),
  });

  document.getElementById('hint-btn').disabled = true;
}

// ─── Reset game ───────────────────────────────────────────────────────────────

function resetGame() {
  const hintBtn = document.getElementById('hint-btn');
  if (!hintBtn.hidden) hintBtn.disabled = false;

  state.chess = new Chess();
  state.moveIndex = 0;
  state.hintLevel = 0;
  runComplete = false;

  setPosition(cg, {
    fen: state.chess.fen(),
    lastMove: [],
    movableColor: 'none',
    dests: new Map(),
  });

  updateMoveList();
  setStatus('Loading...');
  setTimeout(playWhiteMove, 700);
}

// ─── Sound toggle ─────────────────────────────────────────────────────────────

function updateSoundButton() {
  document.getElementById('sound-btn').textContent = isSoundEnabled() ? '🔊' : '🔇';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  const boardEl = document.getElementById('board');
  cg = initBoard(boardEl, handleUserMove);

  const isAdmin = new URLSearchParams(window.location.search).has('admin');
  const hintBtn = document.getElementById('hint-btn');
  hintBtn.hidden = !isAdmin;

  document.getElementById('hint-btn').addEventListener('click', handleHint);
  document.getElementById('new-game-btn').addEventListener('click', resetGame);
  document.getElementById('sound-btn').addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
    updateSoundButton();
  });

  updateSoundButton();
  setTimeout(playWhiteMove, 700);
  setStatus('Loading...');
}

document.addEventListener('DOMContentLoaded', init);
