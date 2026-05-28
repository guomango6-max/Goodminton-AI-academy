import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({
      configured: false,
      hasUrl,
      hasServiceRoleKey,
      tableReadable: false,
    });
  }

  const { error } = await supabase
    .from('student_submissions')
    .select('id')
    .limit(1);

  return NextResponse.json({
    configured: true,
    hasUrl,
    hasServiceRoleKey,
    tableReadable: !error,
    error: error?.message || null,
  });
}
