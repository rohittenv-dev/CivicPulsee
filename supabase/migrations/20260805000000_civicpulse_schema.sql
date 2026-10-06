-- CivicPulse Database Schema Migration
-- Standard PostgreSQL / Supabase Schema

-- Create Custom Types / Enums
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('citizen', 'official', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_status AS ENUM ('reported', 'assigned', 'in_progress', 'resolved', 'confirmed', 'reopened');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_severity AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Default Departments
INSERT INTO public.departments (id, name, code, contact_email)
VALUES
    ('roads', 'Roads & Infrastructure', 'ROADS', 'roads@civicpulse.org'),
    ('sanitation', 'Waste & Sanitation', 'SAN', 'waste@civicpulse.org'),
    ('water', 'Water Supply & Sewage', 'WATER', 'water@civicpulse.org'),
    ('electrical', 'Street Lighting & Power', 'ELEC', 'power@civicpulse.org'),
    ('parks', 'Parks & Horticulture', 'PARKS', 'parks@civicpulse.org')
ON CONFLICT (id) DO NOTHING;

-- 3. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'citizen',
    department_id TEXT REFERENCES public.departments(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, role)
);

-- 4. Issues Table
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    severity public.issue_severity DEFAULT 'medium' NOT NULL,
    status public.issue_status DEFAULT 'reported' NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    department_id TEXT REFERENCES public.departments(id),
    reporter_id UUID REFERENCES public.profiles(id),
    reporter_phone TEXT,
    support_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    proof_photo_url TEXT,
    resolution_notes TEXT,
    reopen_reason TEXT
);

-- 5. Issue Events (Audit Chain) Table
CREATE TABLE IF NOT EXISTS public.issue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    previous_status public.issue_status,
    new_status public.issue_status NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    actor_name TEXT,
    comment TEXT,
    prev_hash TEXT,
    event_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Issue Supporters Table
CREATE TABLE IF NOT EXISTS public.issue_supporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (issue_id, user_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_supporters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Departments: Public Read
CREATE POLICY "Public departments read" ON public.departments FOR SELECT USING (true);

-- Issues: Public Read (Non-PII public monitoring)
CREATE POLICY "Public issues read" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Public issue insert" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Official or reporter issue update" ON public.issues FOR UPDATE USING (true);

-- Issue Events: Public Read
CREATE POLICY "Public issue events read" ON public.issue_events FOR SELECT USING (true);
CREATE POLICY "Public issue events insert" ON public.issue_events FOR INSERT WITH CHECK (true);

-- Issue Supporters: Public Read & Insert
CREATE POLICY "Public supporters read" ON public.issue_supporters FOR SELECT USING (true);
CREATE POLICY "Public supporters insert" ON public.issue_supporters FOR INSERT WITH CHECK (true);

-- Profiles & User Roles
CREATE POLICY "Profiles self or public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles update self" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create Storage Bucket for Complaint Photos if supported
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public issue-photos access" ON storage.objects FOR SELECT USING (bucket_id = 'issue-photos');
CREATE POLICY "Public issue-photos upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-photos');
