import { NextRequest, NextResponse } from 'next/server';
import { getCourseById, getCourseStatistics, batchSaveGradesByCourse } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ success: false, error: 'courseId query param is required.' }, { status: 400 });
    }

    const course = getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ success: false, error: `Course "${courseId}" not found.` }, { status: 404 });
    }

    const stats = getCourseStatistics(courseId);
    return NextResponse.json({
      success: true,
      course,
      enrolledStudents: stats ? stats.records : []
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, grades } = body;

    if (!courseId || !Array.isArray(grades)) {
      return NextResponse.json({ success: false, error: 'courseId and grades array are required.' }, { status: 400 });
    }

    const result = batchSaveGradesByCourse(courseId, grades);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved grades for ${result.updatedCount} student(s).`,
      updatedCount: result.updatedCount
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
