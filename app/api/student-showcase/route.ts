import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const showcasePath = path.join(process.cwd(), 'content', 'student-showcase.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const showcase = JSON.parse(await readFile(showcasePath, 'utf8'));
    return NextResponse.json(showcase);
  } catch (error) {
    console.error('[student-showcase-api-error]', error);
    return NextResponse.json({ zh: [], en: [] });
  }
}
