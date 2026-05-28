import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

const root = process.cwd();
loadEnv({ path: path.join(root, '.env.vercel.local') });
loadEnv({ path: path.join(root, '.env.local'), override: true });
loadEnv({ path: path.join(root, '.env') });

const includeGenerated = process.argv.includes('--include-generated');
const dryRun = process.argv.includes('--dry-run');
const studentsDir = path.join(root, 'data', 'students');
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugPart(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function isGeneratedLessonSummary(summary = {}) {
  const title = cleanText(summary.title);
  const note = cleanText(summary.coachNote);
  return title === '首次建档' || note.includes('从 Obsidian 学员档案生成网站基础页') || note.includes('等待课堂记录补充后校准');
}

function isGeneratedMatchReview(review = {}) {
  const combined = [
    review.match,
    review.score,
    review.whatWorked,
    review.nextAdjustment,
    review.experience,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(' ');

  return !combined || combined.includes('先完成基础能力初评') || combined.includes('先补网前、步法、防守基线');
}

function lessonRecordRow(student, lesson) {
  const date = cleanText(lesson.date) || null;
  const title = cleanText(lesson.title) || '上课记录';
  const id = cleanText(lesson.id) || `${date || 'undated'}-${slugPart(title)}`;

  return {
    external_id: `student-json:${student.studentId}:lesson-record:${id}`,
    happened_at: date,
    student_id: student.studentId,
    student_name: student.name,
    record_type: 'lesson_record',
    title,
    payload: {
      source: 'data/students',
      lessonRecord: {
        id,
        date: date || '',
        title,
        mainContent: Array.isArray(lesson.mainContent) ? lesson.mainContent.map(cleanText).filter(Boolean) : [],
        focus: cleanText(lesson.focus),
        coachNote: cleanText(lesson.coachNote),
        studentNote: cleanText(lesson.studentNote),
        homeworkDone: Number.isFinite(Number(lesson.homeworkDone)) ? Number(lesson.homeworkDone) : 0,
        homeworkTotal: Number.isFinite(Number(lesson.homeworkTotal)) ? Number(lesson.homeworkTotal) : 0,
      },
    },
    source: 'data/students',
    status: 'imported',
  };
}

function lessonSummaryRow(student, summary) {
  const date = cleanText(summary.date) || null;
  const title = cleanText(summary.title) || '课后总结';
  const id = `student-json:${student.studentId}:lesson-summary:${date || slugPart(title) || 'current'}`;
  const homework = Array.isArray(summary.homework) ? summary.homework : [];
  const completedHomework = homework.filter((item) => item && item.done).map((item) => cleanText(item.text)).filter(Boolean);
  const submission = {
    id,
    submissionType: 'lesson',
    studentId: student.studentId,
    studentName: student.name,
    submittedAt: `${date || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    lessonSummary: {
      date: date || '',
      title,
      studentReflection: cleanText(summary.studentReflection) || cleanText(summary.coachNote),
      question: '',
      confidence: 0,
      completedHomework,
    },
    matchReview: {
      match: '',
      score: '',
      whatWorked: '',
      nextAdjustment: '',
      experience: '',
    },
  };

  return {
    external_id: id,
    happened_at: date,
    student_id: student.studentId,
    student_name: student.name,
    record_type: 'lesson_summary',
    title,
    payload: {
      source: 'data/students',
      lessonSummary: summary,
      submission,
    },
    source: 'data/students',
    status: 'imported',
  };
}

function matchReviewRow(student, review) {
  const title = cleanText(review.match) || '比赛复盘';
  const dateMatch = title.match(/\d{4}-\d{2}-\d{2}/);
  const date = dateMatch ? dateMatch[0] : null;
  const id = `student-json:${student.studentId}:match-review:${date || slugPart(title) || 'current'}`;
  const submission = {
    id,
    submissionType: 'match',
    studentId: student.studentId,
    studentName: student.name,
    submittedAt: `${date || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    lessonSummary: {
      date: '',
      title: '',
      studentReflection: '',
      question: '',
      confidence: 0,
      completedHomework: [],
    },
    matchReview: {
      match: title,
      score: cleanText(review.score),
      whatWorked: cleanText(review.whatWorked),
      nextAdjustment: cleanText(review.nextAdjustment),
      experience: cleanText(review.experience),
    },
  };

  return {
    external_id: id,
    happened_at: date,
    student_id: student.studentId,
    student_name: student.name,
    record_type: 'match_review',
    title,
    payload: {
      source: 'data/students',
      matchReview: review,
      submission,
    },
    source: 'data/students',
    status: 'imported',
  };
}

function buildRows() {
  const rows = [];
  const files = fs.readdirSync(studentsDir).filter((file) => file.endsWith('.json')).sort();

  for (const file of files) {
    const student = JSON.parse(fs.readFileSync(path.join(studentsDir, file), 'utf8'));
    if (!cleanText(student.studentId) || !cleanText(student.name)) continue;

    for (const lesson of Array.isArray(student.lessonHistory) ? student.lessonHistory : []) {
      if (lesson && (cleanText(lesson.date) || cleanText(lesson.title))) {
        rows.push(lessonRecordRow(student, lesson));
      }
    }

    if (student.lessonSummary && (includeGenerated || !isGeneratedLessonSummary(student.lessonSummary))) {
      rows.push(lessonSummaryRow(student, student.lessonSummary));
    }

    if (student.matchReview && (includeGenerated || !isGeneratedMatchReview(student.matchReview))) {
      rows.push(matchReviewRow(student, student.matchReview));
    }
  }

  return rows;
}

async function main() {
  const rows = buildRows();
  const counts = rows.reduce((acc, row) => {
    acc[row.record_type] = (acc[row.record_type] || 0) + 1;
    return acc;
  }, {});

  console.log(`Prepared ${rows.length} history rows`, counts);
  if (dryRun) return;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Pull or set server env first.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('student_history_records')
      .upsert(batch, { onConflict: 'external_id' });

    if (error) {
      throw new Error(error.message);
    }
  }

  console.log(`Backfilled ${rows.length} rows into student_history_records.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
