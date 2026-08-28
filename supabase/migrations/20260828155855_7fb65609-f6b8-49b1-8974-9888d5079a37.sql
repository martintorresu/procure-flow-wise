DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname, cl.relname, n.nspname
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
     WHERE n.nspname = 'public' AND c.conname LIKE '%pdc%'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
      r.nspname, r.relname, r.conname, replace(replace(r.conname,'purchase_processes','processes'),'pdc','process'));
  END LOOP;

  FOR r IN
    SELECT cl.relname, n.nspname
      FROM pg_class cl JOIN pg_namespace n ON n.oid = cl.relnamespace
     WHERE n.nspname = 'public' AND cl.relkind = 'i' AND cl.relname LIKE '%pdc%'
  LOOP
    EXECUTE format('ALTER INDEX %I.%I RENAME TO %I',
      r.nspname, r.relname, replace(replace(r.relname,'purchase_processes','processes'),'pdc','process'));
  END LOOP;

  FOR r IN
    SELECT cl.relname, n.nspname
      FROM pg_class cl JOIN pg_namespace n ON n.oid = cl.relnamespace
     WHERE n.nspname = 'public' AND cl.relkind = 'r' AND cl.relname LIKE '%purchase_process%'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', r.nspname, r.relname, replace(r.relname,'purchase_processes','processes'));
  END LOOP;
END
$do$;