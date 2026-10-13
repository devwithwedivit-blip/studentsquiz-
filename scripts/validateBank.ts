import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateQuestionBank,
  validateCrossClassDuplicates,
  validatePassages,
  BankValidationReport,
  PassageValidationReport,
  PASSAGE_RANGES,
  QuestionItemRef
} from '../src/services/validator.js';

// Resolve directory paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');

const args = process.argv.slice(2);
const allowPartial = args.includes('--allow-partial') || args.includes('--partial') || args.includes('--sample');
const isStrict100 = !allowPartial || args.includes('--full') || args.includes('--strict-100');

// Parse optional --class and --file filters
let targetClassFilter: string | null = null;
const classArgIdx = args.findIndex(a => a.startsWith('--class'));
if (classArgIdx !== -1) {
  if (args[classArgIdx].includes('=')) {
    targetClassFilter = args[classArgIdx].split('=')[1];
  } else if (args[classArgIdx + 1] && !args[classArgIdx + 1].startsWith('--')) {
    targetClassFilter = args[classArgIdx + 1];
  }
}

let targetFileFilter: string | null = null;
const fileArgIdx = args.findIndex(a => a.startsWith('--file'));
if (fileArgIdx !== -1) {
  if (args[fileArgIdx].includes('=')) {
    targetFileFilter = args[fileArgIdx].split('=')[1];
  } else if (args[fileArgIdx + 1] && !args[fileArgIdx + 1].startsWith('--')) {
    targetFileFilter = args[fileArgIdx + 1];
  }
}

console.log('='.repeat(80));
console.log('🔍 QUIZFORGE QUESTION BANK VALIDATOR');
console.log(
  `Mode: ${allowPartial ? 'PARTIAL WORK-IN-PROGRESS (--allow-partial: skips 100-count check on incomplete files)' : 'STRICT FULL BANK (Requires exactly 100 questions per file & type distribution)'}`
);
if (targetClassFilter) console.log(`Filter: Class ${targetClassFilter}`);
if (targetFileFilter) console.log(`Filter: File ${targetFileFilter}`);
console.log('='.repeat(80));

if (!fs.existsSync(dataDir)) {
  console.error(`❌ Data directory not found: ${dataDir}`);
  process.exit(1);
}

const reports: BankValidationReport[] = [];
const allGlobalQuestions: QuestionItemRef[] = [];
const allPassageReports: PassageValidationReport[] = [];
const allPassageFileIssues: { className: number; issues: any[] }[] = [];
let totalErrors = 0;
let totalWarnings = 0;
let totalQuestions = 0;

// Scan class folders
let classDirs = fs.readdirSync(dataDir).filter(f => f.startsWith('class-')).sort();
if (targetClassFilter) {
  classDirs = classDirs.filter(d => d === `class-${targetClassFilter}` || d === targetClassFilter);
}

if (classDirs.length === 0) {
  console.warn('⚠️ No matching class directories found in src/data.');
  process.exit(0);
}

for (const cDir of classDirs) {
  const fullClassPath = path.join(dataDir, cDir);
  if (!fs.statSync(fullClassPath).isDirectory()) continue;
  const clsNum = parseInt(cDir.replace('class-', ''), 10);

  // Exclude *.passages.json from standard question bank scanning
  let files = fs.readdirSync(fullClassPath).filter(f => f.endsWith('.json') && !f.endsWith('.passages.json')).sort();
  if (targetFileFilter) {
    files = files.filter(f => f.includes(targetFileFilter!));
  }

  let classHindiQuestions: any[] = [];

  for (const file of files) {
    const filePath = path.join(fullClassPath, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const questions = JSON.parse(raw);
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

      if (file === 'hindi.json' && Array.isArray(questions)) {
        classHindiQuestions = questions;
      }

      const report = validateQuestionBank(questions, relativePath, {
        requireExact100: !allowPartial,
        allowPartial: allowPartial
      });

      reports.push(report);
      totalQuestions += report.totalQuestions;

      // Accumulate questions for cross-class checking
      if (Array.isArray(questions)) {
        for (const q of questions) {
          if (q && q.id && q.question) {
            allGlobalQuestions.push({
              id: q.id,
              className: report.className,
              subject: report.subject,
              question: q.question,
              file: relativePath
            });
          }
        }
      }

      const fileErrors = report.issues.filter(i => i.severity === 'error');
      const fileWarnings = report.issues.filter(i => i.severity === 'warning');
      totalErrors += fileErrors.length;
      totalWarnings += fileWarnings.length;
    } catch (err: any) {
      console.error(`❌ Failed to parse JSON file: ${filePath}`);
      console.error(err.message);
      totalErrors++;
    }
  }

  // Check hindi.passages.json for this class if present
  const passagesFilePath = path.join(fullClassPath, 'hindi.passages.json');
  if (fs.existsSync(passagesFilePath) && (!targetFileFilter || targetFileFilter.includes('hindi') || targetFileFilter.includes('passage'))) {
    try {
      const rawPassages = fs.readFileSync(passagesFilePath, 'utf-8');
      const passagesData = JSON.parse(rawPassages);
      const pResult = validatePassages(passagesData, clsNum, classHindiQuestions, { allowPartial });
      allPassageReports.push(...pResult.reports);
      if (pResult.fileIssues.length > 0) {
        allPassageFileIssues.push({ className: clsNum, issues: pResult.fileIssues });
        for (const fi of pResult.fileIssues) {
          if (fi.severity === 'error') totalErrors++;
          else totalWarnings++;
        }
      }
      for (const prep of pResult.reports) {
        for (const pIssue of prep.issues) {
          if (pIssue.severity === 'error') totalErrors++;
          else totalWarnings++;
        }
      }
    } catch (err: any) {
      console.error(`❌ Failed to parse passage file: ${passagesFilePath}`);
      console.error(err.message);
      totalErrors++;
    }
  }
}

