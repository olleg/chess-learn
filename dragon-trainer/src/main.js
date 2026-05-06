import { Chess } from 'chess.js';
import { initBoard, setPosition } from './chess/board.js';
import './style.css';
import dragonData from '../data/dragon-main-line.json';
import italianData from '../data/italian-giuoco.json';
import dragonG4Data from '../data/dragon-g4.json';

const LINES = [dragonData, dragonG4Data, italianData];

// ── State ──────────────────────────────────────────────────────────────────────

let currentLine = LINES[0];
let cg = null;
let appMode = 'learn'; // 'learn' | 'practice'

// Learn state
const learn = {
  chess: new Chess(),
  step: 0,
};

// Practice state
const practice = {
  chess: new Chess(),
  moveIndex: 0,
  hintLevel: 0,
  runComplete: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLegalDests() {
  const dests = new Map();
  for (const m of practice.chess.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push(m.to);
  }
  return dests;
}

function getLastMoveCoords(chess) {
  const h = chess.history({ verbose: true });
  if (!h.length) return [];
  return [h[h.length - 1].from, h[h.length - 1].to];
}

function setStatus(text) {
  document.getElementById('status-text').textContent = text;
}

function showNote(text) {
  const el = document.getElementById('note-bar');
  if (text) {
    el.textContent = text;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

function flashError() {
  const wrap = document.getElementById('board-wrap');
  wrap.classList.remove('error-flash');
  void wrap.offsetWidth;
  wrap.classList.add('error-flash');
  setTimeout(() => wrap.classList.remove('error-flash'), 500);
}

function isUserTurn(moveIndex) {
  const move = currentLine.moves[moveIndex];
  return move && move.player === currentLine.playerColor;
}

// ── Move list ─────────────────────────────────────────────────────────────────

function updateMoveList(chess) {
  const el = document.getElementById('move-list');
  const history = chess.history();
  if (!history.length) { el.innerHTML = ''; return; }

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

// ── Learn mode ────────────────────────────────────────────────────────────────

function enterLearnMode() {
  appMode = 'learn';
  document.getElementById('learn-controls').hidden = false;
  document.getElementById('practice-controls').hidden = true;
  document.getElementById('learn-tab-btn').classList.add('active');
  document.getElementById('practice-tab-btn').classList.remove('active');
  document.getElementById('move-list').innerHTML = '';

  learn.chess = new Chess();
  learn.step = 0;

  showNote(null);
  renderLearnStep();
  setStatus('Step through the line, then click Practice to drill it.');
}

function renderLearnStep() {
  const lastMove = getLastMoveCoords(learn.chess);
  setPosition(cg, {
    fen: learn.chess.fen(),
    lastMove,
    movableColor: 'none',
  });

  const total = currentLine.moves.length;
  document.getElementById('learn-counter').textContent = `${learn.step} / ${total}`;

  const prevMove = learn.step > 0 ? currentLine.moves[learn.step - 1] : null;
  showNote(prevMove?.note || null);

  // Disable/enable nav buttons
  document.getElementById('learn-prev-btn').disabled = learn.step === 0;
  document.getElementById('learn-next-btn').disabled = learn.step === total;

  // Show move list in learn mode too
  updateMoveList(learn.chess);
}

function learnNext() {
  if (learn.step >= currentLine.moves.length) return;
  const m = currentLine.moves[learn.step];
  learn.chess.move({ from: m.from, to: m.to, promotion: 'q' });
  learn.step++;
  renderLearnStep();
}

function learnPrev() {
  if (learn.step === 0) return;
  learn.chess.undo();
  learn.step--;
  renderLearnStep();
}

// ── Practice mode ─────────────────────────────────────────────────────────────

function enterPracticeMode() {
  appMode = 'practice';
  document.getElementById('learn-controls').hidden = true;
  document.getElementById('practice-controls').hidden = false;
  document.getElementById('practice-tab-btn').classList.add('active');
  document.getElementById('learn-tab-btn').classList.remove('active');

  resetPractice();
}

function resetPractice() {
  practice.chess = new Chess();
  practice.moveIndex = 0;
  practice.hintLevel = 0;
  practice.runComplete = false;

  const hintBtn = document.getElementById('hint-btn');
  if (!hintBtn.hidden) hintBtn.disabled = false;

  showNote(null);
  setPosition(cg, {
    fen: practice.chess.fen(),
    lastMove: [],
    movableColor: 'none',
  });
  updateMoveList(practice.chess);
  setStatus('Loading...');
  setTimeout(playAutoMove, 700);
}

// Plays the computer's side (whichever color is NOT playerColor).
// If it's already the user's turn, just enables the board.
function playAutoMove() {
  const move = currentLine.moves[practice.moveIndex];
  if (!move || move.player === currentLine.playerColor) {
    if (move) {
      setPosition(cg, {
        fen: practice.chess.fen(),
        lastMove: getLastMoveCoords(practice.chess),
        movableColor: currentLine.playerColor,
        dests: getLegalDests(),
      });
      const moveNum = Math.ceil(practice.moveIndex / 2) + 1;
      setStatus(`Move ${moveNum} — your turn`);
    }
    return;
  }

  practice.chess.move({ from: move.from, to: move.to, promotion: 'q' });
  const lastMove = [move.from, move.to];
  showNote(move.note || null);
  practice.moveIndex++;

  setPosition(cg, { fen: practice.chess.fen(), lastMove, movableColor: 'none' });
  updateMoveList(practice.chess);

  // Consecutive auto-moves (shouldn't happen but guard anyway)
  if (practice.moveIndex < currentLine.moves.length &&
      currentLine.moves[practice.moveIndex].player !== currentLine.playerColor) {
    setTimeout(playAutoMove, 700);
    return;
  }

  if (practice.moveIndex >= currentLine.moves.length) {
    handlePracticeComplete();
    return;
  }

  setTimeout(() => {
    setPosition(cg, {
      fen: practice.chess.fen(),
      lastMove,
      movableColor: currentLine.playerColor,
      dests: getLegalDests(),
    });
    const moveNum = Math.ceil(practice.moveIndex / 2) + 1;
    setStatus(`Move ${moveNum} — your turn`);
  }, 150);
}

function handleUserMove(from, to) {
  if (appMode !== 'practice' || practice.runComplete) return;

  const expected = currentLine.moves[practice.moveIndex];
  if (!expected || expected.player !== currentLine.playerColor) return;

  if (from === expected.from && to === expected.to) {
    practice.chess.move({ from, to, promotion: 'q' });
    practice.hintLevel = 0;
    showNote(expected.note || null);
    practice.moveIndex++;

    setPosition(cg, {
      fen: practice.chess.fen(),
      lastMove: [from, to],
      movableColor: 'none',
    });
    cg.setAutoShapes([]);
    updateMoveList(practice.chess);
    if (practice.moveIndex >= currentLine.moves.length) {
      handlePracticeComplete();
    } else {
      setTimeout(playAutoMove, 700);
    }
  } else {
    setPosition(cg, {
      fen: practice.chess.fen(),
      lastMove: getLastMoveCoords(practice.chess),
      movableColor: 'none',
    });
    flashError();
    setStatus('Wrong move — restarting...');
    setTimeout(resetPractice, 1200);
  }
}

function handleHint() {
  if (practice.runComplete) return;
  const expected = currentLine.moves[practice.moveIndex];
  if (!expected || expected.player !== currentLine.playerColor) return;

  practice.hintLevel++;
  if (practice.hintLevel === 1) {
    cg.setAutoShapes([{ orig: expected.from, brush: 'blue' }]);
    setStatus('Hint: move this piece');
  } else if (practice.hintLevel === 2) {
    cg.setAutoShapes([{ orig: expected.from, dest: expected.to, brush: 'blue' }]);
    setStatus('Hint: move here');
  } else {
    handleUserMove(expected.from, expected.to);
  }
}

function handlePracticeComplete() {
  practice.runComplete = true;
  setStatus('Well done! Line complete!');
  setPosition(cg, {
    fen: practice.chess.fen(),
    lastMove: getLastMoveCoords(practice.chess),
    movableColor: 'none',
  });
  document.getElementById('hint-btn').disabled = true;
}

// ── Line selector ─────────────────────────────────────────────────────────────

function loadLine(line) {
  currentLine = line;
  cg.set({ orientation: line.playerColor });
  if (appMode === 'learn') enterLearnMode();
  else enterPracticeMode();
}

function buildLineSelector() {
  const sel = document.getElementById('line-select');
  sel.innerHTML = '';
  LINES.forEach((line, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${line.title}: ${line.subtitle}`;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => loadLine(LINES[+sel.value]));
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  cg = initBoard(
    document.getElementById('board'),
    currentLine.playerColor,
    handleUserMove
  );

  buildLineSelector();

  const isAdmin = new URLSearchParams(window.location.search).has('admin');
  document.getElementById('hint-btn').hidden = !isAdmin;

  document.getElementById('learn-prev-btn').addEventListener('click', learnPrev);
  document.getElementById('learn-next-btn').addEventListener('click', learnNext);
  document.getElementById('learn-practice-btn').addEventListener('click', enterPracticeMode);
  document.getElementById('learn-tab-btn').addEventListener('click', enterLearnMode);
  document.getElementById('practice-tab-btn').addEventListener('click', enterPracticeMode);
  document.getElementById('hint-btn').addEventListener('click', handleHint);
  document.getElementById('new-game-btn').addEventListener('click', resetPractice);

  enterLearnMode();
}

document.addEventListener('DOMContentLoaded', init);
