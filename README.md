# Turismo Vassouras — Pesquisa de Visitantes e Painel do Conselho

Site do Conselho Municipal de Turismo de Vassouras, hospedado na Vercel,
com os dados salvos no Supabase.

- `/` → **pesquisa pública de visitantes** (anônima)
- `/painel` → **painel do Conselho** (exige login). O endereço antigo
  `/prefeitura` continua funcionando.

## O que o painel faz

- **Painel**: indicadores (visitantes, gasto médio por pessoa, ocupação
  média, público em eventos) e gráficos do perfil do visitante.
- **Lançamentos**: ocupação mensal dos hotéis/pousadas e números dos eventos.
- **Cadastros**: atrativos, hotéis/pousadas e eventos. O que for cadastrado
  aparece sozinho nas opções da pesquisa e nas páginas do site.
- **Exportar Excel**: baixa uma planilha com todas as respostas,
  lançamentos, cadastros e a lista de e-mails.

## Links da pesquisa com QR code

Acrescente parâmetros ao endereço para identificar onde a pesquisa foi aplicada:

- `?ponto=Praca-Matriz` → registra o ponto de coleta (o campo some do formulário)
- `?evento=Nome do evento` → já deixa o evento marcado

Exemplo: `https://SEU-PROJETO.vercel.app/?ponto=Festival-2026&evento=Festival%20Vale%20do%20Café`

## Configuração (uma vez)

### 1. Banco de dados

No Supabase, abra **SQL Editor → New query**, cole todo o conteúdo de
`supabase.sql` e clique em **Run**. O script cria a tabela de e-mails e troca
as regras de acesso: visitantes só conseguem enviar respostas; ler e editar
os dados exige login.

### 2. Usuários do painel

1. **Authentication → Users → Add user → Create new user**: informe e-mail
   e senha de cada conselheiro (marque *Auto Confirm User*).
2. **Authentication → Sign In / Providers**: desligue
   **Allow new users to sign up**. Sem isso, qualquer pessoa conseguiria
   criar uma conta e ver os dados.

### 3. Vercel

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam as
mesmas (Project Settings → Environment Variables).

## Rodando localmente (opcional)

```bash
npm install
cp env.example .env   # depois edite .env com suas chaves do Supabase
npm run dev
```
