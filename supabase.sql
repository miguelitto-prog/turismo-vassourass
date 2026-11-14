-- ===========================================================================
-- Turismo Vassouras — estrutura e regras de acesso do banco (Supabase)
-- Rode no SQL Editor: https://app.supabase.com -> seu projeto -> SQL Editor
-- Pode rodar de novo sem problema: o script apaga e recria as regras.
-- ===========================================================================

-- 1) Tabela principal (já existe se você usou a versão anterior)
create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table kv_store enable row level security;

-- Remove as regras antigas, que deixavam qualquer pessoa ler e alterar tudo
drop policy if exists "Permitir leitura pública" on kv_store;
drop policy if exists "Permitir escrita pública" on kv_store;
drop policy if exists "Permitir atualização pública" on kv_store;
drop policy if exists "publico_le_cadastros" on kv_store;
drop policy if exists "publico_envia_resposta" on kv_store;
drop policy if exists "conselho_acesso_total" on kv_store;

-- Visitantes (sem login) podem:
--   a) LER apenas os cadastros (atrativos, hotéis, eventos) — usados no formulário e no site
create policy "publico_le_cadastros" on kv_store
  for select to anon
  using (key = 'vd_cadastros');

--   b) ENVIAR uma resposta nova da pesquisa (não podem ler nem alterar respostas)
create policy "publico_envia_resposta" on kv_store
  for insert to anon
  with check (key like 'vd_visitantes:%');

-- Conselheiros logados podem ler e alterar tudo
create policy "conselho_acesso_total" on kv_store
  for all to authenticated
  using (true) with check (true);

-- 2) E-mails de quem quer receber comunicações
--    Fica separado das respostas para que a pesquisa continue anônima.
create table if not exists contatos (
  id bigserial primary key,
  email text not null,
  criado_em timestamptz not null default now()
);
alter table contatos enable row level security;

drop policy if exists "publico_cadastra_email" on contatos;
drop policy if exists "conselho_le_emails" on contatos;
drop policy if exists "conselho_apaga_emails" on contatos;

create policy "publico_cadastra_email" on contatos
  for insert to anon
  with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');

create policy "conselho_le_emails" on contatos
  for select to authenticated using (true);

-- Permite atender pedidos de descadastro (LGPD)
create policy "conselho_apaga_emails" on contatos
  for delete to authenticated using (true);

-- 3) COMTUR: documentos oficiais e membros do Conselho (aba "Conselho" do painel)
--    Visitantes só leem; quem está logado no painel cadastra, edita e apaga.
create table if not exists public.comtur_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null check (tipo in ('lei','decreto','deliberacao','resolucao','regulamento','ata','outro')),
  data_documento date,
  descricao text,
  arquivo_url text not null,
  arquivo_path text,
  criado_em timestamptz not null default now()
);
create table if not exists public.comtur_membros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text,
  representa text,
  segmento text not null default 'trade' check (segmento in ('trade','governo')),
  foto_url text,
  foto_path text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.comtur_documentos enable row level security;
alter table public.comtur_membros enable row level security;
drop policy if exists "leitura publica" on public.comtur_documentos;
drop policy if exists "admin escreve" on public.comtur_documentos;
drop policy if exists "leitura publica" on public.comtur_membros;
drop policy if exists "admin escreve" on public.comtur_membros;
create policy "leitura publica" on public.comtur_documentos for select using (true);
create policy "admin escreve" on public.comtur_documentos for all to authenticated using (true) with check (true);
create policy "leitura publica" on public.comtur_membros for select using (true);
create policy "admin escreve" on public.comtur_membros for all to authenticated using (true) with check (true);

-- Arquivos: PDFs (até 20 MB) e fotos (até 5 MB), públicos para leitura
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comtur-documentos','comtur-documentos', true, 20971520, array['application/pdf']),
       ('comtur-fotos','comtur-fotos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "comtur leitura publica" on storage.objects;
drop policy if exists "comtur admin upload" on storage.objects;
drop policy if exists "comtur admin update" on storage.objects;
drop policy if exists "comtur admin delete" on storage.objects;
create policy "comtur leitura publica" on storage.objects for select using (bucket_id in ('comtur-documentos','comtur-fotos'));
create policy "comtur admin upload" on storage.objects for insert to authenticated with check (bucket_id in ('comtur-documentos','comtur-fotos'));
create policy "comtur admin update" on storage.objects for update to authenticated using (bucket_id in ('comtur-documentos','comtur-fotos'));
create policy "comtur admin delete" on storage.objects for delete to authenticated using (bucket_id in ('comtur-documentos','comtur-fotos'));
