'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

type StudentPathItem = {
  label: string;
  active: boolean;
};

type StudentActivity = {
  label: string;
  value: string;
  note: string;
};

type ReviewItem = {
  title: string;
  source: string;
  status: string;
  detail: string;
};

type KnowledgeLink = {
  from: string;
  to: string;
  weight: string;
};

type Achievement = {
  id: string;
  title: string;
  category: string;
  level: 'bronze' | 'silver' | 'gold' | 'locked';
  status: 'earned' | 'in_progress' | 'locked';
  description: string;
  progress: number;
  target: number;
  earnedAt?: string;
};

type StudentData = {
  studentId: string;
  name: string;
  level: string;
  reviewMode: string;
  progress: number;
  stage: {
    title: string;
    description: string;
    path: StudentPathItem[];
    pathProgress: number;
  };
  today: {
    title: string;
    description: string;
  };
  activity: StudentActivity[];
  tags: string[];
  reviewQueue: ReviewItem[];
  knowledgeLinks: KnowledgeLink[];
  recentFeedback: string[];
  lessonSummary?: {
    date: string;
    title: string;
    studentReflection: string;
    coachNote: string;
    homework: Array<{
      id: string;
      text: string;
      done: boolean;
    }>;
  };
  matchReview?: {
    match: string;
    score: string;
    whatWorked: string;
    nextAdjustment: string;
    experience?: string;
  };
  abilityMatrix?: Array<{
    label: string;
    value: number;
  }>;
  skillTree?: Array<{
    group: string;
    nodes: Array<{
      label: string;
      status: 'done' | 'active' | 'locked';
    }>;
  }>;
  achievements?: Achievement[];
  lessonHistory?: Array<{
    id?: string;
    date: string;
    title: string;
    mainContent?: string[];
    focus?: string;
    coachNote: string;
    studentNote: string;
    homeworkDone: number;
    homeworkTotal: number;
  }>;
  growthPath?: Array<{
    date: string;
    stage: string;
    ability: string;
    score: number;
  }>;
  lastUpdated: string;
};

type StudentDraft = {
  checkedHomework?: string[];
  lessonInput?: {
    studentReflection?: string;
    question?: string;
    confidence?: string;
  };
  matchInput?: {
    match?: string;
    score?: string;
    whatWorked?: string;
    nextAdjustment?: string;
    experience?: string;
  };
};

