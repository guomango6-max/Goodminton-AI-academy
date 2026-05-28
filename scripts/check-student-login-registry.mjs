import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function normalizeLoginCredential(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function addCredential(credentials, rawCredential, studentId) {
  const credential = normalizeLoginCredential(rawCredential);
  if (!credential || !studentId) return;
  credentials[credential] = studentId;
}

const manifest = readJson('data/student-manifest.json');
const generatedCredentials = readJson('data/student-login-credentials.json');
const credentials = {};

for (const [rawCredential, studentId] of Object.entries(generatedCredentials)) {
  addCredential(credentials, rawCredential, studentId);
}

for (const student of manifest) {
  addCredential(credentials, student.loginId, student.studentId);
  addCredential(credentials, student.studentId, student.studentId);
  addCredential(credentials, student.alias, student.studentId);
}

const errors = [];
const seenLoginIds = new Map();

for (const student of manifest) {
  if (!student.studentId) {
    errors.push('Manifest entry is missing studentId.');
    continue;
  }

  if (!student.loginId) {
    errors.push(`${student.studentId}: missing loginId.`);
  }

  if (!student.file) {
    errors.push(`${student.studentId}: missing file.`);
  } else if (!existsSync(join(root, 'data', 'students', student.file))) {
    errors.push(`${student.studentId}: data/students/${student.file} does not exist.`);
  }

  const loginCredential = normalizeLoginCredential(student.loginId);
  const resolvedStudentId = credentials[loginCredential];
  if (student.loginId && resolvedStudentId !== student.studentId) {
    errors.push(`${student.studentId}: loginId ${student.loginId} resolves to ${resolvedStudentId || 'nothing'}.`);
  }

  if (loginCredential) {
    const existing = seenLoginIds.get(loginCredential);
    if (existing && existing !== student.studentId) {
      errors.push(`${student.studentId}: loginId ${student.loginId} duplicates ${existing}.`);
    }
    seenLoginIds.set(loginCredential, student.studentId);
  }
}

if (errors.length) {
  console.error(`Student login registry check failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Student login registry ok: ${manifest.length} students, ${Object.keys(credentials).length} credentials.`);
