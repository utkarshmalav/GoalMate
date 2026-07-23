import { StudyData } from "../types/study";
import { SYLLABUS_DETAILED } from "../constants/syllabus";

export function subjectStats(data: StudyData, subject: string) {
  let total = 0;
  let done = 0;
  Object.keys(SYLLABUS_DETAILED[subject]).forEach((chapter) => {
    const subs = SYLLABUS_DETAILED[subject][chapter];
    subs.forEach((st) => {
      total++;
      if (data.syllabus[subject]?.[chapter]?.[st]) done++;
    });
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function chapterStats(
  data: StudyData,
  subject: string,
  chapter: string,
) {
  const subs = SYLLABUS_DETAILED[subject][chapter];
  const doneMap = data.syllabus[subject]?.[chapter] || {};
  const done = subs.filter((st) => doneMap[st]).length;
  return {
    total: subs.length,
    done,
    complete: done === subs.length && subs.length > 0,
  };
}
