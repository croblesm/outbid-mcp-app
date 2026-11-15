#!/usr/bin/env bash
# Talk-only: drops every public table of the project you name. Run it only against a demo project:
#   OUTBID_PROJECT_REF=<ref> demo/reset-hosted.sh
# Puts the hosted project back to where Act 4 starts: no tables, no migration history, no MCP function,
# OAuth 2.1 server off. Keeps Auth users, OAuth client registrations (so a connected Claude stays connected),
# the lots bucket and its photos, and every other setting.
set -euo pipefail
ref=${OUTBID_PROJECT_REF:?set OUTBID_PROJECT_REF to the demo project ref; this drops every public table}
sb() { env -u CLAUDECODE -u AI_AGENT supabase "$@"; }

echo "== MCP function"
sb functions delete mcp --project-ref "$ref" >/dev/null 2>&1 && echo "deleted" || echo "not deployed"

echo "== schema and migration history"
sb db query --linked --project-ref "$ref" "
  -- By what they touch, not by name: Claude names policies and helpers differently on every take.
  do \$\$ declare r record; begin
    for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
               and coalesce(qual, '') || coalesce(with_check, '') like '%''lots''%' loop
      execute format('drop policy %I on storage.objects', r.policyname);
    end loop;
    for r in select tablename from pg_tables where schemaname = 'public' loop
      execute format('drop table public.%I cascade', r.tablename);
    end loop;
    for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.prokind = 'f'
                 and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
      execute format('drop function %s cascade', r.sig);
    end loop;
    for r in select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
               where n.nspname = 'public' and t.typtype in ('e', 'd')
                 and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e') loop
      execute format('drop type public.%I cascade', r.typname);
    end loop;
  end \$\$;
  delete from supabase_migrations.schema_migrations;
  delete from supabase_migrations.seed_files;
" >/dev/null
sb db query --linked --project-ref "$ref" "select count(*) as tables_left from pg_tables where schemaname = 'public'" 2>&1 | tail -3

echo "== OAuth 2.1 server off"
# Not `supabase config push`: when only `enabled` changes, CLI 2.121 sends it without the authorization path and
# the Auth API rejects that (400). Call the Management API with both fields, using the CLI's own login token.
raw=$(security find-generic-password -s "Supabase CLI" -a supabase -w)
case "$raw" in go-keyring-base64:*) token=$(printf %s "${raw#go-keyring-base64:}" | base64 -d) ;; *) token=$raw ;; esac
curl -sf -X PATCH "https://api.supabase.com/v1/projects/$ref/config/auth" \
  -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
  -d '{"oauth_server_enabled":false,"oauth_server_allow_dynamic_registration":false,"oauth_server_authorization_path":"/oauth/consent"}' >/dev/null
sleep 5
code=$(curl -s -o /dev/null -w "%{http_code}" "https://$ref.supabase.co/.well-known/oauth-authorization-server/auth/v1")
echo "OAuth metadata now answers $code (404 = off)"
