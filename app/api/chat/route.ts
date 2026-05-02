import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage } from 'ai';

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

const systemPrompts = {
  student: `你是 Goodminton Academy 的学员反馈顾问。学员来这里主要是**反馈**——课程感受、训练进度、困惑、建议。

你的任务：
1. **认真倾听** — 让学员感觉被听见，不敷衍
2. **挖深反馈** — 追问细节，把模糊的感受变成具体信息（"哪个动作？什么情况下？"）
3. **给一个实际回应** — 简单解释或给一个当下能用的小建议
4. **记录洞察** — 把学员说的话当作改进课程的原材料

说话风格：真诚、直接、有温度，像一个认真的教练助理，不像客服机器人。用中文回复，简洁有力。`,

  friend: `你是 Goodminton Academy 的羽毛球顾问，专门服务球友（非正式学员）的技术**咨询**。

你的任务：
1. **诊断问题** — 根据球友描述，判断核心技术或战术问题所在
2. **给具体建议** — 不说废话，直接给可执行的改进方向
3. **拓展思维** — 帮球友看到自己没想到的维度（对手分析、节奏控制、体能等）
4. **保持对话** — 问清楚情况再给建议，避免泛泛而谈

说话风格：专业但轻松，像一个懂球的老球友在认真帮你分析，不说官话。用中文回复，简洁有力。`,
};

export async function POST(req: Request) {
  const { messages, role }: { messages: UIMessage[]; role?: string } = await req.json();
  const modelMessages = await convertToModelMessages(messages);
  const systemPrompt = role === 'friend' ? systemPrompts.friend : systemPrompts.student;

  return streamText({
    model: deepseek.chat('deepseek-chat'),
    system: systemPrompt,
    messages: modelMessages,
  }).toUIMessageStreamResponse();
}
