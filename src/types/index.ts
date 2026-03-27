export interface RubricSection {
  id: string;
  name: string;
  maxScore: number;
  description: string;
}

export interface Rubric {
  id: string;
  name: string;
  sections: RubricSection[];
  totalMax: number;
}

export interface LabSheet {
  id: string;
  name: string;
  fileName: string;
  uploadDate: string;
  rubric: Rubric;
}

export interface StudentReport {
  id: string;
  studentName: string;
  studentId: string;
  fileName: string;
  uploadDate: string;
  status: 'pending' | 'assessed' | 'finalized';
  aiGrade?: GradeResult;
  finalGrade?: GradeResult;
}

export interface GradeResult {
  sectionScores: { sectionId: string; score: number; feedback: string }[];
  totalScore: number;
  totalMax: number;
  overallFeedback: string;
}

export interface Lab {
  id: string;
  name: string;
  labNumber: number;
  labSheet?: LabSheet;
  reports: StudentReport[];
}

export interface Module {
  id: string;
  name: string;
  code: string;
  labs: Lab[];
}

export const defaultRubricSections: RubricSection[] = [
  { id: 'intro', name: 'Introduction', maxScore: 15, description: 'Clear objectives and background' },
  { id: 'method', name: 'Methodology', maxScore: 25, description: 'Detailed procedure and approach' },
  { id: 'results', name: 'Results', maxScore: 25, description: 'Accurate data presentation' },
  { id: 'discussion', name: 'Discussion', maxScore: 25, description: 'Analysis and interpretation' },
  { id: 'conclusion', name: 'Conclusion', maxScore: 10, description: 'Summary and future work' },
];
