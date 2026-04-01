export const tableQueries = `
CREATE TABLE IF NOT EXISTS public.appointment_types (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  name text,
  duration text
);

CREATE TABLE IF NOT EXISTS public.doctors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  name text,
  email text UNIQUE,
  phone text UNIQUE,
  type text,
  about text,
  weekly_availability json,
  specialty text,
  services text[],
  image_url text,
  off_days text[],
  google_refresh_token text,
  calendar_connected boolean
);

CREATE TABLE IF NOT EXISTS public.doctors_appointments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  timezone text,
  start_time timestamptz,
  end_time timestamptz,
  meeting_date date,
  appointment_type_id bigint,
  doctor_id bigint,
  patient_details json,
  notes text,
  CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  CONSTRAINT fk_appointment_type FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id)
);

CREATE TABLE IF NOT EXISTS public.gmail_appointment_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  message_id text UNIQUE,
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gmail_threads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  thread_id text NOT NULL,
  last_message text,
  last_message_time timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sender_name text,
  sender_email text,
  subject text,
  is_new boolean DEFAULT true,
  receiver_name text,
  receiver_email text
);

CREATE TABLE IF NOT EXISTS public.patients (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  name text,
  email varchar,
  phone text,
  insurance text,
  dob date,
  gender text,
  member_id text,
  next_appointment date
);

CREATE TABLE IF NOT EXISTS public.patients_appointment_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  patient_id bigint,
  date date,
  purpose text,
  doctor_id bigint,
  status text,
  user_id uuid DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.practice_details (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  general_information json,
  address json,
  contact_information json,
  unique_key text
);

CREATE TABLE IF NOT EXISTS public.user_gmail_accounts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid UNIQUE DEFAULT auth.uid(),
  gmail_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  is_active boolean,
  updated_at timestamptz DEFAULT now(),
  ai_auto_reply boolean DEFAULT false
);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_appointment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients_appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gmail_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.voice_notes_template (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  name text,
  details text
);

ALTER TABLE voice_notes_template ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS periodontal_charts (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  doctor_id BIGINT NOT NULL,
  dob DATE,
  chart_date DATE NOT NULL,
  recording_url TEXT,
  transcript_url TEXT,
  tooth_data JSONB NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  aiSummary JSONB,
  isSummaryGenerating BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periodontal_charts_user_id ON periodontal_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_periodontal_charts_patient_id ON periodontal_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_periodontal_charts_doctor_id ON periodontal_charts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_periodontal_charts_created_at ON periodontal_charts(created_at);

CREATE TABLE IF NOT EXISTS public.twilio_config (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  account_sid text,
  auth_token text
);

CREATE TABLE IF NOT EXISTS public.scheduler_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  script_url text,
  widget_props jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT scheduler_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_scribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  patient_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  template_id BIGINT,
  description TEXT,
  date_created DATE NOT NULL DEFAULT CURRENT_DATE,
  user_recording_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  transcript_url TEXT,
  live_transcript TEXT,
  ai_summary_url TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_scribes_user ON ai_scribes(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_scribes_patient ON ai_scribes(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_scribes_doctor ON ai_scribes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_scribes_date ON ai_scribes(date_created);

ALTER TABLE scheduler_configs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ai_agents (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE,
  voice_id        TEXT,
  introduction_prompt TEXT,
  prompt_voice_url TEXT,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  link TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_embedding_ivfflat
ON public.faqs
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.match_faqs (
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  question text,
  answer text,
  link text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    faqs.id,
    faqs.question,
    faqs.answer,
    faqs.link,
    1 - (faqs.embedding <=> query_embedding) AS similarity
  FROM public.faqs
  WHERE filter_user_id IS NULL OR faqs.user_id = filter_user_id
  ORDER BY faqs.embedding <=> query_embedding
  LIMIT match_count;
$$;


CREATE TABLE IF NOT EXISTS public.patients_insurance (
  id bigserial primary key,
  user_id uuid not null,
  patient_id integer not null,

  subscriber_name text,
  ssn_masked text,
  member_id text,
  dob date,
  company text,
  phone text,
  group_name text,
  group_number text,
  payer_id text,
  effective_date date,
  email_fax text,
  timely_filing text,

  network_status text,
  fee_schedule text,
  plan_year_type text,
  plan_year_start date,
  plan_year_end date,
  yearly_max numeric(12,2) default 0,
  yearly_max_used numeric(12,2) default 0,
  deductible_individual numeric(12,2) default 0,
  deductible_individual_met numeric(12,2) default 0,
  deductible_family numeric(12,2) default 0,
  deductible_family_met numeric(12,2) default 0,
  coverage_type text,
  dependent_age_limit integer,
  cob_rule text,
  waiting_period_has boolean default false,
  waiting_period_details text,
  missing_tooth_clause_has boolean default false,
  missing_tooth_clause_details text,
  po_box text,

  verified_by text,
  date_verified date,
  reference_number text,
  verification_notes text,

  coverage_categories jsonb not null default '[]'::jsonb,
  procedure_codes jsonb not null default '[]'::jsonb,
  covered_members jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint patients_insurance_user_patient_unique unique (user_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_patients_insurance_user_id
  ON public.patients_insurance(user_id);

CREATE INDEX IF NOT EXISTS idx_patients_insurance_patient_id
  ON public.patients_insurance(patient_id);

-- Foreign keys and constraints (using DO blocks or ALTER to avoid errors if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gmail_threads_user_id_fkey') THEN
    ALTER TABLE public.gmail_threads ADD CONSTRAINT gmail_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_history_doctor_fkey') THEN
    ALTER TABLE public.patients_appointment_history ADD CONSTRAINT patient_history_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_history_patient_fkey') THEN
    ALTER TABLE public.patients_appointment_history ADD CONSTRAINT patient_history_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);
  END IF;
  
  -- Foreign Keys for ai_scribes
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_scribes_patient_id_fkey') THEN
    ALTER TABLE ai_scribes ADD CONSTRAINT ai_scribes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_scribes_doctor_id_fkey') THEN
    ALTER TABLE ai_scribes ADD CONSTRAINT ai_scribes_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_scribes_template_id_fkey') THEN
    ALTER TABLE ai_scribes ADD CONSTRAINT ai_scribes_template_id_fkey FOREIGN KEY (template_id) REFERENCES voice_notes_template(id) ON DELETE SET NULL;
  END IF;
  
  -- Foreign Keys for periodontal_charts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_patient') THEN
    ALTER TABLE periodontal_charts ADD CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_doctor') THEN
    ALTER TABLE periodontal_charts ADD CONSTRAINT fk_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user') THEN
    ALTER TABLE periodontal_charts ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;


CREATE TABLE public.campaign_calls (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_patient_id uuid NOT NULL 
      REFERENCES public.campaign_patients(id) ON DELETE CASCADE,
  call_sid text,
  call_start_time timestamp with time zone,
  call_end_time timestamp with time zone,
  call_duration integer,
  call_status text,
  recording_url text,
  ai_response jsonb,
  transcript_url text,
  sentiment text,
  remark text,
  created_at timestamp with time zone DEFAULT now()
);

create index idx_campaign_status on public.campaigns (status);
create index idx_campaign_patients_status on public.campaign_patients (campaign_id, status, attempt_count);
create index idx_campaign_calls_campaign_patient_id on public.campaign_calls (campaign_patient_id);

`;
