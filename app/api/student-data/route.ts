import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

function normalizeStudentId(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
}

function stripPrivateFields(student: Record<string, unknown>) {
  const publicStudent = { ...student };
  delete publicStudent.accessCode;
  return publicStudent;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    studentId?: string;
    accessCode?: string;
  } | null;

  const studentId = normalizeStudentId(body?.studentId);
  const accessCode = typeof body?.accessCode === 'string' ? body.accessCode.trim() : '';

  if (!studentId || !accessCode) {
    return NextResponse.json({ error: '请输入学员 ID 和访问码。' }, { status: 400 });
  }

  try {
    const filePath = join(process.cwd(), 'data', 'students', `${studentId}.json`);
    const raw = await readFile(filePath, 'utf8');
    const student = JSON.parse(raw) as Record<string, unknown>;

    if (student.accessCode !== accessCode) {
      return NextResponse.json({ error: '学员 ID 或访问码不正确。' }, { status: 401 });
    }

    return NextResponse.json({ student: stripPrivateFields(student) });
  } catch (error) {
    console.error('[student-data-error]', error);
    return NextResponse.json({ error: '没有找到这个学员数据。' }, { status: 404 });
  }
}
