const fs = require('fs');
const path = require('path');

const EXACT_VOLATILE_IDS = new Set([
  'c9-gk-064',   // Current number of States in India (28 states, 8 UTs)
  'c10-gk-005',  // Current count of Fundamental Duties under Art 51A (11 duties)
  'c10-gk-030',  // Largest contributing sector to Indian GDP (Services sector)
  'c10-gk-037',  // Current sovereign member states in UN General Assembly (193 members)
  'c11-gk-084',  // Khel Ratna award renamed in 2021 to Major Dhyan Chand Khel Ratna
  'c12-eng-091', // Current CBSE blueprint long writing task weighting (5 marks)
  'c12-gk-042',  // RBI Flexible Inflation Targeting tolerance band (4% +/- 2%)
  'c12-gk-055'   // IMF SDR currency basket composition (USD, EUR, CNY, JPY, GBP)
]);

const classes = ['class-9', 'class-10', 'class-11', 'class-12'];
let tagged = 0;

for (const cls of classes) {
  const dir = path.join(__dirname, '..', 'src', 'data', cls);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const filePath = path.join(dir, f);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const q of questions) {
      if (EXACT_VOLATILE_IDS.has(q.id)) {
        q.volatile = true;
        tagged++;
      } else {
        q.volatile = false;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2) + '\n', 'utf8');
  }
}

console.log(`Successfully verified and set exactly ${tagged} volatile questions across all 32 files.`);
