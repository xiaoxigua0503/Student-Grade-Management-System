import { NextRequest, NextResponse } from 'next/server';
import { getStudentTranscript } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const transcript = getStudentTranscript(studentId);
    if (!transcript) {
      return NextResponse.json({ success: false, error: `Student "${studentId}" not found.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, transcript });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
