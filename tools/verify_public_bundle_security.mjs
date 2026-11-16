/**
 * Auditor Determinístico de Segurança do Bundle Público (Camada 3 - Tools)
 * Verifica que os arquivos compilados em `dist/` para publicação HTTPS:
 *  1. NÃO contêm a chave `service_role` do Supabase nem qualquer segredo administrativo.
 *  2. NÃO contêm senhas de teste ou de demonstração (`demo-password-123`, `RenovaAlpha#2026`, `RenovaBeta#2026`, `RenovaExt2026!StagingDb`).
 *  3. NÃO expõem contas de testes internos (`alpha.homologacao@`, `beta.homologacao@`).
 *  4. Contêm os artefatos públicos esperados (`index.html`, `comercial.html`, `proposta-piloto.html`).
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const envLocalPath = path.join(rootDir, '.env.local');

function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function runAudit() {
  if (!fs.existsSync(distDir)) {
    throw new Error('Diretório dist/ não encontrado. Execute npm run build primeiro.');
  }

  let serviceRoleSecret = '';
  if (fs.existsSync(envLocalPath)) {
    const envRaw = fs.readFileSync(envLocalPath, 'utf-8');
    for (const line of envRaw.split(/\r?\n/)) {
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        serviceRoleSecret = line.split('=')[1].trim();
      }
    }
  }

  const forbiddenPatterns = [
    { label: 'service_role JWT claim', pattern: 'service_role' },
    { label: 'SUPABASE_SERVICE_ROLE_KEY identifier', pattern: 'SUPABASE_SERVICE_ROLE_KEY' },
    { label: 'Old demo password', pattern: 'demo-password-123' },
    { label: 'Old Alpha test password', pattern: 'RenovaAlpha#2026' },
    { label: 'Old Beta test password', pattern: 'RenovaBeta#2026' },
    { label: 'Database admin password', pattern: 'RenovaExt2026!StagingDb' },
    { label: 'Internal test account Alpha', pattern: 'alpha.homologacao@' },
    { label: 'Internal test account Beta', pattern: 'beta.homologacao@' },
  ];

  if (serviceRoleSecret) {
    forbiddenPatterns.push({
      label: 'Actual SUPABASE_SERVICE_ROLE_KEY value',
      pattern: serviceRoleSecret,
    });
  }

  const allFiles = collectFiles(distDir);
  const violations = [];
  const binaryExts = new Set(['.mp4', '.mp3', '.png', '.jpg', '.jpeg', '.webp', '.woff2']);

  for (const file of allFiles) {
    if (binaryExts.has(path.extname(file).toLowerCase())) continue;
    const content = fs.readFileSync(file, 'utf-8');
    for (const rule of forbiddenPatterns) {
      if (rule.pattern && content.includes(rule.pattern)) {
        violations.push({
          file: path.relative(rootDir, file),
          rule: rule.label,
        });
      }
    }
  }

  for (const requiredAsset of [
    'index.html',
    'comercial.html',
    'proposta-piloto.html',
    'painel-fundador-crm.html',
    'video-demo-renovaext.mp4',
    'legendas-demo-ptbr.vtt',
    'video-thumbnail.png',
    'captura-tela1-radar.png',
    'captura-tela2-importacao.png',
    'captura-tela3-proposta.png',
  ]) {
    if (!fs.existsSync(path.join(distDir, requiredAsset))) {
      violations.push({
        file: `dist/${requiredAsset}`,
        rule: 'Arquivo público obrigatório ausente no build',
      });
    }
  }

  if (violations.length > 0) {
    console.error('VIOLAÇÕES DE SEGURANÇA ENCONTRADAS NO BUNDLE:', violations);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        status: 'PUBLIC_BUNDLE_SECURITY_VERIFIED',
        scannedFilesCount: allFiles.length,
        serviceRoleLeaked: false,
        adminSecretsLeaked: false,
        internalTestAccountsLeaked: false,
        oldDemoPasswordsLeaked: false,
        publicPagesPresent: [
          'index.html',
          'comercial.html',
          'proposta-piloto.html',
          'painel-fundador-crm.html',
        ],
      },
      null,
      2
    )
  );
}

runAudit();
