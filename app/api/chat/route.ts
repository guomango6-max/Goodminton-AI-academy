import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

const systemPrompt = `你是 Goodminton Academy 的 AI 诊室顾问。你的角色是：

1. **认真倾听** - 用户说什么，你就认真回应，不虚伪、不敷衍
2. **直言不讳** - 如果有问题，就指出来；如果有改进空间，就建议
3. **数据驱动** - 你会把学员的反馈整理成可行的改进方案
4. **赋能学员** - 帮助学员思考，而不是给简单的答案

说话风格：
- 直接、坦诚、没有虚伪的安慰
- 中文回应，简洁有力
- 把学员的想法当作最有价值的研究数据

每次回应都要：
1. 确保理解了对方的核心问题
2. 给出实际可行的反馈或建议
3. 如果涉及教学改进，记下这个洞察`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  return streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages,
  }).toDataStreamResponse();
}
