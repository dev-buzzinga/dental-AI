export const rlsQueries = `
-- Enable RLS
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_appointment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients_appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients_insurance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to make script rerunnable safely
DROP POLICY IF EXISTS "appointment_types_crud" ON appointment_types;
DROP POLICY IF EXISTS "doctors_crud" ON doctors;
DROP POLICY IF EXISTS "doctors_appointments_crud" ON doctors_appointments;
DROP POLICY IF EXISTS "gmail_appointment_messages_crud" ON gmail_appointment_messages;
DROP POLICY IF EXISTS "gmail_threads_crud" ON gmail_threads;
DROP POLICY IF EXISTS "patients_crud" ON patients;
DROP POLICY IF EXISTS "patients_appointment_history_crud" ON patients_appointment_history;
DROP POLICY IF EXISTS "practice_details_crud" ON practice_details;
DROP POLICY IF EXISTS "user_gmail_accounts_crud" ON user_gmail_accounts;
DROP POLICY IF EXISTS "periodontal_charts" ON periodontal_charts;
DROP POLICY IF EXISTS "twilio_config" ON twilio_config;
DROP POLICY IF EXISTS "ai_scribes_crud" ON ai_scribes;
DROP POLICY IF EXISTS "voice_notes_template_crud" ON voice_notes_template;
DROP POLICY IF EXISTS "faqs_crud" ON faqs;
DROP POLICY IF EXISTS "scheduler_configs_crud" ON scheduler_configs;
DROP POLICY IF EXISTS "Allow authenticated upload doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete doctor images" ON storage.objects;


-- appointment_types
CREATE POLICY "appointment_types_crud"
ON appointment_types
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- doctors
CREATE POLICY "doctors_crud"
ON doctors
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- doctors_appointments
CREATE POLICY "doctors_appointments_crud"
ON doctors_appointments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- gmail_appointment_messages
CREATE POLICY "gmail_appointment_messages_crud"
ON gmail_appointment_messages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- gmail_threads
CREATE POLICY "gmail_threads_crud"
ON gmail_threads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- patients
CREATE POLICY "patients_crud"
ON patients
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- patients_appointment_history
CREATE POLICY "patients_appointment_history_crud"
ON patients_appointment_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- practice_details
CREATE POLICY "practice_details_crud"
ON practice_details
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_gmail_accounts
CREATE POLICY "user_gmail_accounts_crud"
ON user_gmail_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gmail_appointment_messages_user_message_unique') THEN
    ALTER TABLE gmail_appointment_messages ADD CONSTRAINT gmail_appointment_messages_user_message_unique UNIQUE (user_id, message_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS gmail_threads_user_thread_unique on public.gmail_threads (user_id, thread_id);


-- periodontal_charts
CREATE POLICY "periodontal_charts"
ON periodontal_charts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- bucket policies (Note: requires storage schema privileges)
DO $$
BEGIN
  CREATE POLICY "Allow authenticated upload doctor images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'doctor-images');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow public read doctor images" ON storage.objects FOR SELECT USING (bucket_id = 'doctor-images');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow delete doctor images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'doctor-images');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


CREATE POLICY "twilio_config"
ON twilio_config
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_scribes_crud"
ON ai_scribes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "voice_notes_template_crud"
ON voice_notes_template
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_agents_crud"
ON ai_agents
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "faqs_crud"
ON faqs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scheduler_configs_crud"
ON scheduler_configs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- patients_insurance SELECT (GET)
CREATE POLICY "patients_insurance_select_own"
ON public.patients_insurance
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- patients_insurance INSERT
CREATE POLICY "patients_insurance_insert_own"
ON public.patients_insurance
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- patients_insurance UPDATE
CREATE POLICY "patients_insurance_update_own"
ON public.patients_insurance
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- patients_insurance DELETE
CREATE POLICY "patients_insurance_delete_own"
ON public.patients_insurance
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

`;