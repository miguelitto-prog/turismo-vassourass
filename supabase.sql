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
