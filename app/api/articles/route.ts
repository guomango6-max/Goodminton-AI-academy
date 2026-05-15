import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type Lang = 'zh' | 'en';

type ArticlePost = {
  title: string;
  date: string;
  category: string;
  excerpt: string;
  image: string;
  href?: string;
};

type ArticleFrontmatter = {
  slug: string;
  date: string;
  placement?: string;
  image: string;
  href?: string;
  zhTitle: string;
  enTitle: string;
  zhDate: string;
  enDate: string;
  zhCategory: string;
  enCategory: string;
  zhExcerpt: string;
  enExcerpt: string;
};

const articlesDirectory = path.join(process.cwd(), 'content', 'articles');

export const dynamic = 'force-dynamic';

function parseFrontmatter(fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  return match[1].split(/\r?\n/).reduce<Record<string, string>>((frontmatter, line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return frontmatter;

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    frontmatter[key] = value;
    return frontmatter;
  }, {});
}

function isCompleteArticle(frontmatter: Record<string, string>): frontmatter is ArticleFrontmatter {
  return [
    'slug',
    'date',
    'image',
    'zhTitle',
    'enTitle',
    'zhDate',
    'enDate',
    'zhCategory',
    'enCategory',
    'zhExcerpt',
    'enExcerpt',
  ].every((key) => Boolean(frontmatter[key]));
}

function toLocalizedPost(article: ArticleFrontmatter, lang: Lang): ArticlePost {
  return {
    title: article[`${lang}Title`],
    date: article[`${lang}Date`],
    category: article[`${lang}Category`],
    excerpt: article[`${lang}Excerpt`],
    image: article.image,
    href: article.href || '#student-portal',
  };
}

export async function GET() {
  try {
    const files = await readdir(articlesDirectory);
    const articles = (
      await Promise.all(
        files
          .filter((file) => file.endsWith('.md'))
          .map(async (file) => parseFrontmatter(await readFile(path.join(articlesDirectory, file), 'utf8'))),
      )
    )
      .filter(isCompleteArticle)
      .filter((article) => article.placement !== 'hero')
      .sort((first, second) => Date.parse(second.date) - Date.parse(first.date))
      .slice(0, 3);

    return NextResponse.json({
      zh: articles.map((article) => toLocalizedPost(article, 'zh')),
      en: articles.map((article) => toLocalizedPost(article, 'en')),
    });
  } catch {
    return NextResponse.json({ zh: [], en: [] });
  }
}
