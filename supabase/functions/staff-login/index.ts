import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { email, password, requestedRole } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Rate limiting check: check failed logins for this email in last 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failedCount } = await supabaseAdmin
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'login_failed')
      .eq('target_id', cleanEmail)
      .gte('created_at', fifteenMinAgo);

    if ((failedCount || 0) >= 5) {
      return new Response(
        JSON.stringify({
          error: 'सुरक्षा लॉक: 5 बार गलत लॉगिन प्रयास हुए हैं। कृपया 15 मिनट बाद पुनः प्रयास करें। (Too many failed attempts. Try again in 15 minutes.)'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password)
    });

    if (authError || !authData.user) {
      // Log failed attempt
      await supabaseAdmin.from('audit_log').insert({
        actor_id: cleanEmail,
        actor_role: requestedRole || 'unknown',
        action: 'login_failed',
        target_type: 'staff_account',
        target_id: cleanEmail,
        details: { reason: 'invalid_credentials' }
      });

      return new Response(
        JSON.stringify({ error: 'ईमेल या पासवर्ड अमान्य है। (Invalid email or password)' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = authData.user.id;

    // 3. Fetch profile record
    const { data: profile, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, active, must_change_password')
      .eq('id', userId)
      .single();

    if (profError || !profile) {
      return new Response(
        JSON.stringify({ error: 'उपयोगकर्ता प्रोफ़ाइल नहीं मिली। (Profile not found)' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!profile.active) {
      return new Response(
        JSON.stringify({ error: 'यह खाता निष्क्रिय कर दिया गया है। कृपया व्यवस्थापक से संपर्क करें। (Account deactivated)' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. Server-enforce role matching requested role card
    if (requestedRole === 'admin' && profile.role !== 'admin') {
      await supabaseAdmin.from('audit_log').insert({
        actor_id: userId,
        actor_role: profile.role,
        action: 'login_failed',
        target_type: 'staff_account',
        target_id: cleanEmail,
        details: { reason: 'role_mismatch_not_admin' }
      });

      return new Response(
        JSON.stringify({ error: "These details don't belong to an admin account" }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (requestedRole === 'teacher' && profile.role !== 'teacher') {
      await supabaseAdmin.from('audit_log').insert({
        actor_id: userId,
        actor_role: profile.role,
        action: 'login_failed',
        target_type: 'staff_account',
        target_id: cleanEmail,
        details: { reason: 'role_mismatch_not_teacher' }
      });

      return new Response(
        JSON.stringify({ error: "These details don't belong to a teacher account" }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 5. Ensure app_metadata has the authoritative role
    if (authData.user.app_metadata?.role !== profile.role) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { role: profile.role }
      });
    }

    // 6. Fetch assigned classes if teacher
    let assignedClasses: number[] = [];
    if (profile.role === 'teacher') {
      const { data: tClasses } = await supabaseAdmin
        .from('teacher_classes')
        .select('class')
        .eq('teacher_id', userId);
      assignedClasses = (tClasses || []).map((tc: any) => tc.class);
    }

    // 7. Log successful login
    await supabaseAdmin.from('audit_log').insert({
      actor_id: userId,
      actor_role: profile.role,
      action: 'login',
      target_type: 'staff_account',
      target_id: cleanEmail,
      details: { role: profile.role, email: cleanEmail }
    });

    return new Response(
      JSON.stringify({
        session: authData.session,
        profile: {
          id: profile.id,
          name: profile.name,
          email: profile.email || cleanEmail,
          role: profile.role,
          mustChangePassword: profile.must_change_password,
          assignedClasses
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('staff-login error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
