# 羽毛球训练纠错外网抓取自动化

目标：从外网抓取羽毛球训练方法、动作纠错、步法发力等内容，自动整理成 Obsidian 训练卡片，而不是 Goodminton 内部资料或普通新闻摘要。

源语言不限。抓取阶段可以接受中文、英文、印尼语、马来语、丹麦语、德语、西语、法语等内容；最终训练卡以中文为主，并在可用时附英文版。

## 自动化流程

```text
外网 RSS / 指定网页 URL
-> fetch-external-training-sources.mjs 抓取标题、正文、来源链接
-> D:\raw\gc
-> Make.com / Zapier / AI 处理 raw JSON
-> training-inbox
-> create-training-note.mjs 生成 Markdown
-> D:\ob
```

建议先从 RSS、YouTube 字幕、手动链接开始。Instagram、X、小红书等平台限制更多，适合作为第二阶段。

## 外网抓取源

复制示例配置：

```powershell
Copy-Item scripts\external-training-sources.example.json scripts\external-training-sources.json
```

编辑 `scripts\external-training-sources.json`，添加 RSS 或网页 URL：

```json
{
  "sources": [
    {
      "name": "Badminton training feed",
      "type": "rss",
      "url": "https://example.com/badminton-training.xml",
      "keywords": ["badminton", "training", "footwork", "羽毛球", "训练", "纠错"]
    },
    {
      "name": "Manual URLs",
      "type": "urls",
      "urls": ["https://example.com/badminton-smash-technique"],
      "keywords": ["badminton", "training", "羽毛球", "训练"]
    }
  ]
}
```

抓取外网内容：

```powershell
node scripts\fetch-external-training-sources.mjs --config scripts\external-training-sources.json --out "D:\raw\gc"
```

短命令：

```powershell
.\bb
```

提高每个源最多检查的条数：

```powershell
.\bb -Max 50
```

先预览，不写文件：

```powershell
.\bb -DryRun -Max 50
```

抓取结束后会输出 `Source report`，用于判断每个源是新增少、重复多、被关键词过滤，还是请求失败。

## 抓取效率策略

常规 `bb` 只保留高频增量源：

- RSS：适合每次运行检查少量最新内容。
- Brave Search：启用 key 后用于主动发现新 URL。

一次性种子源默认设为 `enabled: false`：

- 固定教程页面
- 已处理论文列表
- 已验证但当前低产出的 RSS

需要重新跑这些种子源时，临时把对应来源改回：

```json
"enabled": true
```

源配置支持单源限量：

```json
"maxItems": 5
```

默认报告会隐藏 disabled 源；需要排查完整配置时，可直接运行底层脚本并加 `--show-disabled`。

## 源头拓宽策略

新来源分三层管理：

1. `active`：稳定高价值，进入常规 `gc`。
2. `trial`：小流量试跑，必须 dry-run 看 `new/filtered/seen/error`。
3. `candidate`：候选池，不进入常规抓取。

候选源池：

```text
scripts\source-candidates.json
```

拓源原则：

- 不把未经验证的 RSS/网站直接放进高频采集。
- 先看最近 3-8 条是否有具体训练方法、纠错、教练话术。
- 动机鸡汤、装备评测、营养、规则、赛事新闻，降级或过滤。
- 一次性高价值文章页放 `enabled: false`，需要提取时临时启用。
- 小红书、抖音、快手、优酷等平台先做线索发现，不直接当训练事实来源。
- 不按语言限制来源；按训练密度和可验证性筛选。

## YouTube 字幕入口 bf

`bf` 已合并为项目根目录短命令，专门处理 YouTube 字幕，不和 `bb` 混用。

```powershell
.\bf -Url "https://www.youtube.com/@full-swing/videos" -Name "full-swing" -Limit 20
```

默认字幕语言：

```text
zh-Hans,zh-Hant,zh,en
```

默认输出根目录：

```text
D:\ob\.obsidian\_sources\work\youtube
```

流程：

```text
YouTube URL
-> yt-dlp 下载字幕
-> scripts\fetch-youtube-transcripts.mjs 生成字幕 JSON 和审计表
-> scripts\convert-vtt-to-txt.ps1 清洗 .vtt/.srt 为 .txt
```

