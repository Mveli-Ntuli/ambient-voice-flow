CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email text NOT NULL,
  actor_badge text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'police',
  action text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_occurred_at_idx ON public.activity_logs (occurred_at DESC);
CREATE INDEX activity_logs_actor_idx ON public.activity_logs (actor_email);

GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.officer_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  badge text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'police',
  display_name text NOT NULL DEFAULT '',
  has_completed_onboarding boolean NOT NULL DEFAULT false,
  onboarding_completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.officer_profiles TO service_role;
ALTER TABLE public.officer_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER officer_profiles_touch_updated_at
BEFORE UPDATE ON public.officer_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();