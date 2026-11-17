/* Camada PWA (iPhone): offline via service worker + NBR cifrada */
(function () {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let IMGS = null; const urls = {};
  async function deriva(senha) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(NBRMETA.salt), iterations: NBRMETA.iter, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function abre(key, arq) {
    const buf = new Uint8Array(await (await fetch('data/' + arq)).arrayBuffer());
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function desbloqueia(key) {
    window.__PK(await abre(key, 'nbr_txt.bin'));
    abre(key, 'nbr_img.bin').then(o => { IMGS = o; }).catch(() => {});
    window.nbrLocked = false;
  }
  window.nbrImg = p => {
    const f = 'p-' + p + '.png';
    if (urls[f]) return urls[f];
    if (!IMGS || !IMGS[f]) return '';
    return (urls[f] = URL.createObjectURL(new Blob([b64(IMGS[f])], { type: 'image/png' })));
  };
  window.PWA_BOOT = async () => {
    window.nbrLocked = true;
    try {
      const raw = localStorage.getItem('nbr_k');
      if (raw) { const key = await crypto.subtle.importKey('raw', b64(raw), 'AES-GCM', true, ['decrypt']); await desbloqueia(key); }
    } catch (e) { localStorage.removeItem('nbr_k'); }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  };
  window.nbrUnlock = async senha => {
    const key = await deriva(senha);
    await desbloqueia(key);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    localStorage.setItem('nbr_k', btoa(String.fromCharCode(...raw)));
  };
  // leitor: NBR bloqueada → pede a senha
  const vd = window.viewDoc;
  window.viewDoc = function (id, k, q) {
    if (id === 'NBR-10897-2007' && window.nbrLocked) {
      bar('NBR 10897');
      setView(`<div class="form"><div><label for="nbs">Senha da NBR 10897</label><input id="nbs" type="password" autocomplete="off" placeholder="senha recebida"></div><button class="btn" id="nbgo">Desbloquear</button><p class="meta">A NBR é de uso pessoal (licença ABNT) e fica cifrada nesta versão. A senha é pedida só uma vez neste aparelho.</p></div>`);
      $('#nbgo').onclick = async () => { try { await window.nbrUnlock($('#nbs').value.trim()); toast('NBR liberada ✓'); vd(id, k, q); } catch (e) { toast('Senha incorreta'); } };
      return;
    }
    return vd(id, k, q);
  };
  // início: status offline + instrução de instalação
  const vh = window.viewHome;
  window.viewHome = function () {
    vh();
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    const box = document.createElement('div');
    box.innerHTML = `<div class="offbox"><div><b id="offt">Uso offline</b><span id="offs">Verificando…</span><div class="bar2"><span id="offb"></span></div></div><button class="btn sm" id="offgo">Baixar tudo</button></div>
      ${standalone ? '' : '<div class="warn">No iPhone: toque em <b>Compartilhar ⬆</b> no Safari e depois em <b>Adicionar à Tela de Início</b>. Abra pelo ícone criado.</div>'}`;
    $('#view').prepend(box);
    status();
    $('#offgo').onclick = baixar;
  };
  async function lista() { return (await fetch('files.json', { cache: 'no-store' }).catch(() => null))?.json?.() || JSON.parse(localStorage.getItem('files_json') || 'null'); }
  async function status() {
    try {
      const fj = await lista(); if (!fj) { $('#offs').textContent = 'Sem conexão para verificar.'; return; }
      localStorage.setItem('files_json', JSON.stringify(fj));
      const c = await caches.open('vgo-' + fj.v); let n = 0;
      for (const f of fj.extra) if (await c.match(f)) n++;
      const p = Math.round(n / fj.extra.length * 100);
      $('#offb').style.width = p + '%';
      $('#offs').textContent = p >= 100 ? 'Tudo salvo no aparelho — funciona sem sinal ✓' : `Mapas e páginas originais: ${p}% salvos (${Math.round(fj.extraBytes / 1e6)} MB no total). Use Wi-Fi.`;
      $('#offgo').hidden = p >= 100;
    } catch (e) { const s = $('#offs'); if (s) s.textContent = 'Instale pela Tela de Início para uso offline.'; }
  }
  async function baixar() {
    const fj = await lista(); const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!fj || !reg || !reg.active) { toast('Abra com internet e tente de novo'); return; }
    const ch = new MessageChannel(); $('#offgo').disabled = true;
    ch.port1.onmessage = e => { const { done, total, fim } = e.data; const p = Math.round(done / total * 100); const b = $('#offb'); if (b) { b.style.width = p + '%'; $('#offs').textContent = `Baixando… ${p}%`; } if (fim) { toast('Pronto: tudo disponível offline ✓'); status(); } };
    reg.active.postMessage({ t: 'baixar', files: fj.extra }, [ch.port2]);
  }
})();