只转换已有字幕：

```powershell
.\bf -ConvertOnly -SourceDir "D:\ob\.obsidian\_sources\work\youtube\full-swing\_yt-dlp"
```

## 集成信息采集器 gc

`gc` 是统一编排器，用来一次性跑多个采集步骤。它不替代 `bb` 或 `bf`，而是按参数调用它们。

默认只跑网页/RSS/Brave/论文增量：

```powershell
.\gc
```

预览，不写报告：

```powershell
.\gc -DryRun
```

网页采集 + 处理已有 training-inbox：

```powershell
.\gc -ProcessInbox
```

网页采集 + raw 外层清洗：

```powershell
.\gc -CleanRaw
```

只采集 YouTube 字幕：

```powershell
.\gc -Mode youtube -YouTubeUrl "https://www.youtube.com/@full-swing/videos" -YouTubeName "full-swing" -YouTubeLimit 20
```

网页和 YouTube 一起跑：

```powershell
.\gc -Mode all -YouTubeUrl "https://www.youtube.com/@full-swing/videos" -YouTubeName "full-swing"
```

批量跑精选新媒体源：

```powershell
.\gc -Mode youtube -UseYouTubeSources
```

新媒体源配置：

```text
scripts\youtube-sources.json
```

当前默认启用的重点频道：

- Badminton Insight
- Tobias Wadenka
- Shuttle Life
- Badminton Famly
- BG Badminton

`BadmintonWorld.tv` 默认关闭，只在做战术案例复盘时启用。

正式运行后会写采集报告到：

```text
D:\Badminton\collector-reports
```

## Raw 外层清洗 bc

`bc` 负责 raw 后处理，不做正式入库判断。它从 `D:\raw\gc` 读取原始 JSON，输出清洗后的 Markdown、clean JSON、manifest 到 `D:\raw-clean`。

```powershell
.\bc
```

预览：

```powershell
.\bc -DryRun
```

处理旧 raw 目录：

```powershell
.\bc -SourceDir "D:\Badminton\raw-training-inbox" -Out "D:\raw-clean"
```

清洗内容：

- 抓取字段标准化：标题、来源、作者、发布时间、原始文件。
- 正文去噪：导航、登录、分享、隐私政策、重复短句等。
- 转 Markdown：保留 metadata、clean text、chunks。
- 按段切块：默认约 1600 字符一块。
- 相似块合并：基于段落和 chunk fingerprint 去重，跨文件重复块只保留第一份。
- 自动打标签：步法、杀球、接发、发球、网前、防守、双打、多球、战术、纠错、体能、生物力学、论文、视频字幕等。
- 低价值过滤：装备、新闻、价格、营养、过短内容、训练密度低内容。

manifest 会显示每条素材的 `Status / Tags / Chunks / Title / Source / Reason`，用于快速人工扫选。

输出仍是 `pending-review`，由人工决定是否进入正式训练卡。

## Brave Search 增量发现

`scripts\external-training-sources.json` 里可以配置 `type: "brave-search"` 的来源。它会先用 Brave Search 找新 URL，再抓网页正文进入 raw inbox。

启用前先在 `scripts\training-automation.env.ps1` 加：

```powershell
$env:BRAVE_SEARCH_API_KEY = "your-brave-search-api-key"
```

未设置 key 时，`bb` 会跳过 Brave Search 来源，RSS 和固定 URL 仍然照常运行。

当前配置包含两类 Brave 增量发现：

- `Brave incremental training discovery`：找教练文章、训练教程、纠错页面。
- `Brave scholarly badminton discovery`：找论文摘要、开放全文和研究站点，如 PubMed、PMC、Frontiers、MDPI、PLOS、Springer。
- `Brave Chinese coaching discovery`：找中文训练方法、教案、纠错、双打轮转、多球训练。
- `Brave Chinese platform discovery`：重点找爱羽客、小红书、抖音、快手、优酷、中羽网/中羽在线、知乎上的羽毛球训练线索。
- `Brave English coaching blog discovery`：找英文教练博客、学院文章、训练教案。
- `Brave international coaching discovery`：找非中英文训练资料，如印尼/马来、丹麦、德国、西语、法语等羽毛球训练内容。

