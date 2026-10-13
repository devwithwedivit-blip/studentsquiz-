import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env or .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function createFirstAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment.');
    process.exit(1);
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be provided as environment variables.');
    console.log('👉 Usage: ADMIN_EMAIL=admin@myschool.com ADMIN_PASSWORD="MySecurePassword123!" npx tsx scripts/create-first-admin.ts');
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 10) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 10 characters long.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const cleanEmail = ADMIN_EMAIL.trim().toLowerCase();
  console.log(`🚀 Provisioning first admin account for: ${cleanEmail}...`);

  // 1. Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`ℹ️ User already exists in auth (${userId}). Updating credentials and metadata...`);
    await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { name: 'Principal / Admin' }
    });
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { name: 'Principal / Admin' }
    });

    if (createErr || !newUser.user) {
      console.error('❌ Error creating auth user:', createErr?.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`✅ Auth user created with ID: ${userId}`);
  }

  // 2. Upsert profile with role = 'admin'
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: cleanEmail,
    name: 'Principal / Admin',
    role: 'admin',
    active: true,
    must_change_password: false,
    updated_at: new Date().toISOString()
  });

  if (profErr) {
    console.error('❌ Error upserting admin profile:', profErr.message);
    process.exit(1);
  }

  // 3. Log audit event
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action: 'first_admin_provisioned',
    target_type: 'admin',
    target_id: cleanEmail,
    details: { email: cleanEmail }
  });

  console.log('🎉 First admin provisioned successfully!');
  console.log(`📧 Email: ${cleanEmail}`);
  console.log('🛡️ Role: admin (authoritative in profiles and app_metadata)');
}

createFirstAdmin();
