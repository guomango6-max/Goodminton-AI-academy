import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const sourceUrl = args.url || "https://www.youtube.com/@%E5%AF%B6%E5%AF%B6%E6%95%99%E7%B7%B4/videos";
const sourceName = args.name || "baobao-coach";
const limit = Number(args.limit || 5);
const outDir = resolve(args.out || process.env.BADMINTON_RAW_INBOX || "D:\\raw", sourceName);
const audioDir = resolve(args.audio || join(outDir, "_audio"));
const auditPath = resolve(args.audit || join(outDir, `${sourceName}-audio-transcript-audit.md`));
const model = args.model || "gpt-4o-mini-transcribe";
const language = args.language || "zh";
const maxMb = Number(args["max-mb"] || 24);
const transcribe = Boolean(args.transcribe);
const cookiesPath = args.cookies ? resolve(args.cookies) : "";
const cookiesFromBrowser = args["cookies-from-browser"] || "";

await ensureYtDlp();
await mkdir(outDir, { recursive: true });
await mkdir(audioDir, { recursive: true });

if (transcribe && !process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required when using --transcribe.");
}

console.log(`Fetching video list: ${sourceUrl}`);
const videos = await getVideoList(sourceUrl, limit);
console.log(`Found ${videos.length} videos. Downloading audio only.`);

const rows = [];
let written = 0;

