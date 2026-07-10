-- =====================================================================
-- CONSTRUCTOSYS — Schema Supabase
-- Sistema interno: RLS desabilitado, acesso apenas via service role no
-- servidor Next.js (padrão dos seus outros projetos).
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------ AUTENTICAÇÃO (senha única)
-- Acesso por senha única (definida em ADMIN_PASSWORD na Vercel). Aqui guardamos
-- apenas os tokens de sessão emitidos após o login.
create table if not exists sessoes (
  token text primary key,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------ MÓDULO 1: CADASTROS
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  email text,
  cpf_cnpj text,
  criado_em timestamptz not null default now()
);

create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text,
  rt_nome text,           -- Responsável Técnico
  crea text,
  status text not null default 'ativa' check (status in ('ativa','pausada','concluida')),
  cliente_id uuid references clientes(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  escopo_resumo text,
  valor_fechado numeric(14,2) not null default 0,
  condicoes text,
  criado_em timestamptz not null default now()
);

-- Aditivos de contrato (mudanças de escopo/valor/prazo)
create table if not exists aditivos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  descricao text not null,
  valor numeric(14,2) not null default 0,
  impacto_prazo_dias int not null default 0,
  status text not null default 'proposto' check (status in ('proposto','aprovado','recusado')),
  criado_em timestamptz not null default now()
);

-- ------------------------------------------- MÓDULO 2: CRONOGRAMA
-- Status de execução NÃO é armazenado: é calculado pelas datas (regra
-- automática no app). Medição vive na própria etapa.
create table if not exists etapas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  macroetapa text not null,
  servico text not null,
  ordem int not null default 0,
  inicio_previsto date,
  fim_previsto date,
  inicio_real date,
  fim_real date,
  custo_previsto numeric(14,2) not null default 0,
  custo_real numeric(14,2) not null default 0,
  medicao_status text not null default 'sem_medicao'
    check (medicao_status in ('sem_medicao','medida_pendente','medida_paga')),
  medicao_link text,
  medicao_valor numeric(14,2) not null default 0,
  justificativa_atraso text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_etapas_obra on etapas(obra_id, ordem);

-- --------------------------------- MÓDULO 3: FINANCEIRO E SUPRIMENTOS
create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  etapa_id uuid references etapas(id) on delete set null,
  material text not null,
  fornecedor text,
  quantidade text,
  valor numeric(14,2) not null default 0,
  data_pedido date,
  data_necessaria date,          -- quando o material PRECISA estar na obra
  data_entrega_prevista date,
  data_entrega_real date,
  status text not null default 'cotacao' check (status in ('cotacao','pedido','entregue')),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente','pago')),
  criado_em timestamptz not null default now()
);
create index if not exists idx_compras_obra on compras(obra_id);

-- ------------------------------------- MÓDULO 4: DIÁRIO DE OBRA E MÍDIAS
create table if not exists rdos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  data date not null,
  clima text,
  dia_perdido_chuva boolean not null default false,
  efetivo int not null default 0,
  relato text,
  criado_em timestamptz not null default now(),
  unique (obra_id, data)
);

create table if not exists midias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  etapa_id uuid references etapas(id) on delete set null,
  titulo text not null,
  url text not null,            -- SEMPRE link externo (Drive/Dropbox)
  tipo text not null default 'foto' check (tipo in ('foto','video','documento')),
  criado_em timestamptz not null default now()
);

-- ------------------------------------- MÓDULO 1b: DOCUMENTOS E CONTRATOS
-- Arquivos ficam no Supabase Storage (bucket privado "documentos").
-- Aqui guardamos apenas o índice: metadados + caminho do arquivo no storage.
create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  titulo text not null,
  categoria text not null default 'outro'
    check (categoria in ('contrato','art_rrt','projeto','licenca','nota_fiscal','outro')),
  storage_path text not null,      -- caminho do arquivo no bucket
  nome_arquivo text not null,      -- nome original
  tamanho_bytes bigint not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists idx_documentos_obra on documentos(obra_id);
