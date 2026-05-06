'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'zh' | 'en';

const LangContext = createContext<{
  lang: Lang;
  toggle: () => void;
}>({ lang: 'zh', toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const toggle = () => setLang((l) => (l === 'zh' ? 'en' : 'zh'));
  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
