# QuizForge Question Bank Rules

## Counts
Exactly 100 questions per class x subject file. IDs: c{class}-{subject}-{001..100}.

## Type distribution (per 100)
| Subject group | MCQ | T/F | Fill | Match | Numerical | Image | Short | Logic | Multi | Order |
|---|---|---|---|---|---|---|---|---|---|---|
| GK, Computer Science | 25 | 10 | 10 | 6 | 10 | 6 | 10 | 8 | 8 | 7 |
| Maths, Physics, Chemistry | 22 | 8 | 8 | 5 | 18 | 6 | 8 | 8 | 9 | 8 |
| Biology | 24 | 10 | 10 | 6 | 5 | 12 | 10 | 5 | 8 | 10 |
| English | 28 | 10 | 14 | 8 | 3 | 6 | 12 | 6 | 8 | 5 |
| Hindi (Phase 7: Pure Grammar + Passages) | 33 | 8 | 13 | 7 | 3 | 4 | 12 | 5 | 9 | 6 |

Every type must appear at least 3 times in every file. Small deviations of +/-2 are fine if the content demands it.
Numerical meaning per subject: Maths/Physics/Chemistry = real calculations; Biology = ratios, crosses, magnification, counts; CS = number-system conversions, output counting, trace tables; GK = years, counts, quantities; English = counting-based or word-puzzle items; Hindi = counting questions with one unambiguous answer (e.g. number of sangya in a given sentence, matras in a chhand line).

### Phase 7 Hindi Breakdown (70 Vyakaran + 30 Passage = 100 per file)
| Part | MCQ | T/F | Fill | Match | Num | Image | Short | Logic | Multi | Order | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Vyakaran (Grammar) | 23 | 4 | 10 | 7 | 3 | 4 | 4 | 5 | 6 | 4 | 70 |
| Unseen Passage (6 passages x 5 Qs) | 10 | 4 | 3 | 0 | 0 | 0 | 8 | 0 | 3 | 2 | 30 |
| **Hindi File Total** | **33** | **8** | **13** | **7** | **3** | **4** | **12** | **5** | **9** | **6** | **100** |

Meaning of types in Hindi grammar:
- **Numerical** = counting questions with one unambiguous answer (e.g. count of nouns/pronouns/adjectives in a sentence, matras in a chhand line).
- **Image** = inline SVG grammar charts: varnamala/uchcharan-sthan chart, sandhi/samas split diagrams, ras and sthayi-bhav wheel, vakya-bhed flowchart, format of patra/suchna/vigyapan with labelled parts. Use Noto Sans Devanagari inside the SVG.
- **Logic** = shabd-sadrishya (analogies), odd one out, word chains, coded words, vilom/paryay patterns.
- **Ordering** = arrange words into a correct grammatical sentence, parts of a formal letter, steps of word formation, alphabetical (shabdkosh) order.
- **Match** = word to samas/sandhi/alankar/ras, muhavara to meaning, uchcharan-sthan to varna, etc.

## Difficulty split per file (unless the class prompt overrides it)
- General: about 35% easy, 45% medium, 20% hard.
- **Hindi (Phase 7)**:
  - Class 9 = 40% easy / 45% medium / 15% hard.
  - Class 10 = 35% easy / 45% medium / 20% hard.
  - Classes 11 and 12 = 30% easy / 45% medium / 25% hard.

## Strict Hindi Quality Rules (Phase 7)
1. **Devanagari Integrity**: All questions, options, answers, and explanations are in correct Devanagari (standard Khari Boli). Proofread every question for spelling, matra, anusvar/chandrabindu, and nukta errors. A spelling mistake inside a grammar question is a serious fault.
2. **Zero Ambiguity**: One defensible answer only. Hindi grammar has known ambiguities, so AVOID words that textbooks classify in more than one way (for example पीतांबर, चतुर्भुज and similar multi-samas compounds) unless sentence context fixes the meaning. Use the standard school-textbook classification, and avoid items where books disagree.
3. **Tolerance**: Fill and short answers must treat anusvar/panchamakshar forms (संधि/सन्धि), chandrabindu/anusvar (हँसना/हंसना, where valid) and nukta forms as equivalent. Add these in `acceptedAnswers`, and make sure answer normalisation handles Unicode NFC/NFD.
4. **Original Passages**: Passages must be completely ORIGINAL. Do not copy or paraphrase any NCERT text, textbook, news article, or website. Do not use real people's quotes, current affairs, or politically/religiously sensitive themes. Themes: environment, water, technology and youth, discipline, books, sports, health, honesty, village and city, science, teamwork, digital habits. For Classes 11 and 12, also use abstract themes (consumerism, language and identity, role of art, ethics of progress).
5. **Passage Questions Structure**: Passage questions must be answerable from the passage alone. Across the 5 questions of each passage, mix: direct fact, inference, vocabulary in context (synonym/antonym of a word in passage), suitable title or central idea, author's tone/message, and at least one grammar-from-passage item (e.g. identify samas, sandhi, pratyay, vachya, or ras of a word/phrase). Each passage must have at least 3 different question types.
6. **Passage Length Constraints**:
   - Gadyansh (prose): Class 9 = 120-170 words; Class 10 = 160-220 words; Class 11 = 200-280 words; Class 12 = 250-320 words.
   - Padyansh (poems): Class 9 = 8-10 lines; Class 10 = 8-12 lines; Class 11 = 10-14 lines; Class 12 = 12-16 lines. Original figurative poetry that grows with the class.
7. **No Textbook Literature**: NO questions about lessons or poems from Kshitij, Kritika, Sparsh, Sanchayan, Aroh, Vitan, Antra, Antral, and none that name any textbook lesson, poem, or author.
8. **Class Ladder**: Each class must be clearly harder than the one below it, and no question or passage may be reused or lightly reworded across classes.
9. **Metadata**: Every question has chapter (Devanagari string from the allowed list), difficulty, explanation (1-3 lines in Hindi), marks.

## Quality
- Every question is unique, correct, self-contained, unambiguous, with one defensible answer.
- No templated repeats (same question with only numbers changed), no "Question 14" placeholders.
- Solve every numerical question step by step BEFORE writing the answer; put the working in "explanation".
- MCQ distractors must be plausible common student mistakes. "All/None of the above" in max 5% of MCQs.
- Multi-select: 5-6 options, 2-4 correct. Match: 4-6 pairs. Ordering: 4-7 items.
- Image questions: hand-drawn inline SVG that really shows what is asked (geometry figures, circuits, ray diagrams, cell/organ/flower/heart diagrams, molecule structures, flowcharts, logic gates, graphs, network topologies, flags/symbols for GK, notice/letter/poster layouts for English/Hindi). Labels A, B, C. Readable at 320px. No external image links.
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
