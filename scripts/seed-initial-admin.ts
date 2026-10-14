import fs from 'fs';
import path from 'path';

// Standard 4-digit PIN '1234' bcrypt hash with cost 10:
// $2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe
const PIN_1234_HASH = '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe';

const sampleStudents = [
  // Class 9
  { name: 'Aarav Sharma', class: 9, pin: '1234' },
  { name: 'Ananya Verma', class: 9, pin: '1234' },
  { name: 'Rohan Gupta', class: 9, pin: '1234' },
  { name: 'Priya Singh', class: 9, pin: '1234' },
  // Class 10
  { name: 'Aditya Kumar', class: 10, pin: '1234' },
  { name: 'Diya Patel', class: 10, pin: '1234' },
  { name: 'Krish Agarwal', class: 10, pin: '1234' },
  { name: 'Sameera Khan', class: 10, pin: '1234' },
  // Class 11
  { name: 'Vivek Joshi', class: 11, pin: '1234' },
  { name: 'Riya Banerjee', class: 11, pin: '1234' },
  { name: 'Nikhil Reddy', class: 11, pin: '1234' },
  // Class 12
  { name: 'Harshit Mehta', class: 12, pin: '1234' },
  { name: 'Sneha Kulshreshtha', class: 12, pin: '1234' },
  { name: 'Siddharth Malhotra', class: 12, pin: '1234' }
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
