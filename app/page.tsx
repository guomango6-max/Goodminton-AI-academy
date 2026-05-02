'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">🏸</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Goodminton Academy</h1>
            <p className="text-sm text-slate-500">AI 诊室</p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <p className="text-slate-500 text-sm uppercase tracking-widest mb-2 font-medium">选择你的身份</p>
        <h2 className="text-3xl font-bold text-slate-900 mb-10">你是谁？</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* 学员 */}
          <Link href="/student">
            <div className="group cursor-pointer bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-5 transition-colors text-4xl">
                🎓
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">我是学员</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                和我聊训练、技术、课程感受——你的每一条反馈都会变成下周更好的课
              </p>
              <div className="mt-6 px-6 py-2 rounded-full bg-blue-500 text-white text-sm font-medium group-hover:bg-blue-600 transition-colors">
                进入诊室 →
              </div>
            </div>
          </Link>

          {/* 球友 */}
          <Link href="/friend">
            <div className="group cursor-pointer bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center mb-5 transition-colors text-4xl">
                🤝
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">我是球友</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                约局、分析比赛、聊战术——一起把球打得更好玩
              </p>
              <div className="mt-6 px-6 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium group-hover:bg-emerald-600 transition-colors">
                开始聊 →
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
