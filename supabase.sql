-- Rode este script no SQL Editor do seu projeto Supabase
-- (https://app.supabase.com -> seu projeto -> SQL Editor -> New query)

create table if not exists kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table kv_store enable row level security;

-- Como este é um formulário público (sem login), liberamos leitura e
-- escrita para a chave "anon". Se quiser restringir a edição/exclusão
-- de registros no futuro, troque estas políticas por regras mais
-- específicas (por exemplo, exigindo autenticação para o painel da
-- Prefeitura).
create policy "Permitir leitura pública" on kv_store
  for select using (true);

create policy "Permitir escrita pública" on kv_store
  for insert with check (true);

create policy "Permitir atualização pública" on kv_store
  for update using (true);
