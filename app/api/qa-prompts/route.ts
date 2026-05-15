import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

const promptsPath = path.join(process.cwd(), 'content', 'qa-prompts.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prompts = JSON.parse(await readFile(promptsPath, 'utf8'));
    return NextResponse.json(prompts);
  } catch {
    return NextResponse.json({ zh: [], en: [] });
  }
}
