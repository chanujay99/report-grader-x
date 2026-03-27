import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, FlaskConical, FileText, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Modules() {
  const { modules, addModule, deleteModule } = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleAdd = () => {
    if (name.trim() && code.trim()) {
      addModule(name.trim(), code.trim());
      setName('');
      setCode('');
      setOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your course modules and labs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Module</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Module Name</Label>
                <Input
                  placeholder="e.g. Digital Electronics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Module Code</Label>
                <Input
                  placeholder="e.g. EC3020"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Create Module
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => {
          const totalReports = mod.labs.reduce((a, l) => a + l.reports.length, 0);
          const assessed = mod.labs.reduce(
            (a, l) => a + l.reports.filter((r) => r.status !== 'pending').length,
            0
          );
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/modules/${mod.id}`}>
                <Card className="glass-card hover:border-primary/30 transition-all cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteModule(mod.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-foreground mt-4">{mod.name}</h3>
                    <p className="text-sm text-muted-foreground">{mod.code}</p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FlaskConical className="w-3.5 h-3.5" /> {mod.labs.length} Labs
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {totalReports} Reports
                      </span>
                    </div>
                    {totalReports > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-primary rounded-full transition-all"
                            style={{
                              width: `${(assessed / totalReports) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {assessed}/{totalReports} assessed
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
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
