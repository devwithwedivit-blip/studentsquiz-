import { SubjectId } from '../types/quiz';

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  hindiName: string;
  themeColor: string;
  lightBg: string;
  darkBg: string;
  borderColor: string;
  chaptersByClass: Record<9 | 10 | 11 | 12, string[]>;
  description: string;
}

export const SUBJECTS: Record<SubjectId, SubjectMeta> = {
  maths: {
    id: 'maths',
    name: 'Mathematics',
    hindiName: 'गणित',
    themeColor: '#0284c7', // Blueprint Blue
    lightBg: '#f0f9ff',
    darkBg: '#082f49',
    borderColor: '#7dd3fc',
    chaptersByClass: {
      9: [
        'Number Systems',
        'Polynomials',
        'Coordinate Geometry',
        'Linear Equations in Two Variables',
        'Lines and Angles',
        'Triangles',
        'Quadrilaterals',
        'Circles',
        "Heron's Formula",
        'Surface Areas and Volumes',
        'Statistics'
      ],
      10: [
        'Real Numbers',
        'Polynomials',
        'Pair of Linear Equations in Two Variables',
        'Quadratic Equations',
        'Arithmetic Progressions',
        'Triangles',
        'Coordinate Geometry',
        'Introduction to Trigonometry',
        'Some Applications of Trigonometry',
        'Circles',
        'Areas Related to Circles',
        'Surface Areas and Volumes',
        'Statistics',
        'Probability'
      ],
      11: [
        'Sets',
        'Relations and Functions',
        'Trigonometric Functions',
        'Complex Numbers and Quadratic Equations',
        'Linear Inequalities',
        'Permutations and Combinations',
        'Binomial Theorem',
        'Sequences and Series',
        'Straight Lines',
        'Conic Sections',
        'Introduction to 3D Geometry',
        'Limits and Derivatives',
        'Statistics',
        'Probability'
      ],
      12: [
        'Relations and Functions',
        'Inverse Trigonometric Functions',
        'Matrices',
        'Determinants',
        'Continuity and Differentiability',
        'Application of Derivatives',
        'Integrals',
        'Application of Integrals',
        'Differential Equations',
        'Vector Algebra',
        'Three Dimensional Geometry',
        'Linear Programming',
        'Probability'
      ]
    },
    description: 'NCERT Geometry, Algebra, Calculus & Arithmetic'
  },
  physics: {
    id: 'physics',
    name: 'Physics',
    hindiName: 'भौतिक विज्ञान',
    themeColor: '#7c3aed', // Quantum Violet
    lightBg: '#f5f3ff',
    darkBg: '#2e1065',
    borderColor: '#c4b5fd',
    chaptersByClass: {
      9: [
        'Motion',
        'Force and Laws of Motion',
        'Gravitation',
        'Work and Energy',
        'Sound'
      ],
      10: [
        'Light - Reflection and Refraction',
        'The Human Eye and the Colourful World',
        'Electricity',
        'Magnetic Effects of Electric Current'
      ],
      11: [
        'Units and Measurements',
        'Motion in a Straight Line',
        'Motion in a Plane',
        'Laws of Motion',
        'Work, Energy and Power',
        'System of Particles and Rotational Motion',
        'Gravitation',
        'Mechanical Properties of Solids',
        'Mechanical Properties of Fluids',
        'Thermal Properties of Matter',
        'Thermodynamics',
        'Kinetic Theory',
        'Oscillations',
        'Waves'
      ],
      12: [
        'Electric Charges and Fields',
        'Electrostatic Potential and Capacitance',
        'Current Electricity',
        'Moving Charges and Magnetism',
        'Magnetism and Matter',
        'Electromagnetic Induction',
        'Alternating Current',
        'Electromagnetic Waves',
        'Ray Optics and Optical Instruments',
        'Wave Optics',
        'Dual Nature of Radiation and Matter',
        'Atoms',
        'Nuclei',
        'Semiconductor Electronics'
      ]
    },
    description: 'Mechanics, Electromagnetism, Optics & Modern Physics'
  },
  chemistry: {
    id: 'chemistry',
    name: 'Chemistry',
    hindiName: 'रसायन विज्ञान',
    themeColor: '#0d9488', // Flask Teal
    lightBg: '#f0fdfa',
    darkBg: '#134e4a',
    borderColor: '#99f6e4',
    chaptersByClass: {
      9: [
        'Matter in Our Surroundings',
        'Is Matter Around Us Pure',
        'Atoms and Molecules',
        'Structure of the Atom'
      ],
      10: [
        'Chemical Reactions and Equations',
        'Acids, Bases and Salts',
        'Metals and Non-metals',
        'Carbon and its Compounds'
      ],
      11: [
        'Some Basic Concepts of Chemistry',
        'Structure of Atom',
        'Classification of Elements and Periodicity in Properties',
        'Chemical Bonding and Molecular Structure',
        'Thermodynamics',
        'Equilibrium',
        'Redox Reactions',
        'Organic Chemistry - Some Basic Principles and Techniques',
        'Hydrocarbons'
      ],
      12: [
        'Solutions',
        'Electrochemistry',
        'Chemical Kinetics',
        'The d- and f-Block Elements',
        'Coordination Compounds',
        'Haloalkanes and Haloarenes',
        'Alcohols, Phenols and Ethers',
        'Aldehydes, Ketones and Carboxylic Acids',
        'Amines',
        'Biomolecules'
      ]
    },
    description: 'Physical, Inorganic & Organic Chemistry'
  },
  biology: {
    id: 'biology',
    name: 'Biology',
    hindiName: 'जीव विज्ञान',
    themeColor: '#16a34a', // Botanical Green
    lightBg: '#f0fdf4',
    darkBg: '#14532d',
    borderColor: '#86efac',
    chaptersByClass: {
      9: [
        'The Fundamental Unit of Life',
        'Tissues',
        'Improvement in Food Resources'
      ],
      10: [
        'Life Processes',
        'Control and Coordination',
        'How do Organisms Reproduce',
        'Heredity',
        'Our Environment'
      ],
      11: [
        'The Living World',
        'Biological Classification',
        'Plant Kingdom',
        'Animal Kingdom',
        'Morphology of Flowering Plants',
        'Anatomy of Flowering Plants',
        'Structural Organisation in Animals',
        'Cell: The Unit of Life',
        'Biomolecules',
        'Cell Cycle and Cell Division',
        'Photosynthesis in Higher Plants',
        'Respiration in Plants',
        'Plant Growth and Development',
        'Breathing and Exchange of Gases',
        'Body Fluids and Circulation',
        'Excretory Products and their Elimination',
        'Locomotion and Movement',
        'Neural Control and Coordination',
        'Chemical Coordination and Integration'
      ],
      12: [
        'Sexual Reproduction in Flowering Plants',
        'Human Reproduction',
        'Reproductive Health',
        'Principles of Inheritance and Variation',
        'Molecular Basis of Inheritance',
        'Evolution',
        'Human Health and Disease',
        'Microbes in Human Welfare',
        'Biotechnology: Principles and Processes',
        'Biotechnology and its Applications',
        'Organisms and Populations',
        'Ecosystem',
        'Biodiversity and Conservation'
      ]
    },
    description: 'Cell biology, Genetics, Human Physiology & Ecology'
  },
  cs: {
    id: 'cs',
    name: 'Computer Science',
    hindiName: 'कंप्यूटर विज्ञान',
    themeColor: '#475569', // Terminal Slate
    lightBg: '#f8fafc',
    darkBg: '#1e293b',
    borderColor: '#cbd5e1',
    chaptersByClass: {
      9: [
        'Basics of Information Technology',
        'Cyber Safety and Ethics',
        'Word Processing and Spreadsheets',
        'Presentation Tools',
        'Introduction to Python'
      ],
      10: [
        'Networking Basics and Internet',
        'HTML and Web Basics',
        'Cyber Ethics',
        'Database Concepts',
        'Spreadsheet Analysis'
      ],
      11: [
        'Computer Systems and Organisation',
        'Computational Thinking and Getting Started with Python',
        'Python Control Flow and Loops',
        'Strings, Lists, Tuples, Dictionaries',
        'Cyber Safety and Digital Footprint'
      ],
      12: [
        'Python Functions and File Handling',
        'Data Structures: Stacks',
        'Computer Networks',
        'Database Management and SQL',
        'Interface Python with MySQL'
      ]
    },
    description: 'Python, SQL, Networking, Data Structures & IT'
  },
  english: {
    id: 'english',
    name: 'English',
    hindiName: 'अंग्रेज़ी',
    themeColor: '#b45309', // Quill Amber
    lightBg: '#fffbeb',
    darkBg: '#78350f',
    borderColor: '#fde68a',
    chaptersByClass: {
      9: [
        'Beehive Prose & Poetry',
        'Moments Supplementary',
        'Tenses and Modals',
        'Subject-Verb Concord and Determiners',
        'Reported Speech',
        'Reading Comprehension & Vocabulary'
      ],
      10: [
        'First Flight Prose & Poems',
        'Footprints Without Feet',
        'Grammar: Editing & Omission',
        'Reported Speech & Modals',
        'Analytical Paragraph & Formal Letters',
        'Reading Comprehension'
      ],
      11: [
        'Hornbill Prose & Poetry',
        'Snapshots Supplementary',
        'Grammar & Sentence Transformation',
        'Note Making and Summarising',
        'Notice, Poster, Speech Writing',
        'Reading Comprehension'
      ],
      12: [
        'Flamingo Prose & Poetry',
        'Vistas Supplementary',
        'Notice, Invitations & Replies',
        'Letter to Editor & Job Application',
        'Article & Report Writing',
        'Reading Comprehension'
      ]
    },
    description: 'Literature, Grammar, Vocabulary & Writing Skills'
  },
  hindi: {
    id: 'hindi',
    name: 'Hindi',
    hindiName: 'हिन्दी',
    themeColor: '#c2410c', // Sanskrit Ochre
    lightBg: '#fff7ed',
    darkBg: '#7c2d12',
    borderColor: '#fed7aa',
    chaptersByClass: {
      9: [
        'क्षितिज एवं कृतिका (गद्य व पद्य)',
        'स्पर्श एवं संचयन',
        'उपसर्ग, प्रत्यय एवं समास',
        'अर्थ की दृष्टि से वाक्य भेद',
        'अलंकार एवं मुहावरे',
        'अपठित गद्यांश एवं पत्र लेखन'
      ],
      10: [
        'क्षितिज एवं कृतिका',
        'स्पर्श एवं संचयन',
        'रचना के आधार पर वाक्य भेद',
        'वाच्य एवं पद परिचय',
        'रस एवं अलंकार',
        'मुहावरे एवं अपठित बोध'
      ],
      11: [
        'आरोह भाग-1 (काव्य व गद्य खंड)',
        'वितान भाग-1',
        'अंतरा एवं अंतराल',
        'जनसंचार माध्यम और पत्रकारिता',
        'व्याकरण एवं शब्द विचार',
        'अपठित बोध व रचनात्मक लेखन'
      ],
      12: [
        'आरोह भाग-2 (काव्य व गद्य खंड)',
        'वितान भाग-2',
        'अभिव्यक्ति और माध्यम',
        'व्याकरण एवं अलंकार/छंद',
        'अपठित गद्यांश व काव्यांश',
        'पत्र एवं आलेख लेखन'
      ]
    },
    description: 'साहित्य, व्याकरण, मुहावरे, रस, छंद व अलंकार'
  },
  gk: {
    id: 'gk',
    name: 'General Knowledge',
    hindiName: 'सामान्य ज्ञान',
    themeColor: '#059669', // Atlas Emerald
    lightBg: '#ecfdf5',
    darkBg: '#064e3b',
    borderColor: '#a7f3d0',
    chaptersByClass: {
      9: [
        'Indian Constitution & Polity',
        'Physical Geography of India',
        'Indian Freedom Struggle',
        'Basic Science & Space Exploration',
        'National Symbols & Heritage'
      ],
      10: [
        'Indian Democratic Institutions',
        'Indian Economy & Resources',
        'Modern World History',
        'Scientific Discoveries & Inventions',
        'Sports, Honors & Major Awards'
      ],
      11: [
        'Constitutional Framework & Rights',
        'Global Geopolitics & World Bodies (UN/WHO/WTO)',
        'Economic Indicators & Monetary Policy',
        'Environment, Biodiversity & Climate Treaties',
        'Science, Tech Innovations & Nuclear Energy'
      ],
      12: [
        'Judiciary, Federalism & Governance',
        'International Treaties & Agreements',
        'Macroeconomic Trends & Fiscal System',
        'Defence, Space Missions (ISRO) & AI Frontier',
        'Indian Art, Literature & Philosophy'
      ]
    },
    description: 'Constitution, Geography, Science, Economy & World Affairs'
  }
};

export const ALL_CLASSES: (9 | 10 | 11 | 12)[] = [9, 10, 11, 12];
export const ALL_SUBJECTS: SubjectId[] = [
  'maths',
  'physics',
  'chemistry',
  'biology',
  'cs',
  'english',
  'hindi',
  'gk'
];
