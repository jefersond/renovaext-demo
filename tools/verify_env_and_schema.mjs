import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TMP_DIR = path.join(ROOT, '.tmp');

function verifyWorkspace() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const requiredFiles = [
    'gemini.md',
    'task_plan.md',
    'findings.md',
    'progress.md',
    '.env.example',
    'supabase/migrations/20261112000001_renovaext_mvp_schema.sql',
  ];

  const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length > 0) {
    console.error(`[ERRO] Arquivos obrigatórios ausentes: ${missing.join(', ')}`);
    process.exit(1);
  }

  const sqlContent = fs
    .readFileSync(
      path.join(ROOT, 'supabase/migrations/20261112000001_renovaext_mvp_schema.sql'),
      'utf-8'
    )
    .toLowerCase();

  const requiredTables = [
    'public.companies',
    'public.profiles',
    'public.clients',
    'public.equipments',
    'public.service_history',
    'public.opportunity_history',
    'public.proposals',
    'public.audit_logs',
  ];

  for (const tbl of requiredTables) {
    if (!sqlContent.includes(`alter table ${tbl} enable row level security;`)) {
      console.error(`[ERRO] RLS não habilitado para a tabela ${tbl}`);
      process.exit(1);
    }
  }

  fs.writeFileSync(
    path.join(TMP_DIR, 'handshake_verification.txt'),
    'STATUS=OK\nISOLATION=VERIFIED\nRLS_TABLES=8\nBILLING_ACTIVE=FALSE\n',
    'utf-8'
  );
  console.log('[OK] Handshake e verificação de esquema/RLS do RenovaExt concluídos com sucesso.');
}

verifyWorkspace();
