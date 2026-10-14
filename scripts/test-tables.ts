import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

const anonClient = createClient(url, anonKey);
const adminClient = createClient(url, serviceKey);

async function run() {
  console.log('Testing Supabase connectivity to:', url);
  const tables = ['students', 'quizzes', 'teacher_tests', 'teacher_test_questions', 'teacher_test_submissions', 'attempts', 'profiles', 'teacher_classes'];
  
  console.log('\n--- ANON KEY ACCESS (Browser/Student view) ---');
  for (const t of tables) {
    const { data, error } = await anonClient.from(t).select('*').limit(2);
    if (error) {
      console.log(`[ANON] Table "${t}": ERROR ${error.code} - ${error.message}`);
    } else {
      console.log(`[ANON] Table "${t}": OK (${data.length} rows)`);
    }
  }

  console.log('\n--- SERVICE ROLE KEY ACCESS (DB check) ---');
  for (const t of tables) {
    const { data, error } = await adminClient.from(t).select('*').limit(2);
    if (error) {
      console.log(`[ADMIN] Table "${t}": ERROR ${error.code} - ${error.message}`);
    } else {
      console.log(`[ADMIN] Table "${t}": OK (${data.length} rows)`);
    }
  }
}

run();
