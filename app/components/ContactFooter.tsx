'use client';

import { useState } from 'react';

type CopyItem = 'wechat' | 'email' | null;

export default function ContactFooter() {
  const [copied, setCopied] = useState<CopyItem>(null);

  const copy = (text: string, key: CopyItem) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="border-t border-slate-100 bg-white/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="text-slate-400 text-xs mr-1">联系教练</span>

        {/* WhatsApp — clickable link */}
        <a
          href="https://wa.me/358413134358"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 hover:bg-green-100 text-green-700 font-medium transition-colors"
        >
          <span>📱</span>
          <span>WhatsApp</span>
          <span className="text-green-500 text-xs">+358 413 134 358</span>
        </a>

        {/* WeChat — copy ID */}
        <button
          onClick={() => copy('guomango', 'wechat')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors"
        >
          <span>💬</span>
          <span>微信</span>
          <span className="text-emerald-500 text-xs">guomango</span>
          <span className="text-emerald-400 text-xs ml-0.5">
            {copied === 'wechat' ? '✓ 已复制' : '点击复制'}
          </span>
        </button>

        {/* Email — copy */}
        <button
          onClick={() => copy('guomango6@gmail.com', 'email')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors"
        >
          <span>📧</span>
          <span className="text-blue-500 text-xs">guomango6@gmail.com</span>
          <span className="text-blue-400 text-xs ml-0.5">
            {copied === 'email' ? '✓ 已复制' : '点击复制'}
          </span>
        </button>
      </div>
    </div>
  );
}
