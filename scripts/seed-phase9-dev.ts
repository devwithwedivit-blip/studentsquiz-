import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env or .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Bcrypt hash for 1234
const PIN_1234_HASH = '$2a$10$wOqZqW6K0jD/fG8jXw6f..Y6D2IeE5Lg/XJsm3N9v4C.gHn7ZfHfe';

const devStudents = [
  // Class 9 (3 students)
  { name: 'Aarav Sharma', class: 9, pin_hash: PIN_1234_HASH },
  { name: 'Ananya Verma', class: 9, pin_hash: PIN_1234_HASH },
  { name: 'Ishaan Patel', class: 9, pin_hash: PIN_1234_HASH },

  // Class 10 (3 students)
  { name: 'Rohan Gupta', class: 10, pin_hash: PIN_1234_HASH },
  { name: 'Sneha Rao', class: 10, pin_hash: PIN_1234_HASH },
  { name: 'Diya Patel', class: 10, pin_hash: PIN_1234_HASH },

  // Class 11 (3 students)
  { name: 'Priya Patel', class: 11, pin_hash: PIN_1234_HASH },
  { name: 'Vikram Joshi', class: 11, pin_hash: PIN_1234_HASH },
  { name: 'Vivek Joshi', class: 11, pin_hash: PIN_1234_HASH },

  // Class 12 (3 students)
  { name: 'Aditya Singh', class: 12, pin_hash: PIN_1234_HASH },
  { name: 'Meera Iyer', class: 12, pin_hash: PIN_1234_HASH },
  { name: 'Harshit Mehta', class: 12, pin_hash: PIN_1234_HASH }
];

async function seedPhase9Dev() {
  console.log('🌱 Starting Phase 9 Dev Seeding (1 Teacher + 3 Students per class)...');

  // 1. Generate SQL file
  const sqlLines: string[] = [
    '-- Phase 9 Dev Seed SQL (1 Teacher assigned to Class 9 + 3 Students per Class 9-12 with PIN 1234)',
    'BEGIN;',
    ''
  ];

  for (const st of devStudents) {
    sqlLines.push(`
INSERT INTO public.students (name, class, pin_hash, active)
VALUES ('${st.name.replace(/'/g, "''")}', ${st.class}, '${st.pin_hash}', true)
ON CONFLICT (name, class) DO UPDATE SET active = true, pin_hash = '${st.pin_hash}';`);
  }

  sqlLines.push('');
  sqlLines.push('COMMIT;');

  const outSql = path.resolve(process.cwd(), 'supabase/seed_phase9_dev.sql');
  fs.writeFileSync(outSql, sqlLines.join('\n'), 'utf-8');
  console.log(`✅ Generated SQL file: ${outSql}`);

  // 2. If Supabase keys available, seed via API
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    console.log('📡 Connecting to Supabase with service role key...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Create Test Teacher
    const teacherEmail = 'teacher.class9@school.com';
    const teacherPass = process.env.TEACHER_PASSWORD || 'Teach#Class9!2026';
    const teacherName = 'Mr. Sharma (Class 9 Teacher)';

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === teacherEmail);

    let teacherId: string;
    if (existing) {
      teacherId = existing.id;
      console.log(`ℹ️ Test teacher already exists (${teacherId}). Updating...`);
      await supabase.auth.admin.updateUserById(teacherId, {
        password: teacherPass,
        email_confirm: true,
        app_metadata: { role: 'teacher' },
        user_metadata: { name: teacherName }
      });
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: teacherEmail,
        password: teacherPass,
        email_confirm: true,
        app_metadata: { role: 'teacher' },
        user_metadata: { name: teacherName }
      });
      if (createErr || !newUser.user) {
        console.warn('⚠️ Could not create teacher in auth:', createErr?.message);
        teacherId = '00000000-0000-0000-0000-000000000002';
      } else {
        teacherId = newUser.user.id;
      }
    }

    // Upsert teacher profile
    await supabase.from('profiles').upsert({
      id: teacherId,
      email: teacherEmail,
      name: teacherName,
      role: 'teacher',
      active: true,
      must_change_password: false,
      updated_at: new Date().toISOString()
    });

    // Assign Class 9 to teacher
    await supabase.from('teacher_classes').delete().eq('teacher_id', teacherId);
    await supabase.from('teacher_classes').insert([
      { teacher_id: teacherId, class: 9 }
    ]);
    console.log(`✅ Teacher ${teacherEmail} assigned to Class 9`);

    // Upsert students
    for (const st of devStudents) {
      await supabase.from('students').upsert({
        name: st.name,
        class: st.class,
        pin_hash: st.pin_hash,
        active: true
      }, { onConflict: 'name,class' });
    }
    console.log(`✅ Upserted ${devStudents.length} dev students (Classes 9, 10, 11, 12)`);
  } else {
    console.log('ℹ️ Offline mode: Run supabase/seed_phase9_dev.sql in Supabase SQL editor.');
  }

  console.log('🎉 Phase 9 Dev Seeding complete!');
}

seedPhase9Dev();
