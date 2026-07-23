// syllabus[subject][chapter][subtopic] = true if completed
export type StudyData = {
  syllabus: Record<string, Record<string, Record<string, boolean>>>;
};
