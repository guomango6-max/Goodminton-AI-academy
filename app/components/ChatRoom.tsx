'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Link from 'next/link';
import ContactFooter from './ContactFooter';

type Prompt = { icon: string; text: string };

interface ChatRoomProps {
  role: 'student' | 'friend';
  accentColor: 'blue' | 'emerald';
  title: string;
  subtitle: string;
  welcomeTitle: string;
  welcomeDesc: string;
  prompts: Prompt[];
}

export default function ChatRoom({
  role,
  accentColor,
  title,
  subtitle,
  welcomeTitle,
  welcomeDesc,
  prompts,
}: ChatRoomProps) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { role },
    }),
  });

  const [input, setInput] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

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

  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-600 mr-1 transition-colors" title="返回">
            ←
          </Link>
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent.header} flex items-center justify-center`}>
            <span className="text-white font-bold">🏸</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${accent.badge}`}>
            {role === 'student' ? '学员频道' : '球友频道'}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-3xl">
              {role === 'student' ? '🎓' : '🤝'}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{welcomeTitle}</h2>
            <p className="text-slate-600 max-w-md mb-8 text-sm leading-relaxed">{welcomeDesc}</p>

            <div className="w-full max-w-2xl">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-medium">可以这样开始</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage({ text: prompt.text })}
                    className={`flex items-start gap-3 text-left px-4 py-3 rounded-xl border border-slate-200 bg-white ${accent.cardHover} hover:shadow-sm transition-all group`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{prompt.icon}</span>
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 leading-snug">
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={role === 'student' ? '写下你的反馈或问题…' : '问我任何关于羽毛球的事…'}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 ${accent.ring} focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 text-sm`}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`px-6 py-3 rounded-lg ${accent.button} text-white font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm`}
            >
              发送
            </button>
          </div>
        </form>
      </div>

      <ContactFooter />
    </div>
  );
}
