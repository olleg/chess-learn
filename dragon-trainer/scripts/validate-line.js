import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function validateFile(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const moves = Array.isArray(raw) ? raw : raw.moves;
  const label = Array.isArray(raw) ? filePath : `${raw.title} (${filePath})`;

  const chess = new Chess();
  let errors = 0;

  for (const move of moves) {
    let result;
    try {
      result = chess.move({ from: move.from, to: move.to, promotion: 'q' });
    } catch (e) {
      console.error(`  Move ${move.moveIndex} (${move.san}): ILLEGAL — ${e.message}`);
      errors++;
      continue;
    }
    const actualSan = chess.history().at(-1);
    if (actualSan !== move.san) {
      console.error(`  Move ${move.moveIndex}: expected "${move.san}" got "${actualSan}"`);
      errors++;
    } else {
      console.log(`  Move ${move.moveIndex}: OK — ${actualSan}`);
    }
  }
  return errors;
}

const files = [
  join(__dirname, '..', 'data', 'dragon-main-line.json'),
  join(__dirname, '..', 'data', 'dragon-g4.json'),
  join(__dirname, '..', 'data', 'italian-giuoco.json'),
];

let totalErrors = 0;
for (const f of files) {
  console.log(`\nValidating ${f}...`);
  totalErrors += validateFile(f);
}

if (totalErrors === 0) {
  console.log('\nAll lines validated successfully.');
  process.exit(0);
} else {
  console.error(`\n${totalErrors} error(s) found.`);
  process.exit(1);
}
