import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchModules, fetchLabs, fetchLabSheet, fetchReports, uploadLabSheet, uploadReport, uploadReportsBulk, updateReportGrade, updateRubric, assessReport, updateReportInfo, deleteReport, copyRubricToLab, fetchAllLabs } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Upload, FileText, Settings2, Download, Sparkles, Check, X, Eye, Plus, Trash2, PlayCircle, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { defaultRubricSections, RubricSection, GradeResult } from '@/types';
import type { Json } from '@/integrations/supabase/types';

const genId = () => Math.random().toString(36).slice(2, 10);

export default function LabDetail() {
  const { moduleId, labId } = useParams<{ moduleId: string; labId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const labSheetInputRef = useRef<HTMLInputElement>(null);

  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: fetchModules });
  const mod = modules.find((m) => m.id === moduleId);
  const { data: labs = [] } = useQuery({ queryKey: ['labs', moduleId], queryFn: () => fetchLabs(moduleId!), enabled: !!moduleId });
  const lab = labs.find((l) => l.id === labId);
  const { data: labSheet } = useQuery({ queryKey: ['labSheet', labId], queryFn: () => fetchLabSheet(labId!), enabled: !!labId });
  const { data: reports = [] } = useQuery({ queryKey: ['reports', labId], queryFn: () => fetchReports(labId!), enabled: !!labId });

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [editedSections, setEditedSections] = useState<RubricSection[]>([]);
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [batchAssessing, setBatchAssessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, failed: 0 });
  const [copyTargetLabId, setCopyTargetLabId] = useState<string>('');

  const { data: allLabs = [] } = useQuery({ queryKey: ['allLabs'], queryFn: fetchAllLabs });

  const rubric = labSheet?.rubric as any || { sections: defaultRubricSections, totalMax: 100 };

  const uploadLabSheetMut = useMutation({
    mutationFn: (file: File) => uploadLabSheet(labId!, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labSheet', labId] }); toast.success('Lab sheet uploaded'); },
    onError: (e) => toast.error(e.message),
  });

  const uploadReportMut = useMutation({
    mutationFn: (file: File) => uploadReport(labId!, file),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['reports', labId] }); setSelectedReport(data.id); toast.success('Report uploaded'); },
    onError: (e) => toast.error(e.message),
  });

  const bulkUploadMut = useMutation({
    mutationFn: (files: File[]) => uploadReportsBulk(labId!, files),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports', labId] }); toast.success('Reports uploaded'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteReportMut = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['reports', labId] });
      if (selectedReport === deletedId) setSelectedReport(null);
      toast.success('Report deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAIAssess = async (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    setAssessingId(reportId);
    try {
      const grade = await assessReport(report.file_path, labSheet?.file_path || null, rubric, report.student_name, report.file_name, labSheet?.file_name);
      await updateReportGrade(reportId, grade, false);
      qc.invalidateQueries({ queryKey: ['reports', labId] });
      toast.success(`AI assessment complete (${grade.model})`);
    } catch (e: any) {
      toast.error(e.message || 'Assessment failed');
    } finally {
      setAssessingId(null);
    }
  };

  const runBatch = async (batch: typeof reports, label: string) => {
    setBatchAssessing(true);
    setBatchProgress({ current: 0, total: batch.length, failed: 0 });
    let failed = 0;

    for (let i = 0; i < batch.length; i++) {
      const report = batch[i];
      try {
        const grade = await assessReport(report.file_path, labSheet?.file_path || null, rubric, report.student_name, report.file_name, labSheet?.file_name);
        await updateReportGrade(report.id, grade, false);
      } catch (e: any) {
        console.error(`${label} failed for ${report.file_name}:`, e);
        failed++;
      }
      setBatchProgress({ current: i + 1, total: batch.length, failed });
    }

    qc.invalidateQueries({ queryKey: ['reports', labId] });
    setBatchAssessing(false);
    toast.success(`${label} complete: ${batch.length - failed}/${batch.length} succeeded${failed > 0 ? `, ${failed} failed` : ''}`);
  };

  const handleBatchAssess = async () => {
    const pending = reports.filter((r) => r.status === 'pending');
    if (pending.length === 0) { toast.info('No pending reports to assess'); return; }
    await runBatch(pending.slice(0, 200), 'Batch assessment');
  };

  const handleBatchReassess = async () => {
    const assessed = reports.filter((r) => r.status === 'assessed' || r.status === 'finalized');
    if (assessed.length === 0) { toast.info('No assessed reports to reassess'); return; }
    await runBatch(assessed.slice(0, 200), 'Batch reassessment');
  };

  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const handleDeleteAll = async () => {
    if (reports.length === 0) { toast.info('No reports to delete'); return; }
    setDeleteAllConfirm(false);
    const total = reports.length;
    let failed = 0;
    for (const r of reports) {
      try { await deleteReport(r.id); } catch { failed++; }
    }
    qc.invalidateQueries({ queryKey: ['reports', labId] });
    setSelectedReport(null);
    toast.success(`Deleted ${total - failed}/${total} reports${failed > 0 ? `, ${failed} failed` : ''}`);
  };

  const handleFinalize = async (reportId: string, grade: GradeResult) => {
    await updateReportGrade(reportId, grade, true);
    qc.invalidateQueries({ queryKey: ['reports', labId] });
    toast.success('Grade finalized');
  };

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Student ID', 'File', 'Status', 'Total Score', 'Max Score'];
    const rows = reports.map((r) => {
      const g = r.finalGrade || r.aiGrade;
      return [r.student_name || 'N/A', r.student_id || 'N/A', r.file_name, r.status, g?.totalScore ?? '', g?.totalMax ?? ''];
    });
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mod?.code || 'lab'}_Lab${lab?.lab_number || ''}_grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const openRubricEditor = () => {
    setEditedSections((rubric.sections || defaultRubricSections).map((s: any) => ({ ...s })));
    setRubricOpen(true);
  };

  const saveRubric = async () => {
    if (!labSheet) return;
    const total = editedSections.reduce((a, s) => a + s.maxScore, 0);
    const newRubric = { sections: editedSections, totalMax: total };
    await updateRubric(labSheet.id, newRubric as unknown as Json);
    qc.invalidateQueries({ queryKey: ['labSheet', labId] });
    setRubricOpen(false);
    toast.success('Rubric updated');
  };

  if (!mod || !lab) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Lab not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/modules')}>Back to Modules</Button>
      </div>
    );
  }

  const activeReport = reports.find((r) => r.id === selectedReport);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/modules" className="hover:text-foreground transition-colors">Modules</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/modules/${mod.id}`} className="hover:text-foreground transition-colors">{mod.name}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">Lab {lab.lab_number}: {lab.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/modules/${mod.id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lab {lab.lab_number}: {lab.name}</h1>
            <p className="text-muted-foreground text-sm">{mod.code} — {mod.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openRubricEditor} className="gap-2" disabled={!labSheet}>
            <Settings2 className="w-4 h-4" /> Rubric
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="labsheet">Lab Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="labsheet" className="space-y-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              {labSheet ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{labSheet.file_name}</p>
                      <p className="text-sm text-muted-foreground">Uploaded {new Date(labSheet.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => labSheetInputRef.current?.click()}>Replace</Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => labSheetInputRef.current?.click()}>
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-foreground font-medium">Upload Lab Sheet</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF or Word document</p>
                </div>
              )}
              <input ref={labSheetInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLabSheetMut.mutate(f); }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> Upload Report
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => bulkInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> Bulk Upload (max 200)
            </Button>
            <Button size="sm" variant="secondary" className="gap-2" onClick={handleBatchAssess}
              disabled={batchAssessing || !labSheet || reports.filter(r => r.status === 'pending').length === 0}>
              <PlayCircle className="w-4 h-4" /> {batchAssessing ? `${batchProgress.current}/${batchProgress.total}...` : `Batch Assess (${reports.filter(r => r.status === 'pending').length} pending)`}
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleBatchReassess}
              disabled={batchAssessing || !labSheet || reports.filter(r => r.status !== 'pending').length === 0}>
              <Sparkles className="w-4 h-4" /> {`Bulk Reassess (${reports.filter(r => r.status !== 'pending').length})`}
            </Button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReportMut.mutate(f); }} />
            <input ref={bulkInputRef} type="file" accept=".pdf,.doc,.docx" multiple className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  const arr = Array.from(files).slice(0, 200);
                  if (files.length > 200) toast.warning(`Only the first 200 files will be uploaded (${files.length} selected)`);
                  bulkUploadMut.mutate(arr);
                }
              }} />
          </div>
          {batchAssessing && (
            <div className="space-y-1">
              <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {batchProgress.current}/{batchProgress.total} assessed{batchProgress.failed > 0 ? ` · ${batchProgress.failed} failed` : ''}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2 lg:col-span-1">
              {reports.map((r) => (
                <Card key={r.id} className={`cursor-pointer transition-all ${selectedReport === r.id ? 'border-primary ring-1 ring-primary/20' : 'glass-card hover:border-primary/30'}`}
                  onClick={() => setSelectedReport(r.id)}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{r.student_name || r.file_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.student_id || 'No ID'} · {r.upload_date}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <Badge variant="secondary" className={`text-xs ${
                          r.status === 'finalized' ? 'bg-success/10 text-success' : r.status === 'assessed' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                        }`}>{r.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteReportMut.mutate(r.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {(r.finalGrade || r.aiGrade) && (
                      <p className="text-xs font-medium text-primary mt-1">
                        {(r.finalGrade || r.aiGrade)!.totalScore}/{(r.finalGrade || r.aiGrade)!.totalMax}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No reports uploaded yet
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {activeReport ? (
                  <AssessmentPanel
                    key={activeReport.id}
                    report={activeReport}
                    rubric={rubric}
                    onAssess={() => handleAIAssess(activeReport.id)}
                    onFinalize={(grade) => handleFinalize(activeReport.id, grade)}
                    assessing={assessingId === activeReport.id}
                    onUpdateInfo={(name, id) => { updateReportInfo(activeReport.id, name, id).then(() => qc.invalidateQueries({ queryKey: ['reports', labId] })); }}
                  />
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-64 text-muted-foreground text-sm glass-card rounded-lg border border-border">
                    Select a report to view assessment
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={rubricOpen} onOpenChange={setRubricOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Marking Rubric</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {editedSections.map((sec, idx) => (
              <div key={sec.id} className="space-y-2 p-3 rounded-lg bg-muted/50">
                <div className="flex gap-2">
                  <Input value={sec.name} onChange={(e) => { const next = [...editedSections]; next[idx] = { ...next[idx], name: e.target.value }; setEditedSections(next); }} className="flex-1" />
                  <Input type="number" value={sec.maxScore} onChange={(e) => { const next = [...editedSections]; next[idx] = { ...next[idx], maxScore: Number(e.target.value) }; setEditedSections(next); }} className="w-20" />
                  <Button variant="ghost" size="icon" onClick={() => setEditedSections(editedSections.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>
                </div>
                <Input placeholder="Description" value={sec.description} onChange={(e) => { const next = [...editedSections]; next[idx] = { ...next[idx], description: e.target.value }; setEditedSections(next); }} className="text-sm" />
              </div>
            ))}
            <Button variant="outline" className="w-full"
              onClick={() => setEditedSections([...editedSections, { id: genId(), name: 'New Section', maxScore: 10, description: '' }])}>
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total: {editedSections.reduce((a, s) => a + s.maxScore, 0)} marks</span>
              <Button onClick={saveRubric}>Save Rubric</Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><Copy className="w-4 h-4" /> Copy Rubric to Another Lab</p>
              <div className="flex gap-2">
                <Select value={copyTargetLabId} onValueChange={setCopyTargetLabId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select target lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLabs.filter((l: any) => l.id !== labId).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {(l.modules as any)?.code} — Lab {l.lab_number}: {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" disabled={!copyTargetLabId || !labSheet} onClick={async () => {
                  try {
                    await copyRubricToLab(labSheet!.id, copyTargetLabId);
                    toast.success('Rubric copied successfully');
                    setCopyTargetLabId('');
                  } catch (e: any) { toast.error(e.message); }
                }}>Copy</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssessmentPanel({ report, rubric, onAssess, onFinalize, assessing, onUpdateInfo }: {
  report: any;
  rubric: { sections: RubricSection[]; totalMax: number };
  onAssess: () => void;
  onFinalize: (grade: GradeResult) => void;
  assessing: boolean;
  onUpdateInfo: (name: string, id: string) => void;
}) {
  const grade = report.finalGrade || report.aiGrade;
  const [editingGrade, setEditingGrade] = useState<GradeResult | null>(null);
  const [studentName, setStudentName] = useState(report.student_name || '');
  const [studentId, setStudentId] = useState(report.student_id || '');

  const updateScore = (sectionId: string, score: number) => {
    if (!editingGrade) return;
    const updated = { ...editingGrade, sectionScores: editingGrade.sectionScores.map((s) => s.sectionId === sectionId ? { ...s, score } : s) };
    updated.totalScore = updated.sectionScores.reduce((a, s) => a + s.score, 0);
    setEditingGrade(updated);
  };

  const updateFeedback = (sectionId: string, feedback: string) => {
    if (!editingGrade) return;
    setEditingGrade({ ...editingGrade, sectionScores: editingGrade.sectionScores.map((s) => s.sectionId === sectionId ? { ...s, feedback } : s) });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1 mr-4">
              <CardTitle className="text-lg">{report.file_name}</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Student Name" value={studentName} onChange={(e) => setStudentName(e.target.value)}
                  onBlur={() => onUpdateInfo(studentName, studentId)} className="h-8 text-sm" />
                <Input placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)}
                  onBlur={() => onUpdateInfo(studentName, studentId)} className="h-8 text-sm w-32" />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {report.status === 'pending' && (
                <Button onClick={onAssess} disabled={assessing} className="gap-2">
                  <Sparkles className="w-4 h-4" />{assessing ? 'Assessing...' : 'AI Assess'}
                </Button>
              )}
              {report.status !== 'pending' && (
                <Button variant="outline" size="sm" onClick={onAssess} disabled={assessing} className="gap-2">
                  <Sparkles className="w-4 h-4" />{assessing ? 'Reassessing...' : 'Reassess'}
                </Button>
              )}
              {grade && !editingGrade && report.status !== 'finalized' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditingGrade(JSON.parse(JSON.stringify(grade)))} className="gap-2">
                    <Eye className="w-4 h-4" /> Review
                  </Button>
                  <Button size="sm" onClick={() => onFinalize(grade)} className="gap-2">
                    <Check className="w-4 h-4" /> Finalize
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessing && (
            <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>AI is analyzing the report...</span>
            </div>
          )}

          {grade && !assessing && (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-sm font-medium text-foreground">Total Score</span>
                <span className="text-2xl font-bold text-primary">
                  {editingGrade ? editingGrade.totalScore : grade.totalScore}/{grade.totalMax}
                </span>
              </div>

              <div className="space-y-3">
                {rubric.sections.map((sec) => {
                  const sg = (editingGrade || grade).sectionScores.find((s: any) => s.sectionId === sec.id);
                  return (
                    <div key={sec.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{sec.name}</span>
                        {editingGrade ? (
                          <Input type="number" value={sg?.score ?? 0} min={0} max={sec.maxScore}
                            onChange={(e) => updateScore(sec.id, Math.min(Number(e.target.value), sec.maxScore))} className="w-20 h-8 text-sm" />
                        ) : (
                          <span className="text-sm font-semibold text-foreground">{sg?.score ?? 0}/{sec.maxScore}</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${((sg?.score ?? 0) / sec.maxScore) * 100}%` }} />
                      </div>
                      {editingGrade ? (
                        <Textarea value={sg?.feedback || ''} onChange={(e) => updateFeedback(sec.id, e.target.value)} className="text-sm min-h-[60px]" />
                      ) : (
                        <p className="text-xs text-muted-foreground">{sg?.feedback}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {editingGrade && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setEditingGrade(null)}>Cancel</Button>
                  <Button onClick={() => { onFinalize(editingGrade); setEditingGrade(null); }}>
                    <Check className="w-4 h-4 mr-2" /> Finalize Grade
                  </Button>
                </div>
              )}

              {!editingGrade && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Overall Feedback</p>
                  <p className="text-sm text-foreground">{grade.overallFeedback}</p>
                </div>
              )}

              {report.status === 'finalized' && (
                <Badge className="bg-success/10 text-success border-success/20">
                  <Check className="w-3 h-3 mr-1" /> Finalized
                </Badge>
              )}
            </>
          )}

          {!grade && !assessing && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Click "AI Assess" to generate an automated assessment
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
