import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const endpoint = process.env.GOODMINTON_STUDENT_SHEET_ENDPOINT;
const token = process.env.GOODMINTON_STUDENT_SHEET_TOKEN;

const students = [
  { file: 'guo-yiwei.json', alias: 'gyw' },
  { file: 'li-chenrun.json', alias: 'lcr' },
  { file: 'sheng-xinyi.json', alias: 'sxy' },
  { file: 'xue-meijiao.json', alias: 'xmj' },
  { file: 'yang-jingnan.json', alias: 'yjn' },
];

if (!endpoint || !token) {
  console.error('Missing GOODMINTON_STUDENT_SHEET_ENDPOINT or GOODMINTON_STUDENT_SHEET_TOKEN.');
  console.error('Set them in this terminal before running this script.');
  process.exit(1);
}

const rows = [];

for (const item of students) {
  const raw = await readFile(join(process.cwd(), 'data', 'students', item.file), 'utf8');
  const student = JSON.parse(raw);
  rows.push({
    studentId: student.studentId,
    aliases: item.alias,
    accessCode: String(student.accessCode || ''),
    studentName: student.name || '',
    studentJson: JSON.stringify(student),
  });
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    token,
    action: 'upsertStudents',
    students: rows,
  }),
});

const text = await response.text();
let payload;

try {
  payload = JSON.parse(text);
} catch {
  payload = { raw: text };
}

if (!response.ok || payload.error) {
  console.error('Upload failed:', payload);
  process.exit(1);
}

console.log('Uploaded students:', payload);
