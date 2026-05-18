import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { NextResponse } from 'next/server';

function normalizeStudentId(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
}

const STUDENT_LOGIN_ALIASES: Record<string, { studentId: string; accessCode: string }> = {
  gyw: { studentId: 'guo-yiwei', accessCode: '1122' },
  lcr: { studentId: 'li-chenrun', accessCode: '2233' },
  sxy: { studentId: 'sheng-xinyi', accessCode: '3344' },
  xmj: { studentId: 'xue-meijiao', accessCode: '4455' },
  yjn: { studentId: 'yang-jingnan', accessCode: '4837' },
};

function stripPrivateFields(student: Record<string, unknown>) {
  const publicStudent = { ...student };
  delete publicStudent.accessCode;
  return publicStudent;
}

function parseStudentData(raw: string) {
  return JSON.parse(raw) as Record<string, unknown>;
}

const singleStudentCache = new Map<string, Record<string, unknown>>();
const fileStudentCache = new Map<string, Record<string, unknown>>();
let envStudentCacheRaw = '';
let envStudentCache: Record<string, Record<string, unknown>> | Array<Record<string, unknown>> | null = null;

function getStudentFromSingleEnv(studentId: string) {
  const envBase = `GOODMINTON_STUDENT_${studentId.replaceAll('-', '_').toUpperCase()}`;
  const rawGzip = process.env[`${envBase}_GZ_B64`];
  const raw = rawGzip || process.env[`${envBase}_B64`];

  if (!raw) {
    return null;
  }

  const cacheKey = rawGzip ? `${studentId}:gz:${rawGzip}` : `${studentId}:b64:${raw}`;
  const cached = singleStudentCache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = Buffer.from(raw, 'base64');
    const student = parseStudentData(rawGzip ? gunzipSync(data).toString('utf8') : data.toString('utf8'));
    singleStudentCache.set(cacheKey, student);
    return student;
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

  if (envStudentCacheRaw !== raw || !envStudentCache) {
    try {
      envStudentCache = JSON.parse(raw) as Record<string, Record<string, unknown>> | Array<Record<string, unknown>>;
      envStudentCacheRaw = raw;
    } catch (error) {
      envStudentCache = null;
      envStudentCacheRaw = '';
      console.error('[student-data-env-parse-error]', error);
      return null;
    }
  }

  if (Array.isArray(envStudentCache)) {
    return envStudentCache.find((student) => student.studentId === studentId) || null;
  }

  return envStudentCache[studentId] || null;
}

async function getStudentFromFile(studentId: string) {
  const cached = fileStudentCache.get(studentId);
  if (cached) return cached;

  const filePath = join(process.cwd(), 'data', 'students', `${studentId}.json`);
  const raw = await readFile(filePath, 'utf8');
  const student = JSON.parse(raw) as Record<string, unknown>;
  fileStudentCache.set(studentId, student);
  return student;
}

async function getStudentById(studentId: string) {
  const envStudent = getStudentFromSingleEnv(studentId) || getStudentFromEnv(studentId);
  if (envStudent) return envStudent;

  try {
    return await getStudentFromFile(studentId);
  } catch {
    return null;
  }
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
    const alias = STUDENT_LOGIN_ALIASES[studentId];
    const expectedAccessCode = alias?.accessCode;
    const lookupStudentIds = [
      alias?.studentId,
      accessCode ? `${studentId}_${accessCode}` : '',
      studentId,
    ].filter(Boolean) as string[];
    const uniqueLookupStudentIds = [...new Set(lookupStudentIds)];

    let student: Record<string, unknown> | null = null;
    for (const lookupStudentId of uniqueLookupStudentIds) {
      student = await getStudentById(lookupStudentId);
      if (student) break;
    }

    if (!student) {
      return NextResponse.json({ error: '没有找到这个学员数据。' }, { status: 404 });
    }

    if ((expectedAccessCode || student.accessCode) !== accessCode) {
      return NextResponse.json({ error: '学员 ID 或访问码不正确。' }, { status: 401 });
    }

    return NextResponse.json({ student: stripPrivateFields(student) });
  } catch (error) {
    console.error('[student-data-error]', error);
    return NextResponse.json({ error: '没有找到这个学员数据。' }, { status: 404 });
  }
}
