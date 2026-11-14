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

-- ===========================================================================
-- 3) Página "O Conselho": membros e documentos (atas, leis, decretos...)
--    Cadastrados pela aba "Conselho" do painel. O site público só lê.
-- ===========================================================================
create table if not exists conselho_membros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  segmento text not null check (segmento in ('governo', 'trade')),
  representa text,
  tipo text not null default 'Titular' check (tipo in ('Titular', 'Suplente')),
  cargo text,            -- Presidente, Vice-Presidente, 1ª Secretária... (vazio = só conselheiro)
  foto_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists conselho_documentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lei', 'decreto', 'regimento', 'ata', 'deliberacao', 'apresentacao', 'outro')),
  titulo text not null,
  data date,
  url text not null,     -- link do PDF (Storage do Supabase) ou link externo
  arquivo text,          -- caminho no Storage, quando o PDF foi enviado pelo painel
  observacao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table conselho_membros enable row level security;
alter table conselho_documentos enable row level security;

drop policy if exists "publico_le_membros" on conselho_membros;
drop policy if exists "conselho_edita_membros" on conselho_membros;
drop policy if exists "publico_le_documentos" on conselho_documentos;
drop policy if exists "conselho_edita_documentos" on conselho_documentos;

create policy "publico_le_membros" on conselho_membros
  for select to anon using (ativo);
create policy "conselho_edita_membros" on conselho_membros
  for all to authenticated using (true) with check (true);

create policy "publico_le_documentos" on conselho_documentos
  for select to anon using (ativo);
create policy "conselho_edita_documentos" on conselho_documentos
  for all to authenticated using (true) with check (true);

-- Pasta de arquivos (fotos e PDFs). Pública para leitura; só quem tem login envia.
insert into storage.buckets (id, name, public)
values ('comtur', 'comtur', true)
on conflict (id) do update set public = true;

drop policy if exists "conselho_envia_arquivos" on storage.objects;
drop policy if exists "conselho_altera_arquivos" on storage.objects;
drop policy if exists "conselho_apaga_arquivos" on storage.objects;

create policy "conselho_envia_arquivos" on storage.objects
  for insert to authenticated with check (bucket_id = 'comtur');
create policy "conselho_altera_arquivos" on storage.objects
  for update to authenticated using (bucket_id = 'comtur');
create policy "conselho_apaga_arquivos" on storage.objects
  for delete to authenticated using (bucket_id = 'comtur');

