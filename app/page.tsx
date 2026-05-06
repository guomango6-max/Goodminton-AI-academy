'use client';

import Image from 'next/image';
import Link from 'next/link';
import ContactFooter from './components/ContactFooter';
import { useLang } from './components/LangContext';

const copy = {
  zh: {
    eyebrow: 'Goodminton Academy',
    heading: '明德 · 新民 · 至善',
    intro: '',
    studentTitle: '我是学员',
    studentDesc: '记录课后感受、训练问题和技术反馈，让下一节课更贴近你的真实状态。',
    studentCta: '进入学员教室',
    friendTitle: '我是球友',
    friendDesc: '聊约球、比赛分析和战术选择，把一次对话变成更清晰的行动。',
    friendCta: '开始聊天',
    subtitle: 'AI 教室',
    philosophyKicker: 'GOOD intentions. MINimal steps. consistent TONe.',
    philosophyLine: '梯度向上 步长变小 路径积分',
    philosophyChinese: '梯度向上 · 步长变小 · 路径积分',
    studentMeta: 'Feedback / Training / Lesson',
    friendMeta: 'Tactics / Match / Play',
    imageAlt: '旧书墙图片，象征训练知识库和长期积累',
  },
  en: {
    eyebrow: 'Goodminton Academy',
    heading: 'Clearer, kinder, more useful badminton coaching.',
    intro: 'Choose an entry point to share training feedback or start a focused conversation about technique, tactics, and lessons.',
    studentTitle: "I'm a Student",
    studentDesc: 'Capture session feelings, training issues, and technique feedback so the next lesson starts from the right place.',
    studentCta: 'Enter student room',
    friendTitle: "I'm a Player",
    friendDesc: 'Talk games, match analysis, and tactical choices, then turn the conversation into clearer action.',
    friendCta: 'Start chatting',
    subtitle: 'AI Coach',
    philosophyKicker: 'Goodminton',
    philosophyLine: '梯度向上 步长变小 路径积分',
    philosophyChinese: 'Upward gradient 路 smaller steps 路 path integration',
    studentMeta: 'Feedback / Training / Lesson',
    friendMeta: 'Tactics / Match / Play',
    imageAlt: 'Old books on shelves, suggesting a training knowledge base and long-term accumulation',
  },
};

export default function Home() {
  const { lang, toggle } = useLang();
  const t = copy[lang];

  return (
    <div className="min-h-screen bg-[#0d0f10] text-white">
      <header className="fixed top-4 left-0 right-0 z-50">
        <div className="mx-auto flex w-[min(1120px,calc(100%-24px))] items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CCFF00]/40 bg-[#CCFF00]/10">
            <span className="text-base font-semibold text-[#CCFF00]">G</span>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">Goodminton Academy</h1>
            <p className="text-xs text-white/60">{t.subtitle}</p>
          </div>
          <button
            onClick={toggle}
            className="ml-auto h-9 rounded-md border border-white/20 bg-white/5 px-3 text-sm font-medium text-white/80 transition-colors hover:border-[#CCFF00]/60 hover:text-[#CCFF00]"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-10 pt-24 sm:px-5">
        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#141617] p-7 md:col-span-8 md:row-span-4 md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#CCFF00]/12 blur-3xl" />
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#CCFF00]">{t.eyebrow}</p>
            <h2 className={`mt-4 max-w-2xl font-semibold leading-[1.1] text-white ${lang === 'zh' ? 'text-3xl sm:text-5xl' : 'text-4xl sm:text-6xl'}`}>
              {t.heading}
            </h2>
            <div className="mt-7 inline-flex items-center rounded-lg border border-[#CCFF00]/40 bg-[#CCFF00]/10 px-4 py-2 text-xs font-medium tracking-[0.16em] text-[#CCFF00]">
              {t.philosophyLine}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/15 bg-[#151718] md:col-span-4 md:row-span-4">
            <Image
              src="/wiki-life-hero.jpg"
              alt={t.imageAlt}
              width={2048}
              height={1110}
              priority
              className="h-full min-h-[280px] w-full object-cover opacity-80 contrast-110"
            />
          </div>

          <Link
            href="/student"
            className="group rounded-3xl border border-white/15 bg-[#141617] p-6 transition-all hover:border-[#CCFF00]/60 hover:bg-[#1a1d1e] md:col-span-6 md:row-span-2"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t.studentMeta}</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">{t.studentTitle}</h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/70">{t.studentDesc}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-[#CCFF00]/40 bg-[#CCFF00]/10 px-3 py-2 text-sm font-medium text-[#CCFF00]">
              {t.studentCta}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </Link>

          <Link
            href="/friend"
            className="group rounded-3xl border border-white/15 bg-[#141617] p-6 transition-all hover:border-[#CCFF00]/60 hover:bg-[#1a1d1e] md:col-span-6 md:row-span-2"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{t.friendMeta}</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">{t.friendTitle}</h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/70">{t.friendDesc}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-3 py-2 text-sm font-medium text-white">
              {t.friendCta}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </Link>

        </section>
      </main>

      <ContactFooter lang={lang} />
    </div>
  );
}




