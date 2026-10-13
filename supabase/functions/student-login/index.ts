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
          error: 'सुरक्षा लॉक: 5 बार गलत पिन दर्ज किया गया है। कृपया 15 मिनट बाद पुनः प्रयास करें। (Locked out for 15 minutes)'
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
      return new Response(JSON.stringify({ error: 'विद्यार्थी का रिकॉर्ड नहीं मिला या खाता निष्क्रिय है।' }), {
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
      const remainingAttempts = 4 - failedCount;
      const warnMsg = remainingAttempts > 0
        ? `गलत पिन दर्ज किया गया। आपके पास ${remainingAttempts} प्रयास शेष हैं।`
        : 'गलत पिन। इसके बाद आपका खाता 15 मिनट के लिए लॉक हो जाएगा।';
      return new Response(JSON.stringify({ error: warnMsg }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Success -> Issue Student Session Token
    const token = await createStudentJwt(student.id, student.name, student.class);

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
