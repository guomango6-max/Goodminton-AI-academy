import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { NextResponse } from 'next/server';

function normalizeLoginCredential(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function isSafeStudentFileId(value: string) {
  return /^[a-z0-9][a-z0-9_-]*$/u.test(value);
}

const STUDENT_LOGIN_CREDENTIALS: Record<string, string> = {
  demo: 'demo',
  gyw11: 'guo-yiwei',
  gyw1: 'guo-yiwei',
  gyw1122: 'guo-yiwei',
  guoyiwei11: 'guo-yiwei',
  guoyiwei1122: 'guo-yiwei',
  郭一苇11: 'guo-yiwei',
  郭一苇1122: 'guo-yiwei',
  lcr22: 'li-chenrun',
  lcr2: 'li-chenrun',
  lcr2233: 'li-chenrun',
  lichenrun22: 'li-chenrun',
  lichenrun2233: 'li-chenrun',
  李晨润22: 'li-chenrun',
  李晨润2233: 'li-chenrun',
  sxy33: 'sheng-xinyi',
  sxy3: 'sheng-xinyi',
  sxy3344: 'sheng-xinyi',
  shengxinyi33: 'sheng-xinyi',
  shengxinyi3344: 'sheng-xinyi',
  盛心怡33: 'sheng-xinyi',
  盛心怡3344: 'sheng-xinyi',
  盛欣怡33: 'sheng-xinyi',
  盛欣怡3344: 'sheng-xinyi',
  xmj44: 'xue-meijiao',
  xmj4: 'xue-meijiao',
  xmj4455: 'xue-meijiao',
  xuemeijiao44: 'xue-meijiao',
  xuemeijiao4455: 'xue-meijiao',
  薛美姣44: 'xue-meijiao',
  薛美姣4455: 'xue-meijiao',
  yjn48: 'yang-jingnan',
  yjn8: 'yang-jingnan',
  yjn4837: 'yang-jingnan',
  yangjingnan48: 'yang-jingnan',
  yangjingnan4837: 'yang-jingnan',
  杨静南48: 'yang-jingnan',
  杨静南4837: 'yang-jingnan',
};

function stripPrivateFields(student: Record<string, unknown>) {
  const publicStudent = { ...student };
  delete publicStudent.accessCode;
  return publicStudent;
}

function parseStudentData(raw: string) {
  return JSON.parse(raw) as Record<string, unknown>;
}

type GoogleServiceAccount = {
  client_email?: string;
  private_key?: string;
};

type ValidGoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

const singleStudentCache = new Map<string, Record<string, unknown>>();
const fileStudentCache = new Map<string, Record<string, unknown>>();
const driveStudentCache = new Map<string, Record<string, unknown>>();
const sheetStudentCache = new Map<string, Record<string, unknown>>();
let envStudentCacheRaw = '';
let envStudentCache: Record<string, Record<string, unknown>> | Array<Record<string, unknown>> | null = null;
let googleAccessTokenCache: { token: string; expiresAt: number } | null = null;

async function getStudentFromSheet(studentId: string) {
  const endpoint = process.env.GOODMINTON_STUDENT_SHEET_ENDPOINT;
  const token = process.env.GOODMINTON_STUDENT_SHEET_TOKEN;
  if (!endpoint || !token) return null;

  const cached = sheetStudentCache.get(studentId);
  if (cached) return cached;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, studentId }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error('[student-data-sheet-error]', response.status, await response.text().catch(() => ''));
      return null;
    }

    const payload = (await response.json()) as { error?: string; student?: Record<string, unknown> } | Record<string, unknown>;
    if ('error' in payload && payload.error) return null;
    const student = 'student' in payload ? payload.student : payload;
    if (
      !student ||
      typeof student !== 'object' ||
      Array.isArray(student) ||
      !('studentId' in student)
    ) {
      return null;
    }
    const studentRecord = student as Record<string, unknown>;

    sheetStudentCache.set(studentId, studentRecord);
    return studentRecord;
  } catch (error) {
    console.error('[student-data-sheet-fetch-error]', error);
    return null;
  }
}

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getGoogleServiceAccount(): ValidGoogleServiceAccount | null {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64
      ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8')
      : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!raw) return null;

  try {
    const account = JSON.parse(raw) as GoogleServiceAccount;
    if (!account.client_email || !account.private_key) return null;
    return {
      client_email: account.client_email,
      private_key: account.private_key,
    };
  } catch (error) {
    console.error('[student-data-google-account-parse-error]', error);
    return null;
  }
}

