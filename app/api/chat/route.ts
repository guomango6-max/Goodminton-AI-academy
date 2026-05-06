import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

function getLastUserText(messages: UIMessage[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUserMessage) return '';

  const textFromParts = lastUserMessage.parts
    ?.filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string }).text)
    .join('')
    .trim();

  return textFromParts || (lastUserMessage as unknown as { content?: string }).content || '';
}

function toMarkdownQuote(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n');
}

async function appendFeedbackMarkdown({
  time,
  role,
  lang,
  lastUserText,
}: {
  time: string;
  role: string;
  lang: string;
  lastUserText: string;
}) {
  const feedbackPath = process.env.GOODMINTON_FEEDBACK_MD_PATH;
  if (!feedbackPath) return;

  const entry = [
    '',
    `## ${time}`,
    '',
    `- role: ${role}`,
    `- lang: ${lang}`,
    '- source: Goodminton Academy chat',
    '',
    toMarkdownQuote(lastUserText),
    '',
  ].join('\n');

  await mkdir(dirname(feedbackPath), { recursive: true });
  await appendFile(feedbackPath, entry, 'utf8');
}

async function sendFeedbackWebhook({
  time,
  role,
  lang,
  lastUserText,
}: {
  time: string;
  role: string;
  lang: string;
  lastUserText: string;
}) {
  const webhookUrl = process.env.GOODMINTON_FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  const secret = process.env.GOODMINTON_FEEDBACK_WEBHOOK_SECRET;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        time,
        role,
        lang,
        lastUserText,
        source: 'Goodminton Academy chat',
        ...(secret ? { secret } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function logFeedback({ messages, role, lang }: { messages: UIMessage[]; role: string; lang: string }) {
  const lastUserText = getLastUserText(messages);
  if (!lastUserText) return;

  const time = new Date().toISOString();

  console.log('[goodminton-feedback]', {
    time,
    role,
    lang,
    lastUserText,
  });

  try {
    await appendFeedbackMarkdown({ time, role, lang, lastUserText });
  } catch (error) {
    console.error('[goodminton-feedback-md-error]', error);
  }

  try {
    await sendFeedbackWebhook({ time, role, lang, lastUserText });
  } catch (error) {
    console.error('[goodminton-feedback-webhook-error]', error);
  }
}

const systemPrompts = {
  student: {
    zh: `你是 Goodminton Academy 的学员反馈顾问。学员来这里主要是**反馈**——课程感受、训练进度、困惑、建议。

你的任务：
1. **认真倾听** — 让学员感觉被听见，不敷衍
2. **挖深反馈** — 追问细节，把模糊的感受变成具体信息（"哪个动作？什么情况下？")
3. **给一个实际回应** — 简单解释或给一个当下能用的小建议
4. **记录洞察** — 把学员说的话当作改进课程的原材料

说话风格：真诚、直接、有温度，像一个认真的教练助理，不像客服机器人。用中文回复，简洁有力。`,

    en: `You are the student feedback advisor for Goodminton Academy. Students come here mainly to give **feedback** — how sessions felt, training progress, confusion, suggestions.

Your tasks:
1. **Listen carefully** — make students feel heard, not brushed off
2. **Dig deeper** — ask follow-up questions to turn vague feelings into specific information ("Which shot? In what situation?")
3. **Give a practical response** — a brief explanation or one actionable tip they can use right away
4. **Note the insight** — treat what students say as raw material for improving future classes

Tone: genuine, direct, warm — like a thoughtful coaching assistant, not a customer service bot. Reply in English, concise and clear.`,
  },

  friend: {
    zh: `你是 Goodminton Academy 的羽毛球顾问，专门服务球友（非正式学员）的技术**咨询**。

你的任务：
1. **诊断问题** — 根据球友描述，判断核心技术或战术问题所在
2. **给具体建议** — 不说废话，直接给可执行的改进方向
3. **拓展思维** — 帮球友看到自己没想到的维度（对手分析、节奏控制、体能等）
4. **保持对话** — 问清楚情况再给建议，避免泛泛而谈

说话风格：专业但轻松，像一个懂球的老球友在认真帮你分析，不说官话。用中文回复，简洁有力。`,

    en: `You are the badminton consultant for Goodminton Academy, serving recreational players (not enrolled students) with technical **advice**.

Your tasks:
1. **Diagnose the problem** — based on what the player describes, identify the core technical or tactical issue
2. **Give specific advice** — skip the fluff, give directly actionable improvement directions
3. **Expand their thinking** — help them see angles they haven't considered (opponent analysis, tempo control, fitness, etc.)
4. **Keep the conversation going** — clarify the situation before giving advice; avoid vague generalisations

Tone: professional but relaxed, like a knowledgeable playing partner giving you a real analysis, not corporate speak. Reply in English, concise and clear.`,
  },
};

export async function POST(req: Request) {
  const { messages, role, lang }: { messages: UIMessage[]; role?: string; lang?: string } =
    await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const langKey = lang === 'en' ? 'en' : 'zh';
  const roleKey = role === 'friend' ? 'friend' : 'student';
  await logFeedback({ messages, role: roleKey, lang: langKey });
  const systemPrompt = systemPrompts[roleKey][langKey];

  return streamText({
    model: deepseek.chat('deepseek-chat'),
    system: systemPrompt,
    messages: modelMessages,
  }).toUIMessageStreamResponse();
}