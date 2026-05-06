'use client';

import { useState } from 'react';
import { Lang } from './LangContext';

const copy = {
  zh: {
    label: '联系教练',
    tagline: '欢迎随时聊聊训练、约球或反馈',
    wechatCopy: '复制',
    wechatCopied: '已复制',
    whatsappLabel: 'WhatsApp',
    wechatLabel: '微信',
    emailLabel: '邮箱',
    rights: 'Goodminton Academy · 芒果教练',
  },
  en: {
    label: 'Contact Coach',
    tagline: 'Reach out about training, matches, or feedback',
    wechatCopy: 'copy',
    wechatCopied: 'copied',
    whatsappLabel: 'WhatsApp',
    wechatLabel: 'WeChat',
    emailLabel: 'Email',
    rights: 'Goodminton Academy · Coach Mango',
  },
};

function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconWeChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="9" cy="9" rx="6.5" ry="5" />
      <ellipse cx="16" cy="15" rx="5.5" ry="4.5" />
      <circle cx="7" cy="8.5" r="0.6" fill="currentColor" />
      <circle cx="11" cy="8.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="14.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="14.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export default function ContactFooter({ lang = 'zh' }: { lang?: Lang }) {
  const [copied, setCopied] = useState(false);
  const t = copy[lang];

  const copyWeChat = () => {
    navigator.clipboard.writeText('guomango').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <footer className="relative mt-16 pb-8">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-5">
        <div className="relative mb-10 flex items-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-300" />
          <div className="mx-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-700" />
            {t.label}
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-300" />
        </div>

        <p className="mb-6 text-center text-sm text-slate-500">{t.tagline}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a
            href="https://wa.me/358413134358"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl border border-emerald-700/25 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-[0_10px_30px_-20px_rgba(4,120,87,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-700/50 hover:shadow-[0_18px_40px_-20px_rgba(4,120,87,0.4)]"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl transition-opacity duration-500 group-hover:bg-emerald-200/70" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-700/30 bg-emerald-700/8 text-emerald-800">
                <IconWhatsApp />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-800/80">{t.whatsappLabel}</p>
                <p className="truncate text-sm font-semibold text-slate-900">+358 41 313 4358</p>
              </div>
            </div>
          </a>

          <button
            onClick={copyWeChat}
            className="group relative overflow-hidden rounded-2xl border border-black/8 bg-white p-5 text-left shadow-[0_10px_30px_-20px_rgba(15,23,42,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:border-black/15"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-slate-50 text-slate-700">
                <IconWeChat />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{t.wechatLabel}</p>
                <p className="truncate font-mono text-sm font-semibold text-slate-900">guomango</p>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium tracking-wider transition-colors ${
                  copied
                    ? 'border-emerald-700/40 bg-emerald-700/8 text-emerald-800'
                    : 'border-black/10 bg-slate-50 text-slate-500 group-hover:border-black/20 group-hover:text-slate-700'
                }`}
              >
                {copied ? t.wechatCopied : t.wechatCopy}
              </span>
            </div>
          </button>

          <a
            href="mailto:guomango6@gmail.com"
            className="group relative overflow-hidden rounded-2xl border border-black/8 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:border-black/15"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-slate-50 text-slate-700">
                <IconMail />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{t.emailLabel}</p>
                <p className="truncate text-sm font-semibold text-slate-900">guomango6@gmail.com</p>
              </div>
            </div>
          </a>
        </div>

        <p className="mt-10 text-center text-[11px] uppercase tracking-[0.25em] text-slate-400">
          © {new Date().getFullYear()} · {t.rights}
        </p>
      </div>
    </footer>
  );
}
