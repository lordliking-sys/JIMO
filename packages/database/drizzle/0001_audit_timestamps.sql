CREATE FUNCTION public.jimo_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_touch_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER exercises_touch_updated_at BEFORE UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER programs_touch_updated_at BEFORE UPDATE ON public.programs
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER program_days_touch_updated_at BEFORE UPDATE ON public.program_days
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER program_exercises_touch_updated_at BEFORE UPDATE ON public.program_exercises
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER workout_sessions_touch_updated_at BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER workout_exercises_touch_updated_at BEFORE UPDATE ON public.workout_exercises
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER workout_sets_touch_updated_at BEFORE UPDATE ON public.workout_sets
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
