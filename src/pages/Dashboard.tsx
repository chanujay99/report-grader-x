import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

export default function Dashboard() {
  const { modules } = useAppStore();

  const stats = useMemo(() => {
    let totalReports = 0;
    let assessed = 0;
    let finalized = 0;
    let pending = 0;
    const allScores: number[] = [];

    modules.forEach((m) =>
      m.labs.forEach((l) =>
        l.reports.forEach((r) => {
          totalReports++;
          if (r.status === 'assessed') assessed++;
          if (r.status === 'finalized') finalized++;
          if (r.status === 'pending') pending++;
          const grade = r.finalGrade || r.aiGrade;
          if (grade) allScores.push(Math.round((grade.totalScore / grade.totalMax) * 100));
        })
      )
    );

    return { totalReports, assessed, finalized, pending, allScores };
  }, [modules]);

  const bellCurveData = useMemo(() => {
    const bins = [
      { range: '0-10', count: 0 }, { range: '11-20', count: 0 },
      { range: '21-30', count: 0 }, { range: '31-40', count: 0 },
      { range: '41-50', count: 0 }, { range: '51-60', count: 0 },
      { range: '61-70', count: 0 }, { range: '71-80', count: 0 },
      { range: '81-90', count: 0 }, { range: '91-100', count: 0 },
    ];
    stats.allScores.forEach((s) => {
      const idx = Math.min(Math.floor(s / 10), 9);
      bins[idx].count++;
    });
    return bins;
  }, [stats.allScores]);

  const avg = stats.allScores.length
    ? Math.round(stats.allScores.reduce((a, b) => a + b, 0) / stats.allScores.length)
    : 0;

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
        <p className="text-muted-foreground text-sm mt-1">
          Overview of {modules.length} modules and lab assessments
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
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
          <CardHeader>
            <CardTitle className="text-base">Grade Distribution (Bell Curve)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.allScores.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No grades available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bellCurveData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="range" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {bellCurveData.map((_, idx) => (
                      <Cell key={idx} fill={`hsl(var(--chart-${(idx % 5) + 1}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Modules</span>
              <span className="font-semibold text-foreground">{modules.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Labs</span>
              <span className="font-semibold text-foreground">
                {modules.reduce((a, m) => a + m.labs.length, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Average Grade</span>
              <span className="font-semibold text-foreground">{avg}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="font-semibold text-foreground">
                {stats.totalReports
                  ? Math.round((stats.finalized / stats.totalReports) * 100)
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Recent Submissions</CardTitle>
        </CardHeader>
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
                {modules.flatMap((m) =>
                  m.labs.flatMap((l) =>
                    l.reports.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium text-foreground">{r.studentName}</td>
                        <td className="py-3 text-muted-foreground">{m.code}</td>
                        <td className="py-3 text-muted-foreground">Lab {l.labNumber}</td>
                        <td className="py-3 text-muted-foreground">{r.uploadDate}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'finalized'
                                ? 'bg-success/10 text-success'
                                : r.status === 'assessed'
                                ? 'bg-info/10 text-info'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-foreground">
                          {(r.finalGrade || r.aiGrade)
                            ? `${(r.finalGrade || r.aiGrade)!.totalScore}/${(r.finalGrade || r.aiGrade)!.totalMax}`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
