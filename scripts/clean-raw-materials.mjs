import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const inputDir = resolve(args.input || process.env.BADMINTON_RAW_INBOX || "D:\\raw");
const outDir = resolve(args.out || process.env.BADMINTON_CLEAN_INBOX || "D:\\raw-clean");
const minChars = Number(args["min-chars"] || 280);
const chunkChars = Number(args["chunk-chars"] || 1600);
const dryRun = Boolean(args["dry-run"]);

await mkdir(outDir, { recursive: true });

const files = await listJsonFiles(inputDir);
const manifest = [];
const globalChunkFingerprints = new Map();
let written = 0;
let skipped = 0;
let duplicateChunks = 0;

for (const filePath of files) {
  const raw = await readJson(filePath);
  const metadata = metadataFrom(raw, filePath);
  const cleanedText = cleanBody(raw.text || raw.transcript || raw.description || "");
  const paragraphs = splitParagraphs(cleanedText);
  const uniqueParagraphs = mergeSimilarParagraphs(paragraphs);
  const quality = scoreQuality({ ...metadata, text: uniqueParagraphs.join("\n\n") });

  if (quality.skip) {
    skipped += 1;
    manifest.push({ ...metadata, status: "skipped", reason: quality.reason, chars: cleanedText.length });
    continue;
  }

  const tags = inferTags(`${metadata.title}\n${uniqueParagraphs.join("\n\n")}`);
  const chunks = chunkParagraphs(uniqueParagraphs, chunkChars)
    .map((text, index) => ({
      id: `${metadata.id}-${String(index + 1).padStart(3, "0")}`,
      index: index + 1,
      text,
      hash: stableId(text),
      fingerprint: fingerprint(text),
      tags: inferTags(text),
      chars: text.length,
    }))
    .filter((chunk) => chunk.chars >= minChars || chunksAreUseful(chunk.text))
    .filter((chunk) => {
      const existing = globalChunkFingerprints.get(chunk.fingerprint);
      if (existing) {
        duplicateChunks += 1;
        return false;
      }
      globalChunkFingerprints.set(chunk.fingerprint, chunk.id);
      return true;
    });

  if (chunks.length === 0) {
    skipped += 1;
    manifest.push({ ...metadata, status: "skipped", reason: "no useful chunks after cleaning", chars: cleanedText.length });
    continue;
  }

  const metadataWithTags = { ...metadata, tags };
  const markdown = buildMarkdown(metadataWithTags, uniqueParagraphs.join("\n\n"), chunks, quality);
  const cleanJson = {
    ...metadata,
    status: "cleaned",
    quality,
    tags,
    chars: uniqueParagraphs.join("\n\n").length,
    chunks,
  };

  const base = `${datePrefix(metadata.fetchedAt || metadata.published)}-${slugify(metadata.title || metadata.id)}`;
  if (!dryRun) {
    await writeFile(join(outDir, `${base}.md`), markdown, "utf8");
    await writeFile(join(outDir, `${base}.clean.json`), `${JSON.stringify(cleanJson, null, 2)}\n`, "utf8");
  }

  written += 1;
  manifest.push({ ...metadata, status: "cleaned", reason: quality.reason, tags, chars: cleanJson.chars, chunks: chunks.length });
  console.log(`${dryRun ? "Would clean" : "Cleaned"} ${metadata.title || metadata.url || basename(filePath)}`);
}

