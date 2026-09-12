import { NextRequest, NextResponse } from 'next/server';
import { deleteGradeRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, courseId } = body;

    if (!studentId || !courseId) {
      return NextResponse.json({ success: false, error: 'Both studentId and courseId are required for deletion.' }, { status: 400 });
    }

    const result = deleteGradeRecord(studentId, courseId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Grade record deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
