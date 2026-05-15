import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const sourceUrl = args.url || "https://www.youtube.com/@full-swing/videos";
const sourceName = args.name || "full-swing";
const limit = Number(args.limit || 20);
const outDir = resolve(args.out || process.env.BADMINTON_RAW_INBOX || "D:\\raw", sourceName);
const auditPath = resolve(args.audit || join(outDir, `${sourceName}-subtitle-audit.md`));
const workDir = resolve(args.work || join(outDir, "_yt-dlp"));
const langs = String(args.langs || "zh-Hans,zh-Hant,zh,en,ko").split(",").map((lang) => lang.trim()).filter(Boolean);
const cookiesFromBrowser = args["cookies-from-browser"] || "";
const cookiesPath = args.cookies ? resolve(args.cookies) : "";

await ensureYtDlp();
await mkdir(outDir, { recursive: true });
await mkdir(workDir, { recursive: true });

if (args.clean) {
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });
}

console.log(`Fetching video list: ${sourceUrl}`);
const videos = await getVideoList(sourceUrl, limit);
console.log(`Found ${videos.length} videos. Fetching subtitles only.`);

const rows = [];
let written = 0;

for (const video of videos) {
  const videoUrl = video.webpage_url || video.url || `https://www.youtube.com/watch?v=${video.id}`;
  const safeId = video.id || stableId(videoUrl);
  const videoDir = join(workDir, safeId);
  await mkdir(videoDir, { recursive: true });

  const before = await listFiles(videoDir);
  const result = await fetchSubtitle(videoUrl, videoDir, langs);
  const after = await listFiles(videoDir);
  const changed = after.filter((file) => !before.includes(file));
  const subtitleFile = pickSubtitleFile(after);
  const transcript = subtitleFile ? await parseSubtitle(join(videoDir, subtitleFile)) : "";
  const language = subtitleFile ? subtitleLanguage(subtitleFile) : "";
  const published = video.upload_date ? formatUploadDate(video.upload_date) : subtitleDate(subtitleFile);
  const output = {
    sourceName,
    sourceType: "youtube-transcript",
    title: video.title || "",
    url: videoUrl,
    id: safeId,
    published,
    duration: video.duration || "",
    channel: video.channel || video.uploader || sourceName,
    transcriptLanguage: language,
    transcript,
    fetchedAt: new Date().toISOString(),
    nextStep: "Use this transcript as source material for AI extraction. Do not promote directly into formal drill notes without review.",
  };

  if (transcript) {
    const fileName = `${output.published || new Date().toISOString().slice(0, 10)}-${slugify(output.title || safeId)}.json`;
    await writeFile(join(outDir, fileName), `${JSON.stringify(output, null, 2)}\n`, "utf8");
    written += 1;
  }

  rows.push({
    title: output.title,
    url: videoUrl,
    published: output.published,
    duration: output.duration,
    language,
    chars: transcript.length,
    status: transcript ? "ok" : classifyFailure(result.error),
    note: result.ok ? changed.join(", ") : result.error,
  });
}

await writeAudit(auditPath, sourceName, sourceUrl, rows);
console.log(`Done. Transcript JSON files: ${written}. Audit: ${auditPath}`);

async function ensureYtDlp() {
  const result = await run(ytDlpCommand(), ["--version"], { allowFailure: true });
  if (result.code !== 0) {
    throw new Error("yt-dlp is not installed. Put yt-dlp.exe in scripts/bin or set YTDLP_PATH.");
  }
}