中文平台处理原则：

- 爱羽客 / 中羽在线 / 中羽网 / 知乎：优先尝试网页正文抓取。
- 小红书 / 抖音 / 快手 / 优酷：优先当作线索发现源，只保存标题、摘要、链接；公开视频需要后续人工筛选或单独字幕/视频流程。
- 平台内容进入训练卡前必须保留来源链接，并区分“原作者观点”和“上课建议”。

另外还有 `Known badminton biomechanics papers`，用于保存人工确认过的论文/DOI 种子源。继续添加论文时，优先放可访问的文章页或期刊页；如果 DOI 跳转不稳定，就保留解析后的文章页，并在 `titles` 里补明确标题。

论文类素材进入 AI 提取时，不要直接写成绝对训练结论。把研究发现转成训练卡片时，应区分 `研究支持` 和 `上课建议`，并保留论文来源链接。

## 双语训练卡格式

AI 提取时建议输出中文主卡，并附 `english` 或 `en` 对象。`create-training-note.mjs` 会把英文内容追加为 `English Version`。

```json
{
  "decision": "save",
  "title": "中文标题",
  "topic": "",
  "technique": "",
  "level": "",
  "source": "",
  "published": "",
  "author": "",
  "sourceLanguage": "en / zh / id / da / de / es / fr / other",
  "summary": "",
  "coreProblem": "",
  "commonErrors": [],
  "causes": [],
  "corrections": [],
  "drills": [],
  "coachCues": [],
  "standards": [],
  "tags": [],
  "english": {
    "title": "English title",
    "summary": "",
    "coreProblem": "",
    "commonErrors": [],
    "causes": [],
    "corrections": [],
    "drills": [],
    "coachCues": [],
    "standards": []
  }
}
```

输出的 raw JSON 不是最终 Obsidian 笔记，它是给 AI 的输入素材。

定时抓取外网：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-external-fetch-task.ps1
```

默认每 60 分钟抓取一次。改成每 30 分钟：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-external-fetch-task.ps1 -IntervalMinutes 30
```

## Make.com 场景

1. Trigger
   - RSS: Watch RSS feed items
   - YouTube: Watch videos in a channel
   - Manual: Webhook 接收你发来的链接或正文

2. Content
   - 从 `D:\raw\gc` 读取 raw JSON
   - 传入字段：
     - `title`
     - `url`
     - `published`
     - `author`
     - `text`
     - `imageUrl`

3. AI
   - 使用下面的 System Prompt 和 User Prompt
   - 要求输出 JSON，不要输出 Markdown

4. Router
   - 如果 `decision` 是 `skip`，结束
   - 如果 `decision` 是 `save`，继续

5. Storage
   - 最简单：把 AI 输出 JSON 保存到 `D:\Badminton\training-inbox`
   - 进阶：Make.com 直接用 Markdown 模板写入 Google Drive/Dropbox

## System Prompt

```text
你是 Goodminton 的羽毛球训练方法与动作纠错助理。

你的任务不是总结新闻，而是把输入内容转化为可执行的训练知识卡片。

只收录以下内容：
- 羽毛球技术训练方法
- 动作纠错
- 步法、启动、重心、连贯
- 发力机制、击球点、拍面控制
- 多球训练、影子步法、专项训练
- 教练可以直接拿去上课使用的练习

跳过以下内容：
- 比赛新闻
- 球员八卦
- 装备营销
- 泛泛励志内容
- 没有明确训练动作或纠错价值的内容

输出必须是严格 JSON。
不要输出 Markdown。
不要添加解释。
```

## User Prompt

