'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Link from 'next/link';
import ContactFooter from './ContactFooter';
import { Lang, useLang } from './LangContext';

type Prompt = { icon: string; text: string };
type ChatCopy = {
  subtitle: string;
  welcomeTitle: string;
  welcomeDesc: string;
  prompts: Prompt[];
};

interface ChatRoomProps {
  role: 'student' | 'friend';
  accentColor: 'blue' | 'emerald';
  title: string;
  copy: Record<Lang, ChatCopy>;
}

export default function ChatRoom({
  role,
  accentColor,
  title,
  copy,
}: ChatRoomProps) {
  const { lang } = useLang();
  const [dynamicPrompts, setDynamicPrompts] = useState<Partial<Record<Lang, Prompt[]>>>({});
  const t = { ...copy[lang], prompts: dynamicPrompts[lang]?.length ? dynamicPrompts[lang] : copy[lang].prompts };
  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { role, lang },
    }),
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';
  const ui = {
    zh: {
      back: '返回',
      channel: role === 'student' ? '学员频道' : '球友频道',
      promptLabel: '可以这样开始',
      placeholder: role === 'student' ? '写下你的反馈或问题...' : '问我任何关于羽毛球的事...',
      send: '发送',
      errorTitle: '聊天暂时不可用',
      retryHint: '请稍后再试，或联系教练检查 DeepSeek API 配置。',
    },
    en: {
      back: 'Back',
      channel: role === 'student' ? 'Student room' : 'Player room',
      promptLabel: 'Start with one of these',
      placeholder: role === 'student' ? 'Share your feedback or question...' : 'Ask me anything about badminton...',
      send: 'Send',
      errorTitle: 'Chat is temporarily unavailable',
      retryHint: 'Please try again later, or ask the coach to check the DeepSeek API configuration.',
    },
  }[lang];

  const accent = {
    blue: {
      header: 'from-blue-500 to-blue-600',
      button: 'bg-blue-500 hover:bg-blue-600',
      ring: 'focus:ring-blue-500',
      cardHover: 'hover:border-blue-300 hover:bg-blue-50',
      badge: 'bg-blue-100 text-blue-700',
    },
    emerald: {
      header: 'from-emerald-500 to-emerald-600',
      button: 'bg-emerald-500 hover:bg-emerald-600',
      ring: 'focus:ring-emerald-500',
      cardHover: 'hover:border-emerald-300 hover:bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-700',
    },
  }[accentColor];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (role !== 'friend') return;

    let isMounted = true;

    async function loadPrompts() {
      try {
        const response = await fetch('/api/qa-prompts');
        const payload = (await response.json()) as Partial<Record<Lang, Prompt[]>>;

        if (response.ok && isMounted) {
          setDynamicPrompts(payload);
        }
      } catch {
        // Keep the built-in prompts if local prompt loading fails.
      }
    }

    void loadPrompts();

    return () => {
      isMounted = false;
    };
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    clearError();
    sendMessage({ text: input });
    setInput('');
  };

  const handlePromptClick = (text: string) => {
    if (isLoading) return;
    clearError();
    sendMessage({ text });
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-600 mr-1 transition-colors" title={ui.back}>
            ←
          </Link>
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent.header} flex items-center justify-center`}>
            <span className="text-sm font-bold text-white">G</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 leading-none">{title}</h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">{t.subtitle}</p>
          </div>
          <span className={`ml-auto hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${accent.badge}`}>
            {ui.channel}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl font-bold text-slate-700 shadow-sm">
              {role === 'student' ? 'S' : 'P'}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.welcomeTitle}</h2>
            <p className="mb-8 max-w-md px-1 text-sm leading-relaxed text-slate-600 [word-break:break-all] sm:[word-break:normal]">
              {t.welcomeDesc}
            </p>

            <div className="w-full max-w-2xl">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-medium">{ui.promptLabel}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {t.prompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePromptClick(prompt.text)}
                    disabled={isLoading}
                    className={`group flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:shadow-sm ${accent.cardHover}`}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-lg">{prompt.icon}</span>
                    <span className="min-w-0 text-sm leading-snug text-slate-600 [word-break:break-all] group-hover:text-slate-900 sm:[word-break:normal]">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg px-4 py-3 rounded-lg text-sm leading-relaxed ${
                    message.role === 'user'
                      ? `${accent.button.split(' ')[0]} text-white rounded-br-none`
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {message.parts
                    .filter((p) => p.type === 'text')
                    .map((p) => (p as { type: 'text'; text: string }).text)
                    .join('') ||
                    /* fallback for any structural variation */
                    (message as unknown as { content?: string }).content ||
                    ''}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg rounded-bl-none shadow-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {error ? (
              <div className="flex justify-start">
                <div className="max-w-lg rounded-lg rounded-bl-none border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                  <div className="font-semibold">{ui.errorTitle}</div>
                  <div className="mt-1">{error.message || ui.retryHint}</div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex min-w-0 gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ui.placeholder}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 ${accent.ring} focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 text-sm`}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`px-6 py-3 rounded-lg ${accent.button} text-white font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm`}
            >
              {ui.send}
            </button>
          </div>
        </form>
      </div>

      <ContactFooter lang={lang} />
    </div>
  );
}
