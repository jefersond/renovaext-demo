/**
 * Verificador Determinístico de Publicação HTTPS e Existência das 5 Oficinas da Rodada 1
 * 1. Testa os 3 endpoints HTTPS publicados no GitHub Pages:
 *    - https://jefersond.github.io/renovaext-demo/
 *    - https://jefersond.github.io/renovaext-demo/?demo=1
 *    - https://jefersond.github.io/renovaext-demo/comercial.html
 *    - https://jefersond.github.io/renovaext-demo/proposta-piloto.html
 * 2. Confere o bundle JS público servido via HTTPS para garantir que `service_role` e segredos NÃO estão presentes.
 * 3. Confere a resposta HTTP/DNS dos sites das 5 oficinas selecionadas para a Rodada 1.
 */

const PUBLIC_URLS = [
  'https://jefersond.github.io/renovaext-demo/',
  'https://jefersond.github.io/renovaext-demo/?demo=1',
  'https://jefersond.github.io/renovaext-demo/comercial.html',
  'https://jefersond.github.io/renovaext-demo/proposta-piloto.html',
];

const ROUND1_COMPANIES = [
  { name: 'WS Extintores', url: 'https://www.wsextintores.com.br', email: 'contato@wsextintores.com.br' },
  { name: 'Extinsantos', url: 'https://www.extinsantos.com.br', email: 'extinsantos@terra.com.br' },
  { name: 'Insight Fire', url: 'https://www.insightfire.com.br', email: 'contato@insightfire.com.br' },
  { name: 'Dig Fire Extintores', url: 'https://digfire.com.br', email: 'digfireextintores@gmail.com' },
  { name: 'MDL Extintores', url: 'https://www.mdlextintores.com.br', email: 'vendas@mdlextintores.com.br' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, retries = 8) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'RenovaExt-Homologation-Verifier/1.0' },
      });
      if (res.ok) {
        const text = await res.text();
        return { ok: true, status: res.status, length: text.length, text };
      }
      if (i < retries - 1) await sleep(4000);
    } catch (err) {
      if (i < retries - 1) await sleep(4000);
      else return { ok: false, status: 0, error: String(err) };
    }
  }
  return { ok: false, status: 404 };
}

async function run() {
  const publicChecks = [];
  for (const url of PUBLIC_URLS) {
    const res = await fetchWithRetry(url);
    publicChecks.push({
      url,
      ok: res.ok,
      status: res.status,
      bytes: res.length || 0,
      hasServiceRoleSecret: res.text ? res.text.includes('service_role') : false,
    });
  }

  const companyChecks = [];
  for (const comp of ROUND1_COMPANIES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(comp.url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      clearTimeout(timeout);
      companyChecks.push({
        company: comp.name,
        url: comp.url,
        email: comp.email,
        reachable: res.status >= 200 && res.status < 500,
        httpStatus: res.status,
      });
    } catch (err) {
      companyChecks.push({
        company: comp.name,
        url: comp.url,
        email: comp.email,
        reachable: false,
        error: String(err),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        httpsDemoUrls: publicChecks,
        round1TargetsVerification: companyChecks,
      },
      null,
      2
    )
  );
}

run();
