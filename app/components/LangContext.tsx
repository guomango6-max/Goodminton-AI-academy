'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'zh' | 'en';

const LangContext = createContext<{
  lang: Lang;
  toggle: () => void;
}>({ lang: 'zh', toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'zh';
    const saved = window.localStorage.getItem('goodminton-lang');
    return saved === 'zh' || saved === 'en' ? saved : 'zh';
  });

  useEffect(() => {
    window.localStorage.setItem('goodminton-lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const toggle = () => setLang((l) => (l === 'zh' ? 'en' : 'zh'));

  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
