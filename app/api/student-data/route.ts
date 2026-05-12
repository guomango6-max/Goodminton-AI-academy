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

function parseStudentData(raw: string) {
  return JSON.parse(raw) as Record<string, unknown>;
}

function getStudentFromSingleEnv(studentId: string) {
  const envKey = `GOODMINTON_STUDENT_${studentId.replaceAll('-', '_').toUpperCase()}_B64`;
  const raw = process.env[envKey];

  if (!raw) {
    return null;
  }

  try {
    return parseStudentData(Buffer.from(raw, 'base64').toString('utf8'));
  } catch (error) {
    console.error('[student-data-single-env-parse-error]', error);
    return null;
  }
}

function getStudentFromEnv(studentId: string) {
  const raw =
    process.env.GOODMINTON_STUDENT_DATA_B64
      ? Buffer.from(process.env.GOODMINTON_STUDENT_DATA_B64, 'base64').toString('utf8')
      : process.env.GOODMINTON_STUDENT_DATA_JSON;

  if (!raw) {
    return null;
  }

  let data: Record<string, Record<string, unknown>> | Array<Record<string, unknown>>;

  try {
    data = JSON.parse(raw) as Record<string, Record<string, unknown>> | Array<Record<string, unknown>>;
  } catch (error) {
    console.error('[student-data-env-parse-error]', error);
    return null;
  }

  if (Array.isArray(data)) {
    return data.find((student) => student.studentId === studentId) || null;
  }

  return data[studentId] || null;
}

async function getStudentFromFile(studentId: string) {
  const filePath = join(process.cwd(), 'data', 'students', `${studentId}.json`);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as Record<string, unknown>;
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
    const student = getStudentFromSingleEnv(studentId) || getStudentFromEnv(studentId) || (await getStudentFromFile(studentId));

    if (student.accessCode !== accessCode) {
      return NextResponse.json({ error: '学员 ID 或访问码不正确。' }, { status: 401 });
    }

    return NextResponse.json({ student: stripPrivateFields(student) });
  } catch (error) {
    console.error('[student-data-error]', error);
    return NextResponse.json({ error: '没有找到这个学员数据。' }, { status: 404 });
  }
}
