import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyStudentJwt, extractBearerToken } from '../_shared/auth.ts';

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

  // 1. Authenticate Student
  const token = extractBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing student token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const student = await verifyStudentJwt(token);
  if (!student) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired student token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { attemptId, questionId, response, timeSpentSeconds } = await req.json();

    if (!attemptId || !questionId) {
      return new Response(JSON.stringify({ error: 'attemptId and questionId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Verify attempt ownership & status
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id, student_id, status, started_at, quizzes(duration_minutes)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: 'Attempt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (attempt.student_id !== student.studentId) {
      return new Response(JSON.stringify({ error: 'Forbidden: Attempt belongs to another student' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (attempt.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: `Cannot save: Attempt is already ${attempt.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Verify server timer (with 60 seconds grace for network latency)
    const durationMin = (attempt.quizzes as any)?.duration_minutes || 30;
    const deadlineMs = new Date(attempt.started_at).getTime() + (durationMin * 60 + 60) * 1000;
    if (Date.now() > deadlineMs) {
      await supabase
        .from('attempts')
        .update({ status: 'timed_out' })
        .eq('id', attemptId);

      return new Response(JSON.stringify({ error: 'समय समाप्त (Time Out). परीक्षा स्वतः बंद हो गई है।' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Upsert into attempt_answers
    const { error: upsertError } = await supabase
      .from('attempt_answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          response,
          time_spent_seconds: timeSpentSeconds || 0,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'attempt_id,question_id' }
      );

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ saved: true, serverTime: new Date().toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('save-progress error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
