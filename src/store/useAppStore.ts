import { create } from 'zustand';
import { Module, Lab, StudentReport, LabSheet, defaultRubricSections, GradeResult } from '@/types';

interface AppState {
  modules: Module[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  addModule: (name: string, code: string) => void;
  deleteModule: (id: string) => void;
  addLab: (moduleId: string, name: string, labNumber: number) => void;
  deleteLab: (moduleId: string, labId: string) => void;
  setLabSheet: (moduleId: string, labId: string, labSheet: LabSheet) => void;
  addReport: (moduleId: string, labId: string, report: StudentReport) => void;
  addReports: (moduleId: string, labId: string, reports: StudentReport[]) => void;
  updateReportGrade: (moduleId: string, labId: string, reportId: string, grade: GradeResult, finalize: boolean) => void;
  updateLabRubric: (moduleId: string, labId: string, rubric: LabSheet['rubric']) => void;
}

const genId = () => Math.random().toString(36).slice(2, 10);

const sampleModules: Module[] = [
  {
    id: 'mod1',
    name: 'Digital Electronics',
    code: 'EC3020',
    labs: [
      {
        id: 'lab1',
        name: 'Logic Gates',
        labNumber: 1,
        labSheet: {
          id: 'ls1',
          name: 'Logic Gates Lab Sheet',
          fileName: 'logic_gates_lab.pdf',
          uploadDate: '2025-03-15',
          rubric: {
            id: 'r1',
            name: 'Default Rubric',
            sections: defaultRubricSections,
            totalMax: 100,
          },
        },
        reports: [
          {
            id: 'rep1',
            studentName: 'Alice Johnson',
            studentId: 'STU001',
            fileName: 'alice_lab1.pdf',
            uploadDate: '2025-03-20',
            status: 'assessed',
            aiGrade: {
              sectionScores: [
                { sectionId: 'intro', score: 12, feedback: 'Good introduction with clear objectives.' },
                { sectionId: 'method', score: 20, feedback: 'Well-documented methodology.' },
                { sectionId: 'results', score: 22, feedback: 'Results well presented with diagrams.' },
                { sectionId: 'discussion', score: 18, feedback: 'Good analysis, could go deeper.' },
                { sectionId: 'conclusion', score: 8, feedback: 'Adequate conclusion.' },
              ],
              totalScore: 80,
              totalMax: 100,
              overallFeedback: 'Well-structured report with strong methodology section.',
            },
          },
          {
            id: 'rep2',
            studentName: 'Bob Smith',
            studentId: 'STU002',
            fileName: 'bob_lab1.pdf',
            uploadDate: '2025-03-21',
            status: 'pending',
          },
          {
            id: 'rep3',
            studentName: 'Carol Davis',
            studentId: 'STU003',
            fileName: 'carol_lab1.pdf',
            uploadDate: '2025-03-20',
            status: 'finalized',
            aiGrade: {
              sectionScores: [
                { sectionId: 'intro', score: 14, feedback: 'Excellent introduction.' },
                { sectionId: 'method', score: 23, feedback: 'Thorough methodology.' },
                { sectionId: 'results', score: 24, feedback: 'Outstanding results presentation.' },
                { sectionId: 'discussion', score: 22, feedback: 'Deep and insightful discussion.' },
                { sectionId: 'conclusion', score: 9, feedback: 'Strong conclusion with future work.' },
              ],
              totalScore: 92,
              totalMax: 100,
              overallFeedback: 'Exceptional report across all sections.',
            },
            finalGrade: {
              sectionScores: [
                { sectionId: 'intro', score: 14, feedback: 'Excellent introduction.' },
                { sectionId: 'method', score: 23, feedback: 'Thorough methodology.' },
                { sectionId: 'results', score: 24, feedback: 'Outstanding results presentation.' },
                { sectionId: 'discussion', score: 22, feedback: 'Deep and insightful discussion.' },
                { sectionId: 'conclusion', score: 9, feedback: 'Strong conclusion with future work.' },
              ],
              totalScore: 92,
              totalMax: 100,
              overallFeedback: 'Exceptional report across all sections.',
            },
          },
        ],
      },
      {
        id: 'lab2',
        name: 'Flip Flops',
        labNumber: 2,
        reports: [],
      },
    ],
  },
  {
    id: 'mod2',
    name: 'Data Structures & Algorithms',
    code: 'CS2010',
    labs: [
      {
        id: 'lab3',
        name: 'Sorting Algorithms',
        labNumber: 1,
        reports: [],
      },
    ],
  },
];

export const useAppStore = create<AppState>((set) => ({
  modules: sampleModules,
  darkMode: false,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle('dark', next);
      return { darkMode: next };
    }),
  addModule: (name, code) =>
    set((s) => ({
      modules: [...s.modules, { id: genId(), name, code, labs: [] }],
    })),
  deleteModule: (id) =>
    set((s) => ({ modules: s.modules.filter((m) => m.id !== id) })),
  addLab: (moduleId, name, labNumber) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? { ...m, labs: [...m.labs, { id: genId(), name, labNumber, reports: [] }] }
          : m
      ),
    })),
  deleteLab: (moduleId, labId) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId ? { ...m, labs: m.labs.filter((l) => l.id !== labId) } : m
      ),
    })),
  setLabSheet: (moduleId, labId, labSheet) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              labs: m.labs.map((l) => (l.id === labId ? { ...l, labSheet } : l)),
            }
          : m
      ),
    })),
  addReport: (moduleId, labId, report) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              labs: m.labs.map((l) =>
                l.id === labId ? { ...l, reports: [...l.reports, report] } : l
              ),
            }
          : m
      ),
    })),
  addReports: (moduleId, labId, reports) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              labs: m.labs.map((l) =>
                l.id === labId ? { ...l, reports: [...l.reports, ...reports] } : l
              ),
            }
          : m
      ),
    })),
  updateReportGrade: (moduleId, labId, reportId, grade, finalize) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              labs: m.labs.map((l) =>
                l.id === labId
                  ? {
                      ...l,
                      reports: l.reports.map((r) =>
                        r.id === reportId
                          ? {
                              ...r,
                              ...(finalize
                                ? { finalGrade: grade, status: 'finalized' as const }
                                : { aiGrade: grade, status: 'assessed' as const }),
                            }
                          : r
                      ),
                    }
                  : l
              ),
            }
          : m
      ),
    })),
  updateLabRubric: (moduleId, labId, rubric) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              labs: m.labs.map((l) =>
                l.id === labId && l.labSheet
                  ? { ...l, labSheet: { ...l.labSheet, rubric } }
                  : l
              ),
            }
          : m
      ),
    })),
}));
