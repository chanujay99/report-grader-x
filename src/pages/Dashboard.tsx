import { useQuery } from '@tanstack/react-query';
import { fetchModules, fetchReports, fetchLabs } from '@/lib/api';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: fetchModules });
  const { data: allLabs = [] } = useQuery({
    queryKey: ['all-labs', modules.map((m) => m.id)],
    queryFn: async () => {
      const results = await Promise.all(modules.map((m) => fetchLabs(m.id)));
      return results.flat().map((l, _, arr) => ({
        ...l,
        moduleCode: modules.find((m) => m.id === l.module_id)?.code || '',
        moduleName: modules.find((m) => m.id === l.module_id)?.name || '',
      }));
    },
    enabled: modules.length > 0,
  });
  const { data: allReports = [] } = useQuery({
    queryKey: ['all-reports', allLabs.map((l) => l.id)],
    queryFn: async () => {
      const results = await Promise.all(allLabs.map((l) => fetchReports(l.id).then((rs) => rs.map((r) => ({ ...r, lab: l })))));
      return results.flat();
    },
    enabled: allLabs.length > 0,
  });

  const stats = useMemo(() => {
    let pending = 0, assessed = 0, finalized = 0;
    const allScores: number[] = [];
    allReports.forEach((r) => {
      if (r.status === 'pending') pending++;
      if (r.status === 'assessed') assessed++;
      if (r.status === 'finalized') finalized++;
      const grade = r.finalGrade || r.aiGrade;
      if (grade) allScores.push(Math.round((grade.totalScore / grade.totalMax) * 100));
    });
    return { totalReports: allReports.length, pending, assessed, finalized, allScores };
  }, [allReports]);

  const bellCurveData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10 + 1}-${(i + 1) * 10}`, count: 0 }));
    bins[0].range = '0-10';
    stats.allScores.forEach((s) => { bins[Math.min(Math.floor(s / 10), 9)].count++; });
    return bins;
  }, [stats.allScores]);

  const avg = stats.allScores.length ? Math.round(stats.allScores.reduce((a, b) => a + b, 0) / stats.allScores.length) : 0;

  const statCards = [
    { label: 'Total Reports', value: stats.totalReports, icon: FileText, color: 'text-primary' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'Assessed', value: stats.assessed, icon: TrendingUp, color: 'text-info' },
    { label: 'Finalized', value: stats.finalized, icon: CheckCircle2, color: 'text-success' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of {modules.length} modules and lab assessments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                  <s.icon className={`w-10 h-10 ${s.color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Grade Distribution (Bell Curve)</CardTitle></CardHeader>
          <CardContent>
            {stats.allScores.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No grades available yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bellCurveData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="range" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {bellCurveData.map((_, idx) => (<Cell key={idx} fill={`hsl(var(--chart-${(idx % 5) + 1}))`} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Modules</span>
              <span className="font-semibold text-foreground">{modules.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Labs</span>
              <span className="font-semibold text-foreground">{allLabs.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Average Grade</span>
              <span className="font-semibold text-foreground">{avg}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="font-semibold text-foreground">
                {stats.totalReports ? Math.round((stats.finalized / stats.totalReports) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Recent Submissions</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-muted-foreground font-medium">Student</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Module</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Lab</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {allReports.slice(0, 20).map((r) => {
                  const grade = r.finalGrade || r.aiGrade;
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium text-foreground">{r.student_name || r.file_name}</td>
                      <td className="py-3 text-muted-foreground">{r.lab.moduleCode}</td>
                      <td className="py-3 text-muted-foreground">Lab {r.lab.lab_number}</td>
                      <td className="py-3 text-muted-foreground">{r.upload_date}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'finalized' ? 'bg-success/10 text-success' : r.status === 'assessed' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                        }`}>{r.status}</span>
                      </td>
                      <td className="py-3 font-medium text-foreground">{grade ? `${grade.totalScore}/${grade.totalMax}` : '—'}</td>
                    </tr>
                  );
                })}
                {allReports.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No submissions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