if (!dryRun) {
  const manifestPath = join(outDir, `${new Date().toISOString().slice(0, 10)}-manifest.json`);
  const manifestMarkdownPath = join(outDir, `${new Date().toISOString().slice(0, 10)}-manifest.md`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(manifestMarkdownPath, buildManifestMarkdown(manifest), "utf8");
}

console.log(`Done. Cleaned: ${written}. Skipped: ${skipped}. Duplicate chunks removed: ${duplicateChunks}.`);

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(path));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".json" && !entry.name.endsWith(".clean.json")) {
      files.push(path);
    }
  }
  return files.sort();
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON ${path}: ${error.message}`);
  }
}

function metadataFrom(raw, filePath) {
  const url = raw.url || raw.source || "";
  return {
    id: stableId(url || raw.title || filePath),
    sourceName: raw.sourceName || "",
    sourceType: raw.sourceType || "",
    title: cleanInline(raw.title || ""),
    url,
    published: raw.published || "",
    author: raw.author || raw.channel || "",
    imageUrl: raw.imageUrl || "",
    fetchedAt: raw.fetchedAt || "",
    rawFile: filePath,
  };
}

function cleanBody(value) {
  return decodeHtml(String(value || ""))
    .replace(/\r/g, "\n")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(Subscribe|Login|Sign in|Share|Follow|Comments|Cookie|Privacy Policy|Terms of Use)\b/gi, " ")
    .replace(/\b(投稿|登录|注册|分享|评论|隐私政策|用户协议|客户端下载)\b/g, " ")
    .replace(/\s+\|\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitParagraphs(text) {
  return text
    .split(/\n{2,}|(?<=[。！？.!?])\s+(?=[A-Z\u4e00-\u9fff])/)
    .map(cleanInline)
    .filter((item) => item.length >= 30)
    .filter((item) => !isBoilerplate(item));
}

function cleanInline(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isBoilerplate(text) {
  const lower = text.toLowerCase();
  const patterns = [
    "all rights reserved",
    "download citation",
    "similar articles",
    "cookie policy",
    "privacy policy",
    "terms and conditions",
    "related posts",
    "leave a reply",
    "copyright",
    "版权所有",
    "相关推荐",
    "免责声明",
  ];
  return patterns.some((pattern) => lower.includes(pattern));
}

function mergeSimilarParagraphs(paragraphs) {
  const seen = new Set();
  const result = [];
  for (const paragraph of paragraphs) {
    const key = fingerprint(paragraph);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(paragraph);
  }
  return result;
}

function fingerprint(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 220);
}

function scoreQuality(item) {
  const text = `${item.title}\n${item.text}`.toLowerCase();
  const positive = [
    "training", "drill", "technique", "footwork", "serve", "return", "smash", "defence", "defense", "tactics", "coach",
    "训练", "教学", "步法", "纠错", "杀球", "接发", "双打", "轮转", "网前", "多球", "防守", "教练",
    "latihan", "teknik", "træning", "übungen", "entrenamiento", "entraînement",
  ];
  const negative = [
    "racket", "review", "shoe", "shop", "nutrition", "news", "tournament", "price", "membership",
    "球拍", "球鞋", "测评", "评测", "装备", "新闻", "赛事", "营养", "价格",
  ];

  const positiveHits = positive.filter((word) => text.includes(word)).length;
  const negativeHits = negative.filter((word) => text.includes(word)).length;
  const chars = item.text.length;
  const score = positiveHits * 2 - negativeHits * 3 + Math.min(4, Math.floor(chars / 1200));

  if (chars < 180) return { score, skip: true, reason: "too short after cleaning", positiveHits, negativeHits };
  if (negativeHits >= 2 && positiveHits < 3) return { score, skip: true, reason: "likely low-value equipment/news/commercial content", positiveHits, negativeHits };
  if (score < 2) return { score, skip: true, reason: "low training density", positiveHits, negativeHits };
  return { score, skip: false, reason: "useful candidate", positiveHits, negativeHits };
}

function chunkParagraphs(paragraphs, maxChars) {
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = `${current}\n\n${paragraph}`.trim();
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

function chunksAreUseful(text) {
  return /训练|教学|步法|杀球|接发|drill|training|technique|footwork|smash|serve|return/i.test(text);
}

function inferTags(text) {
  const tagRules = [
    ["步法/footwork", /步法|启动|回位|footwork|lunge|split step|chasse|scissor|fodarbejde|fußarbeit|desplazamiento/i],
    ["杀球/smash", /杀球|重杀|点杀|smash|remate/i],
    ["接发/serve-return", /接发|发接发|return.*serve|serve.*return|serving strategy|flick serve/i],
    ["发球/serve", /发球|serve|servicio/i],
    ["网前/net", /网前|放网|搓放|扑球|推球|net shot|net kill/i],
    ["防守/defence", /防守|接杀|挡网|挑球|defence|defense|block|lift/i],
    ["双打/doubles", /双打|轮转|站位|doubles|rotation|positioning/i],
    ["多球/multi-feed", /多球|multi-feed|multi shuttle|feeding/i],
    ["战术/tactics", /战术|策略|线路|落点|tactic|strategy|placement/i],
    ["纠错/correction", /纠错|错误|常见问题|mistake|error|fix|correction/i],
    ["体能/conditioning", /体能|力量|耐力|爆发|strength|power|conditioning|endurance|agility/i],
    ["生物力学/biomechanics", /生物力学|运动学|biomechanic|kinematic|force|pressure|fatigue/i],
    ["论文/research", /研究|论文|study|research|journal|doi|abstract/i],
    ["视频字幕/video", /youtube|transcript|subtitle|字幕/i],
  ];

  const matched = tagRules
    .filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag);

  return [...new Set(matched)];
}

function buildMarkdown(metadata, text, chunks, quality) {
  return `---
