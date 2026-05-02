# Goodminton Academy - AI 诊室

一个为羽毛球学员设计的 AI 聊天应用，帮助教练收集真实反馈并优化教学方案。

## 🚀 快速开始

### 1. 获取 DeepSeek API Key

访问 https://platform.deepseek.com/ 注册并获取 API Key（免费）

### 2. 本地开发

```bash
# 复制环境变量文件
cp .env.local.example .env.local

# 编辑 .env.local，填入你的 DEEPSEEK_API_KEY
# DEEPSEEK_API_KEY=sk_live_xxxxx

# 安装依赖
npm install

# 运行开发服务器
npm run dev
```

访问 http://localhost:3000

### 3. 部署到 Vercel

1. 推送到 GitHub：
```bash
git add .
git commit -m "Initial commit: Goodminton Academy AI 诊室"
git push origin main
```

2. 在 Vercel 导入项目：https://vercel.com/new
   - 选择你的 GitHub 仓库
   - 添加环境变量 `DEEPSEEK_API_KEY`
   - Deploy

## 📋 功能

- ✅ 实时聊天（流式响应）
- ✅ 对话保存（localStorage）
- ✅ Notion 风格 UI
- ✅ 完全免费（DeepSeek API）
- ✅ 响应式设计

## 📊 如何使用

### 供学员使用
分享部署后的链接给学员。他们可以：
- 匿名聊天（无需登录）
- 提供真实反馈
- 对话自动保存

### 供你收集数据
每周日用 Claude Code 运行数据蒸馏脚本：
- 导出所有对话
- 分析关键洞察
- 生成改进方案

## 🛠 技术栈

- **前端**: Next.js 15 + React + Tailwind CSS
- **API**: Vercel AI SDK + DeepSeek
- **部署**: Vercel（免费）
- **成本**: 完全免费（DeepSeek 免费额度）

## 📝 System Prompt

AI 会以你的教练风格回应：
- 理智、坦荡、不虚伪
- 直言不讳的反馈
- 重视学员的真实想法

## 🔄 下一步

1. [ ] 部署到 Vercel
2. [ ] 发送链接给学员
3. [ ] 每周收集反馈
4. [ ] 月度数据蒸馏 + 改进

---

**建议**: 在学员群里说：
> "这是本周的 AI 诊室。你在这里的每一个想法——不爽、困惑、小突破——都会直接被我看到，用来优化下周的方案。你的真话就是我最好的研究数据。"
