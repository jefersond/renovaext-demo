/**
 * Script Determinístico (Item 1):
 * Confere o estado exato das páginas públicas (produção raiz vs /preview/) e das versões Git.
 */

const endpoints = [
  'https://jefersond.github.io/renovaext-demo/comercial.html',
  'https://jefersond.github.io/renovaext-demo/proposta-piloto.html',
  'https://jefersond.github.io/renovaext-demo/?demo=1',
  'https://jefersond.github.io/renovaext-demo/preview/comercial.html',
  'https://jefersond.github.io/renovaext-demo/preview/proposta-piloto.html',
  'https://jefersond.github.io/renovaext-demo/preview/?demo=1',
];

async function main() {
  const results = [];
  for (const url of endpoints) {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    const text = await res.text();
    results.push({
      url,
      status: res.status,
      contentLength: text.length,
      cacheControlHeader: res.headers.get('cache-control'),
      lastModifiedHeader: res.headers.get('last-modified'),
      etagHeader: res.headers.get('etag'),
      hasCtaSolicitarDemo: text.includes('Solicitar demonstração'),
      hasCtaParticiparPiloto: text.includes('Quero participar do piloto'),
      hasLeadFormSection: text.includes('id="solicitar"'),
      hasLeadWidgetScript: text.includes('lead-capture-widget.js'),
      hasOldChaveCriptoClaim: text.includes('chave criptográfica'),
      bundleJsReferenced: (text.match(/assets\/index-[A-Za-z0-9_]+\.js/) || [null])[0],
    });
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
