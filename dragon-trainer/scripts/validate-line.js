import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataPath = join(__dirname, '..', 'data', 'dragon-main-line.json');
const moves = JSON.parse(readFileSync(dataPath, 'utf-8'));

const chess = new Chess();
let errors = 0;

for (const move of moves) {
  let result;
  try {
    result = chess.move({ from: move.from, to: move.to, promotion: 'q' });
  } catch (e) {
    console.error(`Move ${move.moveIndex} (${move.san}): ILLEGAL MOVE ${move.from}->${move.to} — ${e.message}`);
    errors++;
    continue;
  }

  const history = chess.history();
  const actualSan = history[history.length - 1];

  if (actualSan !== move.san) {
    console.error(
      `Move ${move.moveIndex}: expected SAN "${move.san}" but got "${actualSan}" (${move.from}->${move.to})`
    );
    errors++;
  } else {
    console.log(`Move ${move.moveIndex}: OK — ${actualSan}`);
  }
}

if (errors === 0) {
  console.log(`\nAll ${moves.length} moves validated successfully.`);
  process.exit(0);
} else {
  console.error(`\n${errors} error(s) found in ${moves.length} moves.`);
  process.exit(1);
}
