# QuizForge Question Bank Rules

## Counts
Exactly 100 questions per class x subject file. IDs: c{class}-{subject}-{001..100}.

## Type distribution (per 100)
| Subject group | MCQ | T/F | Fill | Match | Numerical | Image | Short | Logic | Multi | Order |
|---|---|---|---|---|---|---|---|---|---|---|
| GK, Computer Science | 25 | 10 | 10 | 6 | 10 | 6 | 10 | 8 | 8 | 7 |
| Maths, Physics, Chemistry | 22 | 8 | 8 | 5 | 18 | 6 | 8 | 8 | 9 | 8 |
| Biology | 24 | 10 | 10 | 6 | 5 | 12 | 10 | 5 | 8 | 10 |
| Hindi, English | 28 | 10 | 14 | 8 | 3 | 6 | 12 | 6 | 8 | 5 |
Every type must appear at least 3 times in every file. Small deviations of +/-2 are fine if the content demands it.
Numerical meaning per subject: Maths/Physics/Chemistry = real calculations; Biology = ratios, crosses, magnification, counts; CS = number-system conversions, output counting, trace tables; GK = years, counts, quantities; Hindi/English = counting-based or word-puzzle items.

## Difficulty split per file (unless the class prompt overrides it)
about 35% easy, 45% medium, 20% hard.

## Quality
- Every question is unique, correct, self-contained, unambiguous, with one defensible answer.
- No templated repeats (same question with only numbers changed), no "Question 14" placeholders.
- Solve every numerical question step by step BEFORE writing the answer; put the working in "explanation".
- MCQ distractors must be plausible common student mistakes. "All/None of the above" in max 5% of MCQs.
- Multi-select: 5-6 options, 2-4 correct. Match: 4-6 pairs. Ordering: 4-7 items.
- Image questions: hand-drawn inline SVG that really shows what is asked (geometry figures, circuits, ray diagrams, cell/organ/flower/heart diagrams, molecule structures, flowcharts, logic gates, graphs, network topologies, flags/symbols for GK, notice/letter/poster layouts for English/Hindi). Labels A, B, C. Readable at 320px. No external image links.
- Hindi: proper Devanagari. Every Hindi file must contain Devanagari text in questions, options and answers.
- English: grammar, vocabulary, short reading passages, and literature questions tied to real chapter titles.
- Time-sensitive facts (current office-holders, latest records, recent awards): avoid, or set "volatile": true.
- Tag every question with its REAL chapter name from the latest NCERT/CBSE syllabus. If the chapter list in the class prompt differs from the current NCERT, follow current NCERT and tell me.
- Every question has: chapter, difficulty, explanation (1-3 lines), marks.

## Class ladder
Each class must be clearly harder and different from the one below it. No question may be reused or lightly reworded across class files.

## Process
- Write one subject at a time, in batches of 25 questions (4 batches per subject).
- After every batch, run the validator in partial mode: npm run validate-bank -- --allow-partial
- After the 100th question of a subject, run the full validator for that file.
- After all 8 subjects of a class, print the audit: counts, type split, difficulty split, and a list of questions you are less than fully sure about. Save that list as AUDIT_class-{N}.md.
