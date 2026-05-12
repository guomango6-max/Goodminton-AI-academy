'use client';

import React, { FormEvent, useEffect, useState } from 'react';

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
  lessonHistory?: Array<{
    date: string;
    title: string;
    focus: string;
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

function AbilityHex({ items }: { items: Array<{ label: string; value: number }> }) {
  const center = 100;
  const maxRadius = 76;
  const points = items.map((item, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = maxRadius * (item.value / 100);
    return {
      ...item,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * 92,
      labelY: center + Math.sin(angle) * 92,
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
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
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="3.5" fill="#7e9be8" />
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor={point.labelX > center + 8 ? 'start' : point.labelX < center - 8 ? 'end' : 'middle'}
              dominantBaseline="middle"
              className="fill-slate-600 text-[10px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className="text-slate-500">{item.value}</span>
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
        <p className="mt-4 text-sm leading-7 text-slate-500">
          先看一级大类，再点开某一类看具体技术。柱子越高，掌握越稳定。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              key={group.group}
              onClick={() => setSelectedGroup(group.group)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-medium ' +
                (group.group === activeGroup?.group
                  ? 'border-[#7e9be8] bg-[#dbe6ff] text-slate-800'
                  : 'border-slate-200 bg-white text-slate-500')
              }
            >
              {group.group}
            </button>
          ))}
        </div>
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
                <div className="h-8 text-xs font-medium leading-4 text-slate-700">{group.group}</div>
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

function LessonTimeline({ lessons }: { lessons: NonNullable<StudentData['lessonHistory']> }) {
  return (
    <div className="space-y-4">
      {lessons.map((lesson, index) => (
        <article key={`${lesson.date}-${lesson.title}`} className="relative pl-8">
          {index < lessons.length - 1 ? <div className="absolute left-[11px] top-7 h-full w-px bg-slate-200" /> : null}
          <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-700 bg-white text-xs font-semibold text-emerald-800">
            {index + 1}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs text-slate-500">{lesson.date}</div>
                <div className="mt-1 text-base font-semibold text-slate-950">{lesson.title}</div>
                <div className="mt-1 text-sm text-slate-600">重点：{lesson.focus}</div>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                作业 {lesson.homeworkDone}/{lesson.homeworkTotal}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600">
                <span className="font-medium text-slate-900">教练：</span>
                {lesson.coachNote}
              </div>
              <div className="rounded-md bg-white p-3 text-sm leading-6 text-slate-600">
                <span className="font-medium text-slate-900">学生：</span>
                {lesson.studentNote}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function GrowthPath({ items }: { items: NonNullable<StudentData['growthPath']> }) {
  const maxScore = Math.max(...items.map((item) => item.score), 100);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[680px] items-end gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item, index) => (
          <div key={`${item.date}-${item.stage}`} className="relative text-center">
            {index > 0 ? <div className="absolute right-1/2 top-10 h-px w-full bg-emerald-700/40" /> : null}
            <div className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-xl font-semibold text-emerald-800">
              {item.score}
            </div>
            <div className="mx-auto mt-3 h-20 w-2 rounded-full bg-slate-200">
              <div
                className="mt-auto rounded-full bg-emerald-700"
                style={{ height: `${Math.max(12, (item.score / maxScore) * 80)}px` }}
              />
            </div>
            <div className="mt-3 text-sm font-medium text-slate-900">{item.stage}</div>
            <div className="mt-1 text-xs text-slate-500">
              {item.date} / {item.ability}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPanel({
  studentId,
  accessCode,
  error,
  loading,
  onStudentIdChange,
  onAccessCodeChange,
  onSubmit,
}: {
  studentId: string;
  accessCode: string;
  error: string;
  loading: boolean;
  onStudentIdChange: (value: string) => void;
  onAccessCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-700 text-sm font-semibold text-white">
            G
          </div>
          <div className="text-sm font-semibold">Goodminton Academy</div>
          <div className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">学员数据</div>
        </div>
      </div>
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_400px]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Goodminton / 学员数据
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              取回你的训练数据
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              输入学员 ID 和访问码后，系统会读取属于你的 JSON 文件，并把训练阶段、反馈、
              知识链接和下一步练习展示出来。你的审查会帮助大脑建立连接，而不是只把资料存在系统里。
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                ['身份确认', '确认学生身份和访问权限'],
                ['读取 JSON', '加载个人训练数据文件'],
                ['学习图谱', '把反馈和训练任务连起来'],
              ].map(([item, detail], index) => (
                <div key={item} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">步骤 {index + 1}</div>
                  <div className="mt-2 text-sm font-medium">{item}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-lg border border-emerald-900 bg-slate-950 p-5 text-white">
              <div className="text-sm text-slate-300">审查原则</div>
              <div className="mt-2 text-lg font-semibold">看见来源，确认链接，完成一次内化动作。</div>
            </div>
          </section>

          <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">学员入口</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              访问码由教练提供。第一版使用本地 JSON，后面可以平滑换成数据库账号。
            </p>
            <label className="mt-6 block text-sm font-medium text-slate-700">
              学员 ID
              <input
                value={studentId}
                onChange={(event) => onStudentIdChange(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
                placeholder="例如 demo"
                autoComplete="username"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              访问码
              <input
                value={accessCode}
                onChange={(event) => onAccessCodeChange(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
                placeholder="由教练提供"
                type="password"
                autoComplete="current-password"
              />
            </label>
            {error ? <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? '正在读取...' : '读取我的 JSON'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function StudentDashboard({ student, onLogout }: { student: StudentData; onLogout: () => void }) {
  const draftKey = `goodminton-student-draft-${student.studentId}`;
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

  function copySubmission() {
    void navigator.clipboard.writeText(JSON.stringify(submissionPreview, null, 2));
    setSubmissionStatus('已复制 JSON，可以发给教练。');
  }

  function downloadSubmission() {
    const file = new Blob([`${JSON.stringify(submissionPreview, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${student.studentId}-submission-${student.lastUpdated}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSubmissionStatus('已生成提交 JSON 文件。');
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
                  <div className="mt-1 text-sm font-semibold">{student.level}</div>
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
            <Section title="上课记录">
              <LessonTimeline lessons={student.lessonHistory} />
            </Section>
          ) : null}

          {student.growthPath?.length ? (
            <Section title="成长路径">
              <GrowthPath items={student.growthPath} />
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
              </div>
            </Section>
          </div>

          <Section title="提交预览">
            <div className="mb-4 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">学生提交包</div>
                <div className="mt-1 text-sm text-slate-500">包含课后总结、比赛复盘和家庭作业勾选状态。</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copySubmission}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                >
                  复制 JSON
                </button>
                <button
                  type="button"
                  onClick={downloadSubmission}
                  className="rounded-md bg-[#7e9be8] px-3 py-2 text-sm font-medium text-white"
                >
                  下载 JSON
                </button>
              </div>
            </div>
            {submissionStatus ? <div className="mb-3 text-sm text-slate-600">{submissionStatus}</div> : null}
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {JSON.stringify(submissionPreview, null, 2)}
            </pre>
          </Section>
        </div>
      </div>
    </main>
  );
}

export default function StudentPage() {
  const [studentId, setStudentId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [student, setStudent] = useState<StudentData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/student-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentId, accessCode }),
      });
      const payload = (await response.json()) as { student?: StudentData; error?: string };

      if (!response.ok || !payload.student) {
        throw new Error(payload.error || '读取失败。');
      }

      setStudent(payload.student);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '读取失败。');
    } finally {
      setLoading(false);
    }
  }

  if (!student) {
    return (
      <LoginPanel
        studentId={studentId}
        accessCode={accessCode}
        error={error}
        loading={loading}
        onStudentIdChange={setStudentId}
        onAccessCodeChange={setAccessCode}
        onSubmit={handleSubmit}
      />
    );
  }

  return <StudentDashboard student={student} onLogout={() => setStudent(null)} />;
}
