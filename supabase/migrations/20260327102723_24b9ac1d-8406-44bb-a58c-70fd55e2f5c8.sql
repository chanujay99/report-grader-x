
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules are accessible by everyone" ON public.modules FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Labs table
CREATE TABLE public.labs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lab_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Labs are accessible by everyone" ON public.labs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_labs_updated_at BEFORE UPDATE ON public.labs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lab sheets table
CREATE TABLE public.lab_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL UNIQUE REFERENCES public.labs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  rubric JSONB NOT NULL DEFAULT '{"sections":[],"totalMax":100}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab sheets are accessible by everyone" ON public.lab_sheets FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_lab_sheets_updated_at BEFORE UPDATE ON public.lab_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Student reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  student_id TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assessed', 'finalized')),
  ai_grade JSONB,
  final_grade JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are accessible by everyone" ON public.reports FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets for files
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-sheets', 'lab-sheets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true);

-- Storage policies
CREATE POLICY "Lab sheets are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'lab-sheets');
CREATE POLICY "Anyone can upload lab sheets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lab-sheets');
CREATE POLICY "Anyone can update lab sheets" ON storage.objects FOR UPDATE USING (bucket_id = 'lab-sheets');
CREATE POLICY "Anyone can delete lab sheets" ON storage.objects FOR DELETE USING (bucket_id = 'lab-sheets');

CREATE POLICY "Reports are publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "Anyone can upload reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports');
CREATE POLICY "Anyone can update reports" ON storage.objects FOR UPDATE USING (bucket_id = 'reports');
CREATE POLICY "Anyone can delete reports" ON storage.objects FOR DELETE USING (bucket_id = 'reports');
