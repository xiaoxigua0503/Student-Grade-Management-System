import { NextRequest, NextResponse } from 'next/server';
import { editGradeScoreOnly } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, courseId, score } = body;

    if (!studentId || !courseId) {
      return NextResponse.json({ success: false, error: 'studentId and courseId are required.' }, { status: 400 });
    }

    const result = editGradeScoreOnly(studentId, courseId, score);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, record: result.record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
