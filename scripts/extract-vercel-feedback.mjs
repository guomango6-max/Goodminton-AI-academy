#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

const since = readArg('--since', process.env.VERCEL_LOG_SINCE || '24h');
const outPath = resolve(readArg('--out', process.env.GOODMINTON_VERCEL_FEEDBACK_OUT || 'D:\\ob\\inbox\\goodminton-vercel-feedback.md'));
const query = readArg('--query', '[goodminton-feedback]');

const commandArgs = ['vercel', 'logs', '--json', '--expand', '--query', query, '--since', since, '--no-color'];
if (process.env.VERCEL_PROJECT) commandArgs.push('--project', process.env.VERCEL_PROJECT);
if (process.env.VERCEL_TOKEN) commandArgs.push('--token', process.env.VERCEL_TOKEN);

function stringifyUnknown(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getLogText(entry) {
  const candidates = [
    entry.message,
    entry.text,
    entry.output,
    entry.payload,
    entry.data,
    entry.event,
    entry
  ];
  return candidates.map(stringifyUnknown).find((text) => text.includes('[goodminton-feedback]')) || stringifyUnknown(entry);
}

function getTimestamp(entry) {
  return entry.timestamp || entry.time || entry.createdAt || entry.date || new Date().toISOString();
}

function mdQuote(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
}

let stdout = '';
try {
  stdout = execFileSync('npx.cmd', commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  const stderr = error.stderr?.toString?.() || error.message;
  console.error('Failed to read Vercel logs.');
  console.error(stderr.trim());
  console.error('\nRun `npx vercel login` first, or set VERCEL_TOKEN.');
  process.exit(1);
}

const entries = stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { message: line };
    }
  })
  .filter((entry) => getLogText(entry).includes('[goodminton-feedback]'));

const now = new Date().toISOString();
const markdown = [
  '---',
  'tags: [goodminton, feedback, vercel-log]',
  '---',
  '',
  `# Goodminton Vercel Feedback Export`,
  '',
  `- exported: ${now}`,
  `- since: ${since}`,
  `- query: ${query}`,
  `- count: ${entries.length}`,
  '',
  ...entries.flatMap((entry, index) => [
    `## ${index + 1}. ${getTimestamp(entry)}`,
    '',
    mdQuote(getLogText(entry)),
    '',
  ]),
].join('\n');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, markdown, 'utf8');
console.log(`Exported ${entries.length} feedback log entries to ${outPath}`);