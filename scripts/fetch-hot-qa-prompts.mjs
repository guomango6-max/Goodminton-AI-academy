#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const defaultSourcesPath = path.join(root, 'scripts', 'hot-article-sources.json');
const defaultOutPath = path.join(root, 'content', 'qa-prompts.json');

const questionBank = [
  {
    id: 'doubles-first-three',
    keywords: ['doubles', 'serve', 'return', 'rotation', 'positioning', 'communication'],
    zh: '双打发接发后的前三拍，业余球友最该先练哪一个选择？',
    en: 'In doubles, which choice after serve and return should amateur players train first?',
  },
  {
    id: 'ai-feedback',
    keywords: ['ai', 'smartwatch', 'sensor', 'wearable', 'evaluation', 'feedback', 'analysis'],
    zh: 'AI 或训练记录能帮我看出哪些动作问题？',
    en: 'What movement problems can AI or training notes help me notice?',
  },
  {
    id: 'summer-training',
    keywords: ['summer', 'camp', 'youth', 'junior', 'academy', 'program'],
    zh: '准备参加夏训，怎样判断课程有没有真正的反馈和进步路径？',
    en: 'How do I know whether a summer training program has real feedback and progress tracking?',
  },
  {
    id: 'smash-defence',
    keywords: ['smash', 'defence', 'defense', 'block', 'lift', 'drive'],
    zh: '接杀只能挡高，怎么练成挡网、抽挡和挑后场都有选择？',
    en: 'How can I train smash defence so I can block, drive, and lift with purpose?',
  },
  {
    id: 'footwork',
    keywords: ['footwork', 'split step', 'lunge', 'recovery', 'movement'],
    zh: '步法总慢半拍，是启动、到位还是回位的问题？',
    en: 'If my footwork is late, is the problem start, arrival, or recovery?',
  },
  {
    id: 'pressure',
    keywords: ['pressure', 'match', 'lead', 'rhythm', 'error', 'confidence'],
    zh: '比赛领先后变保守，怎么用固定流程稳住节奏？',
    en: 'When I get conservative while leading, what routine can stabilize my rhythm?',
  },
  {
    id: 'backhand',
    keywords: ['backhand', 'rear court', 'clear'],
    zh: '反手后场被连续压制时，先改步法、握拍还是击球点？',
    en: 'When my rear-court backhand gets targeted, should I fix footwork, grip, or contact first?',
  },
  {
    id: 'net-play',
    keywords: ['net', 'drop', 'tumble', 'push', 'kill'],
    zh: '网前总被抢高点，放网、推扑和挑球应该怎么排序练？',
    en: 'If I lose the net early, how should I sequence net shots, pushes, and lifts in training?',
  }
];

function getArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function matchAll(content, regex) {
  return Array.from(content.matchAll(regex));
}

function parseRss(xml, source) {
  return matchAll(xml, /<item[\s\S]*?<\/item>/gi).slice(0, source.maxItems || 10).map((match) => {
    const item = match[0];
    return {
      title: stripHtml(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]),
      summary: stripHtml(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1]),
      publishedAt: stripHtml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]),
      sourceWeight: source.weight || 1,
    };
  });
}

function parseArxiv(xml, source) {
  return matchAll(xml, /<entry[\s\S]*?<\/entry>/gi).slice(0, source.maxItems || 8).map((match) => {
    const entry = match[0];
    return {
      title: stripHtml(entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1]),
      summary: stripHtml(entry.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1]),
      publishedAt: stripHtml(entry.match(/<published>([\s\S]*?)<\/published>/i)?.[1]),
      sourceWeight: source.weight || 1,
    };
  });
}

function parseReddit(json, source) {
  return (json?.data?.children || []).slice(0, source.maxItems || 12).map(({ data }) => ({
    title: data.title,
    summary: data.selftext || '',
    publishedAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : '',
    sourceWeight: source.weight || 1,
    score: Number(data.score || 0) + Number(data.num_comments || 0) * 1.5,
  }));
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      accept: source.type === 'reddit' ? 'application/json' : 'application/xml,text/xml,text/html;q=0.8,*/*;q=0.5',
      'user-agent': 'GoodmintonAcademyQaPromptBot/1.0',
    },
  });

  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  if (source.type === 'reddit') return parseReddit(await response.json(), source);

  const text = await response.text();
  if (source.type === 'arxiv') return parseArxiv(text, source);
  return parseRss(text, source);
}

function scorePrompt(prompt, items) {
  return items.reduce((score, item) => {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    const keywordScore = prompt.keywords.reduce((total, keyword) => total + (haystack.includes(keyword.toLowerCase()) ? 1 : 0), 0);
    const publishedTime = Date.parse(item.publishedAt || '');
    const ageDays = Number.isFinite(publishedTime) ? Math.max(0, (Date.now() - publishedTime) / 86400000) : 21;
    const recencyScore = Math.max(0, 14 - ageDays) / 14;
    return score + keywordScore * (1 + recencyScore) + (item.score || 0) / 40 + item.sourceWeight / 4;
  }, 0);
}

function toPrompt(text, index) {
  return { icon: String(index + 1).padStart(2, '0'), text };
}

async function main() {
  const outPath = path.resolve(root, getArg('--out', defaultOutPath));
  const sourcesPath = path.resolve(root, getArg('--sources', defaultSourcesPath));
  const dryRun = hasArg('--dry-run');
  const sourceConfig = JSON.parse(await readFile(sourcesPath, 'utf8'));
  const sources = (sourceConfig.sources || []).filter((source) => source.enabled !== false);
  const settled = await Promise.allSettled(sources.map(fetchSource));
  const items = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  const ranked = questionBank
    .map((prompt) => ({ prompt, score: scorePrompt(prompt, items) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const payload = {
    updatedAt: new Date().toISOString(),
    zh: ranked.map(({ prompt }, index) => toPrompt(prompt.zh, index)),
    en: ranked.map(({ prompt }, index) => toPrompt(prompt.en, index)),
  };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${payload.zh.length} QA prompts to ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
