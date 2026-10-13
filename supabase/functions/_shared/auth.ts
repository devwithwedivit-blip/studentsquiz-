// Lightweight JWT creation and verification for Student Sessions in Supabase Edge Functions

const JWT_SECRET =
  (typeof Deno !== 'undefined' ? Deno.env.get('STUDENT_JWT_SECRET') : (typeof process !== 'undefined' ? process.env?.STUDENT_JWT_SECRET : undefined)) ||
  'quizforge-student-session-secret-key-2026';

function base64UrlEncode(str: string): string {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  return atob(b64);
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const hashArray = Array.from(new Uint8Array(signature));
  const binaryString = String.fromCharCode(...hashArray);
  return base64UrlEncode(binaryString);
}

export interface StudentPayload {
  studentId: string;
  name: string;
  class: number;
  exp: number; // Unix timestamp in seconds
}

export async function createStudentJwt(studentId: string, name: string, studentClass: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: StudentPayload = {
    studentId,
    name,
    class: studentClass,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const toSign = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(toSign, JWT_SECRET);

  return `${toSign}.${signature}`;
}

export async function verifyStudentJwt(token: string): Promise<StudentPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const toSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSig = await hmacSha256(toSign, JWT_SECRET);

    if (signature !== expectedSig) return null;

    const payload: StudentPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
