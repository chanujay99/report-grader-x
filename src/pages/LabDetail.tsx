import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ArrowLeft,
  Upload,
  FileText,
  Settings2,
  Download,
  Sparkles,
  Check,
  X,
  Eye,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { defaultRubricSections, LabSheet, StudentReport, GradeResult, RubricSection } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const genId = () => Math.random().toString(36).slice(2, 10);

export default function LabDetail() {
  const { moduleId, labId } = useParams<{ moduleId: string; labId: string }>();
  const { modules, setLabSheet, addReport, addReports, updateReportGrade, updateLabRubric } =
    useAppStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const labSheetInputRef = useRef<HTMLInputElement>(null);

  const mod = modules.find((m) => m.id === moduleId);
  const lab = mod?.labs.find((l) => l.id === labId);

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [editedSections, setEditedSections] = useState<RubricSection[]>([]);
  const [assessingId, setAssessingId] = useState<string | null>(null);

  if (!mod || !lab) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Lab not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/modules')}>
          Back to Modules
        </Button>
      </div>
    );
  }

  const rubric = lab.labSheet?.rubric || {
    id: 'default',
    name: 'Default Rubric',
    sections: defaultRubricSections,
    totalMax: 100,
  };

  const handleLabSheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ls: LabSheet = {
      id: genId(),
      name: file.name,
      fileName: file.name,
      uploadDate: new Date().toISOString().split('T')[0],
      rubric: {
        id: genId(),
        name: 'Default Rubric',
        sections: [...defaultRubricSections],
        totalMax: 100,
      },
    };
    setLabSheet(mod.id, lab.id, ls);
    toast.success('Lab sheet uploaded');
  };

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const report: StudentReport = {
      id: genId(),
      studentName: '',
      studentId: '',
      fileName: file.name,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
    addReport(mod.id, lab.id, report);
    setSelectedReport(report.id);
    toast.success('Report uploaded');
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reports: StudentReport[] = Array.from(files).map((f) => ({
      id: genId(),
      studentName: '',
      studentId: '',
      fileName: f.name,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'pending' as const,
    }));
    addReports(mod.id, lab.id, reports);
    toast.success(`${reports.length} reports uploaded`);
  };

  const handleAIAssess = (reportId: string) => {
    setAssessingId(reportId);
    // Simulate AI assessment
    setTimeout(() => {
      const grade: GradeResult = {
        sectionScores: rubric.sections.map((s) => ({
          sectionId: s.id,
          score: Math.round(s.maxScore * (0.6 + Math.random() * 0.35)),
          feedback: `AI-generated feedback for ${s.name}. The student demonstrated ${
            Math.random() > 0.5 ? 'strong' : 'adequate'
          } understanding of the concepts.`,
        })),
        totalScore: 0,
        totalMax: rubric.totalMax,
        overallFeedback:
          'This report shows a solid understanding of the lab objectives. The methodology section is well-documented.',
      };
      grade.totalScore = grade.sectionScores.reduce((a, s) => a + s.score, 0);
      updateReportGrade(mod.id, lab.id, reportId, grade, false);
      setAssessingId(null);
      toast.success('AI assessment complete');
    }, 2000);
  };

  const handleFinalize = (reportId: string, grade: GradeResult) => {
    updateReportGrade(mod.id, lab.id, reportId, grade, true);
    toast.success('Grade finalized');
  };

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Student ID', 'File', 'Status', 'Total Score', 'Max Score'];
    const rows = lab.reports.map((r) => {
      const g = r.finalGrade || r.aiGrade;
      return [
        r.studentName || 'N/A',
        r.studentId || 'N/A',
        r.fileName,
        r.status,
        g?.totalScore ?? '',
        g?.totalMax ?? '',
      ];
    });
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mod.code}_Lab${lab.labNumber}_grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const openRubricEditor = () => {
    setEditedSections(rubric.sections.map((s) => ({ ...s })));
    setRubricOpen(true);
  };

  const saveRubric = () => {
    const total = editedSections.reduce((a, s) => a + s.maxScore, 0);
    updateLabRubric(mod.id, lab.id, {
      ...rubric,
      sections: editedSections,
      totalMax: total,
    });
    setRubricOpen(false);
    toast.success('Rubric updated');
  };

  const activeReport = lab.reports.find((r) => r.id === selectedReport);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/modules" className="hover:text-foreground transition-colors">Modules</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/modules/${mod.id}`} className="hover:text-foreground transition-colors">{mod.name}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">Lab {lab.labNumber}: {lab.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/modules/${mod.id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lab {lab.labNumber}: {lab.name}</h1>
            <p className="text-muted-foreground text-sm">{mod.code} — {mod.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openRubricEditor} className="gap-2">
            <Settings2 className="w-4 h-4" /> Rubric
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports ({lab.reports.length})</TabsTrigger>
          <TabsTrigger value="labsheet">Lab Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="labsheet" className="space-y-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              {lab.labSheet ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{lab.labSheet.fileName}</p>
                      <p className="text-sm text-muted-foreground">Uploaded {lab.labSheet.uploadDate}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => labSheetInputRef.current?.click()}
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => labSheetInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-foreground font-medium">Upload Lab Sheet</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF or Word document</p>
                </div>
              )}
              <input
                ref={labSheetInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleLabSheetUpload}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4" /> Upload Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => bulkInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" /> Bulk Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleReportUpload}
            />
            <input
              ref={bulkInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleBulkUpload}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Report List */}
            <div className="space-y-2 lg:col-span-1">
              {lab.reports.map((r) => (
                <Card
                  key={r.id}
                  className={`cursor-pointer transition-all ${
                    selectedReport === r.id
                      ? 'border-primary ring-1 ring-primary/20'
                      : 'glass-card hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedReport(r.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {r.studentName || r.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.studentId || 'No ID'} · {r.uploadDate}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs shrink-0 ml-2 ${
                          r.status === 'finalized'
                            ? 'bg-success/10 text-success'
                            : r.status === 'assessed'
                            ? 'bg-info/10 text-info'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    {(r.finalGrade || r.aiGrade) && (
                      <p className="text-xs font-medium text-primary mt-1">
                        {(r.finalGrade || r.aiGrade)!.totalScore}/{(r.finalGrade || r.aiGrade)!.totalMax}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {lab.reports.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No reports uploaded yet
                </div>
              )}
            </div>

            {/* Assessment Panel */}
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
                    moduleId={mod.id}
                    labId={lab.id}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-64 text-muted-foreground text-sm glass-card rounded-lg border border-border"
                  >
                    Select a report to view assessment
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rubric Editor Dialog */}
      <Dialog open={rubricOpen} onOpenChange={setRubricOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Marking Rubric</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {editedSections.map((sec, idx) => (
              <div key={sec.id} className="space-y-2 p-3 rounded-lg bg-muted/50">
                <div className="flex gap-2">
                  <Input
                    value={sec.name}
                    onChange={(e) => {
                      const next = [...editedSections];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setEditedSections(next);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={sec.maxScore}
                    onChange={(e) => {
                      const next = [...editedSections];
                      next[idx] = { ...next[idx], maxScore: Number(e.target.value) };
                      setEditedSections(next);
                    }}
                    className="w-20"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditedSections(editedSections.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Description"
                  value={sec.description}
                  onChange={(e) => {
                    const next = [...editedSections];
                    next[idx] = { ...next[idx], description: e.target.value };
                    setEditedSections(next);
                  }}
                  className="text-sm"
                />
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                setEditedSections([
                  ...editedSections,
                  { id: genId(), name: 'New Section', maxScore: 10, description: '' },
                ])
              }
            >
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total: {editedSections.reduce((a, s) => a + s.maxScore, 0)} marks
              </span>
              <Button onClick={saveRubric}>Save Rubric</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssessmentPanel({
  report,
  rubric,
  onAssess,
  onFinalize,
  assessing,
}: {
  report: StudentReport;
  rubric: { sections: RubricSection[]; totalMax: number };
  onAssess: () => void;
  onFinalize: (grade: GradeResult) => void;
  assessing: boolean;
  moduleId: string;
  labId: string;
}) {
  const grade = report.finalGrade || report.aiGrade;
  const [editingGrade, setEditingGrade] = useState<GradeResult | null>(null);

  const startEditing = () => {
    if (grade) {
      setEditingGrade(JSON.parse(JSON.stringify(grade)));
    }
  };

  const updateScore = (sectionId: string, score: number) => {
    if (!editingGrade) return;
    const updated = {
      ...editingGrade,
      sectionScores: editingGrade.sectionScores.map((s) =>
        s.sectionId === sectionId ? { ...s, score } : s
      ),
    };
    updated.totalScore = updated.sectionScores.reduce((a, s) => a + s.score, 0);
    setEditingGrade(updated);
  };

  const updateFeedback = (sectionId: string, feedback: string) => {
    if (!editingGrade) return;
    setEditingGrade({
      ...editingGrade,
      sectionScores: editingGrade.sectionScores.map((s) =>
        s.sectionId === sectionId ? { ...s, feedback } : s
      ),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {report.studentName || report.fileName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {report.studentId || 'N/A'} · {report.fileName}
              </p>
            </div>
            <div className="flex gap-2">
              {report.status === 'pending' && (
                <Button onClick={onAssess} disabled={assessing} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  {assessing ? 'Assessing...' : 'AI Assess'}
                </Button>
              )}
              {grade && !editingGrade && report.status !== 'finalized' && (
                <>
                  <Button variant="outline" size="sm" onClick={startEditing} className="gap-2">
                    <Eye className="w-4 h-4" /> Review & Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onFinalize(grade)}
                    className="gap-2"
                  >
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
                  const sg =
                    (editingGrade || grade).sectionScores.find((s) => s.sectionId === sec.id);
                  return (
                    <div key={sec.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{sec.name}</span>
                        {editingGrade ? (
                          <Input
                            type="number"
                            value={sg?.score ?? 0}
                            min={0}
                            max={sec.maxScore}
                            onChange={(e) =>
                              updateScore(sec.id, Math.min(Number(e.target.value), sec.maxScore))
                            }
                            className="w-20 h-8 text-sm"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-foreground">
                            {sg?.score ?? 0}/{sec.maxScore}
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary rounded-full transition-all"
                          style={{
                            width: `${((sg?.score ?? 0) / sec.maxScore) * 100}%`,
                          }}
                        />
                      </div>
                      {editingGrade ? (
                        <Textarea
                          value={sg?.feedback || ''}
                          onChange={(e) => updateFeedback(sec.id, e.target.value)}
                          className="text-sm min-h-[60px]"
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">{sg?.feedback}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {editingGrade && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setEditingGrade(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      onFinalize(editingGrade);
                      setEditingGrade(null);
                    }}
                  >
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