async function getVideoList(url, maxItems) {
  const playlistEnd = Math.max(1, maxItems);
  const result = await run(ytDlpCommand(), [
    "--flat-playlist",
    "--dump-json",
    "--playlist-end",
    String(playlistEnd),
    url,
  ]);

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function fetchSubtitle(url, targetDir, languages) {
  const outputTemplate = join(targetDir, "%(upload_date)s-%(title).120B [%(id)s].%(ext)s");
  const result = await run(ytDlpCommand(), [
    ...cookieArgs(),
    "--skip-download",
    "--write-subs",
    "--write-auto-subs",
    "--sub-langs",
    languages.join(","),
    "--sub-format",
    "vtt/srt/best",
    "--convert-subs",
    "srt",
    "-o",
    outputTemplate,
    url,
  ], { allowFailure: true });

  return result.code === 0
    ? { ok: true, error: "" }
    : { ok: false, error: firstLine(result.stderr || result.stdout) };
}

function cookieArgs() {
  if (cookiesPath) return ["--cookies", cookiesPath];
  return cookiesFromBrowser ? ["--cookies-from-browser", cookiesFromBrowser] : [];
}

function ytDlpCommand() {
  return process.env.YTDLP_PATH || resolve("scripts/bin/yt-dlp.exe");
}

async function parseSubtitle(path) {
  const text = await readFile(path, "utf8");
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^\d+$/.test(trimmed)) return false;
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(trimmed)) return false;
      if (/^WEBVTT\b/i.test(trimmed)) return false;
      if (/^Kind:|^Language:/i.test(trimmed)) return false;
      return true;
    })
    .map((line) => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

async function writeAudit(path, source, url, rows) {
  await mkdir(dirname(path), { recursive: true });
  const lines = [
    "---",
    "type: youtube-transcript-audit",
    `source: ${source}`,
    `source_url: ${url}`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    `# ${source} 字幕抓取审计`,
    "",
    "| 状态 | 字数 | 语言 | 发布时间 | 标题 | 链接 | 备注 |",
    "|---|---:|---|---|---|---|---|",
    ...rows.map((row) => `| ${row.status} | ${row.chars} | ${row.language || "-"} | ${row.published || "-"} | ${escapeTable(row.title)} | [YouTube](${row.url}) | ${escapeTable(row.note || "-")} |`),
    "",
    "## 下一步",
    "",
    "- `ok`：可进入 AI 提取。",
    "- `members-only`：需要 YouTube 登录态 / 会员 cookies 才能抓。",
    "- `missing-subtitle`：需要换字幕语言、手动补转录，或后续用音频转写。",
    "",
  ];
  await writeFile(path, lines.join("\n"), "utf8");
}

async function listFiles(path) {
  try {
    return (await readdir(path)).filter((name) => [".srt", ".vtt"].includes(extname(name).toLowerCase())).sort();
  } catch {
    return [];
  }
}

function pickSubtitleFile(files) {
  const preference = [".zh-Hans.", ".zh-Hant.", ".zh.", ".en.", ".ko."];
  return [...files].sort((a, b) => {
    const ai = preference.findIndex((item) => a.includes(item));
    const bi = preference.findIndex((item) => b.includes(item));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  })[0] || "";
}

function subtitleLanguage(fileName) {
  const match = basename(fileName).match(/\.([a-z]{2}(?:-[A-Za-z]+)?)\.(?:srt|vtt)$/);
  return match?.[1] || "";
}

function subtitleDate(fileName) {
  const match = basename(fileName || "").match(/^(\d{4})(\d{2})(\d{2})-/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (options.allowFailure) {
        resolvePromise({ code: 1, stdout, stderr: error.message });
      } else {
        reject(error);
      }
    });
    child.on("close", (code) => {
      const result = { code, stdout, stderr };
      if (code === 0 || options.allowFailure) {
        resolvePromise(result);
      } else {
        reject(new Error(stderr || stdout || `${command} exited with ${code}`));
      }
    });
  });
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

function formatUploadDate(value) {
  const text = String(value);
  if (!/^\d{8}$/.test(text)) return text;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "youtube-transcript";
}

function stableId(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
}

function firstLine(value) {
  const lines = String(value || "").split(/\r?\n/).filter(Boolean);
  return lines.find((line) => /^ERROR:/i.test(line)) || lines.at(-1) || "yt-dlp failed";
}

function classifyFailure(error) {
  const text = String(error || "").toLowerCase();
  if (text.includes("members-only") || text.includes("join this channel")) return "members-only";
  if (text.includes("private video")) return "private";
  if (text.includes("sign in")) return "login-required";
  return "missing-subtitle";
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function printHelp() {
  console.log(`Usage:
  node scripts/fetch-youtube-transcripts.mjs --url https://www.youtube.com/@full-swing/videos --name full-swing --limit 20

Options:
  --url     YouTube channel, playlist, or video URL. Defaults to full-swing videos.
  --name    Source folder name. Defaults to full-swing.
  --limit   Max videos to inspect. Defaults to 20.
  --langs   Subtitle languages. Defaults to zh-Hans,zh-Hant,zh,en,ko.
  --out     Raw output root. Defaults to D:\\raw\\<name>.
  --work    Subtitle work directory. Defaults to <out>\\_yt-dlp.
  --audit   Audit Markdown path. Defaults to <out>\\<name>-subtitle-audit.md.
  --cookies Path to a Netscape cookies.txt file.
  --cookies-from-browser  Browser name for yt-dlp cookies, for example chrome or edge.
  --clean   Clear the work directory before running.
  --help    Show this help message.`);
}
