# Goodminton Articles

Homepage article cards are loaded from Markdown files in this folder.

## How It Works

- The homepage API reads `*.md` files in this folder.
- It sorts them by the `date` field in frontmatter.
- The homepage shows the latest 3 articles.
- Older files stay here as the article archive.

## Daily Hot Articles

The scheduled task `Goodminton Hot Articles` runs:

```powershell
npm run articles:hot -- --out content\articles
```

The script writes files named like:

```text
hot-doubles-first-three-2026-05-16.md
```

If the task runs multiple times on the same day, it replaces that day's auto-generated hot files. It does not delete older dates.

## Manual Articles

You can also add a manual article by creating a new `.md` file here with this frontmatter:

```md
---
slug: my-article-slug
date: 2026-05-16
image: /article-free.svg
href: "#student-portal"
zhTitle: 中文标题
enTitle: English title
zhDate: 2026年5月16日
enDate: May 16, 2026
zhCategory: 分类
enCategory: Category
zhExcerpt: 中文摘要
enExcerpt: English excerpt
---
```
