import { NextRequest, NextResponse } from 'next/server';
import { getEnrichedScores, upsertGrade } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || undefined;
    const courseId = searchParams.get('courseId') || undefined;
    const q = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;

    const scores = getEnrichedScores({ studentId, courseId, q, status });
    return NextResponse.json({ success: true, scores });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, courseId, score, date } = body;

    if (!studentId || !courseId) {
      return NextResponse.json({ success: false, error: 'studentId and courseId are required.' }, { status: 400 });
    }

    const result = upsertGrade(studentId, courseId, score, date);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, record: result.record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
