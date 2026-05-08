#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const TOPIC = process.env.NTFY_TOPIC || 'goodminton-feedback-ef27280b6181';
const OUT = process.env.GOODMINTON_FEEDBACK_FILE || 'D:\\ob\\inbox\\goodminton-feedback.md';
const STATE = OUT + '.state';

const since = existsSync(STATE) ? readFileSync(STATE, 'utf8').trim() : '24h';
const url = `https://ntfy.sh/${TOPIC}/json?poll=1&since=${encodeURIComponent(since)}`;

const res = await fetch(url);
if (!res.ok) {
  console.error(`ntfy fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const lines = (await res.text()).split('\n').map((l) => l.trim()).filter(Boolean);
const msgs = lines
  .map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  })
  .filter((m) => m && m.event === 'message');

if (msgs.length === 0) {
  console.log('no new feedback');
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
if (!existsSync(OUT)) {
  writeFileSync(OUT, '---\ntags: [goodminton, feedback]\n---\n\n# Goodminton Feedback\n', 'utf8');
}

for (const m of msgs) {
  const ts = new Date((m.time || 0) * 1000).toISOString();
  const title = m.title || '';
  const body = (m.message || '').split(/\r?\n/).map((line) => `> ${line}`).join('\n');
  appendFileSync(OUT, `\n## ${ts}\n\n- ${title}\n\n${body}\n`, 'utf8');
}

writeFileSync(STATE, String(msgs[msgs.length - 1].id), 'utf8');
console.log(`appended ${msgs.length} messages → ${OUT}`);
