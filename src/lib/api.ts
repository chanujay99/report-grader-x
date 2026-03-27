import { supabase } from '@/integrations/supabase/client';
import { GradeResult } from '@/types';
import type { Json } from '@/integrations/supabase/types';

// Helper to convert Json to GradeResult
function jsonToGrade(j: Json | null): GradeResult | undefined {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return undefined;
  const obj = j as Record<string, Json | undefined>;
  return {
    sectionScores: (obj.sectionScores as any[]) || [],
    totalScore: Number(obj.totalScore) || 0,
    totalMax: Number(obj.totalMax) || 0,
    overallFeedback: String(obj.overallFeedback || ''),
  };
}

// Modules
export async function fetchModules() {
  const { data, error } = await supabase.from('modules').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createModule(name: string, code: string) {
  const { data, error } = await supabase.from('modules').insert({ name, code }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteModule(id: string) {
  const { error } = await supabase.from('modules').delete().eq('id', id);
  if (error) throw error;
}

// Labs
export async function fetchLabs(moduleId: string) {
  const { data, error } = await supabase
    .from('labs')
    .select('*')
    .eq('module_id', moduleId)
    .order('lab_number');
  if (error) throw error;
  return data;
}

export async function createLab(moduleId: string, name: string, labNumber: number) {
  const { data, error } = await supabase
    .from('labs')
    .insert({ module_id: moduleId, name, lab_number: labNumber })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLab(id: string) {
  const { error } = await supabase.from('labs').delete().eq('id', id);
  if (error) throw error;
}

// Lab Sheets
export async function fetchLabSheet(labId: string) {
  const { data, error } = await supabase.from('lab_sheets').select('*').eq('lab_id', labId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function uploadLabSheet(labId: string, file: File) {
  const path = `${labId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('lab-sheets').upload(path, file);
  if (uploadError) throw uploadError;

  // Check if lab sheet exists
  const existing = await fetchLabSheet(labId);
  const defaultRubric = {
    sections: [
      { id: 'intro', name: 'Introduction', maxScore: 15, description: 'Clear objectives and background' },
      { id: 'method', name: 'Methodology', maxScore: 25, description: 'Detailed procedure and approach' },
      { id: 'results', name: 'Results', maxScore: 25, description: 'Accurate data presentation' },
      { id: 'discussion', name: 'Discussion', maxScore: 25, description: 'Analysis and interpretation' },
      { id: 'conclusion', name: 'Conclusion', maxScore: 10, description: 'Summary and future work' },
    ],
    totalMax: 100,
  };

  if (existing) {
    const { data, error } = await supabase
      .from('lab_sheets')
      .update({ name: file.name, file_name: file.name, file_path: path })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('lab_sheets')
      .insert({
        lab_id: labId,
        name: file.name,
        file_name: file.name,
        file_path: path,
        rubric: defaultRubric as unknown as Json,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function updateRubric(labSheetId: string, rubric: Json) {
  const { error } = await supabase.from('lab_sheets').update({ rubric }).eq('id', labSheetId);
  if (error) throw error;
}

// Reports
export async function fetchReports(labId: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('lab_id', labId)
    .order('created_at');
  if (error) throw error;
  return data.map((r) => ({
    ...r,
    aiGrade: jsonToGrade(r.ai_grade),
    finalGrade: jsonToGrade(r.final_grade),
  }));
}

export async function uploadReport(labId: string, file: File) {
  const path = `${labId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('reports').upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('reports')
    .insert({ lab_id: labId, file_name: file.name, file_path: path })
    .select()
    .single();
  if (error) throw error;
  return { ...data, aiGrade: undefined, finalGrade: undefined };
}

export async function uploadReportsBulk(labId: string, files: File[]) {
  const results = [];
  for (const file of files) {
    const r = await uploadReport(labId, file);
    results.push(r);
  }
  return results;
}

export async function updateReportInfo(reportId: string, studentName: string, studentId: string) {
  const { error } = await supabase
    .from('reports')
    .update({ student_name: studentName, student_id: studentId })
    .eq('id', reportId);
  if (error) throw error;
}

export async function updateReportGrade(reportId: string, grade: GradeResult, finalize: boolean) {
  const update = finalize
    ? { final_grade: grade as unknown as Json, status: 'finalized' as const }
    : { ai_grade: grade as unknown as Json, status: 'assessed' as const };
  const { error } = await supabase.from('reports').update(update).eq('id', reportId);
  if (error) throw error;
}

// AI Assessment
export async function assessReport(
  reportFilePath: string,
  labSheetFilePath: string | null,
  rubric: { sections: any[]; totalMax: number },
  studentName: string
): Promise<GradeResult & { model: string }> {
  // Try to download and extract text from files (simplified - just pass file names)
  const { data, error } = await supabase.functions.invoke('assess-report', {
    body: {
      reportContent: `Report file: ${reportFilePath}`,
      labSheetContent: labSheetFilePath ? `Lab sheet file: ${labSheetFilePath}` : null,
      rubric,
      studentName,
    },
  });

  if (error) throw new Error(error.message || 'Assessment failed');
  if (data.error) throw new Error(data.error);
  return data;
}
