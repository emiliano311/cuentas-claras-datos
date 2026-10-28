// Descarga el dólar, el IPC y el ICL y los guarda en el formato compacto de la app.
// Sirve para generar las copias que vienen dentro de la app (assets/data) y, más adelante,
// para la actualización automática del archivo público de datos.
//
//   node tool/update_snapshots.mjs [carpeta-de-salida]     (por defecto: assets/data)
//
// Valida antes de escribir: si una fuente falla o devuelve algo raro, NO pisa el archivo anterior.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const out = process.argv[2] ?? 'assets/data';
const today = new Date().toISOString().slice(0, 10);

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// Sanity checks: a broken or stale answer must never replace good data.
const daysAgo = (date) => (Date.now() - new Date(date).getTime()) / 86400000;

function fx(casa, list) {
  const rows = list
    .filter((e) => e.fecha >= '2020-01-01' && e.venta > 0)
    .map((e) => [e.fecha, Number(e.venta)])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (rows.length < 1000) throw new Error(`dólar ${casa}: pocas filas (${rows.length})`);
  if (rows.some((r) => !Number.isFinite(r[1]) || r[1] > 1e6)) throw new Error(`dólar ${casa}: valores imposibles`);
  if (daysAgo(rows.at(-1)[0]) > 10) throw new Error(`dólar ${casa}: el último dato es de ${rows.at(-1)[0]}`);
  return { casa, rows };
}

function ipc(list) {
  const monthly = {};
  for (const e of list) if (e.fecha >= '2016-12') monthly[e.fecha.slice(0, 7)] = Number(e.valor);
  const months = Object.keys(monthly).sort();
  if (months.length < 50) throw new Error('IPC: pocos meses');
  if (months.some((m) => !Number.isFinite(monthly[m]) || monthly[m] < -5 || monthly[m] > 60)) {
    throw new Error('IPC: una variación mensual fuera de rango (-5 % a 60 %)');
  }
  // INDEC publishes the previous month around the 15th: a gap of more than 2 months means something is wrong.
  const last = new Date(`${months.at(-1)}-01`);
  if (daysAgo(last) > 75) throw new Error(`IPC: el último mes es ${months.at(-1)}`);
  return { ipc: monthly };
}

function icl(body) {
  const detail = body.results[0].detalle;
  const rows = detail.map((e) => [e.fecha, Number(e.valor)]).sort((a, b) => a[0].localeCompare(b[0]));
  if (rows.length < 1500) throw new Error(`ICL: pocas filas (${rows.length})`);
  if (rows.some((r) => !Number.isFinite(r[1]) || r[1] <= 0)) throw new Error('ICL: valores imposibles');
  if (daysAgo(rows.at(-1)[0]) > 10) throw new Error(`ICL: el último dato es de ${rows.at(-1)[0]}`);
  return { icl: rows };
}

const jobs = {
  'fx_oficial.json': async () => fx('oficial', await getJson('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial')),
  'fx_blue.json': async () => fx('blue', await getJson('https://api.argentinadatos.com/v1/cotizaciones/dolares/blue')),
  'fx_bolsa.json': async () => fx('bolsa', await getJson('https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa')),
  'ipc.json': async () => ipc(await getJson('https://api.argentinadatos.com/v1/finanzas/indices/inflacion')),
  'icl.json': async () =>
    icl(await getJson(`https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40?desde=2020-06-30&hasta=${today}&limit=3000`)),
};

await mkdir(out, { recursive: true });
let failed = 0;
for (const [file, job] of Object.entries(jobs)) {
  try {
    const data = await job();
    await writeFile(join(out, file), JSON.stringify(data));
    console.log(`ok   ${file}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${file}: ${e.message} (se conserva el archivo anterior)`);
  }
}
process.exit(failed ? 1 : 0);
