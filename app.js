/* NTs – CBMGO OFFLINE — app offline */
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'e', 'em', 'para', 'por', 'com', 'na', 'no', 'nas', 'nos', 'um', 'uma', 'as', 'os', 'ou', 'que', 'se', 'ao', 'aos', 'qual', 'quais', 'como']);
const APPNAME = 'VistoriaGO';
const TIPOS = { NT: 'Normas Técnicas', OT: 'Orientações Técnicas', NP: 'Notas p/ Projeto', LEI: 'Lei 15.802', NBR: 'NBR 10897', ALT: 'Alterações', REV: 'Revogadas' };

const S = { docs: {}, byDoc: {}, chunks: [], revLoaded: false, types: new Set(['NT', 'OT', 'NP', 'LEI', 'NBR', 'ALT']) };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ---------- carregamento ---------- */
window.__PK = list => {
  for (const [doc, secao, titulo, pagina, texto] of list) {
    const c = { i: S.chunks.length, doc, secao, titulo, pagina, texto, n: norm(texto), nt: norm(titulo + ' ' + secao) };
    S.chunks.push(c);
    (S.byDoc[doc] = S.byDoc[doc] || []).push(c);
  }
};
function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}
async function boot() {
  applyTheme();
  await loadScript('data/catalogo.js');
  await loadScript('data/modelos.js');
  await loadScript('data/exig.js'); await loadScript('data/mapa.js'); await loadScript('data/tabpages.js');
  CAT.docs.forEach(d => S.docs[d.id] = d);
  const total = CAT.pacotes.length;
  for (let k = 0; k < total; k++) {
    await loadScript(CAT.pacotes[k]);
    $('#splash-bar').style.width = Math.round((k + 1) / total * 100) + '%';
  }
  if (window.PWA_BOOT) await window.PWA_BOOT();
  $('#splash').classList.add('out');
  setTimeout(() => $('#splash').remove(), 400);
  window.addEventListener('hashchange', route);
  route();
}
async function loadRev() {
  if (S.revLoaded) return;
  S.revLoaded = true;
  toast('Carregando normas revogadas…', 1500);
  for (const p of CAT.pacotes_rev) await loadScript(p);
}

/* ---------- tema ---------- */
function applyTheme() { const t = store.get('tema', null); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
function toggleTheme() {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  store.set('tema', dark ? 'light' : 'dark'); applyTheme();
}
function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, ms); }

/* ---------- rotas ---------- */
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [r, ...a] = h.split('/');
  $('#sheet').hidden = true;
  document.body.classList.remove('mapmode'); window.onresize = null;
  const tab = { '': 'home', busca: 'busca', exig: 'home', lib: 'home', salvos: 'home', doc: 'busca', modelos: 'modelos', notas: 'notas', nota: 'notas', mapa: 'mapa' }[r] || 'home';
  document.querySelectorAll('#tabs a').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
  if (r === 'busca') return viewBusca(a.join('/'));
  if (r === 'lib') return viewLib(a[0] || 'NT');
  if (r === 'doc') return viewDoc(a[0], +a[1] || 0, a.slice(2).join('/'));
  if (r === 'exig') return viewExig();
  if (r === 'salvos') return viewSalvos();
  if (r === 'modelos') return viewModelos(a.join('/'));
  if (r === 'notas') return viewNotas();
  if (r === 'nota') return viewNota(a[0]);
  if (r === 'mapa') return a[0] && a[0] !== 'q' ? viewMapaPg(a[0], a[1], a[2]) : viewMapa(a[0] === 'q' ? a.slice(1).join('/') : '');
  return viewHome();
}
function setView(html) { const v = $('#view'); v.innerHTML = html; v.scrollTop = 0; }
function bar(title, back = true, extra = '') {
  $('#top').innerHTML = `<div class="hrow">${back ? '<button class="hbtn" onclick="history.back()" aria-label="Voltar"><svg><use href="#i-back"/></svg></button>' : ''}<div class="htitle">${esc(title)}</div>${extra}</div>`;
}
const dataBR = s => s.split('-').reverse().join('/');

/* ---------- início ---------- */
const ATALHOS = [
  ['i-grid', 'Classificação', 'NT-01 Tab. 1', 'NT-01-2026-AnexoA', 'Tabela 1'],
  ['i-exit', 'Saídas de emergência', 'NT-11', 'NT-11-2025'],
  ['i-ext', 'Extintores', 'NT-21', 'NT-21-2022'],
  ['i-hyd', 'Hidrantes', 'NT-22', 'NT-22-2025'],
  ['i-spk', 'Chuveiros automáticos', 'NT-23 · NBR', 'NT-23-2025'],
  ['i-lamp', 'Iluminação', 'NT-18', 'NT-18-2022'],
  ['i-sign', 'Sinalização', 'NT-20', 'NT-20-2022'],
  ['i-bell', 'Detecção e alarme', 'NT-19', 'NT-19-2022'],
  ['i-gas', 'GLP', 'NT-28', 'NT-28-2022-P1'],
  ['i-team', 'Brigada', 'NT-17', 'NT-17-2023'],
  ['i-load', 'Carga de incêndio', 'NT-14', 'NT-14-2026'],
  ['i-smoke', 'Controle de fumaça', 'NT-15', 'NT-15-2026-P1'],
  ['i-law', 'Lei 15.802/2006', 'Código Estadual', 'LEI-15802-2006'],
  ['i-check', 'Vistorias e prazos', 'NT-01', 'NT-01-2026'],
  ['i-book', 'Edif. existentes', 'NT-41', 'NT-41-2024'],
];
function link(doc, secao) {
  const list = S.byDoc[doc] || [];
  let k = 0; if (secao) { const f = list.findIndex(c => c.secao === secao); if (f >= 0) k = f; }
  return `#/doc/${doc}/${k}`;
}
function viewHome() {
  $('#top').innerHTML = `<div class="hero"><div class="hrow"><div class="brand"><svg class="flame"><use href="#i-flame"/></svg><div><h1>${APPNAME}</h1><div class="tag">NTs · Mapas · Notas — CBMGO <span class="off">OFFLINE</span></div></div></div><span style="flex:1"></span><button class="hbtn" onclick="toggleTheme()" aria-label="Modo noturno"><svg><use href="#i-moon"/></svg></button></div>
    <form class="searchbox" onsubmit="event.preventDefault();location.hash='#/busca/'+encodeURIComponent(this.q.value)"><svg><use href="#i-search"/></svg><input name="q" type="search" placeholder="Buscar nas normas (ex.: reserva técnica)" enterkeyhint="search" autocomplete="off"></form></div>`;
  const rec = store.get('recentes', []).filter(r => S.docs[r.doc]).slice(0, 4);
  const nn = store.get('notas', []).length;
  setView(`
    <div class="sec-title">Ferramentas de vistoria</div>
    <div class="big4">
      <a class="b4 c1" href="#/modelos"><svg><use href="#i-clip"/></svg><b>Check-list de exigências</b><span>${MODELOS.modelos.length} textos prontos · copiar e colar</span></a>
      <a class="b4 c2" href="#/notas"><svg><use href="#i-note"/></svg><b>Notas</b><span>${nn ? nn + ' nota(s) salva(s)' : 'Anotações p/ o SIAPI'}</span></a>
      <a class="b4 c3" href="#/mapa"><svg><use href="#i-map"/></svg><b>Mapa</b><span>${MAPA.pages.length} mapas · busca por setor</span></a>
      <a class="b4 c4" href="#/exig"><svg><use href="#i-check"/></svg><b>Exigências por edificação</b><span>Divisão + área + altura → medidas</span></a>
    </div>
    <div class="sec-title">Normas — atalhos</div>
    <div class="tiles">${ATALHOS.map(([ic, t, s, doc, sec]) => `<a class="tile" href="${link(doc, sec)}"><svg><use href="#${ic}"/></svg><b>${t}</b><small>${s}</small></a>`).join('')}</div>
    <div class="sec-title">Acervo</div>
    <div class="chips" style="flex-wrap:wrap">${Object.entries(TIPOS).map(([t, n]) => `<a class="chip" href="#/lib/${t}">${n} · ${CAT.docs.filter(d => d.tipo === t).length}</a>`).join('')}<a class="chip" href="#/salvos">★ Salvos · ${store.get('salvos', []).length}</a></div>
    ${rec.length ? `<div class="sec-title">Consultados recentemente</div><div class="list">${rec.map(r => itemChunk((S.byDoc[r.doc] || [])[r.k], null)).join('')}</div>` : ''}
    <div class="foot"><div class="stripe"></div>${APPNAME} · base conferida em ${dataBR(CAT.verificado_em)}<br>Fonte: Normas Técnicas do CBMGO (bombeiros.go.gov.br), Lei 15.802/2006, ABNT NBR 10897 e Guia de Ruas de Goiânia/Aparecida.<br>Ferramenta de consulta — confira sempre o texto oficial vigente.<div class="credit">Desenvolvido por <b>Frederico Kennedy de Oliveira Domingos</b></div></div>`);
}

/* ---------- busca ---------- */
// normalização para busca: sem acento, minúsculas, hífen entre palavras vira espaço, espaços colapsados
const snorm = s => norm(s).replace(/\[p\. \d+\]/g, ' ').replace(/([a-z])[-–‐]([a-z])/g, '$1 $2').replace(/\s+/g, ' ');
const SIN = {
  pcf: ['pcf', 'porta corta fogo', 'portas corta fogo'], sprinkler: ['sprinkler', 'chuveiro automatico', 'chuveiros automaticos'], sprinklers: ['sprinkler', 'chuveiros automaticos'],
  botoeira: ['botoeira', 'acionador manual', 'acionadores manuais'], glp: ['glp', 'gas liquefeito'], spda: ['spda', 'descargas atmosfericas'],
  'guarda corpo': ['guarda corpo', 'guardas', 'guarda corpos'], cercon: ['cercon', 'certificado de conformidade'], art: ['art', 'anotacao de responsabilidade', 'responsabilidade tecnica'],
  rti: ['rti', 'reserva tecnica'], 'reserva tecnica': ['reserva tecnica', 'rti'], extintores: ['extintor'], hidrantes: ['hidrant'],
};
const stem = t => {
  if (/\d/.test(t) || t.length <= 5) return t;
  return t.slice(0, Math.max(5, t.length - 2));
};
function parseQuery(q) {
  let s = snorm(q);
  const nts = [];
  s = s.replace(/\bn\.?\s?t\.?\s*-?\s*(\d{1,2})\b/g, (m, n) => { nts.push(String(+n).padStart(2, '0')); return ' '; });
  const groups = []; const re = /"([^"]+)"|(\S+)/g; let m;
  const raw = [];
  while ((m = re.exec(s))) raw.push({ t: (m[1] || m[2]).trim(), quoted: !!m[1] });
  for (let i = 0; i < raw.length; i++) {
    const { t, quoted } = raw[i];
    if (!t || (!quoted && STOP.has(t))) continue;
    const two = i + 1 < raw.length ? t + ' ' + raw[i + 1].t : null;
    if (two && SIN[two]) { groups.push(SIN[two]); i++; continue; }
    if (quoted) { groups.push([t]); continue; }
    groups.push(SIN[t] ? SIN[t].map(stem) : [stem(t)]);
  }
  return { groups, nts, phrase: raw.filter(x => !STOP.has(x.t)).map(x => x.t).join(' ') };
}
function terms(q) { return parseQuery(q).groups.flat(); }
const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function altRe(a) { const short = a.length <= 3 || /^\d/.test(a); return new RegExp('(?<![a-z0-9])' + reEsc(a) + (short ? '(?![a-z0-9])' : ''), 'g'); }
function cnt(re, hay) { re.lastIndex = 0; let k = 0; while (re.exec(hay) && k < 50) k++; return k; }
function positions(res, hay) { const out = []; for (const re of res) { re.lastIndex = 0; let m, k = 0; while ((m = re.exec(hay)) && k < 60) { out.push(m.index); k++; } } return out; }
function near(G, hay, win = 220) {
  const P = G.map(res => positions(res, hay)); if (P.some(p => !p.length)) return false;
  return P[0].some(x => P.slice(1).every(p => p.some(y => Math.abs(y - x) <= win)));
}
function search(q) {
  const { groups, nts, phrase } = parseQuery(q);
  if (!groups.length && !nts.length) return [];
  const pool = S.chunks.filter(c => { const d = S.docs[c.doc]; return d && S.types.has(d.tipo); });
  let tot = 0;
  for (const c of pool) { if (!c.s) { c.s = snorm(c.texto); c.st = snorm(c.titulo + ' ' + c.secao); c.sd = snorm(S.docs[c.doc].titulo); } tot += c.s.length; }
  const avg = tot / Math.max(pool.length, 1), N = pool.length, k1 = 1.2, bb = 0.75;
  const G = groups.map(alts => alts.map(altRe));
  const tf = pool.map(c => G.map(res => Math.max(0, ...res.map(re => cnt(re, c.s)))));
  const tt = pool.map(c => G.map(res => res.some(re => { re.lastIndex = 0; return re.test(c.st); })));
  const td = pool.map(c => G.map(res => res.some(re => { re.lastIndex = 0; return re.test(c.sd); })));
  const idf = G.map((_, g) => { let df = 0; for (let i = 0; i < N; i++) if (tf[i][g] || tt[i][g]) df++; return Math.log(1 + (N - df + 0.5) / (df + 0.5)); });
  const phraseRe = groups.length > 1 && phrase.length > 4 ? altRe(phrase) : null;
  const itemRe = /^\d+(\.\d+)+$/.test(phrase) ? new RegExp('(^| )' + reEsc(phrase) + '[ .]') : null;
  const res = [];
  pool.forEach((c, i) => {
    const d = S.docs[c.doc];
    const idn = d.id.replace(/^(ALT|REV)-/, '');
    const ntHit = nts.length ? nts.some(n => idn.startsWith('NT-' + n)) : true;
    if (nts.length && !ntHit && !groups.length) return;
    let score = 0, hits = 0;
    G.forEach((_, g) => {
      const f = tf[i][g];
      if (f || tt[i][g]) hits++;
      score += idf[g] * (f * (k1 + 1) / (f + k1 * (1 - bb + bb * c.s.length / avg)));
      if (tt[i][g]) score += idf[g] * 1.2;
      if (td[i][g]) score += idf[g] * 1.6;
    });
    if (groups.length && !hits) return;
    if (hits < groups.length) score *= 0.25 * hits / groups.length;
    if (phraseRe && cnt(phraseRe, c.s)) score += 4;
    else if (G.length > 1 && hits === G.length && near(G, c.s)) score = score * 1.5 + 2.5;
    if (itemRe && itemRe.test(c.s)) score += 8;
    if (nts.length) score = ntHit ? score + 3 : score * 0.15;
    if (d.tipo === 'REV') score *= 0.7;
    if (d.tipo === 'ALT') score *= 0.8;
    if (score > 0) res.push([score, c]);
  });
  return res.sort((a, b) => b[0] - a[0]);
}
function snippet(c, ts) {
  const t = c.texto.replace(/\[p\. \d+\]/g, ' ').replace(/\s+/g, ' ');
  const n = norm(t); let p = -1;
  for (const x of ts) { p = n.indexOf(x.split(' ')[0]); if (p >= 0) break; }
  const a = Math.max(0, p - 60), b = Math.min(t.length, Math.max(p, 0) + 150);
  return hl(esc((a ? '…' : '') + t.slice(a, b) + '…'), ts);
}
function hl(html, ts) {
  if (!ts || !ts.length) return html;
  const src = norm(html); const marks = [];
  const isW = ch => !!ch && /[a-z0-9]/.test(ch);
  for (const x of ts) { for (const s of new Set([x, x.replace(/ /g, '-')])) { if (s.length < 2) continue; let p = src.indexOf(s); while (p !== -1) { if (!isW(src[p - 1])) { let e = p + s.length; while (isW(src[e])) e++; marks.push([p, e]); } p = src.indexOf(s, p + s.length); } } }
  if (!marks.length) return html;
  marks.sort((a, b) => a[0] - b[0]);
  let out = '', last = 0, n = 0;
  for (const [a, b] of marks) { if (a < last) continue; const pre = html.slice(last, a); if (/<[^>]*$/.test(pre) || /&[a-z]*$/.test(pre)) continue; out += pre + `<mark id="m${n++}">` + html.slice(a, b) + '</mark>'; last = b; }
  return out + html.slice(last);
}
function label(c) { return c.secao === '0' ? 'Capa / sumário' : (/^\d/.test(c.secao) ? 'Item ' : '') + c.secao; }
function itemChunk(c, ts, q) {
  if (!c) return '';
  const d = S.docs[c.doc];
  const href = `#/doc/${c.doc}/${S.byDoc[c.doc].indexOf(c)}${q ? '/' + encodeURIComponent(q) : ''}`;
  return `<a class="item${d.tipo === 'REV' ? ' rev' : ''}" href="${href}"><div class="ref"><span class="badge ${d.tipo}">${d.tipo === 'REV' ? 'REVOGADA' : d.tipo}</span>${esc(c.doc)} · ${esc(label(c))} · p. ${c.pagina}</div><div class="tt">${esc(c.titulo || d.titulo)}</div><div class="sn">${ts ? snippet(c, ts) : esc(d.titulo)}</div></a>`;
}
function viewBusca(q) {
  $('#top').innerHTML = `<div class="hrow"><button class="hbtn" onclick="history.back()" aria-label="Voltar"><svg><use href="#i-back"/></svg></button><div class="htitle">Buscar nas normas</div></div>
    <form class="searchbox" onsubmit="event.preventDefault();this.q.blur()"><svg><use href="#i-search"/></svg><input id="qbox" name="q" type="search" value="${esc(q)}" placeholder="Palavras, item (5.8.1.1) ou NT-11" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false"><button type="button" class="clear" id="qclear">×</button></form>`;
  setView(`<div class="chips" id="qchips"></div><div id="qres"></div>`);
  const box = $('#qbox');
  const chips = () => { $('#qchips').innerHTML = Object.entries(TIPOS).map(([t, n]) => `<button class="chip${t === 'REV' ? ' rev' : ''}${S.types.has(t) ? ' on' : ''}" data-t="${t}">${n}</button>`).join('');
    document.querySelectorAll('#qchips .chip').forEach(b => b.onclick = async () => { const t = b.dataset.t; S.types.has(t) ? S.types.delete(t) : S.types.add(t); if (t === 'REV' && S.types.has(t)) await loadRev(); chips(); render(); }); };
  const render = () => {
    const v = box.value; const out = $('#qres');
    history.replaceState(null, '', '#/busca/' + encodeURIComponent(v));
    if (!v.trim()) { out.innerHTML = `<div class="empty"><svg><use href="#i-search"/></svg>Digite termos como <b>“distância máxima extintor”</b>, <b>“reserva técnica”</b>, <b>“guarda-corpo”</b>, <b>“Tabela 6D”</b>, <b>“5.8.1.1”</b> ou <b>“NT-22 bomba”</b>.<br><br>Use aspas para frase exata.</div>`; return; }
    const r = search(v); const ts = terms(v);
    out.innerHTML = r.length ? `<div class="meta" style="margin:0 2px 8px">${r.length} trechos${r.length > 80 ? ' · mostrando 80' : ''}</div><div class="list">${r.slice(0, 80).map(([s, c]) => itemChunk(c, ts, v)).join('')}</div>`
      : `<div class="empty"><svg><use href="#i-search"/></svg>Nada encontrado. Tente menos palavras ou sinônimos.</div>`;
  };
  let tm; box.oninput = () => { clearTimeout(tm); tm = setTimeout(render, 280); };
  $('#qclear').onclick = () => { box.value = ''; render(); box.focus(); };
  chips(); render();
  if (!q.trim()) setTimeout(() => box.focus(), 60);
}

