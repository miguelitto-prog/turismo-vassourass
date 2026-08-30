# Turismo Vassouras — Prefeitura & Visitantes

Dois formulários (app da Prefeitura e app de Visitantes) que agora
funcionam como um site normal, hospedado na Vercel, com os dados
salvos em um banco Supabase (em vez do `window.storage`, que só
existe dentro do Claude.ai).

- `/visitantes` → formulário público de pesquisa de turismo
- `/prefeitura` → painel interno (hospedagem mensal e eventos), que
  também lê os registros enviados pelos visitantes

## Passo a passo para publicar

### 1. Criar o banco no Supabase (grátis)

1. Crie uma conta em https://supabase.com e um novo projeto.
2. Vá em **SQL Editor → New query**, cole o conteúdo do arquivo
   `supabase.sql` (na raiz deste projeto) e clique em **Run**.
3. Vá em **Project Settings → API** e copie:
   - **Project URL** → isso é o `VITE_SUPABASE_URL`
   - **anon public key** → isso é o `VITE_SUPABASE_ANON_KEY`

### 2. Subir este projeto para o GitHub

**Opção fácil (sem instalar nada), pelo navegador:**
1. Crie um repositório novo em https://github.com/new (pode ser
   privado).
2. Na página do repositório, clique em **uploading an existing
   file** e arraste todos os arquivos desta pasta (menos as pastas
   `node_modules` e `dist`, que não devem existir aqui).
3. Confirme o commit.

**Opção com git instalado:**
```bash
cd vassouras-turismo
git init
git add .
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

### 3. Importar na Vercel

1. Crie uma conta em https://vercel.com (pode entrar com GitHub).
2. Clique em **Add New → Project** e selecione o repositório que
   você acabou de criar.
3. A Vercel detecta automaticamente que é um projeto Vite — não
   precisa mudar nada no build.
4. Antes de clicar em **Deploy**, abra **Environment Variables** e
   adicione:
   - `VITE_SUPABASE_URL` = (o Project URL do passo 1)
   - `VITE_SUPABASE_ANON_KEY` = (a anon key do passo 1)
5. Clique em **Deploy**. Em ~1 minuto o site estará no ar.

Depois do deploy, os links finais serão:
- `https://SEU-PROJETO.vercel.app/visitantes`
- `https://SEU-PROJETO.vercel.app/prefeitura`

## Rodando localmente (opcional)

```bash
npm install
cp .env.example .env   # depois edite .env com suas chaves do Supabase
npm run dev
```

## Observação sobre segurança

As políticas do Supabase em `supabase.sql` liberam leitura e escrita
públicas na tabela `kv_store` (necessário para o formulário público
funcionar sem login). Isso significa que, tecnicamente, qualquer
pessoa com a `anon key` (que fica visível no código do site) poderia
enviar ou alterar registros diretamente pela API do Supabase. Para
um uso interno da Prefeitura, isso costuma ser aceitável, mas se
quiser reforçar a segurança no futuro, dá para adicionar autenticação
ao painel `/prefeitura` e restringir as políticas de escrita.