function readStudentDraft(key: string): StudentDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const savedDraft = window.localStorage.getItem(key);

  if (!savedDraft) {
    return null;
  }

  try {
    return JSON.parse(savedDraft) as StudentDraft;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function readCurrentStudent(): StudentData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const savedStudent = window.sessionStorage.getItem('goodminton-student-current');

  if (!savedStudent) {
    return null;
  }

  try {
    return JSON.parse(savedStudent) as StudentData;
  } catch {
    window.sessionStorage.removeItem('goodminton-student-current');
    return null;
  }
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div
      className={
        'rounded-full border px-3 py-1.5 text-xs font-medium ' +
        (active
          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-600')
      }
    >
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">学员数据</div>
      </div>
      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-[#7e9be8]" style={{ width: `${value}%` }} />
    </div>
  );
}

function displayRank(level: string, progress: number) {
  if (/A|王者|第\s*[7-8]\s*档/.test(level) || progress >= 85) {
    return '王者';
  }

  if (/B|大师|第\s*[5-6]\s*档/.test(level) || progress >= 70) {
    return '大师';
  }

  if (/C2|钻石|第\s*[3-4]\s*档/.test(level) || progress >= 55) {
    return '钻石';
  }

  return '白金';
}

function AbilityHex({ items }: { items: Array<{ label: string; value: number }> }) {
  const center = 100;
  const maxRadius = 72;
  const points = items.map((item, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = maxRadius * (item.value / 100);
    return {
      ...item,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56">
          {[0.33, 0.66, 1].map((scale) => {
            const ring = items
              .map((_, index) => {
                const angle = (-90 + index * 60) * (Math.PI / 180);
                return `${center + Math.cos(angle) * maxRadius * scale},${center + Math.sin(angle) * maxRadius * scale}`;
              })
              .join(' ');
            return <polygon key={scale} points={ring} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
          })}
          {items.map((_, index) => {
            const angle = (-90 + index * 60) * (Math.PI / 180);
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={center + Math.cos(angle) * maxRadius}
                y2={center + Math.sin(angle) * maxRadius}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}
          <polygon points={polygon} fill="rgba(126,155,232,0.2)" stroke="#7e9be8" strokeWidth="2" />
          {points.map((point) => (
            <circle key={point.label} cx={point.x} cy={point.y} r="3.5" fill="#7e9be8" />
          ))}
        </svg>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">{item.label}</span>
              <span className="text-lg font-semibold text-slate-950">{item.value}</span>
            </div>
            <ProgressBar value={item.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillTree({ groups }: { groups: NonNullable<StudentData['skillTree']> }) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.group || '');
  const chartItems = groups.map((group) => {
    const doneCount = group.nodes.filter((node) => node.status === 'done').length;
    const hasActive = group.nodes.some((node) => node.status === 'active');
    const activeLevel = Math.min(8, Math.max(1, doneCount + (hasActive ? 1 : 0)));
    const activeNode = group.nodes.find((node) => node.status === 'active') || group.nodes[doneCount - 1];
    return { group, activeLevel, activeNode };
  });
  const activeGroup = groups.find((group) => group.group === selectedGroup) || groups[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
      <div>
        <div className="text-3xl font-semibold tracking-tight text-slate-950">技能柱形图</div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="flex h-64 items-end justify-between gap-3 border-b border-slate-200 px-2">
            {chartItems.map(({ group, activeLevel }) => (
              <div key={group.group} className="flex h-full w-16 shrink-0 flex-col items-center justify-end">
                <div className="flex h-44 w-8 items-end overflow-hidden rounded-t-sm bg-[#dbe6ff]">
                  <div
                    className="w-full rounded-t-sm bg-[#7e9be8]/90"
                    style={{ height: `${(activeLevel / 8) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between gap-3 px-2">
            {chartItems.map(({ group }) => (
              <div key={group.group} className="w-16 shrink-0 text-center">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(group.group)}
                  className={
                    'min-h-8 rounded-full border px-2.5 py-1 text-xs font-medium leading-4 ' +
                    (group.group === activeGroup?.group
                      ? 'border-[#7e9be8] bg-[#dbe6ff] text-[#4969c9]'
                      : 'border-slate-200 bg-white text-slate-700')
                  }
                >
                  {group.group}
                </button>
              </div>
            ))}
          </div>
        </div>

        {activeGroup ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">{activeGroup.group} · 具体技术</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeGroup.nodes.map((node, index) => (
                <div key={node.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-800">{node.label}</div>
                    <span
                      className={
                        'rounded-full px-2 py-1 text-xs ' +
                        (node.status === 'done'
                          ? 'bg-[#dbe6ff] text-slate-700'
                          : node.status === 'active'
                            ? 'bg-white text-slate-800 ring-1 ring-[#7e9be8]'
                            : 'bg-slate-100 text-slate-400')
                      }
                    >
                      {node.status === 'done' ? '已掌握' : node.status === 'active' ? '当前' : '未解锁'}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#7e9be8]"
                      style={{ width: `${((index + 1) / 8) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AchievementBadges({ achievements }: { achievements: Achievement[] }) {
  const levelStyle = {
    bronze: {
      badge: 'border-amber-200 bg-[#fff8ed]',
      mark: 'from-amber-700 via-amber-500 to-orange-300',
      ring: 'border-amber-200',
    },
    silver: {
      badge: 'border-slate-200 bg-[#f8fafc]',
      mark: 'from-slate-500 via-slate-300 to-white',
      ring: 'border-slate-200',
    },
    gold: {
      badge: 'border-yellow-200 bg-[#fffbe8]',
      mark: 'from-yellow-700 via-yellow-400 to-amber-100',
      ring: 'border-yellow-200',
    },
    locked: {
      badge: 'border-slate-200 bg-slate-50 opacity-75',
      mark: 'from-slate-300 via-slate-200 to-slate-100',
      ring: 'border-slate-200',
    },
  };
  const levelText = {
    bronze: '铜',
    silver: '银',
    gold: '金',
    locked: '锁',
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {achievements.map((item) => {
        const style = levelStyle[item.level];
        const percent = Math.min(100, Math.round((item.progress / Math.max(item.target, 1)) * 100));

        return (
          <article key={item.id} className={`rounded-lg border p-4 ${style.badge}`}>
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center border bg-white p-1 ${style.ring}`}
                style={{ clipPath: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)' }}
              >
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${style.mark} text-sm font-semibold text-white shadow-inner`}
                  style={{ clipPath: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)' }}
                >
                  <span className="drop-shadow-sm">{item.status === 'locked' ? levelText.locked : item.category.slice(0, 1)}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                  <div className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-slate-600">
                    {item.category} · {levelText[item.level]}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{item.status === 'earned' ? '已获得' : item.status === 'in_progress' ? '进行中' : '未解锁'}</span>
                    <span>
                      {item.progress}/{item.target}
                    </span>
                  </div>
                  <ProgressBar value={percent} />
                </div>
                {item.earnedAt ? <div className="mt-2 text-xs text-slate-500">获得时间：{item.earnedAt}</div> : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function LessonLog({ lessons }: { lessons: NonNullable<StudentData['lessonHistory']> }) {
  return (
    <div className="max-h-96 overflow-auto rounded-md bg-white">
      <div className="min-w-[860px] space-y-1 font-mono text-sm">
      {lessons.map((lesson, index) => (
        <div key={lesson.id || `${lesson.date}-${lesson.title}`} className="space-y-1 border-b border-slate-100 py-2 last:border-b-0">
          <div className="grid grid-cols-[108px_92px_1fr] gap-4 whitespace-nowrap leading-7">
            <span className="text-slate-500">{lesson.date.slice(5)}</span>
            <span className="text-[#43b66f]">lesson-{String(index + 1).padStart(3, '0')}</span>
            <span className="text-slate-900">课堂标题： {lesson.title}</span>
          </div>
          <div className="grid grid-cols-[108px_92px_1fr] gap-4 whitespace-nowrap leading-7">
            <span className="text-slate-500">{lesson.date.slice(5)}</span>
            <span className="text-[#43b66f]">lesson-{String(index + 1).padStart(3, '0')}</span>
            <span className="text-slate-900">
              课堂主要内容： {(lesson.mainContent || [lesson.focus]).filter(Boolean).join(' / ')}
            </span>
          </div>
          <div className="grid grid-cols-[108px_92px_1fr] gap-4 whitespace-nowrap leading-7">
            <span className="text-slate-500">{lesson.date.slice(5)}</span>
            <span className="text-[#43b66f]">lesson-{String(index + 1).padStart(3, '0')}</span>
            <span className="text-slate-900">教练观察： {lesson.coachNote}</span>
          </div>
          <div className="grid grid-cols-[108px_92px_1fr] gap-4 whitespace-nowrap leading-7">
            <span className="text-slate-500">{lesson.date.slice(5)}</span>
            <span className="text-[#43b66f]">lesson-{String(index + 1).padStart(3, '0')}</span>
            <span className="text-slate-900">学生反馈： {lesson.studentNote}</span>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

function StudentDashboard({ student, onLogout }: { student: StudentData; onLogout: () => void }) {
  const draftKey = `goodminton-student-draft-${student.studentId}`;
  const rank = displayRank(student.level, student.progress);
  const [initialDraft] = useState(() => readStudentDraft(draftKey));
  const [reviewedItems, setReviewedItems] = useState<string[]>([]);
  const [checkedHomework, setCheckedHomework] = useState<string[]>(
    () =>
      initialDraft?.checkedHomework ||
      student.lessonSummary?.homework.filter((item) => item.done).map((item) => item.id) ||
      [],
  );
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [lessonInput, setLessonInput] = useState({
    studentReflection: initialDraft?.lessonInput?.studentReflection || student.lessonSummary?.studentReflection || '',
    question: initialDraft?.lessonInput?.question || '',
    confidence: initialDraft?.lessonInput?.confidence || '3',
  });
  const [matchInput, setMatchInput] = useState({
    match: initialDraft?.matchInput?.match || student.matchReview?.match || '',
    score: initialDraft?.matchInput?.score || student.matchReview?.score || '',
    whatWorked: initialDraft?.matchInput?.whatWorked || student.matchReview?.whatWorked || '',
    nextAdjustment: initialDraft?.matchInput?.nextAdjustment || student.matchReview?.nextAdjustment || '',
    experience: initialDraft?.matchInput?.experience || student.matchReview?.experience || '',
  });

  function markReviewed(label: string) {
    setReviewedItems((items) => (items.includes(label) ? items : [...items, label]));
  }

  function toggleHomework(id: string) {
    setCheckedHomework((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  const submissionPreview = {
    studentId: student.studentId,
    studentName: student.name,
    submittedAt: new Date().toISOString(),
    lessonSummary: {
      date: student.lessonSummary?.date,
      title: student.lessonSummary?.title,
      studentReflection: lessonInput.studentReflection,
      question: lessonInput.question,
      confidence: Number(lessonInput.confidence),
      completedHomework: checkedHomework,
    },
    matchReview: matchInput,
  };

  useEffect(() => {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        checkedHomework,
        lessonInput,
        matchInput,
      }),
    );
  }, [checkedHomework, draftKey, lessonInput, matchInput]);

  function submitStudentReview() {
    window.localStorage.setItem(`${draftKey}-submitted`, JSON.stringify(submissionPreview));
    setSubmissionStatus('已提交。教练端接入后，这里会直接进入后台记录。');
  }

  return (
    <main className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="text-sm font-semibold">Goodminton Academy</div>
          <div className="text-sm text-slate-400">/</div>
          <div className="text-sm text-slate-600">学员图谱</div>
          <button onClick={onLogout} className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">
            退出
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-2xl font-semibold text-white shadow-sm">
                {student.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-sm text-slate-500">Goodminton / 学员图谱 / {student.studentId}</div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {student.name} 的训练数据
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  每个知识点都保留来源、反馈和下一次训练验证点。最后更新：{student.lastUpdated}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-slate-500">等级</div>
                  <div className="mt-1 text-sm font-semibold">{rank}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">进度</div>
                  <div className="mt-1 text-sm font-semibold">{student.progress}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">模式</div>
                  <div className="mt-1 text-sm font-semibold">{student.reviewMode}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {student.tags.slice(0, 3).map((tag, index) => (
                  <Pill key={tag} active={index === 0}>
                    {tag}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <div>
                <div className="text-sm text-slate-500">当前训练</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {student.stage.title}
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">{student.stage.description}</p>
                <div className="mt-6">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {student.stage.path.map((item) => (
                      <Pill key={item.label} active={item.active}>
                        {item.label}
                      </Pill>
                    ))}
                  </div>
                  <ProgressBar value={student.stage.pathProgress} />
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">今日最小练习</div>
                <div className="mt-2 text-xl font-semibold">{student.today.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{student.today.description}</p>
                <button
                  onClick={() => markReviewed(student.today.title)}
                  className="mt-5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                >
                  {reviewedItems.includes(student.today.title) ? '已审查' : '标记为已审查'}
                </button>
              </div>
            </div>
          </section>

          <Section title="家庭作业">
            <div className="grid gap-3 md:grid-cols-3">
              {student.lessonSummary?.homework.map((item) => {
                const checked = checkedHomework.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700"
                  >
                    <input
                      checked={checked}
                      onChange={() => toggleHomework(item.id)}
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    <span className={checked ? 'text-slate-400 line-through' : ''}>{item.text}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          {student.achievements?.length ? (
            <Section title="成就和勋章">
              <AchievementBadges achievements={student.achievements} />
            </Section>
          ) : null}

          {student.abilityMatrix?.length ? (
            <Section title="能力矩阵">
              <AbilityHex items={student.abilityMatrix} />
            </Section>
          ) : null}

          {student.skillTree?.length ? (
            <Section title="技能树">
              <SkillTree groups={student.skillTree} />
            </Section>
          ) : null}

          {student.lessonHistory?.length ? (
            <Section title="上课日志">
              <LessonLog lessons={student.lessonHistory} />
            </Section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="课后总结">
              <div className="space-y-4">
                <div className="rounded-md bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">{student.lessonSummary?.date}</div>
                  <div className="mt-1 text-lg font-semibold">{student.lessonSummary?.title}</div>
                </div>
                <label className="block">
                  <div className="text-sm font-medium">我今天学到了什么 / 卡在哪里</div>
                  <textarea
                    value={lessonInput.studentReflection}
                    onChange={(event) =>
                      setLessonInput((value) => ({ ...value, studentReflection: event.target.value }))
                    }
                    className="mt-2 min-h-28 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-900"
                    placeholder="用自己的话写，不用写漂亮。"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium">我还想问教练的问题</div>
                  <textarea
                    value={lessonInput.question}
                    onChange={(event) => setLessonInput((value) => ({ ...value, question: event.target.value }))}
                    className="mt-2 min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-900"
                    placeholder="例如：为什么我接快推时总是慢半拍？"
                  />
                </label>
                <label className="block">
                  <div className="flex justify-between text-sm font-medium">
                    <span>我对这个重点的把握</span>
                    <span>{lessonInput.confidence} / 5</span>
                  </div>
                  <input
                    value={lessonInput.confidence}
                    onChange={(event) => setLessonInput((value) => ({ ...value, confidence: event.target.value }))}
                    type="range"
                    min="1"
                    max="5"
                    className="mt-3 w-full accent-slate-900"
                  />
                </label>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-medium">教练观察</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{student.lessonSummary?.coachNote}</p>
                </div>
              </div>
            </Section>

            <Section title="比赛复盘">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-sm font-medium">比赛 / 对手</div>
                    <input
                      value={matchInput.match}
                      onChange={(event) => setMatchInput((value) => ({ ...value, match: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
                      placeholder="例如：周末双打练习赛"
                    />
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium">比分</div>
                    <input
                      value={matchInput.score}
                      onChange={(event) => setMatchInput((value) => ({ ...value, score: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
                      placeholder="例如：21-18 / 17-21"
                    />
                  </label>
                </div>
                <label className="block">
                  <div className="text-sm font-medium">有效的地方</div>
                  <textarea
                    value={matchInput.whatWorked}
                    onChange={(event) => setMatchInput((value) => ({ ...value, whatWorked: event.target.value }))}
                    className="mt-2 min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-900"
                    placeholder="哪些回合、哪些打法有效？"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium">待改进的点</div>
                  <textarea
                    value={matchInput.nextAdjustment}
                    onChange={(event) => setMatchInput((value) => ({ ...value, nextAdjustment: event.target.value }))}
                    className="mt-2 min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-900"
                    placeholder="写下这场之后最想改进的地方。"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium">积累的经验</div>
                  <textarea
                    value={matchInput.experience}
                    onChange={(event) => setMatchInput((value) => ({ ...value, experience: event.target.value }))}
                    className="mt-2 min-h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-900"
                    placeholder="这场比赛以后，下次可以直接复用的一条经验。"
                  />
                </label>
              </div>
            </Section>
          </div>

          <Section title="提交">
            <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">提交本次反馈</div>
                <div className="mt-1 text-sm text-slate-500">包含课后总结、比赛复盘和家庭作业完成状态。</div>
              </div>
              <button
                type="button"
                onClick={submitStudentReview}
                className="rounded-md bg-[#7e9be8] px-5 py-2 text-sm font-medium text-white"
              >
                提交
              </button>
            </div>
            {submissionStatus ? <div className="mt-3 text-sm text-slate-600">{submissionStatus}</div> : null}
          </Section>
        </div>
      </div>
    </main>
  );
}

export default function StudentPage() {
  const [student, setStudent] = useState<StudentData | null>(() => readCurrentStudent());

  function logoutStudent() {
    window.sessionStorage.removeItem('goodminton-student-current');
    setStudent(null);
  }

  if (!student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4 text-slate-900">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-sm font-semibold text-white">
            G
          </div>
          <h1 className="mt-5 text-xl font-semibold">请从主页登录</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            学员入口已经移到 Goodminton 主页。登录成功后会直接进入这里。
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-md bg-[#7e9be8] px-4 py-2 text-sm font-medium text-white"
          >
            返回主页
          </Link>
        </section>
      </main>
    );
  }

  return <StudentDashboard student={student} onLogout={logoutStudent} />;
}