/* ---------- biblioteca ---------- */
async function viewLib(tipo) {
  bar('Acervo de normas', true);
  if (tipo === 'REV') await loadRev();
  const ds = CAT.docs.filter(d => d.tipo === tipo);
  setView(`<div class="chips">${Object.entries(TIPOS).map(([t, n]) => `<a class="chip${t === tipo ? ' on' : ''}${t === 'REV' ? ' rev' : ''}" href="#/lib/${t}" onclick="location.replace(this.href);return false">${n}</a>`).join('')}</div>
    ${tipo === 'REV' ? '<div class="warn rev">Normas revogadas — apenas consulta histórica. Para exigências atuais use a norma vigente.</div>' : ''}
    ${tipo === 'ALT' ? '<div class="warn">Quadros de Principais Alterações publicados pelo CBMGO: mostram o que mudou na revisão de cada NT.</div>' : ''}
    <div class="list">${ds.map(d => `<a class="item${tipo === 'REV' ? ' rev' : ''}" href="#/doc/${d.id}/0"><div class="ref"><span class="badge ${d.tipo}">${d.tipo === 'REV' ? 'REVOGADA' : d.tipo}</span>${esc(d.id)}${d.paginas ? ' · ' + d.paginas + ' p.' : ''}</div><div class="tt">${esc(d.titulo)}</div></a>`).join('')}</div>`);
}

