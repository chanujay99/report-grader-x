import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchModules, createModule, deleteModule } from '@/lib/api';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, FlaskConical, FileText, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Modules() {
  const qc = useQueryClient();
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: fetchModules });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const addMut = useMutation({
    mutationFn: () => createModule(name.trim(), code.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); setName(''); setCode(''); setOpen(false); toast.success('Module created'); },
    onError: (e) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteModule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modules'] }); toast.success('Module deleted'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your course modules and labs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Module</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Module</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Module Name</Label>
                <Input placeholder="e.g. Digital Electronics" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Module Code</Label>
                <Input placeholder="e.g. EC3020" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <Button onClick={() => addMut.mutate()} disabled={!name.trim() || !code.trim()} className="w-full">Create Module</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => (
          <motion.div key={mod.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/modules/${mod.id}`}>
              <Card className="glass-card hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <button onClick={(e) => { e.preventDefault(); delMut.mutate(mod.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-foreground mt-4">{mod.name}</h3>
                  <p className="text-sm text-muted-foreground">{mod.code}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {modules.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No modules yet</p>
          <p className="text-sm">Create your first module to get started</p>
        </div>
      )}
    </div>
  );
}
