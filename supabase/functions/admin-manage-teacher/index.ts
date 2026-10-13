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
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller user
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callerId = callerData.user.id;
    // Check caller's role in profiles
    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role, active')
      .eq('id', callerId)
      .single();

    if (profErr || !callerProfile || !callerProfile.active) {
      return new Response(JSON.stringify({ error: 'Caller profile not found or inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { action } = body;

    // Handle change_password (can be done by self or admin)
    if (action === 'change_password') {
      const { newPassword, targetUserId } = body;
      const targetId = targetUserId || callerId;

      if (targetId !== callerId && callerProfile.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Only admins can change passwords for other users' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!newPassword || newPassword.length < 10) {
        return new Response(JSON.stringify({ error: 'Password must be at least 10 characters long' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
        password: newPassword
      });

      if (updateAuthErr) {
        return new Response(JSON.stringify({ error: updateAuthErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', targetId);

      await supabaseAdmin.from('audit_log').insert({
        actor_id: callerId,
        actor_role: callerProfile.role,
        action: 'change_password',
        target_type: 'user',
        target_id: targetId,
        details: { by_self: targetId === callerId }
      });

      return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // All remaining teacher management actions require ADMIN role
    if (callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create_teacher') {
      const { email, password, name, assignedClasses } = body;
      if (!email || !name) {
        return new Response(JSON.stringify({ error: 'Email and name are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const initialPassword = password || `Teach#${Math.random().toString(36).slice(-8)}!9`;
      const cleanEmail = String(email).trim().toLowerCase();

      // Create user in Auth
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: initialPassword,
        email_confirm: true,
        app_metadata: { role: 'teacher' },
        user_metadata: { name }
      });

      if (createErr || !newUser.user) {
        return new Response(JSON.stringify({ error: createErr?.message || 'Failed to create user' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const teacherId = newUser.user.id;

      // Upsert profile
      const { error: profInsertErr } = await supabaseAdmin.from('profiles').upsert({
        id: teacherId,
        email: cleanEmail,
        name,
        role: 'teacher',
        active: true,
        must_change_password: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (profInsertErr) {
        return new Response(JSON.stringify({ error: profInsertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Assign classes
      const classesList = Array.isArray(assignedClasses) ? assignedClasses : [];
      if (classesList.length > 0) {
        const classInserts = classesList.map((cls: string) => ({
          teacher_id: teacherId,
          class: String(cls).trim()
        }));
        await supabaseAdmin.from('teacher_classes').insert(classInserts);
      }

      // Log audit
      await supabaseAdmin.from('audit_log').insert({
        actor_id: callerId,
        actor_role: 'admin',
        action: 'create_teacher',
        target_type: 'teacher',
        target_id: teacherId,
        details: { email: cleanEmail, name, assignedClasses: classesList }
      });

      return new Response(
        JSON.stringify({
          success: true,
          teacher: {
            id: teacherId,
            email: cleanEmail,
            name,
            role: 'teacher',
            active: true,
            must_change_password: true,
            assignedClasses: classesList,
            initialPassword: password ? undefined : initialPassword
          }
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (action === 'update_classes') {
      const { teacherId, assignedClasses } = body;
      if (!teacherId) {
        return new Response(JSON.stringify({ error: 'teacherId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const classesList = Array.isArray(assignedClasses) ? assignedClasses : [];
      // Delete existing
      await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', teacherId);
      // Insert new
      if (classesList.length > 0) {
        const classInserts = classesList.map((cls: string) => ({
          teacher_id: teacherId,
          class: String(cls).trim()
        }));
        await supabaseAdmin.from('teacher_classes').insert(classInserts);
      }

      await supabaseAdmin.from('audit_log').insert({
        actor_id: callerId,
        actor_role: 'admin',
        action: 'update_teacher_classes',
        target_type: 'teacher',
        target_id: teacherId,
        details: { assignedClasses: classesList }
      });

      return new Response(JSON.stringify({ success: true, assignedClasses: classesList }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'toggle_active') {
      const { teacherId, active } = body;
      if (!teacherId || typeof active !== 'boolean') {
        return new Response(JSON.stringify({ error: 'teacherId and active boolean are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabaseAdmin.from('profiles').update({ active }).eq('id', teacherId);

      await supabaseAdmin.from('audit_log').insert({
        actor_id: callerId,
        actor_role: 'admin',
        action: active ? 'activate_teacher' : 'deactivate_teacher',
        target_type: 'teacher',
        target_id: teacherId,
        details: { active }
      });

      return new Response(JSON.stringify({ success: true, active }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'reset_password') {
      const { teacherId, newPassword } = body;
      if (!teacherId || !newPassword || newPassword.length < 10) {
        return new Response(JSON.stringify({ error: 'teacherId and newPassword (>=10 chars) required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(teacherId, {
        password: newPassword
      });

      if (resetErr) {
        return new Response(JSON.stringify({ error: resetErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabaseAdmin.from('profiles').update({ must_change_password: true }).eq('id', teacherId);

      await supabaseAdmin.from('audit_log').insert({
        actor_id: callerId,
        actor_role: 'admin',
        action: 'reset_teacher_password',
        target_type: 'teacher',
        target_id: teacherId,
        details: { reset_by_admin: true }
      });

      return new Response(JSON.stringify({ success: true, message: 'Password reset and marked for change on login' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('admin-manage-teacher error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
