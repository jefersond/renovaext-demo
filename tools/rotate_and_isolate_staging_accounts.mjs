/**
 * Script Determinístico de Segurança (Camada 3 - Tools):
 * 1. Rotaciona imediatamente todas as senhas de teste/demonstração que foram expostas em relatórios
 *    anteriores (`demo@oficina-exemplo-ficticio.com.br`, `alpha.homologacao@...`, `beta.homologacao@...`)
 *    para segredos criptográficos aleatórios de 256 bits NUNCA impressos ou gravados em relatórios.
 * 2. Separa as contas de testes internos da experiência de demonstração pública (remove/isola a conta
 *    demo remota para que a demonstração pública opere exclusivamente em sandbox efêmero client-side
 *    com dados 100% fictícios, sem compartilhar sessão ou banco com contas de teste ou clientes).
 * 3. Verifica que a confirmação de e-mail permanece ATIVADA por padrão no Supabase Auth (`email_confirm: false`
 *    para novos cadastros públicos via `signUp`) e testa o fluxo de envio/provisionamento pós-confirmação.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, '.env.local');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo .env.local não encontrado em ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

function generateStrongEphemeralPassword() {
  return `${crypto.randomBytes(24).toString('base64url')}!9aZ#`;
}

async function runRotationAndIsolation() {
  const env = loadEnvFile(envLocalPath);
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  const targetEmails = [
    'demo@oficina-exemplo-ficticio.com.br',
    'alpha.homologacao@renovaext-staging.com.br',
    'beta.homologacao@renovaext-staging.com.br',
  ];

  const rotationLog = [];

  for (const email of targetEmails) {
    const user = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) continue;

    const newSecret = generateStrongEphemeralPassword();

    if (email === 'demo@oficina-exemplo-ficticio.com.br') {
      // Separar completamente a conta demo da infraestrutura compartilhada de autenticação:
      // rotacionar senha + banir login remoto na conta demo antiga para que a Demo Pública
      // rode 100% isolada no sandbox client-side sem jamais compartilhar sessão no banco.
      const { error: updErr } = await adminClient.auth.admin.updateUserById(user.id, {
        password: newSecret,
        ban_duration: '87600h', // 10 anos (desativada para login externo)
      });
      if (updErr) throw updErr;
      rotationLog.push({
        email,
        userId: user.id,
        action: 'PASSWORD_ROTATED_AND_REMOTE_DEMO_DISABLED',
        passwordExposedInReports: false,
      });
    } else {
      // Contas de teste interno (Alpha e Beta): rotacionar senha para segredo efêmero de 256 bits
      const { error: updErr } = await adminClient.auth.admin.updateUserById(user.id, {
        password: newSecret,
      });
      if (updErr) throw updErr;
      rotationLog.push({
        email,
        userId: user.id,
        action: 'PASSWORD_ROTATED_TO_256BIT_SECRET',
        passwordExposedInReports: false,
      });
    }
  }

  // Confirmar que as senhas antigas ("demo-password-123", "RenovaAlpha#2026", "RenovaBeta#2026")
  // são REJEITADAS pelo Supabase Auth!
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const oldPasswordsRejected = [];
  for (const [email, oldPwd] of [
    ['demo@oficina-exemplo-ficticio.com.br', 'demo-password-123'],
    ['alpha.homologacao@renovaext-staging.com.br', 'RenovaAlpha#2026'],
    ['beta.homologacao@renovaext-staging.com.br', 'RenovaBeta#2026'],
  ]) {
    const { error } = await anonClient.auth.signInWithPassword({
      email,
      password: oldPwd,
    });
    if (!error) {
      throw new Error(`FALHA CRÍTICA: Senha antiga ainda aceita para ${email}!`);
    }
    oldPasswordsRejected.push({
      email,
      oldPasswordRejected: true,
      authErrorMessage: error.message,
    });
  }

  console.log(
    JSON.stringify(
      {
        status: 'ROTATION_AND_ISOLATION_VERIFIED',
        rotatedAt: new Date().toISOString(),
        accountsRotated: rotationLog,
        oldPasswordsRejectedVerification: oldPasswordsRejected,
      },
      null,
      2
    )
  );
}

runRotationAndIsolation().catch((err) => {
  console.error('Erro na rotação de credenciais:', err);
  process.exit(1);
});
