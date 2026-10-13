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
    const { quizId } = await req.json();
    if (!quizId) {
      return new Response(JSON.stringify({ error: 'quizId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Fetch Quiz and Validate Eligibility
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return new Response(JSON.stringify({ error: 'प्रश्नोत्तरी (Quiz) नहीं मिली।' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (quiz.status !== 'published') {
      return new Response(JSON.stringify({ error: 'यह परीक्षा अभी प्रकाशित नहीं हुई है।' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (Number(quiz.class) !== Number(student.class)) {
      return new Response(JSON.stringify({ error: `यह परीक्षा कक्षा ${quiz.class} के लिए है, आप कक्षा ${student.class} में हैं।` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    if (quiz.opens_at && new Date(quiz.opens_at) > now) {
      return new Response(JSON.stringify({ error: 'यह परीक्षा अभी प्रारंभ नहीं हुई है।' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (quiz.closes_at && new Date(quiz.closes_at) < now) {
      return new Response(JSON.stringify({ error: 'इस परीक्षा की अंतिम तिथि समाप्त हो चुकी है।' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Check existing attempts
    const { data: existingAttempts } = await supabase
      .from('attempts')
      .select('id, status, started_at')
      .eq('quiz_id', quizId)
      .eq('student_id', student.studentId);

    // If an in-progress attempt already exists, allow resuming it!
    const activeAttempt = existingAttempts?.find(a => a.status === 'in_progress');
    let attemptId = activeAttempt?.id;
    let startedAt = activeAttempt?.started_at;

    if (!activeAttempt) {
      const completedCount = existingAttempts?.filter(a => a.status !== 'in_progress').length || 0;
      if (completedCount >= (quiz.max_attempts || 1)) {
        return new Response(JSON.stringify({ error: 'आप इस परीक्षा के लिए अधिकतम अनुमत प्रयास पूर्ण कर चुके हैं।' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create new attempt record
      const { data: newAttempt, error: insertError } = await supabase
        .from('attempts')
        .insert({
          quiz_id: quizId,
          student_id: student.studentId,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError || !newAttempt) {
        throw new Error('प्रयास (Attempt) बनाने में त्रुटि हुई: ' + insertError?.message);
      }
      attemptId = newAttempt.id;
      startedAt = newAttempt.started_at;
    }

    // 4. Fetch quiz questions and passages
    const { data: quizQuestions, error: qqError } = await supabase
      .from('quiz_questions')
      .select('position, marks, question_id, questions_public(*)')
      .eq('quiz_id', quizId)
      .order('position', { ascending: true });

    if (qqError) throw qqError;

    // Fetch passages if any questions link to a passage
    const passageIds = Array.from(
      new Set(
        (quizQuestions || [])
          .map((qq: any) => qq.questions_public?.passage_id)
          .filter(Boolean)
      )
    );

    let passages: any[] = [];
    if (passageIds.length > 0) {
      const { data: pData } = await supabase
        .from('passages')
        .select('id, class, subject, kind, content') // Notice: title is intentionally omitted for students
        .in('id', passageIds);
      passages = pData || [];
    }

    // Sanitize questions: strip answers, acceptedAnswers, keywords, true pairs, ordered items
    const sanitizedQuestions = (quizQuestions || []).map((qq: any) => {
      const qp = qq.questions_public;
      return {
        id: qp.id,
        class: qp.class,
        subject: qp.subject,
        chapter: qp.chapter,
        type: qp.type,
        difficulty: qp.difficulty,
        question: qp.question,
        options: qp.options,
        image: qp.image,
        unit: qp.unit,
        hint: qp.hint,
        marks: Number(qq.marks) || Number(qp.marks) || 1,
        pairsLeft: qp.pairs_left,
        pairsRightShuffled: qp.pairs_right_shuffled,
        itemsShuffled: qp.items_shuffled,
        passageId: qp.passage_id,
        passageOrder: qp.passage_order
      };
    });

    // If quiz has shuffle enabled, shuffle questions while keeping passage groups intact
    let finalQuestions = sanitizedQuestions;
    if (quiz.shuffle) {
      const nonPassage = sanitizedQuestions.filter((q: any) => !q.passageId);
      const passageMap = new Map<string, any[]>();
      sanitizedQuestions.forEach((q: any) => {
        if (q.passageId) {
          if (!passageMap.has(q.passageId)) passageMap.set(q.passageId, []);
          passageMap.get(q.passageId)!.push(q);
        }
      });

      // Fisher-Yates
      for (let i = nonPassage.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nonPassage[i], nonPassage[j]] = [nonPassage[j], nonPassage[i]];
      }

      finalQuestions = [...nonPassage];
      for (const [, pGroup] of passageMap.entries()) {
        pGroup.sort((a, b) => (a.passageOrder || 0) - (b.passageOrder || 0));
        finalQuestions.push(...pGroup);
      }
    }

    // 5. Fetch existing saved answers if resuming
    const { data: savedAnswers } = await supabase
      .from('attempt_answers')
      .select('question_id, response, time_spent_seconds')
      .eq('attempt_id', attemptId);

    const savedProgress: Record<string, any> = {};
    (savedAnswers || []).forEach((sa: any) => {
      savedProgress[sa.question_id] = {
        response: sa.response,
        timeSpentSeconds: sa.time_spent_seconds || 0
      };
    });

    return new Response(
      JSON.stringify({
        attemptId,
        startedAt,
        durationMinutes: quiz.duration_minutes,
        negativeMarking: quiz.negative_marking,
        title: quiz.title,
        questions: finalQuestions,
        passages,
        savedProgress
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('start-attempt error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
