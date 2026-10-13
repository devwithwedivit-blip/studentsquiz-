const fs = require('fs');
const path = require('path');

const volatileIds = new Set([
  'c9-gk-064',   // Current number of States in India (28)
  'c10-gk-048',  // Current number of Union Territories in India (8)
  'c11-gk-012',  // Current number of High Courts in India (25)
  'c11-gk-031',  // Current official languages in Eighth Schedule (22)
  'c12-gk-042',  // Flexible Inflation Targeting tolerance band (4% +/- 2%)
  'c12-gk-055',  // IMF SDR valuation basket currencies (USD, EUR, CNY, JPY, GBP)
  'c12-eng-091'  // Current CBSE Class 12 English blueprint section marks
]);

const classes = ['class-9', 'class-10', 'class-11', 'class-12'];
let taggedCount = 0;

for (const cls of classes) {
  const dir = path.join(__dirname, '..', 'src', 'data', cls);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const filePath = path.join(dir, f);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    for (const q of questions) {
      if (volatileIds.has(q.id)) {
        q.volatile = true;
        taggedCount++;
        modified = true;
        console.log(`Tagged volatile: true -> ${q.id} in ${cls}/${f}: ${q.question.substring(0, 70)}...`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2) + '\n', 'utf8');
    }
  }
}

console.log(`Total questions tagged with volatile: true: ${taggedCount}`);
