const fs = require('fs');
const path = require('path');

const classes = ['class-9', 'class-10', 'class-11', 'class-12'];

const keywords = [
  'currently', 'current ', 'current,', 'at present', 'presently', 'as of', 'chief justice', 'governor', 'rbi governor',
  'president of india', 'prime minister', 'number of states', 'union territories', 'repo rate', 'standing deposit facility',
  'chandrayaan-3', 'recent', 'latest', 'world cup', 'olympic gold', 'cop28', 'g20 summit'
];

const results = [];

for (const cls of classes) {
  const dir = path.join(__dirname, '..', 'src', 'data', cls);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const questions = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

    for (const q of questions) {
      const fullText = (q.question + ' ' + (q.explanation || '')).toLowerCase();
      for (const kw of keywords) {
        if (fullText.includes(kw)) {
          results.push({
            id: q.id,
            file: `${cls}/${f}`,
            matchedKw: kw,
            question: q.question,
            explanation: q.explanation,
            currentVolatile: q.volatile
          });
          break;
        }
      }
    }
  }
}

console.log(`Total candidates found: ${results.length}`);
fs.writeFileSync(path.join(__dirname, 'time-sensitive-candidates.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`${r.id} [${r.file}] (KW: "${r.matchedKw}"): ${r.question.substring(0, 90)}...`);
}