-- Dados iniciais: só entram se as tabelas estiverem vazias
insert into conselho_membros (nome, segmento, representa, tipo, cargo, ordem)
select * from (values
  ('Dulce Ângela Procópio de Carvalho', 'governo', 'Secretária Municipal de Turismo', 'Titular', null, 1),
  ('Vinicius Gonçalves', 'governo', 'Secretaria de Turismo', 'Titular', 'Vice-Presidente', 2),
  ('Analice Farias', 'governo', 'Secretaria de Turismo', 'Titular', '2ª Secretária', 3),
  ('William Lourenço', 'governo', 'Secretaria de Turismo', 'Suplente', null, 4),
  ('Isabella de Carvalho Magalhães Oliveira', 'governo', 'Secretaria de Turismo', 'Suplente', null, 5),
  ('Douglas Antonio Ribeiro', 'governo', 'Secretaria de Cultura', 'Titular', null, 6),
  ('Wallace Luiz Rodrigues dos Santos', 'governo', 'Secretaria de Cultura', 'Suplente', null, 7),
  ('Carlos Oliveira da Silva', 'governo', 'Secretaria de Obras', 'Titular', null, 8),
  ('Maria Paula Pinto Mendes', 'governo', 'Secretaria de Obras', 'Suplente', null, 9),
  ('Leila Aparecida de Paiva Cardoso', 'governo', 'Secretaria de Educação', 'Titular', null, 10),
  ('Letícia Santana Nunes Lourenço', 'governo', 'Secretaria de Educação', 'Suplente', null, 11),
  ('Daniela Tamiozzo do Nascimento', 'governo', 'Secretaria de Urbanismo e Patrimônio Histórico', 'Titular', '1ª Secretária', 12),
  ('Fábio Costa Nascimento', 'governo', 'Secretaria de Urbanismo e Patrimônio Histórico', 'Suplente', null, 13),
  ('Vagner de Brito Santos', 'governo', 'Secretaria de Segurança Pública e Defesa Civil', 'Titular', null, 14),
  ('Tadeu Moreira Buzzi de Oliveira', 'governo', 'Secretaria de Segurança Pública e Defesa Civil', 'Suplente', null, 15),
  ('Geovani Nunes Dornelas', 'governo', 'Secretaria de Desenvolvimento Econômico e Inovação', 'Titular', null, 16),
  ('Arabella Mitke Maria de Hoppe Rocha', 'governo', 'Secretaria de Desenvolvimento Econômico e Inovação', 'Suplente', null, 17),
  ('Álvaro Luiz dos Reis Fernandes de Sousa', 'trade', 'Setor de Hospedagem', 'Titular', null, 18),
  ('Susana Pires Magalhães', 'trade', 'Setor de Hospedagem', 'Suplente', null, 19),
  ('Danielle Dias Lopes Mendes', 'trade', 'Restaurantes, Bares, Lanchonetes e Food Trucks', 'Titular', null, 20),
  ('Alfredo Sérgio Barbosa Leal', 'trade', 'Restaurantes, Bares, Lanchonetes e Food Trucks', 'Suplente', null, 21),
  ('Wilson De Maio', 'trade', 'Agências de Turismo', 'Titular', 'Presidente', 22),
  ('Adriana Bitencourt Lavinas', 'trade', 'Agências de Turismo', 'Suplente', null, 23),
  ('Andréia Alves da Silva', 'trade', 'Guias de Turismo', 'Titular', null, 24),
  ('Adelino Matos de Almeida Júnior', 'trade', 'Guias de Turismo', 'Suplente', null, 25),
  ('Cirom Duarte e Alves', 'trade', 'Museus', 'Titular', null, 26),
  ('Catarina Duncan', 'trade', 'Museus', 'Suplente', null, 27),
  ('Rogério Miranda da Cunha', 'trade', 'Associação Comercial, Industrial e Agropecuária de Vassouras – ACIAV', 'Titular', null, 28),
  ('Raquel Porto', 'trade', 'Associação Comercial, Industrial e Agropecuária de Vassouras – ACIAV', 'Suplente', null, 29),
  ('Cíntia Rozaria Magalhães Felício da Costa Leal', 'trade', 'ONGs e Associações da cadeia produtiva do turismo', 'Titular', null, 30),
  ('Tatiana Werneck de Carvalho', 'trade', 'ONGs e Associações da cadeia produtiva do turismo', 'Suplente', null, 31),
  ('Marcelo Müller', 'trade', 'Fazendas Históricas', 'Titular', null, 32),
  ('Ricardo Vergara Caffarelli', 'trade', 'Fazendas Históricas', 'Suplente', null, 33),
  ('Igor Dias de Souza', 'trade', 'Universidade de Vassouras', 'Titular', null, 34),
  ('Luiza Castilho Barbosa', 'trade', 'Universidade de Vassouras', 'Suplente', null, 35)
) as v(nome, segmento, representa, tipo, cargo, ordem)
where not exists (select 1 from conselho_membros);

