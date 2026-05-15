import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const configPath = resolve(args.config || "scripts/external-training-sources.json");
const outDir = resolve(args.out || process.env.BADMINTON_RAW_INBOX || process.env.GOODMINTON_RAW_INBOX || "raw-training-inbox");
const statePath = resolve(args.state || process.env.BADMINTON_FETCH_STATE || process.env.GOODMINTON_FETCH_STATE || "training-fetch-state.json");
const maxItems = Number(args.max || 20);
const config = JSON.parse(await readFile(configPath, "utf8"));
const state = await readState(statePath);

await mkdir(outDir, { recursive: true });

let written = 0;
let skipped = 0;
const sourceReports = [];

for (const source of config.sources || []) {
  let items = [];
  const report = {
    source: source.name || source.url || source.type || "Unnamed source",
    fetched: 0,
    written: 0,
    seen: 0,
    filtered: 0,
    error: "",
  };

  if (source.enabled === false) {
    if (args["show-disabled"]) {
      report.error = "disabled";
      sourceReports.push(report);
    }
    continue;
  }

  try {
    items = await fetchSource(source);
    report.fetched = items.length;
  } catch (error) {
    report.error = error.message;
    sourceReports.push(report);
    console.error(`Failed source ${report.source}: ${error.message}`);
    continue;
  }

  const sourceMaxItems = Number(source.maxItems || maxItems);
  for (const item of items.slice(0, sourceMaxItems)) {
    const id = stableId(item.url || `${source.name}:${item.title}`);
    if (state.seen[id]) {
      skipped += 1;
      report.seen += 1;
      continue;
    }

    if (!matchesKeywords(item, source.keywords, source.excludeKeywords)) {
      skipped += 1;
      report.filtered += 1;
      continue;
    }

    const payload = {
      sourceName: source.name || "",
      sourceType: source.type || "",
      title: item.title || "",
      url: item.url || "",
      published: item.published || "",
      author: item.author || "",
      imageUrl: item.imageUrl || "",
      text: item.text || "",
      fetchedAt: new Date().toISOString(),
      nextStep: "Send this JSON to the AI prompt in docs/training-correction-automation.md, then save the AI JSON output to the training inbox.",
    };

    if (!args["dry-run"]) {
      const fileName = `${new Date().toISOString().slice(0, 10)}-${slugify(payload.title || id)}.json`;
      await writeFile(join(outDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      state.seen[id] = new Date().toISOString();
    }

    written += 1;
    report.written += 1;
    console.log(`${args["dry-run"] ? "Would write" : "Wrote"} ${payload.title || payload.url}`);
  }

  sourceReports.push(report);
}

if (!args["dry-run"]) {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

console.log(`Done. New raw items: ${written}. Skipped: ${skipped}.`);
printSourceReport(sourceReports);

async function fetchSource(source) {
  if (source.type === "rss") return fetchRss(source);
  if (source.type === "urls") return fetchUrls(source);
  if (source.type === "brave-search") return fetchBraveSearch(source);
  throw new Error(`Unsupported source type: ${source.type}`);
}

async function fetchRss(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "BadmintonTrainingAutomation/1.0",
      accept: "application/rss+xml, application/xml, text/xml, text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS ${source.url}: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);

  return blocks.map((block) => ({
    title: decodeXml(tag(block, "title")),
    url: decodeXml(tag(block, "link") || attr(block, "link", "href") || tag(block, "guid")),
    published: decodeXml(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated")),
    author: decodeXml(tag(block, "author") || tag(block, "dc:creator")),
    imageUrl: attr(block, "media:thumbnail", "url") || attr(block, "enclosure", "url"),
    text: stripHtml(decodeXml(tag(block, "description") || tag(block, "summary") || tag(block, "content:encoded"))),
  }));
}

async function fetchUrls(source) {
  const items = [];

  for (const url of source.urls || []) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "BadmintonTrainingAutomation/1.0",
          accept: "text/html, text/plain",
        },
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      items.push({
        title: source.titles?.[url] || cleanText(decodeHtml(meta(html, "og:title") || firstHeading(html) || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url)),
        url,
        published: meta(html, "article:published_time") || "",
        author: meta(html, "author") || "",
        imageUrl: meta(html, "og:image") || "",
        text: stripHtml(mainText(html)),
      });
    } catch (error) {
      console.error(`Failed URL ${url}: ${error.message}`);
    }
  }

  return items;
}

async function fetchBraveSearch(source) {
  const token = process.env.BRAVE_SEARCH_API_KEY;
  if (!token) {
    console.error(`Skipping ${source.name || "Brave Search"}: BRAVE_SEARCH_API_KEY is not set.`);
    return [];
  }

  const discovered = [];
  const seenUrls = new Set();
  const count = Math.max(1, Math.min(Number(source.count || 10), 20));

  for (const query of source.queries || []) {
    const searchUrl = new URL("https://api.search.brave.com/res/v1/web/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("count", String(count));
    searchUrl.searchParams.set("country", source.country || "us");
    searchUrl.searchParams.set("search_lang", source.searchLang || "en");
    searchUrl.searchParams.set("safesearch", source.safesearch || "moderate");

    const response = await fetch(searchUrl, {
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip",
        "x-subscription-token": token,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave Search failed for "${query}": ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    for (const result of data.web?.results || []) {
      const resultUrl = normalizeUrl(result.url || "");
      if (!resultUrl || seenUrls.has(resultUrl)) continue;
      if (isBlockedDomain(resultUrl, source.excludeDomains)) continue;
      seenUrls.add(resultUrl);
      discovered.push({
        title: result.title || "",
        url: resultUrl,
        published: result.age || "",
        author: "",
        imageUrl: result.thumbnail?.src || "",
        text: stripHtml(result.description || ""),
      });
    }
  }

  return hydrateSearchResults(discovered, source);
}

async function hydrateSearchResults(results, source) {
  const items = [];

  for (const result of results) {
    const [item] = await fetchUrls({ ...source, urls: [result.url] });
    items.push(item || result);
  }

  return items;
}

function matchesKeywords(item, keywords = [], excludeKeywords = []) {
  if (!keywords.length) return true;
  const haystack = `${item.title || ""}\n${item.text || ""}`.toLowerCase();
  const excludeHaystack = `${item.title || ""}`.toLowerCase();
  const excluded = excludeKeywords.some((keyword) => excludeHaystack.includes(String(keyword).toLowerCase()));
  if (excluded) return false;
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function isBlockedDomain(value, excludeDomains = []) {
  if (!excludeDomains.length) return false;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return excludeDomains.some((domain) => host === String(domain).replace(/^www\./, "").toLowerCase());
  } catch {
    return false;
  }
}

function tag(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"))?.[1]?.trim() || "";
}

function attr(text, tagName, attrName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAttr = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagMatch = text.match(new RegExp(`<${escapedTag}\\b[^>]*>`, "i"))?.[0] || "";
  return tagMatch.match(new RegExp(`${escapedAttr}=["']([^"']+)["']`, "i"))?.[1] || "";
}

function meta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, "i");
  return decodeHtml(html.match(pattern)?.[1] || "");
}

function mainText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ");
}

function firstHeading(html) {
  return html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
}

function stripHtml(value) {
  return decodeHtml(String(value || ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function decodeXml(value) {
  return decodeHtml(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
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

function cleanText(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

async function readState(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return { seen: {} };
  }
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
    .slice(0, 80) || "raw-training-item";
}

function printHelp() {
  console.log(`Usage:
  node scripts\\fetch-external-training-sources.mjs --config scripts\\external-training-sources.json --out "D:\\raw"

Options:
  --config   Source config JSON. Defaults to scripts/external-training-sources.json.
  --out      Raw item output directory.
  --state    Dedupe state file.
  --max      Max items per source. Defaults to 20.
  --dry-run  Fetch and print without writing files or state.
  --show-disabled  Include disabled sources in the source report.
  --help     Show this help message.`);
}

function printSourceReport(reports) {
  if (!reports.length) return;

  console.log("");
  console.log("Source report:");
  for (const report of reports) {
    const parts = [
      `fetched=${report.fetched}`,
      `new=${report.written}`,
      `seen=${report.seen}`,
      `filtered=${report.filtered}`,
    ];
    if (report.error) parts.push(`error=${report.error}`);
    console.log(`- ${report.source}: ${parts.join(", ")}`);
  }
}
