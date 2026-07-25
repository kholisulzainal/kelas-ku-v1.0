-- =========================================================
-- HYBRID TRACKING TAHAP 1: EMBEDDED FORM & TRACKING SCHEMA
-- Aplikasi: KELAS KU
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel assignments (Tugas dari Guru)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    class_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    google_form_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel student_assignments (Status Pengerjaan & Nilai Siswa)
CREATE TABLE IF NOT EXISTS public.student_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'BELUM_DIKERJAKAN' CHECK (status IN ('BELUM_DIKERJAKAN', 'SEDANG_MENGERJAKAN', 'SELESAI')),
    score NUMERIC(5, 2) DEFAULT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id)
);

-- 3. Trigger & Function Auto-Timestamp untuk started_at & submitted_at
CREATE OR REPLACE FUNCTION public.fn_auto_timestamp_student_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika status berubah menjadi 'SEDANG_MENGERJAKAN' dan started_at masih NULL
    IF NEW.status = 'SEDANG_MENGERJAKAN' AND NEW.started_at IS NULL THEN
        NEW.started_at := NOW();
    END IF;

    -- Jika status berubah menjadi 'SELESAI' dan submitted_at masih NULL
    IF NEW.status = 'SELESAI' AND NEW.submitted_at IS NULL THEN
        NEW.submitted_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_timestamp_student_assignments ON public.student_assignments;

CREATE TRIGGER trg_auto_timestamp_student_assignments
BEFORE INSERT OR UPDATE ON public.student_assignments
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_timestamp_student_assignments();

-- Enable Row Level Security (RLS) & Grant Access
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access assignments" ON public.assignments;
CREATE POLICY "Public access assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access student_assignments" ON public.student_assignments;
CREATE POLICY "Public access student_assignments" ON public.student_assignments FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.assignments TO anon, authenticated, service_role;
GRANT ALL ON public.student_assignments TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