async function getGoogleAccessToken() {
  if (googleAccessTokenCache && googleAccessTokenCache.expiresAt > Date.now() + 60000) {
    return googleAccessTokenCache.token;
  }

  const account = getGoogleServiceAccount();
  if (!account) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(account.private_key.replace(/\\n/g, '\n'));
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    console.error('[student-data-google-token-error]', response.status, await response.text().catch(() => ''));
    return null;
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) return null;

  googleAccessTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000,
  };
  return googleAccessTokenCache.token;
}

function escapeDriveQueryText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getStudentFromDrive(studentId: string) {
  const folderId = process.env.GOODMINTON_STUDENT_DRIVE_FOLDER_ID;
  if (!folderId) return null;

  const cached = driveStudentCache.get(studentId);
  if (cached) return cached;

  const token = await getGoogleAccessToken();
  if (!token) return null;

  const fileName = `${studentId}.json`;
  const query = [
    `'${escapeDriveQueryText(folderId)}' in parents`,
    `name = '${escapeDriveQueryText(fileName)}'`,
    'trashed = false',
  ].join(' and ');
  const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
  listUrl.searchParams.set('q', query);
  listUrl.searchParams.set('fields', 'files(id,name,modifiedTime)');
  listUrl.searchParams.set('pageSize', '1');
  listUrl.searchParams.set('supportsAllDrives', 'true');
  listUrl.searchParams.set('includeItemsFromAllDrives', 'true');

  const listResponse = await fetch(listUrl, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!listResponse.ok) {
    console.error('[student-data-google-list-error]', listResponse.status, await listResponse.text().catch(() => ''));
    return null;
  }

  const listPayload = (await listResponse.json()) as { files?: Array<{ id: string; modifiedTime?: string }> };
  const file = listPayload.files?.[0];
  if (!file?.id) return null;

  const cacheKey = `${studentId}:${file.id}:${file.modifiedTime || ''}`;
  const cachedByFile = driveStudentCache.get(cacheKey);
  if (cachedByFile) return cachedByFile;

  const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) {
    console.error('[student-data-google-file-error]', fileResponse.status, await fileResponse.text().catch(() => ''));
    return null;
  }

  const student = parseStudentData(await fileResponse.text());
  driveStudentCache.set(studentId, student);
  driveStudentCache.set(cacheKey, student);
  return student;
}

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
  const sheetStudent = await getStudentFromSheet(studentId);
  if (sheetStudent) return sheetStudent;

  const driveStudent = await getStudentFromDrive(studentId);
  if (driveStudent) return driveStudent;

  const envStudent = getStudentFromSingleEnv(studentId) || getStudentFromEnv(studentId);
  if (envStudent) return envStudent;

  if (!isSafeStudentFileId(studentId)) return null;

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

  const rawStudentId = typeof body?.studentId === 'string' ? body.studentId : '';
  const rawAccessCode = typeof body?.accessCode === 'string' ? body.accessCode : '';
  const credential = normalizeLoginCredential(`${rawStudentId}${rawAccessCode}`);
  const studentId = STUDENT_LOGIN_CREDENTIALS[credential];

  if (!studentId) {
    return NextResponse.json({ error: `没有找到这个学员数据。识别为：${credential || '空'}` }, { status: 404 });
  }

  try {
    const student = await getStudentById(studentId);

    if (!student) {
      return NextResponse.json({ error: '没有找到这个学员数据。' }, { status: 404 });
    }

    return NextResponse.json({ student: stripPrivateFields(student) });
  } catch (error) {
    console.error('[student-data-error]', error);
    return NextResponse.json({ error: '没有找到这个学员数据。' }, { status: 404 });
  }
}