type: raw-cleaned-badminton-source
status: pending-review
title: "${escapeYaml(metadata.title)}"
source: "${escapeYaml(metadata.url)}"
source_name: "${escapeYaml(metadata.sourceName)}"
source_type: "${escapeYaml(metadata.sourceType)}"
published: "${escapeYaml(metadata.published)}"
author: "${escapeYaml(metadata.author)}"
fetched: "${escapeYaml(metadata.fetchedAt)}"
quality_score: ${quality.score}
tags:
${(metadata.tags || []).map((tag) => `  - ${tag}`).join("\n")}
created: "${new Date().toISOString().slice(0, 10)}"
---

# ${metadata.title || "Untitled Source"}

## Metadata

- Source: ${metadata.url || "Unknown"}
- Author: ${metadata.author || "Unknown"}
- Published: ${metadata.published || "Unknown"}
- Raw file: ${metadata.rawFile}
- Quality: ${quality.reason} (score ${quality.score})
- Tags: ${(metadata.tags || []).join(", ") || "none"}

## Clean Text

${text}

## Chunks

${chunks.map((chunk) => `### Chunk ${chunk.index}\n\nTags: ${(chunk.tags || []).join(", ") || "none"}\n\n${chunk.text}`).join("\n\n")}
`;
}

function buildManifestMarkdown(items) {
  return [
    "---",
    "type: raw-clean-manifest",
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    "# Raw Clean Manifest",
    "",
    "| Status | Tags | Chunks | Title | Source | Reason |",
    "|---|---|---:|---|---|---|",
    ...items.map((item) => `| ${item.status} | ${escapeTable((item.tags || []).join(", ")) || "-"} | ${item.chunks || 0} | ${escapeTable(item.title || "")} | ${item.url ? `[source](${item.url})` : "-"} | ${escapeTable(item.reason || "")} |`),
    "",
  ].join("\n");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function datePrefix(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10).replace(/[^\d-]/g, "") || new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function stableId(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "raw-cleaned-item";
}

function escapeYaml(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
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

function printHelp() {
  console.log(`Usage:
  node scripts/clean-raw-materials.mjs --input D:\\raw --out D:\\raw-clean

Options:
  --input       Raw JSON directory. Defaults to BADMINTON_RAW_INBOX or D:\\raw.
  --out         Clean output directory. Defaults to BADMINTON_CLEAN_INBOX or D:\\raw-clean.
  --min-chars   Minimum chunk chars. Defaults to 280.
  --chunk-chars Target max chars per chunk. Defaults to 1600.
  --dry-run     Print actions without writing files.
  --help        Show this help message.`);
}
