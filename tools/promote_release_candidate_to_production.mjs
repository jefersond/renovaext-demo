/**
 * Script Determinístico de Promoção da Versão Candidata (Release Candidate) para Produção:
 * - Preserva integralmente a demonstração fictícia (/?demo=1) com bloqueio de upload real;
 * - Limpa bundles JS antigos em assets/ para evitar divergência de cache entre rotas;
 * - EXIGE a flag explícita `--confirm-founder-approval` para publicar alterações finais na
 *   raiz de produção, cumprindo a regra:
 *   "Não enviar mensagens externas, ativar cobranças nem publicar alterações finais sem aprovação do fundador."
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const isApprovedByFounder = process.argv.includes('--confirm-founder-approval');

function verifyReleaseCandidateFiles() {
  const requiredFiles = [
    'index.html',
    'comercial.html',
    'proposta-piloto.html',
    'painel-fundador-crm.html',
    'lead-capture-widget.js',
    'sw.js',
    'manifest.webmanifest',
  ];

  const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(distDir, f)));
  if (missing.length > 0) {
    throw new Error(`Arquivos obrigatórios ausentes em dist/: ${missing.join(', ')}`);
  }

  const comercialHtml = fs.readFileSync(path.join(distDir, 'comercial.html'), 'utf-8');
  const propostaHtml = fs.readFileSync(path.join(distDir, 'proposta-piloto.html'), 'utf-8');
  const widgetJs = fs.readFileSync(path.join(distDir, 'lead-capture-widget.js'), 'utf-8');
  const swJs = fs.readFileSync(path.join(distDir, 'sw.js'), 'utf-8');

  const checks = {
    comercialHasCtasAndForm:
      comercialHtml.includes('Solicitar demonstração') &&
      comercialHtml.includes('Quero participar do piloto') &&
      comercialHtml.includes('id="solicitar"'),
    propostaHasCtasAndForm:
      propostaHtml.includes('Solicitar demonstração') &&
      propostaHtml.includes('Quero participar do piloto') &&
      propostaHtml.includes('id="solicitar"'),
    propostaHasAccurateRlsDescription:
      propostaHtml.includes('Row Level Security (RLS)') &&
      !propostaHtml.includes('chave criptográfica'),
    widgetZeroPiiInLocalStorage:
      widgetJs.includes('renovaext_lead_cooldown_ts_v2') &&
      widgetJs.includes('removeItem(LEGACY_PII_KEY)'),
    serviceWorkerNetworkFirstV2: swJs.includes('renovaext-pwa-v2-20261115'),
    fictitiousDemoPreserved: comercialHtml.includes('./index.html?demo=1'),
  };

  for (const [k, ok] of Object.entries(checks)) {
    if (!ok) {
      throw new Error(`Falha na verificação da Release Candidate: ${k} = false`);
    }
  }

  return checks;
}

function main() {
  const checks = verifyReleaseCandidateFiles();

  if (!isApprovedByFounder) {
    console.log(
      JSON.stringify(
        {
          status: 'RELEASE_CANDIDATE_READY_AWAITING_FOUNDER_APPROVAL',
          governanceRule:
            'Nenhuma alteração final foi publicada sem aprovação do fundador (modo dry-run padrão).',
          verifiedChecks: checks,
          promoteCommandAfterApproval:
            'node tools/promote_release_candidate_to_production.mjs --confirm-founder-approval',
        },
        null,
        2
      )
    );
    return;
  }

  const tmpDeployDir = path.join(rootDir, '.tmp', 'rc-promote-production');
  if (fs.existsSync(tmpDeployDir)) {
    fs.rmSync(tmpDeployDir, { recursive: true, force: true });
  }

  execSync(`git clone https://github.com/jefersond/renovaext-demo.git "${tmpDeployDir}"`, {
    stdio: 'inherit',
  });

  // Limpar assets antigos para impedir divergência entre preview e produção
  const targetAssetsDir = path.join(tmpDeployDir, 'assets');
  if (fs.existsSync(targetAssetsDir)) {
    fs.rmSync(targetAssetsDir, { recursive: true, force: true });
  }

  fs.cpSync(distDir, tmpDeployDir, { recursive: true, force: true });
  const targetPreviewDir = path.join(tmpDeployDir, 'preview');
  if (fs.existsSync(targetPreviewDir)) {
    fs.rmSync(targetPreviewDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, targetPreviewDir, { recursive: true, force: true });

  execSync(
    'git add -A && git commit -m "release(prod): promover versao candidata aprovada pelo fundador" && git push origin main',
    { cwd: tmpDeployDir, stdio: 'inherit' }
  );

  fs.rmSync(tmpDeployDir, { recursive: true, force: true });
  console.log(
    JSON.stringify({ status: 'PROMOTED_TO_PRODUCTION_SUCCESSFULLY', checks }, null, 2)
  );
}

main();
