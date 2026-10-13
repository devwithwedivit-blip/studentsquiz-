import fs from 'fs';
import path from 'path';

interface ImageAttachment {
  kind: 'svg' | 'data-url';
  src: string;
  alt?: string;
  caption?: string;
}

interface RawPassage {
  id: string;
  class: number;
  subject: string;
  kind: 'gadya' | 'padya';
  title: string;
  content?: string;
  text?: string;
  wordCount?: number;
  theme?: string;
}

interface RawQuestion {
  id: string;
  class: number;
  subject: string;
  chapter: string;
  type: string;
  difficulty: string;
  question: string;
  options?: string[];
  answer: any;
  acceptedAnswers?: string[];
  keywords?: string[];
  pairs?: [string, string][];
  orderedItems?: string[];
  image?: ImageAttachment;
  tolerance?: number;
  unit?: string;
  hint?: string;
  marks?: number;
  explanation: string;
  passageId?: string;
  passageOrder?: number;
}

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeSqlString(str: string | undefined | null): string {
  if (str === undefined || str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function escapeJson(obj: any): string {
  if (obj === undefined || obj === null) return 'NULL';
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

async function runImport() {
  console.log('📦 Starting Phase 8 Question Bank & Passages Extraction...');

  const dataDir = path.resolve(process.cwd(), 'src/data');
  const classes = [9, 10, 11, 12];
  const allPassages: RawPassage[] = [];
  const allQuestions: RawQuestion[] = [];

  for (const c of classes) {
    const classDir = path.join(dataDir, `class-${c}`);
    if (!fs.existsSync(classDir)) continue;

    const files = fs.readdirSync(classDir);
    for (const file of files) {
      if (file.endsWith('.passages.json')) {
        const filePath = path.join(classDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          allPassages.push(...data);
        }
      } else if (file.endsWith('.json')) {
        const filePath = path.join(classDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          allQuestions.push(...data);
        }
      }
    }
  }

  console.log(`Loaded ${allPassages.length} passages and ${allQuestions.length} questions.`);

  const sqlStatements: string[] = [];
  sqlStatements.push('-- Auto-generated Phase 8 Question Bank Seed');
  sqlStatements.push('BEGIN;');

  // 1. Passages
  console.log('Generating Passages SQL...');
  for (const p of allPassages) {
    const content = p.content || p.text || '';
    const wordCount = p.wordCount || content.trim().split(/\s+/).filter(Boolean).length;
    sqlStatements.push(`
INSERT INTO public.passages (id, class, subject, kind, title, content, word_count, theme)
VALUES (
  ${escapeSqlString(p.id)},
  ${p.class},
  ${escapeSqlString(p.subject)},
  ${escapeSqlString(p.kind)},
  ${escapeSqlString(p.title)},
  ${escapeSqlString(content)},
  ${wordCount},
  ${escapeSqlString(p.theme || null)}
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  word_count = EXCLUDED.word_count;`);
  }

  // 2. Questions Public & Answers
  console.log('Generating Questions (Public & Answers) SQL...');
  let count = 0;
  for (const q of allQuestions) {
    let pairsLeft: string[] | null = null;
    let pairsRightShuffled: string[] | null = null;
    let itemsShuffled: string[] | null = null;

    if (q.type === 'match' && Array.isArray(q.pairs)) {
      pairsLeft = q.pairs.map(p => Array.isArray(p) ? p[0] : (p as any).left);
      const rightItems = q.pairs.map(p => Array.isArray(p) ? p[1] : (p as any).right);
      pairsRightShuffled = shuffleArray(rightItems);
    }

    if (q.type === 'ordering' && Array.isArray(q.orderedItems)) {
      itemsShuffled = shuffleArray(q.orderedItems);
    }

    // Insert into questions_public
    sqlStatements.push(`
INSERT INTO public.questions_public (
  id, class, subject, chapter, type, difficulty, question, options, image, unit, hint, marks,
  pairs_left, pairs_right_shuffled, items_shuffled, passage_id, passage_order
) VALUES (
  ${escapeSqlString(q.id)},
  ${q.class},
  ${escapeSqlString(q.subject)},
  ${escapeSqlString(q.chapter)},
  ${escapeSqlString(q.type)},
  ${escapeSqlString(q.difficulty)},
  ${escapeSqlString(q.question)},
  ${escapeJson(q.options)},
  ${escapeJson(q.image)},
  ${escapeSqlString(q.unit || null)},
  ${escapeSqlString(q.hint || null)},
  ${q.marks || 1},
  ${escapeJson(pairsLeft)},
  ${escapeJson(pairsRightShuffled)},
  ${escapeJson(itemsShuffled)},
  ${escapeSqlString(q.passageId || null)},
  ${q.passageOrder || 'NULL'}
) ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  image = EXCLUDED.image,
  marks = EXCLUDED.marks,
  pairs_left = EXCLUDED.pairs_left,
  pairs_right_shuffled = EXCLUDED.pairs_right_shuffled,
  items_shuffled = EXCLUDED.items_shuffled;`);

    // Insert into question_answers
    sqlStatements.push(`
INSERT INTO public.question_answers (
  question_id, answer, accepted_answers, keywords, tolerance, pairs, ordered_items, explanation
) VALUES (
  ${escapeSqlString(q.id)},
  ${escapeJson(q.answer)},
  ${escapeJson(q.acceptedAnswers)},
  ${escapeJson(q.keywords)},
  ${q.tolerance !== undefined ? q.tolerance : 'NULL'},
  ${escapeJson(q.pairs)},
  ${escapeJson(q.orderedItems)},
  ${escapeSqlString(q.explanation)}
) ON CONFLICT (question_id) DO UPDATE SET
  answer = EXCLUDED.answer,
  accepted_answers = EXCLUDED.accepted_answers,
  keywords = EXCLUDED.keywords,
  tolerance = EXCLUDED.tolerance,
  pairs = EXCLUDED.pairs,
  ordered_items = EXCLUDED.ordered_items,
  explanation = EXCLUDED.explanation;`);

    count++;
  }

  sqlStatements.push('COMMIT;');

  const outputSqlPath = path.resolve(process.cwd(), 'supabase/seed_bank.sql');
  fs.writeFileSync(outputSqlPath, sqlStatements.join('\n'), 'utf-8');
  console.log(`✅ Successfully generated ${outputSqlPath} with ${count} questions and ${allPassages.length} passages!`);
}

runImport().catch(err => {
  console.error('Failed to import question bank:', err);
  process.exit(1);
});
