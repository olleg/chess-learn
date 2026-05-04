import { Chessground } from 'chessground';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

export function initBoard(el, orientation, onMove) {
  return Chessground(el, {
    orientation: orientation || 'black',
    movable: {
      free: false,
      color: 'none',
      events: {
        after: onMove,
      },
    },
    premovable: {
      enabled: false,
    },
    blockTouchScroll: true,
    animation: {
      duration: 150,
    },
  });
}

export function setPosition(cg, { fen, lastMove, movableColor, dests, autoShapes }) {
  const turnColor = fen
    ? (fen.split(' ')[1] === 'b' ? 'black' : 'white')
    : 'white';
  cg.set({
    fen,
    lastMove: lastMove || [],
    turnColor,
    movable: {
      color: movableColor || 'none',
      dests: dests || new Map(),
    },
    drawable: { autoShapes: autoShapes || [] },
  });
}