```text
请分析以下羽毛球内容，并按 JSON schema 输出。

如果不值得收录：
- decision = "skip"
- skipReason 简短说明原因
- 其他字段可以为空数组或空字符串

如果值得收录：
- decision = "save"
- 用中文生成训练纠错卡片
- 不要编造原文没有的组数、频率或技术细节
- 如果原文没有给组数，把 drills[].sets 写成 "原文未说明"
- coachCues 必须是教练能直接说出口的短句
- standards 必须是可以观察的改进标准

JSON schema:
{
  "decision": "save 或 skip",
  "skipReason": "",
  "title": "",
  "topic": "",
  "technique": "",
  "level": "初学 / 进阶 / 高水平 / 青少年 / 成人业余 / 通用",
  "source": "",
  "published": "",
  "author": "",
  "summary": "",
  "coreProblem": "",
  "commonErrors": [],
  "causes": [],
  "corrections": [],
  "drills": [
    {
      "name": "",
      "goal": "",
      "steps": [],
      "sets": "",
      "attention": [],
      "standard": ""
    }
  ],
  "coachCues": [],
  "standards": [],
  "tags": []
}

输入：
标题：{{title}}
来源：{{url}}
发布时间：{{published}}
作者：{{author}}
正文或字幕：
{{text}}
```

## Obsidian 输出格式

生成的 Markdown 使用这些核心区块：

- 核心问题
- 常见错误
- 错误原因
- 纠正方法
- 训练方法
- 教练提示
- 可观察标准
- 原始来源

对应脚本：

```powershell
node scripts\create-training-note.mjs --input path\to\ai-output.json --out "D:\Obsidian\badminton\training"
```

也可以从标准输入读取：

```powershell
Get-Content path\to\ai-output.json | node scripts\create-training-note.mjs --out "D:\Obsidian\badminton\training"
```

## 批量自动入库

Make.com / Zapier 可以把 AI 输出 JSON 保存到一个 inbox 文件夹，例如：

```text
D:\Badminton\training-inbox
```

然后在电脑上定期运行：

```powershell
node scripts\create-training-note.mjs --inbox "D:\Badminton\training-inbox" --out "D:\ob" --archive "D:\Badminton\training-archive"
```

脚本会：

- 读取 inbox 里的 `.json`、`.txt`、`.md`
- `decision = "save"` 时生成 Obsidian Markdown
- `decision = "skip"` 时不生成笔记
- 如果加了 `--archive`，会把输入文件移动到 `processed`、`skipped` 或 `failed`

先检查结果时可以加：

```powershell
node scripts\create-training-note.mjs --inbox "D:\Badminton\training-inbox" --out "D:\ob" --dry-run
```

## 本地定时运行

仓库里还有一个 PowerShell 包装脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-training-inbox.ps1
```

默认路径：

```text
inbox:   .\training-inbox
out:     .\training-notes
archive: .\training-archive
```

你也可以用环境变量改成真实 Obsidian 路径。推荐复制配置样例：

```powershell
Copy-Item scripts\training-automation.env.example scripts\training-automation.env.ps1
```

然后编辑 `scripts\training-automation.env.ps1`：

```powershell
$env:BADMINTON_RAW_INBOX="D:\raw\gc"
$env:BADMINTON_TRAINING_INBOX="D:\Badminton\training-inbox"
$env:BADMINTON_TRAINING_OUT="D:\ob"
$env:BADMINTON_TRAINING_ARCHIVE="D:\Badminton\training-archive"
$env:BADMINTON_FETCH_STATE="D:\Badminton\training-fetch-state.json"
```

手动运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-training-inbox.ps1
```

安装 Windows 任务计划：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-training-inbox-task.ps1
```

默认每 15 分钟扫描一次 inbox。改成每 5 分钟：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-training-inbox-task.ps1 -IntervalMinutes 5
```

先预览任务命令，不安装：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-training-inbox-task.ps1 -WhatIf
```

示例 AI 输出在：

- `docs\examples\training-correction-save.json`
- `docs\examples\training-correction-skip.json`

## 推荐标签

```text
#羽毛球/训练
#羽毛球/纠错
#技术/高远球
#技术/杀球
#技术/吊球
#技术/网前
#技术/接杀
#技术/发接发
#技术/步法
#问题/发力错误
#问题/重心不稳
#问题/击球点
#问题/拍面控制
#训练/多球
#训练/影子步法
#训练/专项力量
```

## 第一阶段建议

先只做一个入口：

```text
手动链接或 RSS
-> AI JSON
-> 本地脚本生成 Markdown
-> Obsidian vault
```

等笔记质量稳定后，再接 YouTube 字幕和社交媒体。
