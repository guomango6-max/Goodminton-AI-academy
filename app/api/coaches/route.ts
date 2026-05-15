import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const coachesPath = path.join(process.cwd(), 'content', 'coaches.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coaches = JSON.parse(await readFile(coachesPath, 'utf8'));
    return NextResponse.json(coaches);
  } catch (error) {
    console.error('[coaches-api-error]', error);
    return NextResponse.json({ zh: [], en: [] });
  }
}
