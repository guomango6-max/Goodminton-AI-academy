import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.inbox) {
  await processInbox(args);
  process.exit(0);
}

const inputText = await readInput(args.input);
const payload = parsePayload(inputText);

if ((payload.decision || "").toLowerCase() === "skip") {
  console.log(`Skipped: ${payload.skipReason || "AI marked this item as not worth saving."}`);
  process.exit(0);
}

const outDir = resolve(args.out || "training-notes");
const markdown = buildMarkdown(payload);
const fileName = `${datePrefix(payload.published)}-${slugify(payload.title || payload.topic || "training-note")}.md`;
const targetPath = join(outDir, fileName);

if (args["dry-run"]) {
  console.log(markdown);
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
await writeFile(targetPath, markdown, "utf8");
console.log(`Created ${targetPath}`);

async function processInbox(options) {
  const inboxDir = resolve(options.inbox);
  const outDir = resolve(options.out || "training-notes");
  const archiveDir = options.archive ? resolve(options.archive) : null;
  await mkdir(inboxDir, { recursive: true });
  const entries = await readdir(inboxDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && [".json", ".txt", ".md"].includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(inboxDir, entry.name));

  if (files.length === 0) {
    console.log(`No input files found in ${inboxDir}`);
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    try {
      const inputText = await readFile(filePath, "utf8");
      const payload = parsePayload(inputText);

      if ((payload.decision || "").toLowerCase() === "skip") {
        skipped += 1;
        console.log(`Skipped ${basename(filePath)}: ${payload.skipReason || "AI marked this item as not worth saving."}`);
        if (archiveDir) await archiveFile(filePath, archiveDir, "skipped");
        continue;
      }

      const markdown = buildMarkdown(payload);
      const fileName = await uniqueFileName(outDir, `${datePrefix(payload.published)}-${slugify(payload.title || payload.topic || "training-note")}.md`);
      const targetPath = join(outDir, fileName);

      if (!options["dry-run"]) {
        await mkdir(outDir, { recursive: true });
        await writeFile(targetPath, markdown, "utf8");
        if (archiveDir) await archiveFile(filePath, archiveDir, "processed");
      }

      created += 1;
      console.log(`${options["dry-run"] ? "Would create" : "Created"} ${targetPath}`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${basename(filePath)}: ${error.message}`);
      if (archiveDir && !options["dry-run"]) await archiveFile(filePath, archiveDir, "failed");
    }
  }

  console.log(`Done. Created: ${created}. Skipped: ${skipped}. Failed: ${failed}.`);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

async function readInput(inputPath) {
  if (inputPath) {
    return readFile(resolve(inputPath), "utf8");
  }

  if (process.stdin.isTTY) {
    throw new Error("Missing input. Use --input file.json or pipe JSON into stdin.");
  }

  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function parsePayload(text) {
  const trimmed = text.trim();
  const json = extractJson(trimmed);

  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Input is not valid JSON: ${error.message}`);
  }
}

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return text;
}

function buildMarkdown(data) {
  const title = data.title || data.topic || "未命名训练纠错卡片";
  const tags = normalizeTags(data.tags);
  const english = data.english || data.en || null;
  const englishMarkdown = english ? buildEnglishMarkdown(english) : "";

  return `---
type: badminton-training-correction
title: "${escapeYaml(title)}"
topic: "${escapeYaml(data.topic || "")}"
technique: "${escapeYaml(data.technique || "")}"
level: "${escapeYaml(data.level || "通用")}"
source: "${escapeYaml(data.source || "")}"
published: "${escapeYaml(data.published || "")}"
author: "${escapeYaml(data.author || "")}"
created: "${new Date().toISOString().slice(0, 10)}"
tags:
${tags.map((tag) => `  - ${tag}`).join("\n")}
---

# ${title}

## 摘要

${data.summary || "原文未提供可提炼摘要。"}

## 核心问题

${data.coreProblem || "原文未说明。"}

## 常见错误

${list(data.commonErrors)}

## 错误原因

${list(data.causes)}

## 纠正方法

${list(data.corrections)}

## 训练方法

${drills(data.drills)}

## 教练提示

${list(data.coachCues)}

## 可观察标准

${list(data.standards)}

## 原始来源

- 来源：${data.source || "原文未说明"}
- 作者：${data.author || "原文未说明"}
- 发布时间：${data.published || "原文未说明"}
${englishMarkdown}
`;
}

function buildEnglishMarkdown(data) {
  const title = data.title || data.topic || "Training Correction Card";

  return `
---

# English Version: ${title}

## Summary

${data.summary || "Not specified in the source."}

## Core Problem

${data.coreProblem || "Not specified in the source."}

## Common Errors

${list(data.commonErrors, "Not specified in the source.")}

## Causes

${list(data.causes, "Not specified in the source.")}

## Corrections

${list(data.corrections, "Not specified in the source.")}

## Drills

${drills(data.drills, {
  drill: "Drill",
  goal: "Goal",
  steps: "Steps",
  sets: "Sets",
  attention: "Attention",
  standard: "Standard",
  missing: "Not specified in the source.",
})}

## Coach Cues

${list(data.coachCues, "Not specified in the source.")}

## Observable Standards

${list(data.standards, "Not specified in the source.")}
`;
}

async function uniqueFileName(outDir, fileName) {
  await mkdir(outDir, { recursive: true });
  const parsed = parseFileName(fileName);
  let candidate = fileName;
  let counter = 2;

  while (await exists(join(outDir, candidate))) {
    candidate = `${parsed.name}-${counter}${parsed.ext}`;
    counter += 1;
  }

  return candidate;
}

function parseFileName(fileName) {
  const ext = extname(fileName);
  return {
    name: fileName.slice(0, fileName.length - ext.length),
    ext,
  };
}

async function exists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function archiveFile(filePath, archiveDir, status) {
  const targetDir = join(archiveDir, status);
  await mkdir(targetDir, { recursive: true });
  const targetName = await uniqueFileName(targetDir, basename(filePath));
  await rename(filePath, join(targetDir, targetName));
}

function normalizeTags(tags) {
  const defaults = ["羽毛球/训练", "羽毛球/纠错"];
  const normalized = Array.isArray(tags) ? tags : [];
  return [...new Set([...defaults, ...normalized].map((tag) => String(tag).replace(/^#/, "").trim()).filter(Boolean))];
}

function list(items, missing = "原文未说明") {
  if (!Array.isArray(items) || items.length === 0) return `- ${missing}`;
  return items.map((item) => `- ${String(item).trim()}`).join("\n");
}

function drills(items, labels = {}) {
  const text = {
    drill: labels.drill || "练习",
    goal: labels.goal || "目标",
    steps: labels.steps || "做法",
    sets: labels.sets || "组数",
    attention: labels.attention || "注意事项",
    standard: labels.standard || "判断标准",
    missing: labels.missing || "原文未说明",
  };

  if (!Array.isArray(items) || items.length === 0) return `### ${text.drill} 1：${text.missing}\n\n- ${text.goal}：${text.missing}\n- ${text.steps}：${text.missing}\n- ${text.sets}：${text.missing}\n- ${text.attention}：${text.missing}\n- ${text.standard}：${text.missing}`;

  return items
    .map((item, index) => {
      const steps = Array.isArray(item.steps) && item.steps.length > 0 ? item.steps.map((step) => `  - ${step}`).join("\n") : `  - ${text.missing}`;
      const attention = Array.isArray(item.attention) && item.attention.length > 0 ? item.attention.map((point) => `  - ${point}`).join("\n") : `  - ${text.missing}`;

      return `### ${text.drill} ${index + 1}：${item.name || text.missing}

- ${text.goal}：${item.goal || text.missing}
- ${text.steps}：
${steps}
- ${text.sets}：${item.sets || text.missing}
- ${text.attention}：
${attention}
- ${text.standard}：${item.standard || text.missing}`;
    })
    .join("\n\n");
}

function datePrefix(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10).replace(/[^\d-]/g, "") || new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function slugify(value) {
  const ascii = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return ascii || basename("training-note");
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function printHelp() {
  console.log(`Usage:
  node scripts\\create-training-note.mjs --input ai-output.json --out "D:\\Obsidian\\badminton\\training"
  Get-Content ai-output.json | node scripts\\create-training-note.mjs --out "D:\\Obsidian\\badminton\\training"
  node scripts\\create-training-note.mjs --inbox "D:\\Goodminton\\training-inbox" --out "D:\\Obsidian\\badminton\\training" --archive "D:\\Goodminton\\training-archive"

Options:
  --input    Path to AI JSON output. If omitted, stdin is used.
  --inbox    Directory containing AI JSON output files.
  --out      Output directory. Defaults to ./training-notes.
  --archive  Optional directory for processed, skipped, and failed source files.
  --dry-run  Print Markdown instead of writing a file.
  --help     Show this help message.`);
}
