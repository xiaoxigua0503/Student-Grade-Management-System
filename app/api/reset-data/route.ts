import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    await new Promise((resolve, reject) => {
      exec('node scripts/generate_data.js', { cwd: process.cwd() }, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully re-seeded data: 125 students, 35 courses, and 1000+ score/enrollment records.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
