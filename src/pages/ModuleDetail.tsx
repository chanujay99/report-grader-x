import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchModules, fetchLabs, createLab, deleteLab } from '@/lib/api';
import { motion } from 'framer-motion';
import { Plus, FlaskConical, FileText, ChevronRight, ArrowLeft, Trash2, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: fetchModules });
  const mod = modules.find((m) => m.id === moduleId);
  const { data: labs = [] } = useQuery({
    queryKey: ['labs', moduleId],
    queryFn: () => fetchLabs(moduleId!),
    enabled: !!moduleId,
  });

  const [open, setOpen] = useState(false);
  const [labName, setLabName] = useState('');

  const addMut = useMutation({
    mutationFn: () => createLab(moduleId!, labName.trim(), labs.length + 1),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labs', moduleId] }); setLabName(''); setOpen(false); toast.success('Lab created'); },
  });

  const delMut = useMutation({
    mutationFn: deleteLab,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labs', moduleId] }); toast.success('Lab deleted'); },
  });

  if (!mod) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Module not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/modules')}>Back to Modules</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/modules" className="hover:text-foreground transition-colors">Modules</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{mod.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{mod.name}</h1>
            <p className="text-muted-foreground text-sm">{mod.code}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Lab</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Lab</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Lab Name</Label>
                <Input placeholder="e.g. Logic Gates" value={labName} onChange={(e) => setLabName(e.target.value)} />
              </div>
              <Button onClick={() => addMut.mutate()} disabled={!labName.trim()} className="w-full">Create Lab</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {labs.map((lab, i) => (
          <motion.div key={lab.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={`/modules/${mod.id}/labs/${lab.id}`}>
              <Card className="glass-card hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {lab.lab_number}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{lab.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Lab {lab.lab_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.preventDefault(); delMut.mutate(lab.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {labs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No labs yet</p>
          <p className="text-sm">Add your first lab to this module</p>
        </div>
      )}
    </div>
  );
}
