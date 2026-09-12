import { NextRequest, NextResponse } from 'next/server';
import { getCourseStatistics } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const statistics = getCourseStatistics(courseId);
    if (!statistics) {
      return NextResponse.json({ success: false, error: `Course "${courseId}" not found.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, statistics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