/* ---------- leitor ---------- */
async function viewDoc(id, k, q) {
  const d = S.docs[id];
  if (!d) { bar('Documento'); return setView('<div class="empty">Documento não encontrado.</div>'); }
  if (d.tipo === 'REV') await loadRev();
  const list = S.byDoc[id] || []; const c = list[k];
  if (!c) { bar(id); return setView('<div class="empty">Trecho não encontrado.</div>'); }
  const rec = store.get('recentes', []).filter(r => !(r.doc === id && r.k === k)); rec.unshift({ doc: id, k }); store.set('recentes', rec.slice(0, 12));
  const saved = store.get('salvos', []); const isSaved = saved.some(s => s.doc === id && s.k === k);
  bar(id.replace(/-/g, ' '), true, `<button class="hbtn" id="btoc" aria-label="Sumário"><svg><use href="#i-list"/></svg></button><button class="hbtn" id="bsave" aria-label="Salvar"><svg><use href="#${isSaved ? 'i-star-f' : 'i-star'}"/></svg></button>`);
  const ts = q ? terms(q) : [];
  const scan = id === 'NBR-10897-2007';
  const tp = (window.TABP || {})[id] || [];
  const pad = n => String(n).padStart(3, '0');
  const imgSrc = n => scan ? (window.nbrImg ? window.nbrImg(pad(n)) : `paginas/NBR-10897-2007/p-${pad(n)}.png`) : `tab/${id}/p-${pad(n)}.webp`;
  const linesT = c.texto.split('\n').filter(l => l.trim());
  const tableLike = linesT.filter(l => /\S\s{4,}\S/.test(l)).length / Math.max(linesT.length, 1) > 0.25;
  const srcTxt = tableLike ? c.texto : c.texto.replace(/([a-zà-ü])-\n[ \t]*(?=[a-zà-ü])/g, '$1-').replace(/([^\n.:;])\n[ \t]*(?=[a-zà-ü(,])/g, '$1 ');
  let body = esc(srcTxt).replace(/\[p\. (\d+)\]/g, (m, n) => scan || tp.includes(+n) ? `<button class="pgbtn" data-src="${imgSrc(n)}">página ${n} · ver original ▸</button>` : `<span class="pg">página ${n}</span>`);
  const cpages = [...new Set([c.pagina, ...[...c.texto.matchAll(/\[p\. (\d+)\]/g)].map(m => +m[1])])].filter(n => tp.includes(n));
  body = hl(body, ts);
  const nm = (body.match(/<mark /g) || []).length;
  const fs = store.get('fs2', 15);
  document.documentElement.style.setProperty('--fs', fs + 'px');
  const lines = c.texto.split('\n').filter(l => l.trim());
  const isTable = lines.filter(l => /\S\s{4,}\S/.test(l)).length / Math.max(lines.length, 1) > 0.25;
  const fit = store.get('fit', true);
  const colorDoc = id === 'NT-20-2022' || id === 'NT-04-2026';
  const origOn = cpages.length && (colorDoc || isTable) && store.get('orig', true);
  setView(`<div class="doc-head"><div class="ref" style="display:flex;gap:6px;align-items:center"><span class="badge ${d.tipo}">${d.tipo === 'REV' ? 'REVOGADA' : d.tipo}</span><span class="sec-label">${esc(label(c))} · a partir da p. ${c.pagina} · trecho ${k + 1}/${list.length}</span></div>
      <h2>${esc(d.titulo)}</h2></div>
    ${d.tipo === 'REV' ? '<div class="warn rev">Norma revogada — consulta histórica. Não usar como exigência vigente.</div>' : ''}
    ${scan ? '<div class="warn">Texto obtido por digitalização (OCR). Para tabelas e figuras, toque em “ver original”.</div>' : ''}
    ${nm ? `<div class="findbar"><span>${nm} ocorrência(s) de “${esc(q)}”</span><button id="bnext">Próxima ▾</button></div>` : ''}
    <div class="doc-tools"><button class="tbtn" id="fminus">A−</button><button class="tbtn" id="fplus">A+</button><button class="tbtn" id="btoc2"><svg><use href="#i-list"/></svg>Sumário</button>${cpages.length ? `<button class="tbtn${origOn ? ' on' : ''}" id="borig">▦ ${origOn ? 'Ver texto' : 'Página original'}</button>` : ''}${isTable && !origOn ? `<button class="tbtn${fit ? ' on' : ''}" id="bfit">⤢ Ajustar tabela</button>` : ''}${d.url ? `<a class="tbtn" href="${esc(d.url)}">Fonte oficial ↗</a>` : ''}</div>
    ${origOn ? `<div class="meta" style="margin:0 2px 6px">Página original da norma (tabelas e cores como publicadas) · toque na imagem para ampliar</div>${cpages.map(n => `<figure class="orig"><figcaption>página ${n}</figcaption><img class="scan" src="${imgSrc(n)}" alt="Página ${n}" data-zoom="${imgSrc(n)}"></figure>`).join('')}` : `${isTable && fit ? '<div class="meta" style="margin:0 2px 6px">Tabela ajustada à largura · gire o celular ou use pinça para ampliar</div>' : ''}<div class="txtwrap"><pre class="txt${isTable ? '' : ' wrap'}">${body}</pre></div>`}
    <div class="pager"><button id="bprev" ${k ? '' : 'disabled'}>◂ Anterior</button><button id="bnextc" ${k < list.length - 1 ? '' : 'disabled'}>Próximo ▸</button></div>`);
  if ($('#borig')) $('#borig').onclick = () => { store.set('orig', !origOn); viewDoc(id, k, q); };
  document.querySelectorAll('[data-zoom]').forEach(im => im.onclick = () => zoomImg(im.dataset.zoom));
  if (isTable && fit && !origOn) {
    const pre = document.querySelector('pre.txt'), wrap = document.querySelector('.txtwrap');
    const fitNow = () => { pre.style.fontSize = ''; const natural = pre.scrollWidth, avail = wrap.clientWidth - 2; if (natural > avail) pre.style.fontSize = Math.max(4, fs * (avail - 26) / (natural - 24) - 0.1) + 'px'; };
    fitNow(); wrap.scrollLeft = 0; window.onresize = fitNow;
  } else window.onresize = null;
  if ($('#bfit')) $('#bfit').onclick = () => { store.set('fit', !fit); viewDoc(id, k, q); };
  const go = n => location.replace(`#/doc/${id}/${n}${q ? '/' + encodeURIComponent(q) : ''}`);
  $('#bprev').onclick = () => go(k - 1);
  $('#bnextc').onclick = () => go(k + 1);
  $('#fplus').onclick = () => { store.set('fs2', Math.min(fs + 1, 24)); viewDoc(id, k, q); };
  $('#fminus').onclick = () => { store.set('fs2', Math.max(fs - 1, 10)); viewDoc(id, k, q); };
  const toc = () => {
    const sh = $('#sheet');
    sh.innerHTML = `<div class="panel"><div class="grab"></div><h3>Sumário · ${esc(id)}</h3><div class="toc">${list.map((x, j) => `<a href="#/doc/${id}/${j}" class="${j === k ? 'on' : ''}" onclick="location.replace(this.href);return false"><span class="n">${esc(label(x))}</span><span class="t">${esc(x.titulo)}</span><span class="p">p.${x.pagina}</span></a>`).join('')}</div></div>`;
    sh.hidden = false; sh.onclick = e => { if (e.target === sh) sh.hidden = true; };
  };
  $('#btoc').onclick = toc; $('#btoc2').onclick = toc;
  $('#bsave').onclick = () => {
    let s = store.get('salvos', []);
    if (s.some(x => x.doc === id && x.k === k)) { s = s.filter(x => !(x.doc === id && x.k === k)); toast('Removido dos salvos'); }
    else { s.unshift({ doc: id, k, em: new Date().toISOString().slice(0, 10) }); toast('Trecho salvo ★'); }
    store.set('salvos', s); $('#bsave').innerHTML = `<svg><use href="#${s.some(x => x.doc === id && x.k === k) ? 'i-star-f' : 'i-star'}"/></svg>`;
  };
  document.querySelectorAll('.pgbtn').forEach(b => b.onclick = () => {
    const nx = b.nextElementSibling; if (nx && nx.tagName === 'IMG') { nx.remove(); return; }
    const im = document.createElement('img'); im.className = 'scan'; im.alt = 'Página original'; im.src = b.dataset.src; im.onclick = () => zoomImg(b.dataset.src); b.after(im);
  });
  if (nm) {
    let cur = 0;
    const show = () => { const m = document.getElementById('m' + cur); if (m) { const v = $('#view'); v.scrollTop += m.getBoundingClientRect().top - v.clientHeight / 2; const w = m.closest('.txtwrap'); if (w && !(isTable && fit)) w.scrollLeft = Math.max(0, m.offsetLeft - w.clientWidth / 2); } };
    $('#bnext').onclick = () => { cur = (cur + 1) % nm; show(); };
    setTimeout(show, 60);
  }
}

function zoomImg(src) {
  const sh = $('#sheet');
  sh.innerHTML = `<div class="zoomv"><div class="zbox" id="zbox"><div id="zin2"><img src="${src}" alt="" draggable="false"></div></div><button class="hbtn zx" aria-label="Fechar">✕</button><div class="mapctl"><button id="zp">＋</button><button id="zm">－</button><button id="zf">⤢</button></div></div>`;
  sh.hidden = false; sh.onclick = null;
  sh.querySelector('.zx').onclick = () => { sh.hidden = true; window.onresize = null; };
  const im = sh.querySelector('img');
  const go = () => { const pz = makePZ($('#zbox'), $('#zin2'), im.naturalWidth, im.naturalHeight); $('#zp').onclick = pz.zoomIn; $('#zm').onclick = pz.zoomOut; $('#zf').onclick = pz.fit; };
  im.complete && im.naturalWidth ? go() : (im.onload = go);
}
/* ---------- exigências por edificação (NT-01 Anexo A, Tabelas 5 e 6 + anexos da NT-01) ---------- */
function byPage(doc, p) { const l = S.byDoc[doc] || []; let k = 0; l.forEach((c, i) => { if (c.pagina <= p) k = i; }); return k; }
function tabelaDe(div) {
  for (const t of EXIG.t6) for (const b of t.blocos) if (b.divs.includes(div)) return { t, b };
  return null;
}
function hIndex(h, ter) { if (ter) return 0; if (h <= 6) return 1; if (h <= 12) return 2; if (h <= 23) return 3; if (h <= 30) return 4; return 5; }
function parseCel(v) { v = (v || '').trim(); if (!v || v === '-' || v === '–') return null; return v.replace(/^X/, '').split(',').map(x => x.trim()).filter(Boolean); }
const RANK = { ok: 4, cond: 3, rec: 2, no: 1 };
// avalia as notas da tabela com os dados informados (área, lotação, pavimentos)
function avalia(notas, txt, c) {
  let st = 'ok', motivo = '';
  const set = (s, m) => { if (s === 'no' || RANK[s] < RANK[st]) { st = s; motivo = m; } };
  for (const n of notas) {
    const t = (txt[n] || '').toLowerCase();
    let m = t.match(/^para edifica[çc][õo]es? com [áa]rea total constru[íi]da igual ou superior a ([\d.]+) ?m/);
    if (m) { const lim = parseFloat(m[1].replace('.', '')); if (c.area < lim) set('no', `nota ${n}: só a partir de ${lim.toLocaleString('pt-BR')} m²`); continue; }
    m = t.match(/lota[çc][ãa]o superior a (\d+) pessoas ou com mais de dois pavimentos/);
    if (m) { const lim = +m[1]; const lk = !isNaN(c.lot), pk = !isNaN(c.pav);
      if ((lk && c.lot > lim) || (pk && c.pav > 2)) continue;
      if (lk && (pk || c.ter)) set('no', `nota ${n}: lotação ≤ ${lim} e até 2 pavimentos`); else set('cond', `nota ${n}: se lotação > ${lim} pessoas ou mais de 2 pavimentos`); continue; }
    m = t.match(/concentra[çc][ãa]o de p[úu]blico a partir de (\d+) pessoas/);
    if (m) { const lim = +m[1]; if (isNaN(c.lot)) set('cond', `nota ${n}: obrigatório a partir de ${lim} pessoas (abaixo: recomendado)`); else if (c.lot < lim) set('rec', `nota ${n}: lotação < ${lim} → recomendatório`); continue; }
    m = t.match(/p[úu]blico acima de (\d+) pessoas/);
    if (m) { const lim = +m[1]; if (isNaN(c.lot)) set('cond', `nota ${n}: só para público acima de ${lim} pessoas`); else if (c.lot <= lim) set('no', `nota ${n}: só acima de ${lim} pessoas`); continue; }
    if (/^recomendat[óo]rio/.test(t)) { set('rec', `nota ${n}: recomendatório`); continue; }
    if (/^(pode|poder[áa]) ser substitu|^deve haver elevador|^a central de glp estar[áa] dispensada|^ver ntcbmgo|^conforme ntcbmgo|^lumin[áa]rias/.test(t)) continue;
    set('cond', '');
  }
  return { st, motivo };
}
// Central de GLP — NT-28 Parte 1, item 5.4 (uso de P-13) e notas das Tabelas 5/6
const RESID = ['A-2', 'A-3'];
function avaliaGLP(c) {
  const g = c.glp, res = RESID.includes(c.div) || (c.div === 'A-1' && c.a1 === 'cond');
  if (g === 'nao') return { st: 'no', motivo: 'Não utiliza GLP (equipamentos elétricos) — central não se aplica.' };
  if (res) {
    const pode13 = !isNaN(c.area) && c.area < 1200 && (c.ter || c.alt <= 10);
    if (g === 'mais') return { st: 'ok', motivo: 'Uso de recipientes maiores que P-13 → suprimento por Central de GLP (NT-28 5.4.6).' };
    if (!pode13) return { st: 'ok', motivo: 'Residencial com área ≥ 1.200 m² ou altura > 10 m: vedado P-13 nos apartamentos/unidades — suprimento obrigatório por Central de GLP (NT-28 5.4.1.1 e 5.4.6).' };
    return { st: 'cond', motivo: 'Blocos < 1.200 m² e H ≤ 10 m: P-13 permitido somente na área externa, no térreo, com rede individual por residência e blocos em risco isolado (NT-07) — NT-28 5.4.1.1. Fora disso (ex.: botijão dentro do apartamento), exigir Central de GLP.' };
  }
  if (c.div === 'F-7') {
    if (g === 'mais') return { st: 'ok', motivo: 'Recipientes maiores que P-13 → Central de GLP (NT-28).' };
    return { st: 'cond', motivo: 'Evento temporário pode usar P-13 (≤ 13 kg) — NT-01 6.7.2.6; trailers, barracas e quiosques: no máximo 1 botijão por unidade (NT-28 5.4.1.3 a). Acima disso, Central de GLP.' };
  }
  if (g === 'p13') return { st: 'no', motivo: 'Dispensada: copa/cozinha/lanchonete com no máximo 1 botijão P-13 por edificação, exclusivo para cocção (NT-28 5.4.1.3 b e nota da tabela).' };
  if (g === 'mais') return { st: 'ok', motivo: 'Mais de 1 P-13 ou recipientes P-20/P-45/P-190/granel → suprimento obrigatório por Central de GLP (NT-28 5.4.6).' };
  return { st: 'cond', motivo: 'Somente se houver uso de GLP. Cozinha elétrica: não se aplica. Copa/cozinha com até 1 botijão P-13: dispensada (NT-28 5.4.1.3 b). Mais de 1 P-13 ou recipientes maiores: Central obrigatória (NT-28 5.4.6).' };
}
// ART/RRT por sistema — NT-01 7.7.3.8.8
const ARTMAP = [['Hidrante e mangotinhos', 'a) Hidrantes/mangotinhos'], ['Resfriamento', 'b) Resfriamento de tanques/cilindros'], ['Espuma', 'c) Espuma (tanques e bacias)'], ['Iluminação de emergência', 'e) Iluminação de emergência — só se alimentada por grupo motogerador (+ f) do gerador)', 1], ['Central de gás', 'j) Central de GLP e k) instalações internas de GLP'], ['Chuveiros automáticos', 'l) Chuveiros automáticos'], ['Detecção de incêndio', 'm) Detecção de incêndio'], ['Controle de fumaça', 'n) Controle de fumaça (e g) pressurização de escada, se houver)'], ['Controle de materiais de acabamento', 'o) Materiais de acabamento e revestimento'], ['Segurança estrutural', 'p) Segurança estrutural — Habite-se/aumento de área (q) na renovação, se houver revestimento contra fogo)'], ['Compartimentação', 'r) Compartimentação vertical/horizontal'], ['Alarme de incêndio', 's) Alarme de incêndio'], ['SPDA', 't) SPDA']];
function docsDe(c, lin) {
  const D = []; const add = (t, ref, st, mot) => D.push({ t, ref, st, mot });
  const med = k => lin.find(x => x.st !== 'no-tab' && x.m.startsWith(k));
  const div = c.div, area = c.area, lot = c.lot, pav = c.pav;
  // projeto (PSCIP) → Anexo S
  const tr = [];
  if (div === 'F-7') { if (area > 200) tr.push('área > 200 m²'); if (lot > 200) tr.push('lotação > 200 pessoas'); }
  else {
    if (area > 750) tr.push('área > 750 m²'); if (lot > 200) tr.push('lotação > 200 pessoas'); if (pav > 3) tr.push('mais de 3 pavimentos');
    if (['L-1', 'L-2', 'L-3', 'M-2', 'G-3'].includes(div)) tr.push('divisão ' + div + ' (independe da área)');
    if (['F-1', 'F-2', 'F-3', 'F-5', 'F-6', 'F-11', 'H-2', 'H-3'].includes(div) && area > 200) tr.push(div + ' com área > 200 m²');
    if (div === 'A-1' && c.a1 === 'cond') tr.push('condomínio/loteamento (projeto das áreas comuns e isolamento de risco – 8.1.2)');
  }
  const outros = 'subsolo com ocupação ≠ estacionamento, > 500 L de inflamáveis/combustíveis, central de GLP > 190 kg, revenda de GLP, produtos perigosos ou isolamento de risco (NT-07)';
  if (tr.length) add('PSCIP aprovado + Memorial Descritivo impressos, com o Anexo S – Termo de Responsabilidade de Apresentação de Projeto Técnico', 'NT-01 7.6.2, 7.6.2.2 e 7.7.3.12', 'ok', (div === 'F-7' ? 'Licenciamento para Evento Temporário (6.6.2): ' : 'Licenciamento por Habite-se com PSCIP (6.4.2): ') + tr.join('; ') + '.');
  else if (div === 'F-7') add('PSCIP aprovado + Memorial Descritivo impressos, com o Anexo S – Termo de Responsabilidade de Apresentação de Projeto Técnico', 'NT-01 7.6.2.2 e 7.7.3.12 / 6.6.2', 'cond', 'Somente se o evento tiver projeto: área > 200 m² ou lotação > 200 pessoas (eventos em área pública aberta sem áreas privativas > 200 m² são dispensados – 6.6.2.1).');
  else add('PSCIP aprovado + Memorial Descritivo impressos, com o Anexo S – Termo de Responsabilidade de Apresentação de Projeto Técnico', 'NT-01 7.6.2.2 e 7.7.3.12 / 6.4.2', 'cond', 'Somente se a edificação exigir projeto (Habite-se): > 750 m², > 3 pavimentos, lotação > 200, ' + outros + '.');
  if (tr.length || div !== 'F-7') add('Adequação da edificação ou substituição do projeto aprovado', 'NT-01 7.6.2.4', 'cond', 'Somente se a vistoria constatar divergência entre a edificação e o projeto/memorial aprovados (a substituição é feita pelo RT na análise, com Quadro Síntese – Anexo L).');
  // brigada
  const br = med('Brigada');
  if (br && br.st !== 'no') {
    if (div === 'F-7') {
      const st = isNaN(lot) ? 'cond' : lot >= 500 ? 'ok' : 'rec';
      add('Anexo O – Comprovante de Contratação de Brigada Efetiva + CCR da empresa + relação nominal e certificados dos brigadistas', 'NT-01 7.10.1/7.10.1.1; NT-17 5.12.1.3, 5.12.8', st, st === 'ok' ? `Lotação ${lot} ≥ 500 pessoas: brigada obrigatória. Quantidade conforme o Memorial Descritivo (Anexo B) aprovado (7.10.3 b; NT-17 5.12.2: mín. 3 até 1.000 + 1 a cada 500).` : st === 'rec' ? 'Lotação abaixo de 500 pessoas: brigada recomendatória (nota 5 da Tabela 6F.4; NT-17 5.12.2 a).' : 'Obrigatório a partir de 500 pessoas (nota 5 da Tabela 6F.4); abaixo disso, recomendatório. Informe a lotação.');
      add('Anexo P – Atestado de Brigada Eventual', 'NT-01 7.10.1 a; NT-17 5.12.1', 'cond', 'Se parte da brigada for de funcionários do evento treinados e permanentemente junto ao público (NT-17 5.12.1).');
      if (lot > 15000) add('Posto médico (médico + enfermeiro + ambulância)', 'NT-17 5.12.6', 'ok', 'Eventos com lotação acima de 15.000 pessoas.');
    } else {
      add('Memorial de Cálculo de Brigada (portal CBMGO)', 'NT-01 7.7.3.7 f e 7.10.3 a', br.st, 'Quantidade mínima de brigadistas pela NT-17.');
      add('Brigada eventual: Anexo P – Atestado de Brigada Eventual  |  Brigada efetiva: Anexo O + CCR da empresa + certificados de formação/recapacitação', 'NT-01 7.10.1 e 7.10.1.1', br.st, br.st === 'rec' ? 'Brigada recomendatória para esta divisão.' : 'Conforme o tipo de brigada adotado.');
    }
    if (['F-3', 'F-11'].includes(div) && br.st !== 'rec') add('Anexo Q – Declaração de Utilização de Brigadistas e Guarda-Vidas durante Eventos', 'NT-01 7.10.2 a e 7.10.2.1', 'cond', 'F-3 e casas de festas/eventos (F-11): substitui os Anexos O/P; o responsável garante a brigada mínima no momento dos eventos.');
    else if (div !== 'F-7' && br.st !== 'rec') add('Anexo Q – Declaração de Utilização de Brigadistas e Guarda-Vidas', 'NT-01 7.10.2 b e 7.10.2.1', 'cond', 'Somente no Habite-se de edificação sem população fixa no momento da vistoria (regularização para locação).');
  }
  // eventos temporários
  if (div === 'F-7') {
    add('Anexo M – Termo de Responsabilidade de Saídas de Emergência', 'NT-01 7.7.3.14', 'ok', 'Portas abrindo no sentido da fuga e abertas durante o evento.');
    add('Anexo N – Termo de Responsabilidade de Lotação Máxima', 'NT-01 7.7.3.13; NT-17 5.12.3', 'ok', 'Lotação máxima do evento; afixar na portaria principal com controle de acesso.');
    add('ART/RRT de instalação/execução das medidas de segurança do evento', 'NT-01 7.7.3.8.3 a e 7.7.3.8.4', 'ok', 'Novo documento a cada montagem de estruturas.');
    add('ART/RRT das estruturas montadas: palcos/palanques (aa), arquibancadas/arenas (y), brinquedos (z), circo (bb), elétrica provisória (cc), lonas/tendas p/ > 200 pessoas (x)', 'NT-01 7.7.3.8.8', 'cond', 'Para cada estrutura existente no evento (lonas: não se aplica a montagens abertas lateralmente).');
  }
  if (c.piro) {
    const P = 'Espetáculo pirotécnico (NT-30 6.5) – protocolar no mínimo 5 dias úteis antes do evento';
    add('Requerimento do promotor do evento (modelo do Anexo A da NT-30) + guia da taxa', 'NT-30 6.5.1.1 e 6.5.1.2', 'ok', P);
    add('Registro atualizado do Técnico em Pirotecnia (Blaster)', 'NT-30 6.5.1.3; NT-01 7.7.3.11', 'ok', P);
    add('Contrato de queima de fogos com a relação dos fogos e rescaldo pela contratada', 'NT-30 6.5.1.4', 'ok', P);
    add('Plano de Segurança (modelo do Anexo B da NT-30) assinado pelo Blaster, com croqui 1/100', 'NT-30 6.5.1.6', 'ok', 'Croqui obrigatório para classes C/D acima de 120 tubos de até 1" ou mais de 2 conjuntos de 6 tubos ≥ 3" (ou 2 girândolas/mini shows) – 6.5.1.6.2; abaixo disso, seguir instruções do fabricante (6.5.4).');
    add('Autorização do órgão ambiental', 'NT-30 6.5.1.5', 'cond', 'Somente se o espetáculo for próximo a Unidades de Conservação.');
    add('Isolamento da área de queima com placas (letras vermelhas 20×20 cm) e distâncias das Tabelas 1 e 2', 'NT-30 6.5.2 a 6.5.7', 'ok', 'Em ambiente fechado, somente fogos indoor (frios) – NT-30 7.3.');
  }
  // residenciais / condomínios
  if (['A-2', 'A-3', 'D-1', 'D-2', 'D-3', 'D-4', 'C-2', 'C-3'].includes(div) || (div === 'A-1' && c.a1 === 'cond'))
    add('Anexo E – Declaração de Área Comum da Edificação', 'NT-01 7.7.3.6 e 7.8.1.5.1', 'cond', 'Vistoria só das áreas comuns quando o projeto não especifica áreas comuns e privativas.');
  // ARTs dos sistemas exigidos
  const arts = ARTMAP.map(([k, t, alw]) => { const x = med(k); return x && x.st !== 'no' ? (alw ? t : t) + (x.st !== 'ok' || alw ? ' (condicional)' : '') : null; }).filter(Boolean);
  if (arts.length && div !== 'F-7') add('ART/RRT dos sistemas: ' + arts.join(' · ') + ' · u) instalações elétricas de baixa tensão (condicional)', 'NT-01 7.7.3.8', arts.every(a => a.endsWith('(condicional)')) ? 'cond' : 'ok', 'Habite-se: de instalação/execução. Renovação: de inspeção/manutenção (máx. 3 anos – 7.7.3.8.7).');
  if (med('Extintores')) add('Nota fiscal de compra/recarga dos extintores (empresa credenciada)', 'NT-01 7.7.3.10', 'ok', 'Com a quantidade de extintores instalados.');
  return D;
}
// Sistemas específicos: fotovoltaico (NT-44/2025) e SAVE – recarga de veículos eletrificados (NT-45/2026)
function especiais(c, lin) {
  const L = []; const add = (sec, t, ref, st, mot, doc) => L.push({ sec, t, ref, st, mot, doc: !!doc });
  const brig = lin.find(x => x.st !== 'no-tab' && x.m.startsWith('Brigada'));
  const brigOk = brig && brig.st !== 'no';
  const hoje = new Date(), fimTrans = new Date('2026-11-15T00:00:00-03:00');
  if (c.fv) {
    const S = 'Sistema fotovoltaico (NT-44/2025)';
    const t1 = c.fvt1, t2 = c.fvt2, tipo = t1 || t2;
    const tel = c.fvTel, solo = c.fvSolo, carp = c.fvCarp, bat = c.fvBat;
    if (!tipo) add(S, 'Classificar o sistema: Tipo 1 (tensão acima de EBT com o sistema parado – string sem otimizador) ou Tipo 2 (micro-inversor ou string com otimizador)', 'NT-44 5.1', 'cond', 'Marque o tipo para listar as proteções elétricas exigidas.');
    add(S, 'ART/RRT das instalações fotovoltaicas', 'NT-44 6.4', 'ok', 'Apresentar na vistoria.', 1);
    add(S, 'Laudo técnico estrutural + ART/RRT (resistência da estrutura à carga dos painéis)', 'NT-44 6.4.1', tel || carp ? 'ok' : 'cond', tel || carp ? 'Painéis sobre telhado/cobertura ou exercendo função de cobertura (carport).' : 'Somente se os painéis estiverem em telhado/cobertura ou forem a própria cobertura.', 1);
    add(S, 'Placa de alerta (Figura A1 da NT-20) junto à placa M1: "ESTA EDIFICAÇÃO POSSUI INSTALADO SISTEMA FOTOVOLTAICO"', 'NT-44 5.6.2', 'ok', 'Além das sinalizações da NBR 16690.');
    add(S, 'Placa M5 (se houver) indicando a localização da chave de desligamento rápido / disjuntor de desligamento', 'NT-44 5.6.3', 'cond', 'Somente se a edificação possuir placa M5.');
    add(S, 'Eletrodutos/eletrocalhas aparentes com fiação em corrente contínua na cor laranja', 'NT-44 5.6.5', 'ok', '');
    add(S, 'Painéis e fiação fora de áreas úmidas (banheiros, vestiários e similares)', 'NT-44 5.4.3', 'ok', '');
    if (tel || !(solo || carp)) add(S, 'Painéis não instalados sobre telhado/cobertura combustível nem sobre locais com explosivos', 'NT-44 5.4.4 e 5.4.4.1', tel ? 'ok' : 'cond', 'Cobertura combustível: aceito tratamento retardante/intumescente com laudo do RT da aplicação + ART/RRT.');
    add(S, 'Inclinação mínima de 5% nas placas', 'NT-44 5.4.5', 'ok', '');
    // inversor string
    const str = t1 ? 'ok' : 'cond', strMot = t1 ? 'Sistema Tipo 1 (inversor string).' : 'Somente para inversor string (com ou sem otimizador); não se aplica a micro-inversores.';
    add(S, 'Inversor(es) string em sala técnica ventilada, de acesso restrito e sem carga de incêndio — ou, se acessível ao público, com grade de proteção rígida e incombustível', 'NT-44 5.4.1 e 5.4.1.1', str, strMot);
    add(S, 'Afastamentos do inversor string: 3 m de combustíveis/pontos de ignição, 3 m de fontes de água (torneiras, hidrantes) e 6 m de inflamáveis', 'NT-44 5.4.1.2', str, strMot);
    add(S, 'Inversor string fora de corredores e rotas de fuga', 'NT-44 5.4.2', str, strMot);
    add(S, 'Sinalização de alerta A5 e de solo E17 nos inversores string', 'NT-44 5.6.1; NT-20', str, strMot);
    add(S, 'Extintor PQS ABC (mín. 2-A:20-B:C) a no máximo 5 m dos inversores string' + (bat ? ' e das baterias' : ''), 'NT-44 5.5.1', t1 || bat ? 'ok' : 'cond', (t1 ? '' : bat ? 'Baterias presentes. ' : strMot + ' ') + 'Pode atender mais de um inversor/banco de baterias; nunca dentro da grade de proteção (5.5.1.2).');
    if (t1) {
      const trans = hoje < fimTrans ? 'Sistemas instalados antes de 14/11/2023: prazo até 14/11/2026 (ou troca dos inversores); até lá, placa "SISTEMA FOTOVOLTAICO DESPROVIDO DE DESLIGAMENTO..." nas entradas (6.6.1).' : 'Prazo de adaptação dos sistemas antigos (instalados antes de 14/11/2023) encerrado em 14/11/2026 — exigir integralmente (NT-44 6.6).';
      add(S, 'Tipo 1: proteção contra falha de arco (AFPE) e interruptor de falha de aterramento (GFCI)', 'NT-44 5.2.1', solo ? 'cond' : 'ok', (solo ? 'Painéis no solo: dispensa possível (ver item da fazenda solar). ' : '') + trans);
      add(S, 'Tipo 1: dispositivo de desligamento rápido (RSD) junto aos painéis, com chave em local de vigilância constante (ou a até 3 m do inversor), operável sem escada/ferramenta', 'NT-44 5.2.2', solo ? 'cond' : 'ok', 'Alternativa: otimizador que reduza a tensão a EBT, reclassificando para Tipo 2 (5.2.2.1).');
      add(S, 'Tipo 1: sinalização "CHAVE DE DESLIGAMENTO RÁPIDO DO SISTEMA FOTOVOLTAICO" (reflexiva, branca/fundo vermelho, letras ≥ 10 mm)', 'NT-44 5.2.2 IV', solo ? 'cond' : 'ok', '');
      if (solo) add(S, 'Tipo 1 no solo – dispensa de AFPE/GFCI/RSD somente se: lotes ≤ 2.500 m² separados por via de acesso (NT-06), inversores fora de edificação com permanência humana e placa "FAZENDA SOLAR DESPROVIDA DE DESLIGAMENTO. EM CASO DE INCÊNDIO, ISOLAR A ÁREA. NÃO REALIZAR O COMBATE DURANTE O DIA"', 'NT-44 5.2.3', 'cond', 'Placa reflexiva, letras brancas ≥ 2 cm sobre fundo vermelho.');
    }
    if (t2) {
      add(S, 'Tipo 2: disjuntor de desligamento do sistema', 'NT-44 Tabela 1', 'ok', 'Micro-inversores ou string com otimizadores.');
      add(S, 'Tipo 2: sinalização "DISJUNTOR DE DESLIGAMENTO DO SISTEMA FOTOVOLTAICO" (reflexiva, branca/fundo vermelho, letras ≥ 10 mm)', 'NT-44 5.6.4', 'ok', '');
    }
    if (solo) {
      add(S, 'Painéis no solo: cercamento (cerca/alambrado/muro) com altura ≥ 1,10 m e aceiros de 4 m nas divisas (se for o caso)', 'NT-44 5.4.6', 'ok', '');
      add(S, 'Painéis no solo: extintores dispensados na área dos painéis, mas exigidos nas demais instalações (sala de operação, transformadores, subestação, skids, comando)', 'NT-44 5.5.2; NT-21', 'ok', '');
    }
    if (carp) add(S, 'Carport/cobertura solar: extintores PQS ABC (mín. 2-A:20-B:C) com caminhamento máximo de 25 m', 'NT-44 5.5.3', 'ok', '');
    if (bat) add(S, 'Área de baterias com as medidas de segurança previstas para a edificação', 'NT-44 5.8.1', 'ok', 'A critério do RT, item 6.10.2 da NBR 13231.');
    add(S, brigOk ? 'Brigadistas devem conhecer a localização dos painéis, inversores, baterias e do desligamento' : 'Recomenda-se que a população fixa conheça a localização dos painéis, inversores, baterias e do desligamento', brigOk ? 'NT-44 5.3.1' : 'NT-44 5.3.2', brigOk ? 'ok' : 'rec', '');
  }
  if (c.pisc) {
    const S = 'Piscina (NT-16/2022)';
    const auto = /^A-[23]/.test(c.div) || (c.div === 'A-1' && c.a1 === 'cond') ? 'III' : /^B-/.test(c.div) ? 'II' : /^E-/.test(c.div) ? 'IV' : /^H-/.test(c.div) ? 'V' : 'I';
    const T = c.pTipo && c.pTipo !== 'auto' ? c.pTipo : auto;
    const NOMES = { I: 'uso público (clubes, parques aquáticos, centros comunitários)', II: 'hospedagem (hotéis, flats, pousadas)', III: 'residencial multifamiliar/coletiva (A-2/A-3)', IV: 'educacional/treinamento (academias, escolas, creches)', V: 'serviços de saúde (terapia, fisioterapia)' };
    add(S, `Classificação: piscina Tipo ${T} – ${NOMES[T]}`, 'NT-16 Tabela A-1', 'ok', (c.pTipo === 'auto' || !c.pTipo ? 'Tipo sugerido pela divisão; ajuste se necessário. ' : '') + 'Spas, ofurôs e banheiras de hidromassagem também são considerados piscina (nota genérica d).');
    add(S, 'Placas de advertência no acesso à piscina (NT-20): maior profundidade; "EM CASO DE EMERGÊNCIA LIGUE 193"; "CRIANÇAS DEVEM FAZER A UTILIZAÇÃO DE PISCINAS SOB A SUPERVISÃO DE ADULTOS"', 'NT-16 5.4 e Tabela A-2 (nota 8)', 'ok', (T === 'I' || T === 'II' ? 'Incluir também o horário de funcionamento (nota 6). ' : '') + (T === 'II' && c.pL50 ? 'Incluir a lotação da piscina: 1 pessoa a cada 1,9 m² de espelho d’água (nota 7).' : ''));
    add(S, 'Placa na recepção: "CRIANÇAS DEVEM FAZER A UTILIZAÇÃO DE PISCINAS SOB A SUPERVISÃO DE ADULTOS"', 'NT-16 5.4.1', 'ok', '');
    add(S, 'Proteção contra aspiração: dispositivo automático que interrompe a sucção quando obstruída + acionamento manual de fácil alcance (inclusive crianças e PCD), sinalizado com placa', 'NT-16 5.8.2 a 5.8.2.2.1 e Tabela A-2 (nota 9)', 'ok', 'Obrigatório inclusive para piscinas já construídas.');
    add(S, 'Admissão do sistema de filtragem protegida por grelha de segurança contra sucção', 'NT-16 5.8.4', 'ok', '');
    add(S, 'Ralos de fundo com grades/tampas de aberturas ≤ 10 mm, removíveis só com ferramenta e antivórtice; na parte mais funda, com sistema anti-aspiração de cabelos', 'NT-16 5.8.5 e 5.8.6', 'ok', '');
    add(S, 'Extintor na casa de bombas / sistema de filtragem', 'NT-16 5.8.1; NT-21', 'ok', '');
    add(S, 'Instalações elétricas da casa de bombas, iluminação da piscina e área circundante isoladas + ART', 'NT-16 5.7.1', 'ok', '', 1);
    const iso = T === 'IV' || T === 'V' ? (c.pRestr ? 'no' : 'ok') : 'rec';
    add(S, 'Isolamento da área circundante: guardas com altura ≥ 1,05 m, aberturas onde não passe esfera de 15 cm (balaústres ≤ 15 cm), sem saliências que enganchem, materiais não estilhaçáveis; acesso separado dos espectadores', 'NT-16 5.3.2 a 5.3.4 e Tabela A-2', iso, iso === 'rec' ? 'Recomendatório para os Tipos I, II e III (nota 1).' : iso === 'no' ? 'Dispensado: ambiente exclusivamente restrito com total controle de acesso (nota 2).' : 'Exigido para os Tipos IV e V, salvo ambiente exclusivamente restrito com controle de acesso (nota 2).');
    add(S, 'Portão de acesso à área circundante com travamento, largura ≥ 80 cm e abertura para o exterior', 'NT-16 5.3.3 e 5.3.3.1', iso === 'ok' ? 'ok' : 'cond', 'Onde houver isolamento.');
    if (T === 'IV') add(S, 'Piscinas de creches, escolas e berçários com acessos trancados fora do horário de uso', 'NT-16 5.3.5', 'cond', 'Somente creches, escolas, berçários e assemelhados.');
    add(S, 'Iluminação externa de toda a piscina para uso noturno', 'NT-16 5.3.6', c.pNoite ? 'ok' : 'cond', c.pNoite ? '' : 'Somente se a piscina funcionar à noite.');
    // guarda-vidas
    let gv = 'no', gvm = '';
    if (T === 'I') { gv = 'ok'; gvm = 'Sem guarda-vidas em serviço: restrição física de acesso + placa de interdição temporária com horário de funcionamento (nota 6).'; }
    else if (T === 'II') { if (c.pL50) { gv = 'cond'; gvm = 'Isento se a área de piscina tiver lotação < 50 pessoas E houver isolamento (5.3) ou ambiente exclusivamente restrito (nota 7).'; } else { gv = 'ok'; gvm = 'Sem guarda-vidas em serviço: restrição física + placa de interdição com horário (nota 6).'; } }
    else gvm = T === 'III' ? 'Não exigido; uso monitorado pelos responsáveis pela edificação (nota 5).' : T === 'IV' ? 'Não exigido: treinos com instrutor CREF; creches/escolas com responsável monitorando (6.5 c, d).' : 'Não exigido: uso monitorado pelo profissional responsável (6.5 e).';
    add(S, 'Guarda-vidas em serviço' + (c.pOnda ? ' (piscina de ondas: mínimo 2 exclusivos, um em cada lateral, com nadadeiras e rescue tube)' : ''), 'NT-16 6.1, 6.5 e Tabela A-2', c.pOnda && T !== 'III' ? 'ok' : gv, gvm);
    if (gv !== 'no' || c.pOnda) {
      const s2 = gv === 'cond' && !c.pOnda ? 'cond' : 'ok';
      add(S, 'Quantidade de guarda-vidas: percurso máximo de 100 m até a vítima, com reforço onde o campo visual estiver comprometido', 'NT-16 6.5 a, b', s2, '');
      add(S, 'Guarda-vidas com apito e máscara de RCP' + (c.pFundo ? '; piscina > 1,5 m de profundidade: nadadeira e rescue tube' : '') + '; uniforme com "GUARDA-VIDAS" nas costas (cores diferentes das do CBMGO); função exclusiva', 'NT-16 6.2 a 6.4', s2, '');
      add(S, 'Conjunto de primeiros socorros: cilindro de O₂ ≥ 1,5 m³, manômetro com válvula redutora, fluxômetro e máscara; luvas descartáveis; ressuscitador de silicone com reservatório', 'NT-16 6.6', s2, '');
      add(S, 'Certificado de formação dos guarda-vidas (empresa credenciada – validade 24 meses)', 'NT-16 7.4.4 d', s2, 'Exigido do responsável na inspeção.', 1);
    }
    if (c.pBrinq) {
      add(S, 'Laudo + ART/RRT dos brinquedos aquáticos (tobogãs, toboáguas, escorregadores)', 'NT-16 5.9.1', 'ok', 'Atestando funcionamento e condições estruturais.', 1);
      add(S, 'Acessos e áreas dos brinquedos aquáticos restritos e monitorados', 'NT-16 5.9.2', 'ok', '');
    }
    add(S, 'Recomendações: afastamento de 1,5 m das divisas; faixa pavimentada ≥ 1,20 m, antiderrapante e com caimento ≥ 2%; boia de salvamento; cor contrastante no ponto mais fundo; 2 drenos de fundo distantes ≥ 1,5 m', 'NT-16 5.2, 5.5.1, 5.6 e 5.8.3', 'rec', '');
  }
  if (c.save) {
    const S = 'SAVE – recarga de veículos eletrificados (NT-45/2026)';
    const ext = c.svExt, int = c.svInt, m12 = c.svM12, m3 = c.svM3, m4 = c.svM4, ant = c.svAnt;
    add(S, 'Laudo técnico das instalações de recarga + ART/RRT da última instalação (curva de carga, nº e identificação dos pontos, modo, correntes/tensões, proteções)', 'NT-45 5.2.1.9 e 6.5', 'ok', 'Apresentar na vistoria; documentação arquivada em ordem cronológica (5.2.1.10).', 1);
    add(S, 'Ponto de desligamento manual para cada estação de recarga, a até 5 m do equipamento', 'NT-45 5.2.1.2', 'ok', 'Altura entre 0,90 m e 1,35 m do piso (5.2.1.4).');
    add(S, 'Ponto de desligamento manual geral das estações do pavimento, a até 5 m de um acesso (entrada, entrada da garagem, escada) — replicado em cada nível com SAVE e no mesmo compartimento das vagas', 'NT-45 5.2.1.3 a 5.2.1.3.2', 'ok', 'Altura entre 0,90 m e 1,35 m do piso (5.2.1.4).');
    add(S, 'Sinalização dos desligamentos: "CHAVE DE DESLIGAMENTO DO SISTEMA DE CARREGAMENTO DE VEÍCULO ELETRIFICADO" (ou S.A.V.E.), fotoluminescente, letras ≥ 10 mm, base a 1,80 m do piso', 'NT-45 5.2.2', 'ok', '');
    add(S, 'Circuito exclusivo por estação com disjuntor e DR; quadro com disjuntores identificados e DPS; estação não ligada direto nos bornes do padrão de entrada', 'NT-45 5.2.1.5 a 5.2.1.7', 'ok', '');
    add(S, 'Proibido carregar veículos/micromobilidade em tomadas de uso geral, adaptadores ou extensões', 'NT-45 5.1.2', 'ok', '');
    add(S, 'Estações fora de corredores e rotas de fuga; com uma única saída de emergência, afastamento mínimo de 5 m dela (a partir da demarcação da vaga)', 'NT-45 5.2.3.4', 'ok', '');
    add(S, 'Modo 4: estações protegidas fisicamente (muretas, pilares ou similar) contra choque de veículos', 'NT-45 5.2.3.3', m4 ? 'ok' : 'cond', m4 ? '' : 'Somente se houver estação Modo 4 (corrente contínua).');
    if (ext || !int) add(S, 'Área externa, Modos 1 e 2: tomada identificada e diferenciada das demais + proteção contra intempéries', 'NT-45 5.3.2', ext && m12 ? 'ok' : 'cond', 'Somente para recarga Modo 1/2 em área externa.');
    if (int || !ext) {
      if (ant) {
        add(S, 'Área interna (projeto aprovado até 01/11/2025): admitido somente o Modo 3' + (m12 ? ' — Modo 1/2 NÃO admitido' : '') + (m4 ? ' — Modo 4 só com todas as exigências do item 5.4' : ''), 'NT-45 5.5.1 e 5.5.1.1', m12 || m4 ? 'ok' : (int ? 'ok' : 'cond'), int ? '' : 'Somente se houver recarga em área interna.');
        if (c.area > 1500 || c.alt > 12) {
          add(S, 'Substituição/atualização do projeto incluindo o ponto de desligamento geral do pavimento', 'NT-45 5.5.2, 6.2 e 6.3', int ? 'ok' : 'cond', 'Imediatamente com a instalação do desligamento geral do pavimento (área > 1.500 m² ou H > 12 m).');
          add(S, 'Detecção e alarme de incêndio + chuveiros automáticos na garagem (com as adaptações do 5.5.2.1)', 'NT-45 5.5.2 e 6.2', 'cond', 'Prazo para instalar: até 01/01/2032 (nota obrigatória no projeto – 6.3).');
        }
      } else {
        add(S, 'Área interna: admitidos somente os Modos 3 e 4' + (m12 ? ' — Modo 1/2 NÃO admitido em área interna' : ''), 'NT-45 5.4.1', int ? 'ok' : 'cond', int ? '' : 'Somente se houver recarga em área interna.');
        if (c.area > 1500 || c.alt > 12) add(S, 'Área > 1.500 m² ou H > 12 m com SAVE interno: detecção e alarme, chuveiros automáticos, exaustão mecânica de fumaça e segurança estrutural em toda a área interna (além do Anexo A)', 'NT-45 5.4.2', int ? 'ok' : 'cond', 'Não se aplica a projetos protocolados antes de 01/11/2025 (6.1).');
      }
    }
    if (['A-2', 'A-3'].includes(c.div)) add(S, 'Vedado carregar mobilidade/micromobilidade elétrica dentro das unidades habitacionais', 'NT-45 6.7', 'ok', 'Exceto se cumpridas as exigências dos itens 5.4 e 5.5.');
    add(S, 'Interligação da central de alarme com os desligamentos das estações nos pavimentos', 'NT-45 5.2.1.3.3', 'rec', '');
  }
  return L;
}
function viewExig() {
  bar('Exigências por edificação', true);
  const st = store.get('exig3', { div: 'C-1', a1: 'cond', area: '', alt: '', lot: '', pav: '', terrea: false, col: 0, glp: '?', piro: false });
  const DIVS = CAT.divisoes;
  setView(`<div class="form">
      <div><label for="fdiv">Divisão (Tabela 1 da NT-01)</label><select id="fdiv">${DIVS.map(x => `<option value="${x.cod}" ${x.cod === st.div ? 'selected' : ''}>${x.cod} — ${esc(x.nome)}</option>`).join('')}</select></div>
      <div id="fa1w" hidden><label for="fa1">Tipo de ocupação A-1</label><select id="fa1">
        <option value="uni" ${st.a1 === 'uni' ? 'selected' : ''}>Residência exclusivamente unifamiliar (casa isolada)</option>
        <option value="mista" ${st.a1 === 'mista' ? 'selected' : ''}>Residência unifamiliar no pav. superior de edificação mista (até 2 pav., acessos independentes)</option>
        <option value="cond" ${st.a1 === 'cond' ? 'selected' : ''}>Condomínio residencial unifamiliar / loteamento (áreas comuns)</option></select></div>
      <div class="row2"><div><label for="farea">Área total construída (m²)</label><input id="farea" type="number" inputmode="decimal" min="0" step="any" value="${esc(st.area)}" placeholder="ex.: 1200"></div>
      <div><label for="falt">Altura H (m)</label><input id="falt" type="number" inputmode="decimal" min="0" step="any" value="${esc(st.alt)}" placeholder="ex.: 14"></div></div>
      <div class="row2"><div><label for="flot">Lotação (pessoas)</label><input id="flot" type="number" inputmode="numeric" min="0" value="${esc(st.lot)}" placeholder="opcional"></div>
      <div><label for="fpav">Nº de pavimentos</label><input id="fpav" type="number" inputmode="numeric" min="1" value="${esc(st.pav)}" placeholder="opcional"></div></div>
      <label class="chk"><input id="fter" type="checkbox" ${st.terrea ? 'checked' : ''}>Edificação térrea (um pavimento)</label>
      <div><label for="fglp">Uso de GLP</label><select id="fglp">
        <option value="?" ${st.glp === '?' ? 'selected' : ''}>Não informado</option>
        <option value="nao" ${st.glp === 'nao' ? 'selected' : ''}>Não usa GLP (cozinha/equipamentos elétricos)</option>
        <option value="p13" ${st.glp === 'p13' ? 'selected' : ''}>Até 1 botijão P-13 (copa/cozinha/lanchonete)</option>
        <option value="mais" ${st.glp === 'mais' ? 'selected' : ''}>Mais de 1 P-13 ou P-20/P-45/P-190/granel</option></select></div>
      <div class="espbox"><div class="esph">Sistemas e riscos específicos</div>
      <label class="chk"><input id="fpiro" type="checkbox" ${st.piro ? 'checked' : ''}>Haverá espetáculo pirotécnico / fogos de artifício</label>
      <label class="chk"><input id="ffv" type="checkbox" ${st.fv ? 'checked' : ''}>Existe sistema fotovoltaico</label>
      <div class="sub" id="ffvw" hidden><label class="chk"><input id="ffvt1" type="checkbox" ${st.fvt1 ? 'checked' : ''}>Tipo 1 — inversor string sem otimizador</label><label class="chk"><input id="ffvt2" type="checkbox" ${st.fvt2 ? 'checked' : ''}>Tipo 2 — micro-inversor ou string com otimizador</label><div class="subh">Instalação</div><label class="chk"><input id="ffvtel" type="checkbox" ${st.fvTel ? 'checked' : ''}>Painéis em telhado/cobertura</label><label class="chk"><input id="ffvcarp" type="checkbox" ${st.fvCarp ? 'checked' : ''}>Painéis como cobertura (carport)</label><label class="chk"><input id="ffvsolo" type="checkbox" ${st.fvSolo ? 'checked' : ''}>Painéis no solo (usina/fazenda solar)</label><label class="chk"><input id="ffvbat" type="checkbox" ${st.fvBat ? 'checked' : ''}>Possui baterias</label></div>
      <label class="chk"><input id="fpisc" type="checkbox" ${st.pisc ? 'checked' : ''}>Existe piscina (inclui spa, ofurô, hidromassagem)</label>
      <div class="sub" id="fpiscw" hidden><div class="subh">Tipo de piscina (Tabela A-1)</div><select id="fptipo"><option value="auto">Automático pela divisão</option><option value="I">I – Uso público (clubes, parques aquáticos)</option><option value="II">II – Hospedagem (hotéis, flats, pousadas)</option><option value="III">III – Residencial multifamiliar/coletiva</option><option value="IV">IV – Academias, escolas, creches, treinamento</option><option value="V">V – Serviços de saúde (terapias)</option></select><label class="chk"><input id="fpnoite" type="checkbox" ${st.pNoite ? 'checked' : ''}>Funciona à noite</label><label class="chk"><input id="fpbrinq" type="checkbox" ${st.pBrinq ? 'checked' : ''}>Possui brinquedos aquáticos (tobogã, escorregador)</label><label class="chk"><input id="fponda" type="checkbox" ${st.pOnda ? 'checked' : ''}>Piscina de ondas</label><label class="chk"><input id="fpfundo" type="checkbox" ${st.pFundo ? 'checked' : ''}>Profundidade acima de 1,5 m</label><label class="chk"><input id="fprestr" type="checkbox" ${st.pRestr ? 'checked' : ''}>Ambiente exclusivamente restrito, com controle de acesso</label><label class="chk"><input id="fpl50" type="checkbox" ${st.pL50 ? 'checked' : ''}>Área de piscina com lotação inferior a 50 pessoas</label></div>
      <label class="chk"><input id="fsave" type="checkbox" ${st.save ? 'checked' : ''}>Existe SAVE (recarga de veículos elétricos)</label>
      <div class="sub" id="fsavew" hidden><div class="subh">Local das estações</div><label class="chk"><input id="fsvext" type="checkbox" ${st.svExt ? 'checked' : ''}>Área externa</label><label class="chk"><input id="fsvint" type="checkbox" ${st.svInt ? 'checked' : ''}>Área interna / garagem coberta</label><div class="subh">Modos de recarga</div><label class="chk"><input id="fsvm12" type="checkbox" ${st.svM12 ? 'checked' : ''}>Modo 1 ou 2 (tomada TUE)</label><label class="chk"><input id="fsvm3" type="checkbox" ${st.svM3 ? 'checked' : ''}>Modo 3 (wallbox CA)</label><label class="chk"><input id="fsvm4" type="checkbox" ${st.svM4 ? 'checked' : ''}>Modo 4 (carregador CC)</label><label class="chk"><input id="fsvant" type="checkbox" ${st.svAnt ? 'checked' : ''}>Projeto aprovado até 01/11/2025</label></div></div>
      <div id="fcolw" hidden><label for="fcol">Coluna da tabela</label><select id="fcol"></select></div>
      <button class="btn" id="fgo">Ver exigências</button>
    </div><div id="fres"></div>
    <div class="warn" style="margin-top:14px">Altura conforme Tabela 2 e notas genéricas da NT-01. Medidas pelas Tabelas 5 e 6 do Anexo A; documentos exigíveis na vistoria pelos itens 7.6, 7.7 e 7.10 da NT-01 (anexos de projeto/análise, como B, L e T, e formulários administrativos, como C, F, H e J, não entram), NT-17, NT-28 e NT-30. Itens que dependem de dados não informados aparecem como <b>condicionais</b>. Confira sempre as Tabelas 7 (subsolos) e 8 (riscos específicos).</div>`);
  const colsFor = div => { const r = tabelaDe(div); return r && r.b.cols.length !== 6 && r.b.cols.length > 1 ? r.b.cols : null; };
  const sync = () => { const d = $('#fdiv').value; const c = colsFor(d); $('#fcolw').hidden = !c; if (c) $('#fcol').innerHTML = c.map((x, i) => `<option value="${i}" ${i === +st.col ? 'selected' : ''}>${esc(x)}</option>`).join(''); $('#fa1w').hidden = d !== 'A-1'; }; const subs = () => { $('#ffvw').hidden = !$('#ffv').checked; $('#fsavew').hidden = !$('#fsave').checked; $('#fpiscw').hidden = !$('#fpisc').checked; }; $('#ffv').onchange = subs; $('#fsave').onchange = subs; $('#fpisc').onchange = subs; subs(); if (st.pTipo) $('#fptipo').value = st.pTipo;
  $('#fdiv').onchange = sync; sync();
  const box = (h, b) => `<div class="result"><div class="rh">${h}</div><div class="rb">${b}</div></div>`;
  const calc = () => {
    const div = $('#fdiv').value, area = parseFloat($('#farea').value), alt = parseFloat($('#falt').value), ter = $('#fter').checked;
    const lot = parseFloat($('#flot').value), pav = parseFloat($('#fpav').value), glp = $('#fglp').value, a1 = $('#fa1').value, piro = $('#fpiro').checked;
    const K = ['fv', 'fvt1', 'fvt2', 'fvTel', 'fvCarp', 'fvSolo', 'fvBat', 'save', 'svExt', 'svInt', 'svM12', 'svM3', 'svM4', 'svAnt', 'pisc', 'pNoite', 'pBrinq', 'pOnda', 'pFundo', 'pRestr', 'pL50'], IDS = ['ffv', 'ffvt1', 'ffvt2', 'ffvtel', 'ffvcarp', 'ffvsolo', 'ffvbat', 'fsave', 'fsvext', 'fsvint', 'fsvm12', 'fsvm3', 'fsvm4', 'fsvant', 'fpisc', 'fpnoite', 'fpbrinq', 'fponda', 'fpfundo', 'fprestr', 'fpl50'];
    const X = {}; K.forEach((k, i) => X[k] = $('#' + IDS[i]).checked); X.pTipo = $('#fptipo').value;
    const col = +($('#fcol').value || 0);
    store.set('exig3', { div, a1, area: $('#farea').value, alt: $('#falt').value, lot: $('#flot').value, pav: $('#fpav').value, terrea: ter, col, glp, piro, ...X });
    const info = DIVS.find(x => x.cod === div);
    if (div === 'A-1' && a1 !== 'cond') {
      $('#fres').innerHTML = box('A-1 · Dispensada', `<p><b>${a1 === 'uni' ? 'Residência exclusivamente unifamiliar' : 'Residência unifamiliar no pavimento superior de edificação mista, até 2 pavimentos e com acessos independentes'}</b> é dispensada das exigências de segurança contra incêndio e pânico — a NT-01 não se aplica (item 2.2${a1 === 'uni' ? ' a' : ' b'}). Não há medidas nem CERCON a exigir.</p>${a1 === 'mista' ? '<p class="mot">A parte não residencial da edificação deve ser classificada pela sua própria divisão.</p>' : ''}${$('#ffv').checked || $('#fsave').checked ? '<p class="mot">Sistema fotovoltaico (NT-44 2.2) e recarga de veículos (NT-45 2.2) são apenas <b>recomendatórios</b> em edificações exclusivamente unifamiliares.</p>' : ''}<p class="mot">Exigências para A-1 só se aplicam a condomínios residenciais unifamiliares e loteamentos, nas áreas e edificações de uso comum (nota 1 da Tabela 5; itens 7.2.2.1 e 8.1.2).</p><a class="btn alt" href="#/doc/NT-01-2026/${byPage('NT-01-2026', 2)}">Ver item 2.2 da NT-01</a>`); return; }
    if (EXIG.semtabela[div]) { $('#fres').innerHTML = box(`${div} · Atenção`, `<p>${esc(EXIG.semtabela[div])}</p>`); return; }
    const r6 = tabelaDe(div);
    const especial = /^[MN]-/.test(div);
    const fixedCols = r6 && r6.b.cols.length !== 6;
    if (isNaN(area) && !especial) { toast('Informe a área total'); return; }
    if (isNaN(alt) && !ter && !fixedCols) { toast('Informe a altura ou marque térrea'); return; }
    if (div === 'L-1' && !(ter && area <= 100)) { $('#fres').innerHTML = box('L-1 · Atenção', `<p>${esc(EXIG.t5.gen.b)}</p>`); return; }
    let tab, ci, cols, meds, notas, gen, why, pag;
    if (!especial && area <= 750 && (ter || alt <= 12)) {
      const t = EXIG.t5; ci = t.colunas.findIndex(c => c.includes(div));
      if (ci < 0) { toast('Divisão fora da Tabela 5'); return; }
      tab = 'Tabela 5'; cols = t.rotulos; meds = t.meds; notas = t.notas; gen = t.gen; pag = t.pag; why = 'Área ≤ 750 m² e altura ≤ 12 m';
    } else if (r6) {
      tab = 'Tabela ' + r6.t.id; cols = r6.b.cols; meds = r6.b.meds; notas = r6.t.notas; gen = r6.t.gen; pag = r6.t.pag;
      ci = fixedCols ? (cols.length === 1 ? 0 : col) : hIndex(alt, ter);
      why = especial ? 'Divisão com tabela própria' : 'Área > 750 m² ou altura > 12 m';
    } else { $('#fres').innerHTML = box('Atenção', 'Divisão sem tabela no Anexo A.'); return; }
    const ctx = { div, a1, area, alt, ter, lot, pav, glp, piro, ...X };
    const lin = meds.map(m => {
      const n = parseCel(m.v[ci]); if (!n) return { m: m.m, st: 'no-tab' };
      const ev = /^Central de g/.test(m.m) ? avaliaGLP(ctx) : avalia(n, notas, ctx);
      return { m: m.m, n, ...ev, v: m.v[ci] };
    });
    if (div === 'A-1') {
      for (const [m, ref] of [['Acesso de viatura (vias do condomínio/loteamento)', 'NT-06'], ['Hidrante urbano', 'NT-34']]) {
        const x = lin.find(y => y.m.startsWith(m.split(' (')[0]));
        if (x && x.st !== 'no-tab') { x.st = 'ok'; x.n = []; x.motivo = `Nota 1 da Tabela 5: condomínios e loteamentos devem possuir via de acesso para viaturas e hidrante urbano (${ref}).`; }
        else if (x) { Object.assign(x, { n: [], st: 'ok', motivo: `Nota 1 da Tabela 5 – condomínios e loteamentos (${ref}).` }); }
        else if (!x) lin.unshift({ m, n: [], st: 'ok', motivo: `Nota 1 da Tabela 5 – condomínios e loteamentos (${ref}).`, extra: ref });
      }
      lin.push({ m: 'Isolamento de risco entre as unidades', n: [], st: 'ok', motivo: 'Indicado no projeto e verificado no Habite-se (NT-01 8.1.2 e 7.2.2.2; NT-07).', extra: 'NT-07' });
    }
    const exig = lin.filter(x => x.st !== 'no-tab');
    const docs = docsDe(ctx, lin);
    const esp = especiais(ctx, lin);
    const ntOf = x => x.extra ? ({ 'NT-06': 'NT-06-2023', 'NT-34': 'NT-34-2022', 'NT-07': 'NT-07-2022' })[x.extra] : EXIG.meds_nt[x.m];
    const badge = s => ({ ok: '<span class="sb ok">EXIGIDO</span>', cond: '<span class="sb cond">CONDICIONAL</span>', rec: '<span class="sb rec">RECOMENDADO</span>', no: '<span class="sb no">NÃO SE APLICA</span>' }[s]);
    const usedNotes = [...new Set(exig.flatMap(x => x.n))].sort((a, b) => a - b);
    const sup = n => n && n.length ? `<sup>${n.join(',')}</sup>` : '';
    const tableHtml = `<div class="ntab-wrap"><table class="ntab"><thead><tr><th>Medidas de segurança</th>${cols.map((c, i) => `<th class="${i === ci ? 'cur' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${meds.map(m => `<tr><td>${esc(m.m)}</td>${m.v.map((v, i) => { const n = parseCel(v); return `<td class="${i === ci ? 'cur' : ''}">${n ? 'X' + sup(n) : (v ? '–' : '')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    const ord = a => a.slice().sort((x, y) => RANK[y.st] - RANK[x.st]);
    const item = x => { const nt = ntOf(x); return `<div class="mi ${x.st}"><div class="mtop"><b>${esc(x.m)}${sup(x.n)}</b>${badge(x.st)}</div>${x.motivo ? `<div class="mot">${esc(x.motivo)}</div>` : ''}${x.n && x.n.length && x.st !== 'no' && !/^Central de g/.test(x.m) ? x.n.map(n => `<div class="mot">Nota ${n}: ${esc(notas[n] || '')}</div>`).join('') : ''}${nt && S.docs[nt] ? `<a class="tbtn sm" href="#/doc/${nt}/0">${nt.replace(/-(\d{4}).*$/, '')} ›</a>` : ''}</div>`; };
    const docItem = d => `<div class="mi ${d.st} doc"><div class="mtop"><b>${esc(d.t)}</b>${badge(d.st)}</div><div class="mot">${esc(d.mot)}</div><div class="dref">${esc(d.ref)}</div></div>`;
    const nOk = exig.filter(x => x.st !== 'no').length;
    $('#fres').innerHTML = box(`${esc(tab)} · ${div}`, `
      <div class="kv"><span>Divisão</span><b>${div} · ${esc(div === 'A-1' ? 'Condomínio unifamiliar / loteamento (áreas comuns)' : info.nome)}</b></div>
      ${isNaN(area) ? '' : `<div class="kv"><span>Área${div === 'A-1' ? ' (comum)' : ''}</span><b>${area.toLocaleString('pt-BR')} m²</b></div>`}
      ${isNaN(lot) ? '' : `<div class="kv"><span>Lotação</span><b>${lot.toLocaleString('pt-BR')} pessoas</b></div>`}
      <div class="kv"><span>Coluna</span><b>${esc(cols[ci])}</b></div>
      <div class="kv"><span>Critério</span><b style="text-align:right">${esc(why)}</b></div>
      <div class="sec-title" style="margin:10px 0 4px">Medidas de segurança (${nOk})</div>
      <div class="mlist">${ord(exig).map(item).join('')}</div>
      <div class="sec-title" style="margin:14px 0 4px">Documentos para a vistoria (NT-01) (${docs.length})</div>
      <div class="mlist">${ord(docs).map(docItem).join('')}</div>
      ${esp.length ? [...new Set(esp.map(e => e.sec))].map(sec => `<div class="sec-title" style="margin:14px 0 4px">${esc(sec)}</div><div class="mlist">${ord(esp.filter(e => e.sec === sec)).map(docItem).join('')}</div>`).join('') : ''}
      <details class="nlist"><summary>Não exigidas nesta coluna (${lin.length - exig.length})</summary>${lin.filter(x => x.st === 'no-tab').map(x => `<div>${esc(x.m)}</div>`).join('')}</details>
      ${usedNotes.length ? `<details class="nlist"><summary>Notas específicas da tabela</summary>${usedNotes.map(n => `<div><b>${n}</b> – ${esc(notas[n] || '')}</div>`).join('')}</details>` : ''}
      <details class="nlist"><summary>Notas genéricas</summary>${Object.entries(gen || {}).map(([k, v]) => `<div><b>${k}</b> – ${esc(v)}</div>`).join('')}</details>
      <details class="nlist"><summary>Tabela completa (coluna destacada)</summary>${tableHtml}</details>
      <button class="btn" id="fcopy">Copiar medidas e documentos</button>
      <div class="row2"><a class="btn alt" href="${link('NT-01-2026-AnexoA', 'Tabela 7')}">Tabela 7 · Subsolos</a><a class="btn alt" href="${link('NT-01-2026-AnexoA', 'Tabela 8')}">Tabela 8 · Riscos</a></div>
      <a class="btn ghost" href="#/doc/NT-01-2026-AnexoA/${byPage('NT-01-2026-AnexoA', pag)}">Ver ${esc(tab)} na norma (p. ${pag})</a>`);
    const lbl = s => s === 'cond' ? ' (condicional)' : s === 'rec' ? ' (recomendatório)' : '';
    $('#fcopy').onclick = () => copyText(`Exigências – ${tab} (NT-01/2026 Anexo A) – ${div}${isNaN(area) ? '' : ' – ' + area.toLocaleString('pt-BR') + ' m²'} – ${cols[ci]}\n\nMEDIDAS DE SEGURANÇA:\n` + ord(exig).filter(x => x.st !== 'no').map(x => `- ${x.m}${lbl(x.st)}`).join('\n') + `\n\nDOCUMENTOS:\n` + ord(docs).filter(d => d.st !== 'no').map(d => `- ${d.t}${lbl(d.st)} [${d.ref}]`).join('\n') + [...new Set(esp.map(e => e.sec))].map(sec => `\n\n${sec.toUpperCase()}:\n` + ord(esp.filter(e => e.sec === sec)).map(d => `- ${d.t}${lbl(d.st)} [${d.ref}]`).join('\n')).join(''));
    $('#fres').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('#fgo').onclick = calc;
}

/* ---------- modelos de exigências (relatório) ---------- */
function ntDoc(n) { const d = CAT.docs.find(x => x.tipo === 'NT' && x.id.startsWith('NT-' + n + '-')); return d ? d.id : null; }
function allModelos() {
  const ed = store.get('modelos_ed', {}); const extra = store.get('modelos_novos', []);
  const base = MODELOS.modelos.map((m, i) => ({ ...m, key: 'b' + i, ...(ed['b' + i] || {}), editado: !!ed['b' + i] }));
  return base.concat(extra.map((m, i) => ({ ...m, key: 'n' + m.id, novo: true, nts: (m.texto.match(/\bNT\s*-?\s*(\d{1,2})\b/gi) || []).map(x => x.replace(/\D/g, '').padStart(2, '0')) })));
}
function copyText(t) {
  try { if (window.Android && window.Android.copy && window.Android.copy(t)) { toast('Copiado ✓ — cole no relatório'); return; } } catch (e) {}
  const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  if (!ok && navigator.clipboard) { navigator.clipboard.writeText(t).then(() => toast('Copiado ✓')).catch(() => toast('Não foi possível copiar')); return; }
  toast(ok ? 'Copiado ✓ — cole no relatório' : 'Não foi possível copiar');
}
function viewModelos(q) {
  $('#top').innerHTML = `<div class="hrow"><div class="htitle wrap">Check-list de exigências</div><button class="hbtn" id="madd" aria-label="Novo modelo">＋</button></div>
    <div class="hsub">Toque em <b>Copiar</b> e cole no relatório · marque vários para copiar juntos</div>
    <form class="searchbox" onsubmit="event.preventDefault();this.q.blur()"><svg><use href="#i-search"/></svg><input id="mq" name="q" type="search" value="${esc(q)}" placeholder="Filtrar exigências (ex.: piscina, ART, GLP)" autocomplete="off" spellcheck="false"><button type="button" class="clear" id="mclear">×</button></form>`;
  setView(`<div id="mres"></div><div id="selbar" class="selbar" hidden></div>`);
  const sel = new Set();
  const selbar = () => {
    const b = $('#selbar'); b.hidden = !sel.size;
    b.innerHTML = `<span>${sel.size} selecionada(s)</span><button id="sclear">Limpar</button><button id="scopy" class="go">Copiar todas</button>`;
    if (!sel.size) return;
    $('#sclear').onclick = () => { sel.clear(); render(); };
    $('#scopy').onclick = () => { const all = allModelos().filter(m => sel.has(m.key)); copyText(all.map(m => m.texto).join('\n\n')); };
  };
  const render = () => {
    const v = $('#mq').value; history.replaceState(null, '', '#/modelos/' + encodeURIComponent(v));
    const { groups } = parseQuery(v);
    let list = allModelos();
    if (groups.length) list = list.map(m => { const h = snorm(m.titulo + ' ' + m.texto), t = snorm(m.titulo); let sc = 0, ok = true; for (const g of groups) { const hit = g.some(a => h.includes(a)); if (!hit) ok = false; if (g.some(a => t.includes(a))) sc += 5; if (hit) sc += 1; } return ok ? [sc, m] : null; }).filter(Boolean).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    const ts = terms(v);
    $('#mres').innerHTML = list.length ? `<div class="meta" style="margin:0 2px 8px">${list.length} modelo(s)${groups.length ? '' : ' · fonte: ' + esc(MODELOS.titulo)}</div><div class="list">${list.map(m => `
      <div class="modelo${sel.has(m.key) ? ' sel' : ''}" data-k="${m.key}">
        <div class="mh"><label class="ck"><input type="checkbox" ${sel.has(m.key) ? 'checked' : ''} data-sel="${m.key}"><span></span></label><div class="mt">${hl(esc(m.titulo), ts)}${m.editado ? ' <small class="tag-ed">editado</small>' : ''}${m.novo ? ' <small class="tag-ed">meu</small>' : ''}</div></div>
        <div class="mx">${hl(esc(m.texto), ts)}</div>
        <div class="ma"><button class="btn sm" data-copy="${m.key}">Copiar</button><button class="tbtn" data-copyt="${m.key}">c/ título</button>${(m.nts || []).map(n => ntDoc(n) ? `<a class="tbtn" href="#/doc/${ntDoc(n)}/0">NT-${n}</a>` : '').join('')}<button class="tbtn" data-edit="${m.key}" aria-label="Editar">✎</button></div>
      </div>`).join('')}</div>` : `<div class="empty"><svg><use href="#i-clip"/></svg>Nenhum modelo encontrado.</div>`;
    const byKey = k => allModelos().find(m => m.key === k);
    document.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(byKey(b.dataset.copy).texto));
    document.querySelectorAll('[data-copyt]').forEach(b => b.onclick = () => { const m = byKey(b.dataset.copyt); copyText(m.titulo.toUpperCase() + '\n' + m.texto); });
    document.querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); c.closest('.modelo').classList.toggle('sel', c.checked); selbar(); });
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editModelo(byKey(b.dataset.edit), render));
    selbar();
  };
  let tm; $('#mq').oninput = () => { clearTimeout(tm); tm = setTimeout(render, 200); };
  $('#mclear').onclick = () => { $('#mq').value = ''; render(); };
  $('#madd').onclick = () => editModelo(null, render);
  render();
}
function editModelo(m, done) {
  const sh = $('#sheet');
  sh.innerHTML = `<div class="panel"><div class="grab"></div><h3>${m ? 'Editar modelo' : 'Novo modelo'}</h3>
    <div class="form" style="border:0;padding:0"><div><label for="et">Título</label><input id="et" value="${m ? esc(m.titulo) : ''}"></div>
    <div><label for="ex">Texto da exigência</label><textarea id="ex" rows="9">${m ? esc(m.texto) : ''}</textarea></div>
    <button class="btn" id="esave">Salvar</button>
    ${m && m.editado ? '<button class="btn ghost" id="ereset">Restaurar texto original</button>' : ''}
    ${m && m.novo ? '<button class="btn ghost" id="edel">Excluir modelo</button>' : ''}
    <button class="btn alt" id="ecancel">Cancelar</button></div></div>`;
  sh.hidden = false; sh.onclick = e => { if (e.target === sh) sh.hidden = true; };
  $('#ecancel').onclick = () => sh.hidden = true;
  $('#esave').onclick = () => {
    const t = $('#et').value.trim(), x = $('#ex').value.trim(); if (!t || !x) { toast('Preencha título e texto'); return; }
    if (!m) { const n = store.get('modelos_novos', []); n.unshift({ id: Date.now(), titulo: t, texto: x }); store.set('modelos_novos', n); }
    else if (m.novo) { store.set('modelos_novos', store.get('modelos_novos', []).map(y => 'n' + y.id === m.key ? { ...y, titulo: t, texto: x } : y)); }
    else { const ed = store.get('modelos_ed', {}); ed[m.key] = { titulo: t, texto: x }; store.set('modelos_ed', ed); }
    sh.hidden = true; toast('Modelo salvo'); done();
  };
  if ($('#ereset')) $('#ereset').onclick = () => { const ed = store.get('modelos_ed', {}); delete ed[m.key]; store.set('modelos_ed', ed); sh.hidden = true; toast('Original restaurado'); done(); };
  if ($('#edel')) $('#edel').onclick = () => { store.set('modelos_novos', store.get('modelos_novos', []).filter(y => 'n' + y.id !== m.key)); sh.hidden = true; toast('Modelo excluído'); done(); };
}