insert into conselho_documentos (tipo, titulo, data, url, observacao)
select tipo, titulo, data::date, url, observacao from (values
  ('decreto', 'Decreto nº 6.240/2026 — composição atual do COMTUR', '2026-07-20', 'https://miguelitto-prog-landing-page.vercel.app/docs/decreto-6240-2026.pdf', 'Nomeia os membros titulares e suplentes. Publicado em 21/07/2026.'),
  ('decreto', 'Decreto nº 6.178/2026 — convalida as atas das reuniões 1 a 4', '2026-05-21', 'https://miguelitto-prog-landing-page.vercel.app/docs/decreto-6178-2026.pdf', null),
  ('decreto', 'Decreto nº 6.147/2026 — nomeação anterior dos membros', '2026-04-01', 'https://miguelitto-prog-landing-page.vercel.app/docs/decreto-6147-2026.pdf', 'Revogado pelo Decreto nº 6.240/2026.'),
  ('lei', 'Lei nº 3.144/2019 — cria o Fundo Municipal de Turismo (FUMTUR)', '2019-10-25', 'https://miguelitto-prog-landing-page.vercel.app/docs/lei-3144-2019-fumtur.pdf', null),
  ('lei', 'Lei nº 1.955/2001 — lei original de criação do COMTUR', '2001-11-13', 'https://miguelitto-prog-landing-page.vercel.app/docs/lei-1955-2001.pdf', 'Documento histórico.'),
  ('regimento', 'Regimento Interno do COMTUR (Lei nº 3.801/2025)', '2026-04-15', 'https://miguelitto-prog-landing-page.vercel.app/docs/regimento-interno.pdf', 'Texto aprovado pelo Conselho Pleno.'),
  ('regimento', 'Regimento Interno — publicação no Diário Oficial nº 4194', '2026-08-28', 'https://miguelitto-prog-landing-page.vercel.app/docs/regimento-interno-diario-oficial.pdf', null),
  ('ata', 'Ata da 1ª Reunião Ordinária — gestão 2025–2027', '2025-12-10', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-01.pdf', null),
  ('ata', 'Ata da 2ª Reunião Ordinária — gestão 2025–2027', '2026-01-21', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-02.pdf', null),
  ('ata', 'Ata da 3ª Reunião Ordinária — gestão 2025–2027', '2026-03-04', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-03.pdf', null),
  ('ata', 'Ata da 4ª Reunião Ordinária — gestão 2025–2027', '2026-03-18', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-04.pdf', null),
  ('ata', 'Ata da 5ª Reunião Ordinária — gestão 2025–2027', '2026-04-15', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-05.pdf', null),
  ('ata', 'Ata da 6ª Reunião Ordinária — gestão 2025–2027', '2026-05-20', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-06.pdf', null),
  ('ata', 'Ata da 7ª Reunião Ordinária — gestão 2025–2027', '2026-06-17', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-07.pdf', null),
  ('ata', 'Ata da 8ª Reunião Ordinária — gestão 2025–2027', '2026-07-22', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-08.pdf', null),
  ('ata', 'Ata da 9ª Reunião Ordinária — gestão 2025–2027', '2026-08-19', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-09.pdf', null),
  ('ata', 'Ata da 10ª Reunião Ordinária — gestão 2025–2027', '2026-09-15', 'https://miguelitto-prog-landing-page.vercel.app/docs/ata-10.pdf', null),
  ('apresentacao', 'Apresentação da 1ª Reunião Ordinária', '2025-12-10', 'https://gamma.app/docs/1-Reuniao-Ordinaria-do-COMTUR-20252027-b3fvw6gg41yh0h8', null),
  ('apresentacao', 'Apresentação da 2ª Reunião Ordinária', '2026-01-21', 'https://gamma.app/docs/2-Reuniao-Ordinaria-do-COMTUR--1nojxy4c3tt9jo1', null),
  ('apresentacao', 'Apresentação da 3ª Reunião Ordinária', '2026-03-04', 'https://gamma.app/docs/3-Reuniao-Ordinaria-do-COMTUR-de-Vassouras-oddpu972rlobnl5', null),
  ('apresentacao', 'Apresentação da 4ª Reunião Ordinária', '2026-03-18', 'https://gamma.app/docs/4-Reuniao-oali922fjsa9xln', null),
  ('apresentacao', 'Apresentação da 5ª Reunião Ordinária', '2026-04-15', 'https://gamma.app/docs/5-Reuniao-Ordinaria-do-Comtur-de-Vassouras-d2tsgkmikpq0v1y', null),
  ('apresentacao', 'Apresentação da 6ª Reunião Ordinária', '2026-05-20', 'https://gamma.app/docs/6-Reuniao-Ordinaria-do-COMTUR-dbsklnq154cgq7t', null),
  ('apresentacao', 'Apresentação da 7ª Reunião Ordinária', '2026-06-17', 'https://gamma.app/docs/7-Reuniao-Ordinaria-do-Comtur-2025-2027-Vassouras-4bwwhmxhxkcc5tc', null),
  ('apresentacao', 'Apresentação da 8ª Reunião Ordinária', '2026-07-22', 'https://gamma.app/docs/8-Reuniao-Ordinaria-do-COMTUR-zzm9smfko3gdt9x', null),
  ('apresentacao', 'Apresentação da 9ª Reunião Ordinária', '2026-08-19', 'https://gamma.app/docs/9-Reuniao-Ordinaria-do-Comtur-Vassouras-20252027-pfkr7ttfz1k5upf', null),
  ('apresentacao', 'Apresentação da 10ª Reunião Ordinária', '2026-09-15', 'https://gamma.app/docs/1-Pauta-Aprovacao-da-Ata-da-9-Reuniao-Ordinaria-h35gmsyiwhlqkuj', null),
  ('apresentacao', 'Apresentação da 11ª Reunião Ordinária', null, 'https://gamma.app/docs/11-Reuniao-Ordinaria-do-Comtur-2025-2027-gmjiacein1xx575', null),
  ('outro', 'Guias de turismo cadastrados — novembro/2026', '2026-11-03', 'https://miguelitto-prog-landing-page.vercel.app/docs/guias-de-turismo-2026-11.pdf', 'Lista da Secretaria Municipal de Turismo.')
) as v(tipo, titulo, data, url, observacao)
where not exists (select 1 from conselho_documentos);