// Check for cross-class near-duplicates
const crossClassIssues = validateCrossClassDuplicates(allGlobalQuestions);
for (const cIssue of crossClassIssues) {
  if (cIssue.severity === 'error') totalErrors++;
  else totalWarnings++;
}

// Print Formatted Summary Table
console.log('\n📊 QUESTION BANK DISTRIBUTION & AUDIT TABLE:');
console.log('-'.repeat(125));
console.log(
  'Class'.padEnd(8) +
  'Subject'.padEnd(16) +
  'Count'.padEnd(8) +
  'Type Distribution (M/TF/FB/Mt/Nm/Img/Sh/Lg/MS/Ord)'.padEnd(52) +
  'Difficulty (E/M/H)'.padEnd(20) +
  'Status'
);
console.log('-'.repeat(125));

for (const rep of reports) {
  const types = rep.typeCounts;
  const typeSummary = `${types.mcq}/${types.truefalse}/${types.fillblank}/${types.match}/${types.numerical}/${types.image}/${types.short}/${types.logic}/${types.multiselect}/${types.ordering}`;
  const diff = rep.difficultyCounts;
  const diffSummary = `${diff.easy} / ${diff.medium} / ${diff.hard}`;
  const statusStr = rep.isValid ? '✅ PASS' : '❌ FAIL';

  console.log(
    `Class ${rep.className}`.padEnd(8) +
    rep.subject.padEnd(16) +
    `${rep.totalQuestions}`.padEnd(8) +
    typeSummary.padEnd(52) +
    diffSummary.padEnd(20) +
    statusStr
  );

  if (rep.issues.length > 0) {
    for (const issue of rep.issues) {
      const icon = issue.severity === 'error' ? '   🛑 [ERROR]' : '   ⚠️ [WARN]';
      const loc = issue.questionId ? ` (${issue.questionId}${issue.field ? ` -> ${issue.field}` : ''})` : '';
      console.log(`${icon}${loc}: ${issue.message}`);
    }
  }
}

// Print Unseen Passages Table
if (allPassageReports.length > 0 || allPassageFileIssues.length > 0) {
  console.log('\n📜 UNSEEN PASSAGES AUDIT TABLE (Phase 7):');
  console.log('-'.repeat(125));
  console.log(
    'Class'.padEnd(8) +
    'Passage ID'.padEnd(18) +
    'Kind'.padEnd(10) +
    'Words/Lines'.padEnd(18) +
    'Required Range'.padEnd(24) +
    'Linked Qs'.padEnd(14) +
    'Status'
  );
  console.log('-'.repeat(125));

  for (const pr of allPassageReports) {
    const range = PASSAGE_RANGES[pr.class];
    const targetRangeStr = pr.kind === 'gadya'
      ? `${range?.gadyaWords[0] || 0}-${range?.gadyaWords[1] || 0} words`
      : `${range?.padyaLines[0] || 0}-${range?.padyaLines[1] || 0} lines`;
    const actualStr = pr.kind === 'gadya' ? `${pr.wordCount} words` : `${pr.lineCount} lines`;
    const statusStr = pr.isValid ? '✅ PASS' : '❌ FAIL';

    console.log(
      `Class ${pr.class}`.padEnd(8) +
      pr.id.padEnd(18) +
      pr.kind.padEnd(10) +
      actualStr.padEnd(18) +
      targetRangeStr.padEnd(24) +
      `${pr.linkedQuestionCount} / 5 Qs`.padEnd(14) +
      statusStr
    );

    if (pr.issues.length > 0) {
      for (const issue of pr.issues) {
        const icon = issue.severity === 'error' ? '   🛑 [PASSAGE ERROR]' : '   ⚠️ [PASSAGE WARN]';
        console.log(`${icon} (${pr.id}): ${issue.message}`);
      }
    }
  }

  for (const pfi of allPassageFileIssues) {
    for (const issue of pfi.issues) {
      const icon = issue.severity === 'error' ? '   🛑 [PASSAGE FILE ERROR]' : '   ⚠️ [PASSAGE FILE WARN]';
      console.log(`${icon} (Class ${pfi.className} Passages): ${issue.message}`);
    }
  }
}

if (crossClassIssues.length > 0) {
  console.log('\n🔄 CROSS-CLASS DUPLICATE ISSUES:');
  for (const cIssue of crossClassIssues) {
    const icon = cIssue.severity === 'error' ? '   🛑 [CROSS-CLASS ERROR]' : '   ⚠️ [CROSS-CLASS WARN]';
    console.log(`${icon}: ${cIssue.message}`);
  }
}

console.log('-'.repeat(125));
console.log(`TOTAL FILES: ${reports.length} | TOTAL QUESTIONS: ${totalQuestions} | ERRORS: ${totalErrors} | WARNINGS: ${totalWarnings}`);
console.log('='.repeat(80));

if (totalErrors > 0) {
  console.error('\n❌ VALIDATION FAILED! Please resolve the errors listed above.');
  process.exit(1);
} else {
  console.log('\n✨ ALL QUESTION BANK CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}