for (const video of videos) {
  const videoUrl = video.webpage_url || video.url || `https://www.youtube.com/watch?v=${video.id}`;
  const id = video.id || stableId(videoUrl);
  const title = video.title || id;
  const published = video.upload_date ? formatUploadDate(video.upload_date) : "";
  const targetBase = `${published || "undated"}-${slugify(title)} [${id}]`;
  const before = await listAudioFiles(audioDir);
  const download = await downloadAudio(videoUrl, join(audioDir, `${targetBase}.%(ext)s`));
  const after = await listAudioFiles(audioDir);
  const audioFile = pickNewAudio(before, after, id);
  const audioPath = audioFile ? join(audioDir, audioFile) : "";
  const size = audioPath ? (await stat(audioPath)).size : 0;
  const sizeMb = size / 1024 / 1024;

  let transcript = "";
  let status = audioPath ? "audio-ready" : "audio-failed";
  let error = download.error;

  if (audioPath && transcribe) {
    if (sizeMb > maxMb) {
      status = "too-large";
      error = `Audio is ${sizeMb.toFixed(1)}MB, above ${maxMb}MB upload limit.`;
    } else {
      try {
        transcript = await transcribeAudio(audioPath, { model, language });
        status = transcript ? "ok" : "empty-transcript";
      } catch (transcribeError) {
        status = "transcribe-failed";
        error = transcribeError.message;
      }
    }
  }

  if (transcript) {
    const payload = {
      sourceName,
      sourceType: "youtube-audio-transcript",
      title,
      url: videoUrl,
      id,
      published,
      duration: video.duration || "",
      channel: video.channel || video.uploader || sourceName,
      transcriptLanguage: language,
      transcript,
      audioFile: audioPath,
      transcribedBy: model,
      fetchedAt: new Date().toISOString(),
      nextStep: "Use this transcript as source material for AI extraction. Do not promote directly into formal drill notes without review.",
    };
    const fileName = `${published || new Date().toISOString().slice(0, 10)}-${slugify(title)}.json`;
    await writeFile(join(outDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    written += 1;
  }

  rows.push({
    status,
    title,
    url: videoUrl,
    published,
    duration: video.duration || "",
    audioFile,
    sizeMb,
    chars: transcript.length,
    note: error || "",
  });
}

await writeAudit(auditPath, sourceName, sourceUrl, rows, { transcribe, model });
console.log(`Done. Transcript JSON files: ${written}. Audit: ${auditPath}`);

async function ensureYtDlp() {
  const result = await run(ytDlpCommand(), ["--version"], { allowFailure: true });
  if (result.code !== 0) {
    throw new Error("yt-dlp is not installed. Put yt-dlp.exe in scripts/bin or set YTDLP_PATH.");
  }
}

async function getVideoList(url, maxItems) {
  const result = await run(ytDlpCommand(), [
    "--flat-playlist",
    "--dump-json",
    "--playlist-end",
    String(Math.max(1, maxItems)),
    url,
  ]);

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function downloadAudio(url, outputTemplate) {
  const result = await run(ytDlpCommand(), [
    ...cookieArgs(),
    "--no-playlist",
    "-f",
    "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
    "-o",
    outputTemplate,
    url,
  ], { allowFailure: true });

  return result.code === 0
    ? { ok: true, error: "" }
    : { ok: false, error: firstLine(result.stderr || result.stdout) };
}

async function transcribeAudio(path, options) {
  const form = new FormData();
  const bytes = await readFile(path);
  form.append("file", new Blob([bytes]), basename(path));
  form.append("model", options.model);
  form.append("language", options.language);
  form.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI transcription failed: ${response.status} ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  return data.text || "";
}

async function writeAudit(path, source, url, rows, options) {
  await mkdir(dirname(path), { recursive: true });
  const lines = [
    "---",
    "type: youtube-audio-transcript-audit",
    `source: ${source}`,
    `source_url: ${url}`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    "---",
    "",
    `# ${source} 音频转写审计`,
    "",
    `- 转写模式：${options.transcribe ? options.model : "download-only"}`,
    "",
    "| 状态 | 字数 | 音频MB | 发布时间 | 标题 | 链接 | 备注 |",
    "|---|---:|---:|---|---|---|---|",
    ...rows.map((row) => `| ${row.status} | ${row.chars} | ${row.sizeMb ? row.sizeMb.toFixed(1) : "-"} | ${row.published || "-"} | ${escapeTable(row.title)} | [YouTube](${row.url}) | ${escapeTable(row.note || row.audioFile || "-")} |`),
    "",
    "## 状态说明",
    "",
    "- `audio-ready`：音频已下载，等待转写。",
    "- `ok`：转写完成，已生成 raw JSON。",
    "- `too-large`：超过单文件上传限制，需要切段。",
    "- `transcribe-failed`：API 转写失败。",
    "",
  ];
  await writeFile(path, lines.join("\n"), "utf8");
}

async function listAudioFiles(path) {
  try {
    return (await readdir(path)).filter((name) => [".m4a", ".webm", ".mp3", ".mp4"].includes(extname(name).toLowerCase())).sort();
  } catch {
    return [];
  }
}

function pickNewAudio(before, after, id) {
  const beforeSet = new Set(before);
  return after.find((file) => file.includes(`[${id}]`) && !beforeSet.has(file))
    || after.find((file) => file.includes(`[${id}]`))
    || "";
}

function cookieArgs() {
  if (cookiesPath) return ["--cookies", cookiesPath];
  return cookiesFromBrowser ? ["--cookies-from-browser", cookiesFromBrowser] : [];
}

function ytDlpCommand() {
  return process.env.YTDLP_PATH || resolve("scripts/bin/yt-dlp.exe");
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
    .slice(0, 90) || "youtube-audio";
}

function stableId(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
}

function firstLine(value) {
  const lines = String(value || "").split(/\r?\n/).filter(Boolean);
  return lines.find((line) => /^ERROR:/i.test(line)) || lines.at(-1) || "yt-dlp failed";
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function printHelp() {
  console.log(`Usage:
  node scripts/fetch-youtube-audio-transcripts.mjs --url https://www.youtube.com/@.../videos --name baobao-coach --limit 5
  node scripts/fetch-youtube-audio-transcripts.mjs --url https://www.youtube.com/@.../videos --name baobao-coach --limit 5 --transcribe

Options:
  --url     YouTube channel, playlist, or video URL. Defaults to baobao-coach videos.
  --name    Source folder name. Defaults to baobao-coach.
  --limit   Max videos to inspect. Defaults to 5.
  --out     Raw output root. Defaults to D:\\raw\\<name>.
  --audio   Audio output directory. Defaults to <out>\\_audio.
  --audit   Audit Markdown path. Defaults to <out>\\<name>-audio-transcript-audit.md.
  --transcribe  Call OpenAI transcription after audio download. Requires OPENAI_API_KEY.
  --model   Transcription model. Defaults to gpt-4o-mini-transcribe.
  --language Input language code. Defaults to zh.
  --max-mb  Max upload size per audio. Defaults to 24.
  --cookies Path to a Netscape cookies.txt file.
  --cookies-from-browser Browser name for yt-dlp cookies, for example chrome or edge.
  --help    Show this help message.`);
}
