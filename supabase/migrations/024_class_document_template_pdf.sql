alter table public.classes
  add column if not exists document_template_path text;

insert into storage.buckets (id, name, public)
values ('class-document-templates', 'class-document-templates', false)
on conflict (id) do nothing;

drop policy if exists "class_document_templates_select_own" on storage.objects;
create policy "class_document_templates_select_own"
  on storage.objects for select
  using (
    bucket_id = 'class-document-templates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "class_document_templates_insert_own" on storage.objects;
create policy "class_document_templates_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'class-document-templates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "class_document_templates_update_own" on storage.objects;
create policy "class_document_templates_update_own"
  on storage.objects for update
  using (
    bucket_id = 'class-document-templates'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'class-document-templates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "class_document_templates_delete_own" on storage.objects;
create policy "class_document_templates_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'class-document-templates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
