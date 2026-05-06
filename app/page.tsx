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
    philosophyChinese: 'Upward gradient · smaller steps · path integration',
    studentMeta: 'Feedback / Training / Lesson',
    friendMeta: 'Tactics / Match / Play',
    imageAlt: 'Old books on shelves, suggesting a training knowledge base and long-term accumulation',
  },
};

export default function Home() {
  const { lang, toggle } = useLang();
  const t = copy[lang];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f1f2f4] text-slate-900">
      {/* ambient background — court grid + soft tint */}
      <div className="court-lines-light pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -left-32 top-40 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-lime-200/40 blur-3xl" />

      <header className="fixed top-4 left-0 right-0 z-50 animate-fade-up">
        <div className="mx-auto flex w-[min(1120px,calc(100%-24px))] items-center gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3 backdrop-blur-xl shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-700/30 bg-emerald-700/8">
            <span className="text-base font-semibold text-emerald-800">G</span>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">Goodminton Academy</h1>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>
          <button
            onClick={toggle}
            className="ml-auto h-9 rounded-md border border-black/10 bg-white/60 px-3 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-700/40 hover:text-emerald-800"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-3 pb-10 pt-24 sm:px-5">
        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-6">
          <div className="card-hover-light animate-fade-up delay-1 relative overflow-hidden rounded-3xl border border-black/8 bg-gradient-to-br from-white via-white to-emerald-50/60 p-7 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.18)] md:col-span-8 md:row-span-4 md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="pointer-events-none absolute right-8 top-8 text-emerald-700/40" aria-hidden>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="14" cy="42" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M18 38 L46 12 M22 36 L48 16 M16 32 L42 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M44 10 L50 6 M46 14 L52 10 M40 8 L46 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
              </svg>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-800">{t.eyebrow}</p>
            <h2
              className={`mt-4 max-w-2xl font-semibold leading-[1.1] text-slate-900 ${
                lang === 'zh' ? 'hero-zh text-4xl sm:text-6xl tracking-wide' : 'text-4xl sm:text-6xl'
              }`}
            >
              {t.heading}
            </h2>
            <div className="mt-8 inline-grid grid-cols-3 gap-x-8 gap-y-2 text-emerald-800">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em]">
                <strong className="font-semibold">GOOD</strong> intentions
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em]">
                <strong className="font-semibold">MIN</strong>imal steps
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em]">
                consistent <strong className="font-semibold">TON</strong>e
              </p>
              <p className="text-sm font-medium tracking-[0.18em]">梯度向上</p>
              <p className="text-sm font-medium tracking-[0.18em]">步长变小</p>
              <p className="text-sm font-medium tracking-[0.18em]">路径积分</p>
            </div>
          </div>

          <div className="animate-fade-up delay-2 group relative overflow-hidden rounded-3xl border border-black/8 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.18)] md:col-span-4 md:row-span-4">
            <Image
              src="/wiki-life-hero.jpg"
              alt={t.imageAlt}
              width={2048}
              height={1110}
              priority
              className="h-full min-h-[280px] w-full object-cover transition-all duration-700 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
          </div>

          <Link
            href="/student"
            className="card-hover-light animate-fade-up delay-3 group relative overflow-hidden rounded-3xl border border-black/8 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.15)] md:col-span-6 md:row-span-2"
          >
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-200/0 blur-2xl transition-all duration-500 group-hover:bg-emerald-200/60" />
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t.studentMeta}</p>
            <h3 className="mt-4 text-2xl font-semibold text-slate-900">{t.studentTitle}</h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">{t.studentDesc}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-emerald-700/30 bg-emerald-700/8 px-3 py-2 text-sm font-medium text-emerald-800">
              {t.studentCta}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </Link>

          <Link
            href="/friend"
            className="card-hover-light animate-fade-up delay-4 group relative overflow-hidden rounded-3xl border border-black/8 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.15)] md:col-span-6 md:row-span-2"
          >
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-lime-200/0 blur-2xl transition-all duration-500 group-hover:bg-lime-200/60" />
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t.friendMeta}</p>
            <h3 className="mt-4 text-2xl font-semibold text-slate-900">{t.friendTitle}</h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">{t.friendDesc}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-black/10 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors group-hover:border-emerald-700/30 group-hover:text-emerald-800">
              {t.friendCta}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </Link>

        </section>
      </main>

      <ContactFooter lang={lang} />
    </div>
  );
}
