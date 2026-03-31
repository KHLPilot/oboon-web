-- Additional search_path hardening for functions that exist in test-db.

DO $functions$
BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.exec_sql(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.exec_sql(text) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.delete_user_account()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.delete_user_account() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.delete_user_account(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.delete_user_account(uuid) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.delete_user_account(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.delete_user_account(text) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.enforce_dictionary_category()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.enforce_dictionary_category() SET search_path = public, pg_temp';
  END IF;
END
$functions$;
