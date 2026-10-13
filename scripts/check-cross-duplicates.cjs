const fs = require('fs');
const path = require('path');

const classes = ['class-9', 'class-10', 'class-11', 'class-12'];
const allQuestions = [];
const allPassages = [];

for (const cls of classes) {
  const dir = path.join(__dirname, '..', 'src', 'data', cls);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.endsWith('.passages.json'));
  for (const file of files) {
    const questions = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const q of questions) {
      allQuestions.push({
        ...q,
        _file: `${cls}/${file}`
      });
    }
  }

  const pFile = path.join(dir, 'hindi.passages.json');
  if (fs.existsSync(pFile)) {
    try {
      const passages = JSON.parse(fs.readFileSync(pFile, 'utf8'));
      for (const p of passages) {
        if (p && p.id && p.content) {
          allPassages.push({
            ...p,
            _class: cls
          });
        }
      }
    } catch {}
  }
}

console.log(`Total questions loaded: ${allQuestions.length}`);
console.log(`Total unseen passages loaded: ${allPassages.length}`);

// Common generic stop words in question stems that don't indicate semantic duplication
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'which', 'what', 'when', 'where', 'who', 'whom',
  'calculate', 'evaluate', 'find', 'determine', 'identify', 'select', 'choose', 'following', 'given',
  'value', 'statement', 'correct', 'incorrect', 'true', 'false', 'below', 'above', 'each', 'match',
  'order', 'arrange', 'between', 'among', 'after', 'before', 'total', 'ratio', 'percentage',
  // Hindi stop words
  'निम्नलिखित', 'कौन', 'कौनसा', 'कौनसी', 'किस', 'किसे', 'किसने', 'क्या', 'कहाँ', 'कब', 'सही', 'गलत',
  'कथन', 'उत्तर', 'अर्थ', 'सुमेलित', 'क्रम', 'सटीक', 'प्रतीक', 'स्पष्ट', 'मान', 'ज्ञात', 'कीजिए', 'करें'
]);

function tokenize(text) {
  // Preserve Unicode letters and combining marks (crucial for Devanagari matras)
  return new Set(
    (text || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccard(setA, setB) {
  if (setA.size < 4 || setB.size < 4) return 0; // Require meaningful content word count
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const tokenMap = allQuestions.map(q => tokenize(q.question));
const crossClassDupes = [];

for (let i = 0; i < allQuestions.length; i++) {
  for (let j = i + 1; j < allQuestions.length; j++) {
    const q1 = allQuestions[i];
    const q2 = allQuestions[j];

    // Only flag if they are in different classes
    if (q1.class !== q2.class) {
      const sim = jaccard(tokenMap[i], tokenMap[j]);
      if (sim >= 0.8) {
        crossClassDupes.push({
          q1: `${q1.id} (${q1._file})`,
          q2: `${q2.id} (${q2._file})`,
          sim: Math.round(sim * 100) + '%',
          text1: q1.question,
          text2: q2.question
        });
      }
    }
  }
}

console.log(`Cross-class near-duplicate question pairs (>= 80% content similarity): ${crossClassDupes.length}`);
if (crossClassDupes.length > 0) {
  console.log(JSON.stringify(crossClassDupes, null, 2));
} else {
  console.log('PASS: 0 cross-class near-duplicate question pairs found!');
}

if (allPassages.length > 0) {
  const passageTokenMap = allPassages.map(p => tokenize(p.content));
  const crossPassageDupes = [];
  for (let i = 0; i < allPassages.length; i++) {
    for (let j = i + 1; j < allPassages.length; j++) {
      const p1 = allPassages[i];
      const p2 = allPassages[j];
      if (p1._class !== p2._class) {
        const sim = jaccard(passageTokenMap[i], passageTokenMap[j]);
        if (sim >= 0.7) {
          crossPassageDupes.push({
            p1: `${p1.id} (${p1._class})`,
            p2: `${p2.id} (${p2._class})`,
            sim: Math.round(sim * 100) + '%'
          });
        }
      }
    }
  }
  console.log(`Cross-class near-duplicate passage pairs (>= 70% similarity): ${crossPassageDupes.length}`);
  if (crossPassageDupes.length > 0) {
    console.log(JSON.stringify(crossPassageDupes, null, 2));
  } else {
    console.log('PASS: 0 cross-class near-duplicate passage pairs found!');
  }
}
