import fs from 'fs';
import path from 'path';

// Standard 4-digit PIN '1234' bcrypt hash with cost 10:
// $2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe
const PIN_1234_HASH = '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe';

const sampleStudents = [
  // Class 9
  { name: 'आरव शर्मा (Aarav Sharma)', class: 9, pin: '1234' },
  { name: 'अनन्या वर्मा (Ananya Verma)', class: 9, pin: '1234' },
  { name: 'रोहन गुप्ता (Rohan Gupta)', class: 9, pin: '1234' },
  { name: 'प्रिया सिंह (Priya Singh)', class: 9, pin: '1234' },
  // Class 10
  { name: 'आदित्य कुमार (Aditya Kumar)', class: 10, pin: '1234' },
  { name: 'दीया पटेल (Diya Patel)', class: 10, pin: '1234' },
  { name: 'कृष अग्रवाल (Krish Agarwal)', class: 10, pin: '1234' },
  { name: 'समीरा खान (Sameera Khan)', class: 10, pin: '1234' },
  // Class 11
  { name: 'विवेक जोशी (Vivek Joshi)', class: 11, pin: '1234' },
  { name: 'रिया बनर्जी (Riya Banerjee)', class: 11, pin: '1234' },
  { name: 'निखिल रेड्डी (Nikhil Reddy)', class: 11, pin: '1234' },
  // Class 12
  { name: 'हर्षित मेहता (Harshit Mehta)', class: 12, pin: '1234' },
  { name: 'स्नेहा कुलश्रेष्ठ (Sneha Kulshreshtha)', class: 12, pin: '1234' },
  { name: 'सिद्धार्थ मल्होत्रा (Siddharth Malhotra)', class: 12, pin: '1234' }
];

async function generateRosterSeed() {
  const sqlLines: string[] = [
    '-- Sample Roster Seed for Classes 9-12 with default PIN 1234',
    'BEGIN;'
  ];

  for (const s of sampleStudents) {
    sqlLines.push(`
INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('${s.name.replace(/'/g, "''")}', ${s.class}, '${PIN_1234_HASH}', true)
ON CONFLICT (name, class) DO UPDATE SET active = true;`);
  }

  sqlLines.push('COMMIT;');

  const outPath = path.resolve(process.cwd(), 'supabase/seed_roster.sql');
  fs.writeFileSync(outPath, sqlLines.join('\n'), 'utf-8');
  console.log(`✅ Generated ${outPath} with ${sampleStudents.length} sample students!`);
}

generateRosterSeed();
