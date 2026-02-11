/**
 * Script debug: lấy data từ DB, so sánh guess vs answer, tìm nguyên nhân so sánh sai
 * Chạy: cd backend && npx ts-node scripts/debug-prediction-answers.ts
 * Test mode (không cần DB): npx ts-node scripts/debug-prediction-answers.ts --test
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { decrypt, isEncrypted } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TEST_MODE = process.argv.includes('--test');

// Copy logic từ admin.ts
function normalizeAnswer(val: unknown): string {
  const s = val == null ? '' : String(val);
  return s
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function answersMatch(guess: unknown, correct: unknown): boolean {
  const a = normalizeAnswer(guess);
  const b = normalizeAnswer(correct);
  if (a === '' && b === '') return false;
  return a === b;
}

function runLocalTests() {
  console.log('=== LOCAL TEST (no DB) ===\n');
  const cases: [string, string, boolean][] = [
    ['24', '24', true],
    ['Arsenal', 'arsenal', true],
    ['  Arsenal  ', 'arsenal', true],
    ['ARSENAL', 'arsenal', true],
    ['24', '24 ', true],
    ['\u0032\u0034', '24', true],  // ASCII digits
    ['２４', '24', true],          // Full-width (NFKC normalizes)
    ['a\u200Br\u200Bs\u200Be\u200Bn\u200Ba\u200Bl', 'arsenal', true], // Zero-width chars
  ];
  for (const [guess, correct, expect] of cases) {
    const result = answersMatch(guess, correct);
    const ok = result === expect;
    console.log(`${ok ? '✓' : '✗'} guess="${guess}" vs answer="${correct}" => ${result} (expected ${expect})`);
    if (!ok) {
      console.log(`   guessNorm="${normalizeAnswer(guess)}" | answerNorm="${normalizeAnswer(correct)}"`);
    }
  }
  console.log('\nDone.');
  process.exit(0);
}

// Hiển thị chi tiết chuỗi (char codes, hex) để debug
function inspectString(s: string, label: string): string[] {
  const lines: string[] = [
    `${label}: "${s}" (length=${s.length})`,
    `  charCodes: [${[...s].map(c => c.charCodeAt(0)).join(', ')}]`,
    `  hex: ${Buffer.from(s, 'utf8').toString('hex')}`,
    `  normalized: "${normalizeAnswer(s)}"`,
  ];
  return lines;
}

async function main() {
  if (TEST_MODE) {
    runLocalTests();
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/predict-win';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No db');
  const predictionsCol = db.collection('predictions');
  const userPredictionsCol = db.collection('userpredictions');

  const predictions = await predictionsCol.find({}).toArray();
  console.log(`Found ${predictions.length} predictions\n`);

  for (const pred of predictions) {
    const subs = await userPredictionsCol.find({ predictionId: pred._id }).toArray();
    if (subs.length === 0) continue;

    console.log('='.repeat(80));
    console.log(`Prediction: ${pred.title} (id: ${pred._id})`);
    console.log('='.repeat(80));

    // Decrypt answer
    let correctAnswer = '';
    try {
      const rawAnswer = pred.answer as string;
      correctAnswer = isEncrypted(rawAnswer) ? decrypt(rawAnswer) : rawAnswer;
    } catch (e: any) {
      correctAnswer = `[decrypt error: ${e.message}]`;
    }

    console.log('\n--- Correct answer (from DB, decrypted) ---');
    inspectString(correctAnswer, 'answer').forEach(l => console.log(l));

    console.log('\n--- User submissions ---');
    for (const sub of subs) {
      const guess = sub.guess ?? '';
      const isCorrect = sub.isCorrect;
      const match = answersMatch(guess, correctAnswer);
      const matchAdmin = answersMatch(guess, correctAnswer); // same as we use both

      console.log(`\n  User ${sub.userId}, guess="${guess}"`);
      console.log(`  guess length=${guess.length}, isCorrect in DB=${isCorrect}, our match=${match}`);
      inspectString(guess, '  guess').forEach(l => console.log(l));

      if (!match && guess.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
        console.log('  >>> WARNING: Should match but normalizeAnswer differs!');
        const gn = normalizeAnswer(guess);
        const an = normalizeAnswer(correctAnswer);
        console.log(`  >>> guessNorm="${gn}" (${gn.length}), answerNorm="${an}" (${an.length})`);
        for (let i = 0; i < Math.max(gn.length, an.length); i++) {
          const gc = gn[i] || '';
          const ac = an[i] || '';
          if (gc !== ac) {
            console.log(`  >>> Diff at ${i}: guess="${gc}"(${gc.charCodeAt(0)}), answer="${ac}"(${ac.charCodeAt(0)})`);
          }
        }
      }
    }
    console.log('\n');
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
