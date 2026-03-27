import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import {
  Plus,
  FlaskConical,
  FileText,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Upload,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { modules, addLab, deleteLab } = useAppStore();
  const navigate = useNavigate();
  const mod = modules.find((m) => m.id === moduleId);

  const [open, setOpen] = useState(false);
  const [labName, setLabName] = useState('');

  if (!mod) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Module not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/modules')}>
          Back to Modules
        </Button>
      </div>
    );
  }

  const handleAddLab = () => {
    if (labName.trim()) {
      addLab(mod.id, labName.trim(), mod.labs.length + 1);
      setLabName('');
      setOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/modules" className="hover:text-foreground transition-colors">
          Modules
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{mod.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/modules')} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{mod.name}</h1>
              <p className="text-muted-foreground text-sm">{mod.code}</p>
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Lab
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lab</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Lab Name</Label>
                <Input
                  placeholder="e.g. Logic Gates"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                />
              </div>
              <Button onClick={handleAddLab} className="w-full">
                Create Lab
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {mod.labs.map((lab, i) => (
          <motion.div
            key={lab.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link to={`/modules/${mod.id}/labs/${lab.id}`}>
              <Card className="glass-card hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {lab.labNumber}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{lab.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          {lab.labSheet ? 'Lab sheet uploaded' : 'No lab sheet'}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {lab.reports.length} reports
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {lab.reports.length > 0 && (
                      <div className="flex gap-1">
                        {['pending', 'assessed', 'finalized'].map((status) => {
                          const count = lab.reports.filter((r) => r.status === status).length;
                          if (count === 0) return null;
                          return (
                            <Badge
                              key={status}
                              variant="secondary"
                              className={`text-xs ${
                                status === 'finalized'
                                  ? 'bg-success/10 text-success'
                                  : status === 'assessed'
                                  ? 'bg-info/10 text-info'
                                  : 'bg-warning/10 text-warning'
                              }`}
                            >
                              {count} {status}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteLab(mod.id, lab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-all"
                    >
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

      {mod.labs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No labs yet</p>
          <p className="text-sm">Add your first lab to this module</p>
        </div>
      )}
    </div>
  );
}
