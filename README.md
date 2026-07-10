# Alvaz - Gestão

Sistema de Gestão de Obras de Engenharia Civil e Portfólio (PMO) para construtoras.
Stack: **Next.js 14 (App Router) + Supabase + Vercel**, auth por cookie, alertas diários
via **cron-job.org + Resend**, e Motor de Memorial Descritivo via **API do Google Gemini (gratuita)**.

## Módulos

| Módulo | Onde fica |
|---|---|
| 1. Cadastros e Contratos | `/obras`, `/obras/nova`, `/clientes` |
| 2. Cronograma + Medições | `/obras/[id]/cronograma` e `/obras/[id]/kanban` |
| 3. Financeiro e Suprimentos | `/obras/[id]/financeiro` |
| 4. Diário de Obra e Mídias | `/obras/[id]/rdo` e `/obras/[id]/midias` |
| Extras | Aditivos de contrato, Curva S (física e financeira), Kanban do portfólio, Painel Hoje, Relatório de Medição p/ cliente |

### Regras automáticas embutidas (`lib/status.ts`)
- Sem datas reais → **A Iniciar** · Início previsto passou sem começar → **Atrasado**
- Início real preenchido → **Em Andamento** · estourou o fim previsto → **Em Andamento (Atrasado)**
- Início + fim reais → **Concluído**
- Concluído com medição "Sem Medição" → aviso `[Aviso: Serviço concluído físico, pendente de medição]`
- Métricas: Progresso Físico Global, Índice de Liberação Financeira, Desvio Financeiro Geral,
  Valor medido/pago/a receber.

O status de execução **não é gravado no banco** — é sempre calculado das datas. O Kanban
apenas escreve datas reais e status de medição; tudo permanece consistente com o Cronograma.

---

## Passo a passo de implantação

### 1. Supabase
1. Crie um projeto novo em supabase.com.
2. Abra **SQL Editor** e execute o arquivo `supabase/schema.sql` inteiro.
3. Em **Project Settings → API**, copie a `URL` e a `service_role key`.
4. Acesso por **senha única**: `Alvaz2026@` (definível via variável `ADMIN_PASSWORD`).

> RLS fica desabilitado de propósito: o banco só é acessado pelo servidor Next.js com a
> service role, nunca pelo navegador (mesmo padrão do C7 CRM).

### 2. Variáveis de ambiente
Copie `.env.example` para `.env.local` (dev) e cadastre as mesmas variáveis na Vercel:

| Variável | O que é |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (Settings → API) |
| `ADMIN_PASSWORD` | Senha única de acesso (padrão `Alvaz2026@`) |
| `CRON_SECRET` | String longa inventada por você |
| `RESEND_API_KEY` | Chave do resend.com |
| `ALERT_EMAIL_TO` / `ALERT_EMAIL_FROM` | Destinatário e remetente dos alertas |
| `GEMINI_API_KEY` | Chave em aistudio.google.com (Motor de Memorial) |

### 3. Rodar local
```bash
npm install
npm run dev   # http://localhost:3000
```

### 4. Vercel
1. Suba o projeto para um repositório GitHub.
2. Importe na Vercel, cole as variáveis de ambiente, deploy.

### 5. cron-job.org (alertas diários)
Crie um job diário (sugestão: 07h00 America/Sao_Paulo) chamando:
```
GET https://SEU-APP.vercel.app/api/cron/alertas?key=SEU_CRON_SECRET
```
O e-mail só é enviado quando existe pendência: etapas atrasadas, serviços concluídos sem
medição, compras com prazo crítico (7 dias) e RDO de ontem faltando.

---

## Fluxo de uso recomendado

1. **Clientes** → cadastre o cliente.
2. **Nova obra** → dados da obra + contrato (valor fechado).
3. **Memorial** → cole o texto do Memorial Descritivo; o Claude extrai macroetapas e
   serviços e cria o escopo no cronograma automaticamente.
4. **Cronograma** → preencha datas previstas e custos previstos por etapa.
5. Dia a dia: mova cards no **Kanban** (preenche datas reais sozinho), preencha o **RDO**,
   lance **compras** com "data necessária", registre **medições** (status + link do Drive +
   valor) e **aditivos** quando o cliente mudar o escopo.
6. Abra o **Painel Hoje** toda manhã — ele lista só o que exige ação.
7. **Relatório** → escolha o período, revise a prévia e clique em "Enviar ao cliente"
   (ou "Imprimir / Salvar PDF"). Ele reúne os serviços concluídos no período, valores
   medidos e as fotos linkadas do Drive, num documento pronto para mandar.

## Estrutura

```
app/
  (app)/               páginas autenticadas (layout com sidebar)
    page.tsx           Painel Hoje
    obras/…            lista, nova, e a obra com 8 abas
    kanban/            Kanban consolidado do portfólio
    clientes/
  api/cron/alertas/    endpoint chamado pelo cron-job.org
  actions.ts           todas as mutações (server actions)
  login/
lib/
  status.ts            motor de status/desvios/métricas (regra de negócio)
  kanban.ts            mapeamento etapa → coluna
  db.ts, auth.ts, fmt.ts
supabase/schema.sql    schema completo + usuário admin inicial
```
