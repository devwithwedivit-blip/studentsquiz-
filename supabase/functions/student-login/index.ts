import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createStudentJwt } from '../_shared/auth.ts';

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
    const { studentId, studentClass, pin } = await req.json();

    if (!studentId || !studentClass || !pin) {
      return new Response(JSON.stringify({ error: 'studentId, studentClass, and pin are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';

    // 1. Rate Limiting Check: check failed attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentFailures, error: logError } = await supabase
      .from('pin_attempts_log')
      .select('id, attempt_time')
      .eq('student_id', studentId)
      .eq('success', false)
      .gte('attempt_time', fifteenMinutesAgo);

    if (logError) {
      console.error('Error querying pin_attempts_log:', logError);
    }

    const failedCount = recentFailures?.length || 0;
    if (failedCount >= 5) {
      return new Response(
        JSON.stringify({
          error: 'Security Lockout: 5 failed PIN attempts. Please try again in 15 minutes.'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Fetch student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, class, pin_hash, active')
      .eq('id', studentId)
      .eq('class', studentClass)
      .single();

    if (studentError || !student || !student.active) {
      return new Response(JSON.stringify({ error: 'Student record not found or account is deactivated.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Verify PIN
    let pinValid = false;
    try {
      pinValid = await bcrypt.compare(String(pin).trim(), student.pin_hash);
    } catch (e) {
      console.error('Bcrypt compare error:', e);
      // Fallback for plain-text dev fallback if hash isn't bcrypt format
      pinValid = student.pin_hash === String(pin).trim();
    }

    // 4. Log attempt
    await supabase.from('pin_attempts_log').insert({
      student_id: studentId,
      success: pinValid,
      ip_address: clientIp
    });

    if (!pinValid) {
      await supabase.from('audit_log').insert({
        actor_id: String(studentId),
        actor_role: 'student',
        action: 'login_failed',
        target_type: 'student',
        target_id: String(studentId),
        details: { ip: clientIp, reason: 'invalid_pin' }
      }).catch((e: any) => console.error('audit_log insert error:', e));

      const warnMsg = remainingAttempts > 0
        ? `Incorrect PIN. You have ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
        : 'Incorrect PIN. Next failed attempt will lock your account for 15 minutes.';
      return new Response(JSON.stringify({ error: warnMsg }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Success -> Issue Student Session Token
    const token = await createStudentJwt(student.id, student.name, student.class);

    await supabase.from('audit_log').insert({
      actor_id: String(student.id),
      actor_role: 'student',
      action: 'login',
      target_type: 'student',
      target_id: String(student.id),
      details: { name: student.name, class: student.class, ip: clientIp }
    }).catch((e: any) => console.error('audit_log insert error:', e));

    return new Response(
      JSON.stringify({
        token,
        student: {
          id: student.id,
          name: student.name,
          class: student.class
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('student-login error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
