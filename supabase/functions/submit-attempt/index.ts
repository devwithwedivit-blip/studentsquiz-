import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyStudentJwt, extractBearerToken } from '../_shared/auth.ts';
import { evaluateQuestionServer } from '../_shared/evaluator.ts';

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
    const { attemptId, answers } = await req.json();

    if (!attemptId) {
      return new Response(JSON.stringify({ error: 'attemptId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Fetch attempt with Quiz settings
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id, student_id, quiz_id, status, started_at, quizzes(*)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: 'Attempt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Security check: attempt ownership
    if (attempt.student_id !== student.studentId) {
      return new Response(JSON.stringify({ error: 'Forbidden: Attempt belongs to another student' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rejection of duplicate submission
    if (attempt.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: `परीक्षा पहले ही सबमिट की जा चुकी है (${attempt.status})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const quiz = attempt.quizzes as any;
    const nowMs = Date.now();
    const durationMin = quiz?.duration_minutes || 30;
    const deadlineMs = new Date(attempt.started_at).getTime() + (durationMin * 60 + 90) * 1000; // 90s grace

    let isTimedOut = false;
    if (nowMs > deadlineMs) {
      isTimedOut = true;
    }

    // 3. Fetch quiz questions and authoritative answers
    const { data: quizQuestions, error: qqError } = await supabase
      .from('quiz_questions')
      .select('marks, question_id, questions_public(id, type, question, marks)')
      .eq('quiz_id', attempt.quiz_id);

    if (qqError) throw qqError;

    const questionIds = (quizQuestions || []).map((qq: any) => qq.question_id);

    const { data: officialAnswers, error: ansError } = await supabase
      .from('question_answers')
      .select('*')
      .in('question_id', questionIds);

    if (ansError) throw ansError;

    const answerMap = new Map<string, any>();
    (officialAnswers || []).forEach((oa: any) => {
      answerMap.set(oa.question_id, oa);
    });

    // Merge any answers sent in payload with previously autosaved answers in DB
    const { data: savedDbAnswers } = await supabase
      .from('attempt_answers')
      .select('question_id, response, time_spent_seconds')
      .eq('attempt_id', attemptId);

    const finalAnswerMap = new Map<string, { response: any; timeSpent: number }>();
    (savedDbAnswers || []).forEach((sa: any) => {
      finalAnswerMap.set(sa.question_id, {
        response: sa.response,
        timeSpent: sa.time_spent_seconds || 0
      });
    });

    if (answers && typeof answers === 'object') {
      for (const [qId, val] of Object.entries(answers)) {
        finalAnswerMap.set(qId, {
          response: (val as any).response !== undefined ? (val as any).response : val,
          timeSpent: (val as any).timeSpentSeconds || 0
        });
      }
    }

    // 4. Server-Side Grading
    let totalScore = 0;
    let maxTotalMarks = 0;
    let totalTimeTaken = 0;
    const reviewItems: any[] = [];
    const attemptAnswerUpserts: any[] = [];

    const applyNegative = Boolean(quiz?.negative_marking);

    for (const qq of quizQuestions || []) {
      const qp = qq.questions_public;
      const qMarks = Number(qq.marks) || Number(qp.marks) || 1;
      maxTotalMarks += qMarks;

      const userAnsObj = finalAnswerMap.get(qp.id);
      const userResponse = userAnsObj ? userAnsObj.response : null;
      const timeSpent = userAnsObj ? userAnsObj.timeSpent : 0;
      totalTimeTaken += timeSpent;

      const qa = answerMap.get(qp.id);
      if (!qa) continue;

      const evalResult = evaluateQuestionServer(
        { id: qp.id, type: qp.type, marks: qMarks },
        qa,
        userResponse,
        applyNegative
      );

      totalScore += evalResult.marksAwarded;

      attemptAnswerUpserts.push({
        attempt_id: attemptId,
        question_id: qp.id,
        response: userResponse,
        is_correct: evalResult.isCorrect,
        partial_score: evalResult.score,
        marks_awarded: evalResult.marksAwarded,
        time_spent_seconds: timeSpent,
        updated_at: new Date().toISOString()
      });

      reviewItems.push({
        questionId: qp.id,
        question: qp.question,
        type: qp.type,
        marks: qMarks,
        marksAwarded: evalResult.marksAwarded,
        isCorrect: evalResult.isCorrect,
        userResponse,
        feedback: evalResult.feedback,
        // The following fields will be stripped if quiz policy does not allow immediate answers
        correctAnswer: qa.answer,
        pairs: qa.pairs,
        orderedItems: qa.ordered_items,
        acceptedAnswers: qa.accepted_answers,
        explanation: qa.explanation
      });
    }

    // Clamp total score to >= 0
    totalScore = Math.max(0, Math.round(totalScore * 100) / 100);

    // 5. Update attempt answers and attempt status
    if (attemptAnswerUpserts.length > 0) {
      await supabase.from('attempt_answers').upsert(attemptAnswerUpserts, {
        onConflict: 'attempt_id,question_id'
      });
    }

    const finalStatus = isTimedOut ? 'timed_out' : 'submitted';
    const submittedAt = new Date().toISOString();

    const { error: updateAttemptErr } = await supabase
      .from('attempts')
      .update({
        status: finalStatus,
        submitted_at: submittedAt,
        score: totalScore,
        total: maxTotalMarks,
        time_taken_seconds: totalTimeTaken
      })
      .eq('id', attemptId);

    if (updateAttemptErr) throw updateAttemptErr;

    // 6. Enforce show_answers_after policy
    const showMode = quiz?.show_answers_after || 'submit';
    let allowAnswersNow = false;

    if (showMode === 'submit') {
      allowAnswersNow = true;
    } else if (showMode === 'close') {
      if (quiz?.closes_at && new Date(quiz.closes_at) <= new Date()) {
        allowAnswersNow = true;
      }
    }

    const sanitizedReview = reviewItems.map(item => {
      if (!allowAnswersNow) {
        return {
          questionId: item.questionId,
          type: item.type,
          marks: item.marks,
          marksAwarded: item.marksAwarded,
          isCorrect: item.isCorrect,
          userResponse: item.userResponse,
          feedback: item.feedback
        };
      }
      return item;
    });

    const percentage = maxTotalMarks > 0 ? Math.round((totalScore / maxTotalMarks) * 1000) / 10 : 0;

    return new Response(
      JSON.stringify({
        attemptId,
        status: finalStatus,
        score: totalScore,
        total: maxTotalMarks,
        percentage,
        timeTakenSeconds: totalTimeTaken,
        submittedAt,
        answersVisible: allowAnswersNow,
        review: sanitizedReview
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('submit-attempt error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
