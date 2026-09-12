import { NextRequest, NextResponse } from 'next/server';
import { getAvailableCoursesForStudent, saveStudentEnrollment, getStudentById } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'studentId query param is required.' }, { status: 400 });
    }

    const student = getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: `Student "${studentId}" not found.` }, { status: 404 });
    }

    const availableCourses = getAvailableCoursesForStudent(studentId);
    return NextResponse.json({ success: true, student, availableCourses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, courseIds } = body;

    if (!studentId || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ success: false, error: 'studentId and a non-empty array of courseIds are required.' }, { status: 400 });
    }

    const result = saveStudentEnrollment(studentId, courseIds);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled in ${result.addedCount} course(s).`,
      addedCount: result.addedCount
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