/* ---------- opções de ART's e Anexos para as notas ---------- */
const ARTOPTS = [
  ['Sistemas previstos na NT-01 (item 7.7.3.8.8)', [
    ['Sistema de hidrantes/mangotinhos', 'a'], ['Resfriamento de tanques, cilindros e esferas', 'b'], ['Sistema de espuma em tanques e bacias de contenção', 'c'],
    ['Sistema fixo de gases para combate a incêndio', 'd'], ['Iluminação de emergência (alimentada por grupo motogerador)', 'e'], ['Grupo motogerador (que alimenta sistema de combate)', 'f'],
    ['Pressurização da escada de segurança', 'g'], ['Elevador de emergência', 'h'], ['Revestimento dos elementos estruturais protegidos contra o fogo', 'i'],
    ['Central de GLP', 'j'], ['Instalações internas de GLP', 'k'], ['Chuveiros automáticos (sprinklers)', 'l'], ['Detecção de incêndio', 'm'], ['Controle de fumaça', 'n'],
    ['Controle de materiais de acabamento e revestimento (CMAR)', 'o'], ['Segurança estrutural – instalação/execução (Habite-se ou aumento de área)', 'p'],
    ['Segurança estrutural – inspeção/manutenção (renovação com revestimento contra fogo)', 'q'], ['Compartimentação vertical e/ou horizontal', 'r'], ['Alarme de incêndio', 's'],
    ['SPDA', 't'], ['Instalações elétricas de baixa tensão', 'u'], ['Controle de explosão de silos', 'v'], ['Caldeiras', 'w'],
    ['Estruturas e lonas de cobertura (NT-10) – lotação > 200 pessoas', 'x'], ['Arquibancadas e arenas desmontáveis', 'y'], ['Brinquedos de parques de diversões', 'z'],
    ['Palcos e palanques', 'aa'], ['Armações de circos', 'bb'], ['Instalações elétricas de montagens provisórias/temporárias', 'cc'],
    ['Ponto de carregamento de veículo eletrificado (SAVE)', 'dd'], ['Sistema fotovoltaico', 'ee']].map(([t, l]) => ['ART/RRT – ' + t, `NT-01 7.7.3.8.8 ${l}`])],
  ['Laudos técnicos (NT-01 item 7.7.3.9)', [
    ['Laudo + ART/RRT – Revestimento resistente ao fogo (TRRF – NT-08 / classe CMAR – NT-10)', 'NT-01 7.7.3.9 a; NT-08 5.20'],
    ['Laudo + ART/RRT – Instalação dos pontos de carregamento de veículos eletrificados', 'NT-01 7.7.3.9 b; NT-45 6.5'],
    ['Laudo + ART/RRT – Estrutura/telhado sob placas fotovoltaicas (tratamento incombustível ou reforço)', 'NT-01 7.7.3.9 c; NT-44 6.4.1'],
    ['ART/RRT – Estrutura atende à carga/incombustibilidade das placas fotovoltaicas', 'NT-01 7.7.3.9 c; NT-44 6.4.1'],
    ['Laudo + ART/RRT – Instalação do elevador de emergência', 'NT-01 7.7.3.9 d; NT-11 5.9.2.9'],
    ['Laudo + ART/RRT – Justificativa de impossibilidade técnica (Comissão Técnica/CTD)', 'NT-01 7.7.3.9 e']]],
  ['Exigidas em normas específicas', [
    ['ART/RRT – Instalações elétricas da casa de bombas, iluminação da piscina e área circundante', 'NT-16 5.7.1'],
    ['Laudo + ART/RRT – Brinquedos aquáticos (tobogãs, toboáguas, escorregadores)', 'NT-16 5.9.1'],
    ['Laudo + ART/RRT – Estabilidade estrutural (recinto esportivo/estádio)', 'NT-12 5.2.2'],
    ['ART/RRT – Estruturas provisórias, instalações elétricas e equipamentos de eventos em recintos esportivos', 'NT-12 5.14.10'],
    ['Laudo + ART/RRT – Teste de resistência das barreiras/guarda-corpos (recinto esportivo)', 'NT-12'],
    ['Laudo de teste do sistema de detecção + ART (pressurização de 2 estágios)', 'NT-13'],
    ['ART/RRT – Projeto do sistema fixo de gases', 'NT-26 5.8'],
    ['ART – Projeto de central de GLP em cobertura/laje', 'NT-28 5.3.19.1 e'],
    ['Laudo + ART – Testes de operação e descarga do sistema de espuma', 'NT-25 P1 5.6.9.2.1'],
    ['Laudo técnico anual + ART – Cobertura de sapé, piaçava e similares', 'NT-33'],
    ['Laudo técnico + ART – Subestação elétrica (a cada 2 anos)', 'NT-37 5.8'],
    ['Laudo de integridade da estrutura + ART/RRT (patologias – edificação existente)', 'NT-41 7.4'],
    ['Laudo – Dispensa de SPDA em área de comércio varejista de GLP', 'NT-40']]],
];
const ANXOPTS = [
  ['Anexos da NT-01', [
    ['PSCIP aprovado e Memorial Descritivo (Anexo B) impressos', 'NT-01 7.6.2.2'],
    ['Anexo E – Declaração de Área Comum da Edificação', 'NT-01 7.7.3.6'],
    ['Anexo M – Termo de Responsabilidade de Saídas de Emergência', 'NT-01 7.7.3.14'],
    ['Anexo N – Termo de Responsabilidade de Lotação Máxima', 'NT-01 7.7.3.13'],
    ['Anexo O – Comprovante de Contratação de Brigada Efetiva', 'NT-01 7.10.1.1'],
    ['Anexo P – Atestado de Brigada Eventual', 'NT-01 7.10.1 a'],
    ['Memorial de Cálculo de Brigada', 'NT-01 7.10.3 a'],
    ['Anexo Q – Declaração de Utilização de Brigadistas e Guarda-Vidas durante Eventos', 'NT-01 7.10.2'],
    ['Anexo S – Termo de Responsabilidade de Apresentação de Projeto Técnico', 'NT-01 7.7.3.12']]],
  ['Outros documentos', [
    ['Nota fiscal de compra/recarga dos extintores', 'NT-01 7.7.3.10'],
    ['Certificado de Credenciamento (CCR) da empresa de brigada', 'NT-01 7.10.1.1'],
    ['Certificados de formação/recapacitação dos brigadistas', 'NT-01 7.10.1.1; NT-17'],
    ['Certificado de formação dos guarda-vidas (validade 24 meses)', 'NT-16 7.4.4 d'],
    ['Registro do Técnico em Pirotecnia (Blaster)', 'NT-30 6.5.1.3'],
    ['Requerimento de espetáculo pirotécnico (Anexo A da NT-30)', 'NT-30 6.5.1.1'],
    ['Plano de Segurança de espetáculo pirotécnico (Anexo B da NT-30)', 'NT-30 6.5.1.6'],
    ['Contrato de queima de fogos com relação dos fogos', 'NT-30 6.5.1.4']]],
];
function optsBlock(k) {
  const G = k === 'art' ? ARTOPTS : ANXOPTS;
  const mode = k === 'art' ? `<div class="segm" data-seg="${k}"><span>Serviço:</span><button data-m="" class="on">Geral</button><button data-m="instalação/execução">Instalação</button><button data-m="inspeção/manutenção">Inspeção/manut.</button></div>` : '';
  return `<details class="opts"><summary>☑ Selecionar ${k === 'art' ? "ART's" : 'anexos'} da lista</summary>${mode}${G.map(([g, items]) => `<div class="og">${esc(g)}</div>${items.map(([t, ref]) => `<label class="oi"><input type="checkbox" data-opt="${k}" value="${esc(t)}"><span>${esc(t)}<small>${esc(ref)}</small></span></label>`).join('')}`).join('')}</details>`;
}
function wireOpts(k, grow, save) {
  const ta = $('#n_' + k); if (!ta) return;
  let modo = '';
  const lineOf = t => k === 'art' && modo ? t.replace(/^(Laudo \+ )?ART\/RRT/, (m, l) => (l || '') + `ART/RRT de ${modo}`) : t;
  const has = t => ta.value.split('\n').some(l => l.replace(/^- /, '').replace(/ de (instalação\/execução|inspeção\/manutenção)/, '') === t);
  const sync = () => document.querySelectorAll(`[data-opt="${k}"]`).forEach(c => c.checked = has(c.value));
  document.querySelectorAll(`[data-opt="${k}"]`).forEach(c => c.onchange = () => {
    let L = ta.value.split('\n').filter(l => l.trim());
    if (c.checked) L.push(lineOf(c.value)); else L = L.filter(l => l.replace(/^- /, '').replace(/ de (instalação\/execução|inspeção\/manutenção)/, '') !== c.value);
    ta.value = L.join('\n'); grow(ta); save();
  });
  const sg = document.querySelector(`[data-seg="${k}"]`);
  if (sg) sg.querySelectorAll('button').forEach(b => b.onclick = e => { e.preventDefault(); modo = b.dataset.m; sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  ta.addEventListener('input', sync); sync();
}
/* ---------- NOTAS (por vistoria, para copiar ao SIAPI) ---------- */
const NFIELDS = [
  ['protocolo', 'Protocolo da vistoria', 'input', 'ex.: 2026/0123456'],
  ['razao', 'Razão social/Nome fantasia', 'input', 'Empresa / estabelecimento'],
  ['proj', 'Número do Projeto', 'input', 'ex.: 123456/2026'],
  ['ext', 'Quantidade de extintores', 'input', 'ex.: 4 PQS 4kg ABC + 1 CO2 6kg'],
  ['art', "ART's", 'area', 'ART/RRT de instalações, SPDA, gás, brigada…'],
  ['anexos', 'Anexos', 'area', 'Documentos/fotos a anexar'],
  ['exig', 'Exigências in loco', 'area', 'Exigências constatadas na vistoria'],
  ['obs', 'Observações/Orientações gerais', 'area', 'Orientações ao responsável, observações'],
];
const notasGet = () => store.get('notas', []);
const notasSet = l => store.set('notas', l);
const fmtData = iso => { const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
function notaTexto(n) {
  return NFIELDS.filter(([k]) => (n.f[k] || '').trim()).map(([k, t, ty]) => ty === 'input' ? `${t.toUpperCase()}: ${n.f[k].trim()}` : `${t.toUpperCase()}:\n${n.f[k].trim()}`).join('\n\n');
}
function viewNotas() {
  bar('Notas de vistoria', false, `<button class="hbtn" id="nadd" aria-label="Nova nota">＋</button>`);
  const l = notasGet().sort((a, b) => b.atualizado.localeCompare(a.atualizado));
  setView(`<button class="btn big" id="nnew">＋ Nova nota de vistoria</button>
    <p class="meta" style="margin:10px 2px">Anote em campo, sem sinal. Depois copie cada campo (ou tudo) e cole no SIAPI. Fica salvo só neste aparelho.</p>
    ${l.length ? `<div class="list">${l.map(n => `<a class="item nota" href="#/nota/${n.id}"><div class="ref">${n.f.protocolo ? 'PROTOCOLO ' + esc(n.f.protocolo) : 'SEM PROTOCOLO'} · ${fmtData(n.atualizado)}</div><div class="tt">${esc((n.f.razao || n.f.exig || n.f.obs || 'Nota em branco').split('\n')[0].slice(0, 90))}</div><div class="sn">${NFIELDS.filter(([k]) => (n.f[k] || '').trim()).map(([, t]) => t).join(' · ') || '—'}</div></a>`).join('')}</div>`
      : `<div class="empty"><svg><use href="#i-note"/></svg>Nenhuma nota ainda.</div>`}`);
  const nova = () => { const n = { id: Date.now().toString(36), criado: new Date().toISOString(), atualizado: new Date().toISOString(), f: {} }; notasSet([n, ...notasGet()]); location.hash = '#/nota/' + n.id; };
  $('#nnew').onclick = nova; $('#nadd').onclick = nova;
}
function viewNota(id) {
  const all = notasGet(); const n = all.find(x => x.id === id);
  if (!n) { location.replace('#/notas'); return; }
  bar(n.f.protocolo ? 'Protocolo ' + n.f.protocolo : 'Nota de vistoria', true, `<button class="hbtn" id="ndel" aria-label="Excluir nota"><svg><use href="#i-trash"/></svg></button>`);
  setView(`<div class="meta" style="margin:0 2px 8px">Criada em ${fmtData(n.criado)} · salva automaticamente</div>
    <div class="nform">${NFIELDS.map(([k, t, ty, ph]) => `<div class="nf${k === 'protocolo' ? ' main' : ''}"><div class="nfh"><label for="n_${k}">${esc(t)}</label><button class="tbtn sm" data-cp="${k}">Copiar</button></div>
      ${ty === 'input' ? `<input id="n_${k}" data-k="${k}" value="${esc(n.f[k] || '')}" placeholder="${esc(ph)}" autocomplete="off">` : `<textarea id="n_${k}" data-k="${k}" rows="${k === 'exig' ? 6 : 3}" placeholder="${esc(ph)}">${esc(n.f[k] || '')}</textarea>`}
      ${k === 'exig' ? '<button class="tbtn sm" id="nmod" style="margin-top:6px">＋ Inserir do Check-list de exigências</button>' : ''}${k === 'art' || k === 'anexos' ? optsBlock(k) : ''}</div>`).join('')}</div>
    <div class="selbar" style="position:static;margin-top:14px"><span>Nota completa</span><button id="nshare">Compartilhar</button><button class="go" id="ncopy">Copiar tudo</button></div>`);
  const save = () => { const l = notasGet(); const x = l.find(y => y.id === id); if (!x) return; document.querySelectorAll('[data-k]').forEach(e => x.f[e.dataset.k] = e.value); x.atualizado = new Date().toISOString(); notasSet(l); const ht = document.querySelector('#top .htitle'); if (ht) ht.textContent = x.f.protocolo ? 'Protocolo ' + x.f.protocolo : 'Nota de vistoria'; return x; };
  const grow = e => { if (e.tagName === 'TEXTAREA') { e.style.height = 'auto'; e.style.height = Math.max(e.scrollHeight + 2, 70) + 'px'; } };
  let tm; document.querySelectorAll('[data-k]').forEach(e => { grow(e); e.oninput = () => { grow(e); clearTimeout(tm); tm = setTimeout(save, 300); }; e.onblur = save; });
  wireOpts('art', grow, save); wireOpts('anexos', grow, save);
  document.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { const v = $('#n_' + b.dataset.cp).value.trim(); v ? copyText(v) : toast('Campo vazio'); });
  $('#ncopy').onclick = () => { const x = save(); const t = notaTexto(x); t ? copyText(t) : toast('Nota vazia'); };
  $('#nshare').onclick = () => { const x = save(); const t = notaTexto(x); if (!t) return toast('Nota vazia'); if (navigator.share) navigator.share({ text: t }).catch(() => {}); else copyText(t); };
  $('#ndel').onclick = () => {
    const sh = $('#sheet'); sh.innerHTML = `<div class="panel"><div class="grab"></div><h3>Excluir esta nota?</h3><p class="meta">Esta ação não pode ser desfeita.</p><div class="row2"><button class="btn alt" id="dno">Cancelar</button><button class="btn" id="dyes">Excluir</button></div></div>`;
    sh.hidden = false; sh.onclick = e => { if (e.target === sh) sh.hidden = true; };
    $('#dno').onclick = () => sh.hidden = true;
    $('#dyes').onclick = () => { notasSet(notasGet().filter(x => x.id !== id)); sh.hidden = true; toast('Nota excluída'); location.replace('#/notas'); };
  };
  $('#nmod').onclick = () => {
    const sh = $('#sheet');
    sh.innerHTML = `<div class="panel"><div class="grab"></div><h3>Inserir exigência</h3><form class="searchbox" style="box-shadow:none;border:1.5px solid var(--line);margin:0 0 10px" onsubmit="event.preventDefault()"><svg><use href="#i-search"/></svg><input id="pq" type="search" placeholder="Filtrar (ex.: extintor, ART)" autocomplete="off"></form><div id="pl" class="list"></div></div>`;
    sh.hidden = false; sh.onclick = e => { if (e.target === sh) sh.hidden = true; };
    const draw = () => {
      const v = snorm($('#pq').value); const ms = allModelos().filter(m => !v || snorm(m.titulo + ' ' + m.texto).includes(v)).slice(0, 60);
      $('#pl').innerHTML = ms.map(m => `<button class="item" data-ins="${m.key}"><div class="tt">${esc(m.titulo)}</div><div class="sn">${esc(m.texto.slice(0, 140))}…</div></button>`).join('') || '<div class="empty">Nada encontrado.</div>';
      document.querySelectorAll('[data-ins]').forEach(b => b.onclick = () => { const m = allModelos().find(x => x.key === b.dataset.ins); const ta = $('#n_exig'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + m.texto; grow(ta); save(); sh.hidden = true; toast('Exigência inserida'); });
    };
    $('#pq').oninput = draw; draw();
  };
}

/* ---------- MAPA (Guia de ruas Goiânia / Aparecida) ---------- */
const mnorm = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const MABR = { st: 'setor', jd: 'jardim', vl: 'vila', res: 'residencial', pq: 'parque', conj: 'conjunto', cj: 'conjunto', cond: 'condominio', ch: 'chacaras', b: 'bairro', sta: 'santa', sto: 'santo' };
const MGEN = new Set(['setor', 'jardim', 'vila', 'residencial', 'parque', 'conjunto', 'condominio', 'chacaras', 'bairro', 'loteamento', 'recanto', 'de', 'do', 'da', 'dos', 'das']);
function bigr(s) { const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; }
function dice(a, b) { if (a === b) return 1; const A = bigr(a), B = bigr(b); if (!A.size || !B.size) return 0; let k = 0; A.forEach(x => { if (B.has(x)) k++; }); return 2 * k / (A.size + B.size); }
let MIDX = null;
function mapIdx() {
  if (MIDX) return MIDX;
  MAPA.byId = {}; MAPA.pages.forEach((p, i) => { MAPA.byId[p.id] = p; p.i = i; });
  MIDX = MAPA.idx.map(e => { const n = mnorm(e.n); return { ...e, nn: n, tk: n.split(' ').filter(t => t && !MGEN.has(t)), all: n.split(' ') }; });
  return MIDX;
}
function mapSearch(q) {
  const qs = mnorm(q).split(' ').filter(Boolean).map(t => MABR[t] || t);
  if (!qs.length) return [];
  const sig = qs.filter(t => !MGEN.has(t) && t.length >= 2); const qq = qs.join(' ');
  const out = [];
  for (const e of mapIdx()) {
    let sc = 0;
    if (e.nn === qq) sc = 3; else if (e.nn.includes(qq)) sc = 2.2;
    else {
      const use = sig.length ? sig : qs; let tot = 0;
      for (const t of use) { let b = 0; for (const w of e.all) { const d = w.startsWith(t) || (t.length >= 4 && w.includes(t)) ? 1 : dice(t, w); if (d > b) b = d; } tot += b; }
      const r = tot / use.length; if (r >= 0.72) sc = r * 1.6;
      if (sig.length && e.tk.length > sig.length + 1) sc *= 0.9;
    }
    if (sc) { if (e.t) sc += 0.6; out.push([sc, e]); }
  }
  out.sort((a, b) => b[0] - a[0]);
  const seen = new Set(), res = [];
  for (const [sc, e] of out) { const key = e.nn + '|' + e.m[0]; if (seen.has(key)) continue; seen.add(key); res.push(e); if (res.length >= 40) break; }
  return res;
}
function mapLabel(p) { return `${p.num} · ${p.titulo}`; }
function viewMapa(q) {
  mapIdx();
  $('#top').innerHTML = `<div class="hrow"><div class="htitle">Mapa · Guia de ruas</div></div>
    <form class="searchbox" onsubmit="event.preventDefault();this.q.blur()"><svg><use href="#i-search"/></svg><input id="mpq" name="q" type="search" value="${esc(q)}" placeholder="Buscar setor/bairro (ex.: Jardim Europa)" autocomplete="off" spellcheck="false"><button type="button" class="clear" id="mpclear">×</button></form>`;
  setView(`<div id="mpres"></div>`);
  const grid = (cid, nome) => `<div class="sec-title">${nome}</div><div class="mgrid">${MAPA.pages.filter(p => p.cidade === cid).map(p => `<a class="mcard" href="#/mapa/${p.id}"><span class="mn">${esc(p.num.replace('MAPA ', ''))}</span><b>${esc(p.titulo)}</b></a>`).join('')}</div>`;
  const draw = () => {
    const v = $('#mpq').value; history.replaceState(null, '', '#/mapa' + (v ? '/q/' + encodeURIComponent(v) : ''));
    if (!v.trim()) { $('#mpres').innerHTML = `<div class="warn">Digite o nome do setor/bairro (nomes em azul nos mapas). O resultado abre a página do mapa onde ele está. Toque num mapa para ampliar com pinça.</div>${grid('Goiânia', 'Goiânia · Mapas 01–73')}${grid('Aparecida de Goiânia', 'Aparecida de Goiânia')}`; return; }
    const r = mapSearch(v);
    $('#mpres').innerHTML = r.length ? `<div class="meta" style="margin:0 2px 8px">${r.length} resultado(s)</div><div class="list">${r.map(e => {
      const p = MAPA.byId[e.m[0]]; const oc = (e.o || []).find(o => o[0] === e.m[0]);
      const href = `#/mapa/${p.id}` + (oc ? `/${oc[1]}/${oc[2]}` : '');
      const outros = e.m.slice(1, 4).map(id => MAPA.byId[id]).filter(Boolean);
      return `<a class="item mres" href="${href}"><div class="ref">${esc(p.num)}${e.g && e.g[p.id] ? ' · quadrícula ' + esc(e.g[p.id]) : ''}${e.t ? ' · TÍTULO DO MAPA' : ''}</div><div class="tt">${esc(e.n)}</div><div class="sn">${esc(p.titulo)} — ${esc(p.cidade)}${outros.length ? ' · também: ' + outros.map(x => x.num.replace('MAPA ', 'M')).join(', ') : ''}</div></a>`;
    }).join('')}</div><p class="meta" style="margin-top:12px">Índice gerado por leitura automática (OCR) dos nomes em azul — pode haver pequenas grafias diferentes. Se não achar, tente parte do nome.</p>` : `<div class="empty"><svg><use href="#i-map"/></svg>Nenhum setor encontrado para “${esc(v)}”.<br>Tente só uma palavra do nome.</div>`;
  };
  let tm; $('#mpq').oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 180); };
  $('#mpclear').onclick = () => { $('#mpq').value = ''; draw(); $('#mpq').focus(); };
  draw();
}
function makePZ(box, inn, W, H) {
  let s = 1, x = 0, y = 0, base = 1;
  const apply = () => { inn.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
  const clamp = () => { const bw = box.clientWidth, bh = box.clientHeight, w = W * s, h = H * s; x = w <= bw ? (bw - w) / 2 : Math.min(0, Math.max(bw - w, x)); y = h <= bh ? (bh - h) / 2 : Math.min(0, Math.max(bh - h, y)); };
  const zoomAt = (ns, cx, cy) => { ns = Math.max(base, Math.min(base * 10, ns)); x = cx - (cx - x) * ns / s; y = cy - (cy - y) * ns / s; s = ns; clamp(); apply(); };
  const fit = () => { base = Math.min(box.clientWidth / W, box.clientHeight / H); s = Math.max(base, box.clientWidth / W); x = 0; y = 0; clamp(); apply(); };
  inn.style.width = W + 'px'; inn.style.height = H + 'px'; inn.style.transformOrigin = '0 0';
  fit();
  const pts = new Map(); let last = null, lastTap = 0;
  box.onpointerdown = e => { if (e.target.closest('button,a')) return; box.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = null;
    const now = Date.now(); if (pts.size === 1 && now - lastTap < 300) { const r = box.getBoundingClientRect(); zoomAt(s < base * 2.4 ? s * 2.5 : base, e.clientX - r.left, e.clientY - r.top); } lastTap = now; };
  box.onpointermove = e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    const r = box.getBoundingClientRect(); const a = [...pts.values()];
    if (a.length === 1) { const [px, py] = a[0]; if (last && last.n === 1) { x += px - last.x; y += py - last.y; clamp(); apply(); } last = { n: 1, x: px, y: py }; }
    else { const [p1, p2] = a; const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]), cx = (p1[0] + p2[0]) / 2 - r.left, cy = (p1[1] + p2[1]) / 2 - r.top;
      if (last && last.n === 2) { x += cx - last.cx; y += cy - last.cy; zoomAt(s * d / last.d, cx, cy); } last = { n: 2, d, cx, cy }; }
  };
  const up = e => { pts.delete(e.pointerId); last = null; };
  box.onpointerup = up; box.onpointercancel = up;
  box.onwheel = e => { e.preventDefault(); const r = box.getBoundingClientRect(); zoomAt(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top); };
  const c = () => [box.clientWidth / 2, box.clientHeight / 2];
  window.onresize = () => { const o = s / base; base = Math.min(box.clientWidth / W, box.clientHeight / H); zoomAt(base * o, ...c()); };
  return {
    fit, zoomIn: () => zoomAt(s * 1.6, ...c()), zoomOut: () => zoomAt(s / 1.6, ...c()),
    focus(fx, fy, k) { s = base * k; x = box.clientWidth / 2 - fx * W * s; y = box.clientHeight / 2 - fy * H * s; clamp(); apply(); },
  };
}
function viewMapaPg(id, mx, my) {
  mapIdx(); const p = MAPA.byId[id];
  if (!p) return viewMapa('');
  document.body.classList.add('mapmode');
  const prev = MAPA.pages[p.i - 1], next = MAPA.pages[p.i + 1];
  bar(mapLabel(p), true, `<a class="hbtn" href="#/mapa" aria-label="Buscar no mapa"><svg><use href="#i-search"/></svg></a>`);
  setView(`<div class="mapbox" id="mapbox"><div class="mapin" id="mapin"><img id="mapimg" src="mapa/${p.id}.webp" alt="${esc(mapLabel(p))}" draggable="false">${mx ? `<div class="mpin" style="left:${mx / 2480 * 100}%;top:${my / 3508 * 100}%"></div>` : ''}</div>
    <div class="mapctl"><button id="zin">＋</button><button id="zout">－</button><button id="zfit">⤢</button></div>
    <div class="mapnav">${prev ? `<a href="#/mapa/${prev.id}" onclick="location.replace(this.href);return false">◂ ${esc(prev.num.replace('MAPA ', ''))}</a>` : '<span></span>'}<span class="mcity">${esc(p.cidade)} · pág. ${p.pdf}</span>${next ? `<a href="#/mapa/${next.id}" onclick="location.replace(this.href);return false">${esc(next.num.replace('MAPA ', ''))} ▸</a>` : '<span></span>'}</div></div>`);
  const pz = makePZ($('#mapbox'), $('#mapin'), 2000, 2829);
  if (mx) pz.focus(mx / 2480, my / 3508, 3.2);
  $('#zin').onclick = pz.zoomIn; $('#zout').onclick = pz.zoomOut; $('#zfit').onclick = pz.fit;
}

/* ---------- salvos ---------- */
function viewSalvos() {
  bar('Trechos salvos', true);
  const s = store.get('salvos', []).filter(x => S.docs[x.doc] && (S.byDoc[x.doc] || S.docs[x.doc].tipo === 'REV'));
  setView(s.length ? `<div class="list">${s.map(x => { const c = (S.byDoc[x.doc] || [])[x.k]; return c ? itemChunk(c, null) : `<a class="item rev" href="#/doc/${x.doc}/${x.k}"><div class="ref">${esc(x.doc)}</div><div class="tt">Trecho ${x.k + 1}</div></a>`; }).join('')}</div>
      <p class="meta" style="text-align:center;margin-top:14px">Toque na ★ dentro de um trecho para salvar ou remover.</p>`
    : `<div class="empty"><svg><use href="#i-star"/></svg>Nenhum trecho salvo ainda.<br>Abra um trecho e toque na ★ para guardá-lo aqui.</div>`);
}

boot();
