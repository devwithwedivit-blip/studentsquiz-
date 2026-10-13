# QuizForge — CBSE & NCERT Practice Notebook & Quiz Platform

> **A student-first, tactile stationery-themed interactive quiz platform and curriculum question bank for CBSE and NCERT Classes 9, 10, 11, and 12.**  
> Built with **React 19**, **TypeScript**, **Vite**, **IndexedDB (`idb`)**, and **Offline-First PWA (Service Worker)**.

---

## Table of Contents
1. [Overview & Design Philosophy](#1-overview--design-philosophy)
2. [Quickstart & Hosting](#2-quickstart--hosting)
3. [Architecture & Project Structure](#3-architecture--project-structure)
4. [Question Schema & The 10 Interactive Types](#4-question-schema--the-10-interactive-types)
5. [Seed Bank Rules & Overlay Protection](#5-seed-bank-rules--overlay-protection)
6. [Teacher & Admin Bank Manager Workflows](#6-teacher--admin-bank-manager-workflows)
7. [Known Boundaries, Volatiles & Teacher Review](#7-known-boundaries-volatiles--teacher-review)

---

## 1. Overview & Design Philosophy

QuizForge is designed from the ground up for Indian middle and high school students preparing for CBSE board examinations, NCERT assessments, Olympiads, and competitive foundations (NEET/JEE).

### Key Features
- **Tactile Notebook Aesthetic**: Editorial serif typography (*Fraunces*), ruled paper backgrounds, margin guide lines, highlighter marks, rubber stamps, real pencil lead progress bars, and an in-quiz scratchpad for rough work calculations.
- **Complete Curriculum Bank**: Exactly **3,200 curated questions** across **4 classes** (9, 10, 11, 12) and **8 subjects** (Maths, Physics, Chemistry, Biology, Computer Science, English, Hindi, and General Knowledge). Exactly 100 questions per subject file.
- **10 Interactive Question Types**: Standard MCQs, True/False, Fill in the Blanks, Match the Columns, Numerical Calculations (with tolerances & units), SVG Diagram & Image analysis, Short Answer conceptual matching, Assertion-Reason Logic, Multi-Select (with partial credits), and Chronological/Step Ordering.
- **Dual Quiz Modes**:
  - **Practice Mode**: Immediate feedback, hints (-0.5 mark penalty), scratchpad rough canvas, student self-grading override, and explanations.
  - **Exam Mode**: Strict countdown timer (per-question or whole-quiz), negative marking (-0.25 on wrong answers), question sheet palette navigator with jump and bookmark flags, and results breakdown.
- **Worksheet & Paper Generator**: Instant generation of CBSE-formatted printable question papers with optional Teacher's Answer Keys.
- **100% Client-Side & Offline-First**: Zero backend requirement. Works completely offline with a Cache-First Service Worker, Web App Manifest, and IndexedDB local persistence.

---

## 2. Quickstart & Hosting

### Prerequisites
- Node.js 18.0 or higher
- npm 9.0 or higher

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Start Vite local development server
npm run dev

# App will be accessible at http://localhost:5173 (or assigned port)
```

### Building for Production
```bash
# Type check and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```
The build produces code-split lazy chunks per subject (~50–140 kB each) with a main client bundle of ~404 kB (113 kB gzipped).

### Validation & Verification Scripts
QuizForge includes an automated QA suite:

```bash
# 1. Validate complete bank (32 files, 3,200 questions, type & difficulty splits)
npm run validate-bank

# 2. Check for near-duplicates across classes (Levenshtein + trigram matching)
node scripts/check-cross-duplicates.cjs

# 3. Recompute numerical questions from first principles (216 MPC questions)
node scripts/verify-numerical-mpc.cjs

# 4. Verify SVG diagrams & image questions (viewBox, scaling, label legibility)
node scripts/verify-svg-images.cjs

# 5. Verify Hindi Devanagari text integrity (zero mojibake, authentic Unicode)
node scripts/verify-hindi-devanagari.cjs

# 6. Run comprehensive feature & scoring engine tests (42 automated checks)
node scripts/test-quiz-features.cjs
```

### Static Hosting
QuizForge runs 100% in the user's browser. Deploy the `dist/` directory directly to any static web host:
- **Vercel**: Deploy root directory; output directory `dist`.
- **Netlify**: Build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: Build and push `dist` to `gh-pages` branch.
- **Firebase Hosting**: Run `firebase deploy --only hosting`.

---

## 3. Architecture & Project Structure

```
kids-examtesting-platform/
├── index.html                   # Entry HTML with PWA tags & Google Fonts
├── public/
│   ├── manifest.webmanifest     # PWA Web App Manifest
│   ├── sw.js                    # Offline Cache-First Service Worker
│   └── favicon.svg              # Scalable SVG pencil icon
├── src/
│   ├── main.tsx                 # React DOM mount point & theme init
│   ├── App.tsx                  # Root controller, routing, session recovery
│   ├── types/
│   │   └── quiz.ts              # Core TypeScript interfaces & schemas
│   ├── data/
│   │   ├── bankLoader.ts        # Lazy dynamic imports & filtering utilities
│   │   ├── subjects.ts          # Subject metadata & curriculum chapter lists
│   │   ├── class-9/             # 8 subjects × 100 questions = 800 questions
│   │   ├── class-10/            # 8 subjects × 100 questions = 800 questions
│   │   ├── class-11/            # 8 subjects × 100 questions = 800 questions
│   │   └── class-12/            # 8 subjects × 100 questions = 800 questions
│   ├── services/
│   │   ├── evaluator.ts         # Answer grading engine for all 10 types
│   │   ├── db.ts                # IndexedDB repository & localStorage session
│   │   └── audio.ts             # Web Audio API procedural sound synthesizer
│   ├── components/
│   │   ├── builder/             # Quiz generator UI & custom filters
│   │   ├── player/              # Player header, timer, card, palette, scratchpad
│   │   │   └── types/           # Specialized UI views for each question type
│   │   ├── results/             # Score card, mistakes notebook, CBSE printable view
│   │   ├── manager/             # Teacher bank manager, pagination, import/export
│   │   └── common/              # Notebook headers, tactile icons, scratchpad modal
│   └── styles/
│       └── index.css            # Tactile stationery design system & tokens
├── scripts/                     # QA, validation & verification scripts
├── REVIEW_FOR_TEACHER.md        # Annual review list for teachers & coordinators
└── QUESTION_BANK_RULES.md       # Strict blueprint & authoring rules
```

---

## 4. Question Schema & The 10 Interactive Types

Every question conforms to the TypeScript `Question` interface defined in [`src/types/quiz.ts`](file:///d:/kids%20examtesting%20platform/src/types/quiz.ts):

```typescript
export interface Question {
  id: string;                       // e.g., 'c10-phy-001'
  class: 9 | 10 | 11 | 12;
  subject: SubjectId;
  chapter: string;
  type: QuestionType;               // 'mcq' | 'truefalse' | 'fillblank' | 'match' | ...
  question: string;
  answer: any;                      // Index, string, boolean, array, or number
  options?: string[];               // For MCQ, Logic, Multiselect, Image
  pairs?: [string, string][];       // For Match questions
  orderedItems?: string[];          // For Ordering questions
  tolerance?: number;               // For Numerical questions (default ±0.02)
  unit?: string;                    // For Numerical questions
  acceptedAnswers?: string[];       // Synonyms for FillBlank / Short Answer
  keywords?: string[];              // Key concepts for Short Answer
  imageSvg?: string;                // Scalable inline SVG diagram
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  explanation: string;
  hint?: string;
  volatile?: boolean;               // Tagged true if time-sensitive fact
  isUserAdded?: boolean;            // Custom teacher overlay flag
  isUserEdited?: boolean;
  isUserDeleted?: boolean;
  isHidden?: boolean;
}
```

### Concrete Examples for Each Question Type

#### 1. Multiple Choice (`mcq`)
```json
{
  "id": "c10-maths-001",
  "class": 10,
  "subject": "maths",
  "chapter": "Real Numbers",
  "type": "mcq",
  "question": "If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then HCF(a, b) is:",
  "options": ["xy", "xy²", "x³y³", "x²y²"],
  "answer": 1,
  "difficulty": "easy",
  "marks": 1,
  "explanation": "HCF is the product of the smallest power of each common prime factor. Smallest power of x is x¹, and of y is y². Thus HCF = xy².",
  "hint": "Look for the lowest exponents of common prime factors."
}
```

#### 2. True / False (`truefalse`)
```json
{
  "id": "c9-cs-012",
  "class": 9,
  "subject": "cs",
  "chapter": "Computer System",
  "type": "truefalse",
  "question": "ROM is a volatile memory that loses its contents when power is turned off.",
  "answer": false,
  "difficulty": "easy",
  "marks": 1,
  "explanation": "ROM is non-volatile; RAM is the primary volatile memory.",
  "hint": "Think about where the BIOS firmware is stored."
}
```

#### 3. Fill in the Blanks (`fillblank`)
```json
{
  "id": "c10-biology-015",
  "class": 10,
  "subject": "biology",
  "chapter": "Life Processes",
  "type": "fillblank",
  "question": "The green pigment present in chloroplasts responsible for trapping light energy is ________.",
  "answer": "chlorophyll",
  "acceptedAnswers": ["Chlorophyll", "chlorophyl"],
  "difficulty": "easy",
  "marks": 1,
  "explanation": "Chlorophyll absorbs red and blue wavelengths of light to drive photosynthesis.",
  "hint": "Starts with 'Chloro-'"
}
```

#### 4. Match the Columns (`match`)
```json
{
  "id": "c11-physics-035",
  "class": 11,
  "subject": "physics",
  "chapter": "Units and Measurements",
  "type": "match",
  "question": "Match the physical quantities in Column A with their SI units in Column B:",
  "pairs": [
    ["Force", "Newton (N)"],
    ["Work", "Joule (J)"],
    ["Power", "Watt (W)"],
    ["Pressure", "Pascal (Pa)"]
  ],
  "difficulty": "medium",
  "marks": 2,
  "explanation": "Force is in Newtons, Work in Joules, Power in Watts, and Pressure in Pascals.",
  "hint": "Recall definitions: Power = Work / Time."
}
```

#### 5. Numerical Calculation (`numerical`)
```json
{
  "id": "c10-physics-042",
  "class": 10,
  "subject": "physics",
  "chapter": "Light - Reflection and Refraction",
  "type": "numerical",
  "question": "A convex lens has a focal length of 20 cm. Calculate the power of this lens in Dioptres (D):",
  "answer": 5,
  "tolerance": 0.05,
  "unit": "D",
  "difficulty": "medium",
  "marks": 1,
  "explanation": "Power P = 1 / f(in metres). Here f = +0.20 m. Hence P = 1 / 0.20 = +5 D.",
  "hint": "Convert focal length from centimeters to meters first."
}
```

#### 6. Image / Diagram Based (`image`)
```json
{
  "id": "c10-biology-051",
  "class": 10,
  "subject": "biology",
  "chapter": "Life Processes",
  "type": "image",
  "question": "Identify the guard cell state illustrated in the diagram below:",
  "imageSvg": "<svg viewBox='0 0 320 180' xmlns='http://www.w3.org/2000/svg'><rect width='320' height='180' fill='#f8fafc'/><path d='M130,90 Q140,50 160,50 Q180,50 190,90 Q180,130 160,130 Q140,130 130,90 Z' fill='#86efac' stroke='#15803d' stroke-width='3'/><circle cx='160' cy='90' r='12' fill='#ffffff' stroke='#15803d' stroke-width='2'/><text x='160' y='160' font-size='14' text-anchor='middle' font-family='sans-serif' fill='#1e293b'>Open Stomatal Pore</text></svg>",
  "options": ["Open Stomatal Pore", "Closed Stomatal Pore", "Plasmolyzed Cell", "Turgid Epidermal Cell"],
  "answer": 0,
  "difficulty": "medium",
  "marks": 1,
  "explanation": "When water flows into guard cells, they swell and curve outward, creating an open pore for gas exchange.",
  "hint": "Notice the central aperture between the swollen kidney-shaped cells."
}
```

#### 7. Short Answer (`short`)
```json
{
  "id": "c9-chemistry-062",
  "class": 9,
  "subject": "chemistry",
  "chapter": "Matter in Our Surroundings",
  "type": "short",
  "question": "Why does a desert cooler cool better on a hot dry day?",
  "answer": "On a hot dry day, humidity is low and temperature is high, which increases the rate of evaporation of water.",
  "keywords": ["evaporation", "humidity", "temperature"],
  "acceptedAnswers": [
    "Higher evaporation rate due to low humidity and high temperature",
    "Low humidity and high temperature increase rate of evaporation"
  ],
  "difficulty": "medium",
  "marks": 2,
  "explanation": "Evaporation causes cooling. Low relative humidity and high ambient temperature accelerate evaporation from the cooling pads.",
  "hint": "Relate humidity and ambient temperature to the rate of evaporation."
}
```

#### 8. Assertion & Reason / Logic (`logic`)
```json
{
  "id": "c10-chemistry-072",
  "class": 10,
  "subject": "chemistry",
  "chapter": "Chemical Reactions and Equations",
  "type": "logic",
  "question": "Assertion (A): Calcium oxide reacts vigorously with water to produce slaked lime.\nReason (R): This reaction is an example of an endothermic reaction.",
  "options": [
    "Both (A) and (R) are true and (R) is the correct explanation of (A)",
    "Both (A) and (R) are true but (R) is not the correct explanation of (A)",
    "(A) is true but (R) is false",
    "(A) is false but (R) is true"
  ],
  "answer": 2,
  "difficulty": "medium",
  "marks": 1,
  "explanation": "Assertion is true (CaO + H₂O → Ca(OH)₂). Reason is false because this reaction releases substantial heat and is strongly exothermic.",
  "hint": "Touch the beaker in a slaked lime reaction — does it get hot or cold?"
}
```

#### 9. Multi-Select (`multiselect`)
```json
{
  "id": "c11-chemistry-081",
  "class": 11,
  "subject": "chemistry",
  "chapter": "States of Matter",
  "type": "multiselect",
  "question": "Which of the following gases diffuse faster than Oxygen gas (O₂, M = 32 g/mol) under identical conditions? (Select all that apply)",
  "options": ["Methane (CH₄, M = 16)", "Carbon Dioxide (CO₂, M = 44)", "Ammonia (NH₃, M = 17)", "Sulfur Dioxide (SO₂, M = 64)"],
  "answer": [0, 2],
  "difficulty": "hard",
  "marks": 2,
  "explanation": "According to Graham's Law, rate of diffusion is inversely proportional to square root of molar mass. Gases with molar mass < 32 g/mol (CH₄ = 16, NH₃ = 17) diffuse faster than O₂.",
  "hint": "Find which gases have a lower molecular weight than 32 g/mol."
}
```

#### 10. Chronological / Step Ordering (`ordering`)
```json
{
  "id": "c10-biology-090",
  "class": 10,
  "subject": "biology",
  "chapter": "Life Processes",
  "type": "ordering",
  "question": "Arrange the sequence of organs in the human alimentary canal through which food travels:",
  "orderedItems": ["Mouth (Oral Cavity)", "Oesophagus (Food Pipe)", "Stomach", "Small Intestine", "Large Intestine"],
  "difficulty": "easy",
  "marks": 2,
  "explanation": "Food is ingested via mouth, propelled through oesophagus by peristalsis, churned in stomach, digested and absorbed in small intestine, and water absorbed in large intestine.",
  "hint": "Follow the path of food from ingestion to egestion."
}
```

---

## 5. Seed Bank Rules & Overlay Protection

### Strict 100 Questions Per File Rule
1. The curriculum seed bank is organized strictly into 32 JSON files located under `src/data/class-{class}/{subject}.json`.
2. Every single file must contain **exactly 100 questions** (total: 3,200 questions across 4 classes × 8 subjects).
3. The automated validator (`npm run validate-bank`) enforces this count and the pedagogical difficulty/type split.

### Non-Destructive IndexedDB Overlay Architecture
At runtime, QuizForge treats all seed JSON files as **immutable, read-only assets**.
- When a teacher edits, duplicates, or soft-deletes a question, the mutation is written exclusively to the `questionOverlay` object store in IndexedDB.
- Deleting a question tags it with `isUserDeleted: true` in the local browser database.
- Adding a custom question stores it with `isUserAdded: true`.
- Clicking **"Reset to Original Bank"** in the Manager deletes all user overlays and immediately restores the original 3,200 seed questions without needing any network download or file reinstallation.

---

## 6. Teacher & Admin Bank Manager Workflows

The **Question Bank Manager** provides an administrative dashboard for educators:

- **Curriculum Matrix Progress**: Visual status board showing active question counts across all 32 class × subject combinations.
- **Search & Multi-Dimensional Filtering**: Filter in real time by Class (9–12), Subject, Chapter, Question Type (10 types), Difficulty (Easy/Medium/Hard), or full-text question stem search.
- **Buttery 60 FPS Pagination**: Automatically divides large question sets into 50-item pages to prevent DOM bloat and ensure fast, smooth scrolling on tablets and phones.
- **Inline Operations**:
  - **Edit**: Modal editor with live schema validation.
  - **Duplicate / Copy**: Clone existing questions as templates for custom variations.
  - **Hide from Quizzes**: Soft-toggle questions without deleting them (`isHidden: true`).
  - **Soft Delete with 6-Second Undo**: Immediate deletion accompanied by a floating undo toast for accidental clicks.
  - **Bulk Selection & Delete**: Checkboxes to select multiple questions across the current filter slice.
- **Export & Import**:
  - **JSON Export**: Full fidelity schema dump for backups and offline editing.
  - **CSV Export**: Spreadsheet-compatible format for curriculum review in Microsoft Excel or Google Sheets.
  - **Safe Import**: Validates uploaded JSON arrays against mandatory schema fields (`id`, `class`, `subject`, `question`, `type`, `answer`) and gracefully reports errors on corrupt or malformed files.

---

## 7. Known Boundaries, Volatiles & Teacher Review

### Time-Sensitive Facts (`volatile: true`)
Certain questions involve administrative figures, geopolitical treaties, or board blueprint marks that may change over time (e.g., number of sovereign Indian states, UN member count, RBI inflation target tolerance bands).
- Exactly 8 questions are tagged `"volatile": true` across the bank.
- A dedicated annual review document is maintained at [`REVIEW_FOR_TEACHER.md`](file:///d:/kids%20examtesting%20platform/REVIEW_FOR_TEACHER.md).
- Teachers should review these 8 questions at the start of each academic school year.

### Client-Side Storage & Quota Management
- QuizForge stores user history, quiz attempts, and custom question overlays in IndexedDB (`quizforge_database`).
- If browser storage limits are approached, a non-intrusive banner (`quizforge:storage-warning`) alerts the user to clear old past attempts without losing active session progress.

### Active Quiz Session Recovery
- If a student accidentally refreshes or closes their browser tab during a test, QuizForge auto-saves their in-progress state (`saveActiveQuizSession`) to `localStorage`.
- Upon re-opening the notebook, a prominent card appears: *"Unfinished Quiz Session Detected — Class X Subject (N questions remaining). [Resume Quiz] [Dismiss]"*.

---

## License & Credits
Developed for CBSE & NCERT learners and educators across India.  
Open-source, student-friendly, and 100% offline-ready.
