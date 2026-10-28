/* Funciones compartidas por la página pública y la de administración. */
const $ = id => document.getElementById(id);
const E = Engine;
const sb = supabase.createClient(CONFIG.url, CONFIG.key);
const CURSO = { 3: 'Tercero', 4: 'Cuarto', 5: 'Quinto', 6: 'Sexto' };
const DEPTOS = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const soloDigitos = v => String(v || '').replace(/\D/g, '');
const MSG_CEL = ' (8 dígitos, empieza con 6 o 7)';
function celularOk(v) { let d = soloDigitos(v); if (d.length === 11 && d.startsWith('591')) d = d.slice(3); return /^[67]\d{7}$/.test(d); }
const fechaPasada = v => !!v && !isNaN(Date.parse(v)) && Date.parse(v) <= Date.now();
const archivoOk = f => !!f && (/^image\//.test(f.type) || f.type === 'application/pdf' || /\.(pdf|jpe?g|png|webp|heic)$/i.test(f.name));
function errsList(el, errs) { el.innerHTML = errs.length ? '<div class="alert crit"><b>Revisa estos datos:</b><ul style="margin:6px 0 0;padding-left:18px">' + errs.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : ''; }

/* ---------- fechas en español ---------- */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const p2 = n => String(n).padStart(2, '0');
/* Siempre en hora de Bolivia (UTC-4), sin importar la zona del teléfono. */
const bo = d => new Date(d.getTime() - 4 * 3600e3);
const fmtF = d => { const b = bo(d); return DIAS[b.getUTCDay()] + ' ' + b.getUTCDate() + ' de ' + MESES[b.getUTCMonth()] + ' de ' + b.getUTCFullYear() + ', ' + p2(b.getUTCHours()) + ':' + p2(b.getUTCMinutes()); };
const fmtC = d => { const b = bo(d); return b.getUTCDate() + '/' + p2(b.getUTCMonth() + 1) + '/' + b.getUTCFullYear() + ' ' + p2(b.getUTCHours()) + ':' + p2(b.getUTCMinutes()); };

/* ---------- aviso de conexión ---------- */
function avisoRed(msg) { const n = $('net'); if (!n) return; n.hidden = !msg; n.innerHTML = msg ? '<div class="alert crit"><b>' + esc(msg) + '</b></div>' : ''; }
const msgErr = e => (e && e.message ? e.message : 'Ocurrió un error. Intenta de nuevo.').replace(/^Error:\s*/, '');

/* ---------- editor de preferencias de carrera ---------- */
function prefsEditor(ol, ruleEl, getArea) {
  const ed = { prefs: [], area: '' };
  const locked = i => { const r = E.reglas(ed.area); return (i === 0 && r.primera) || (i === 5 && r.ultima); };
  function draw() {
    ol.innerHTML = '';
    if (ruleEl) ruleEl.firstChild.textContent = ed.area ? E.reglas(ed.area).texto : 'Elige primero tu área de competencia.';
    if (!ed.area) return;
    ed.prefs.forEach((id, i) => {
      const li = document.createElement('li');
      if (locked(i)) li.className = 'lock';
      li.innerHTML = '<span class="pos">' + (i + 1) + '</span><span class="nm">' + esc(E.nombreCarrera(id)) + (locked(i) ? ' <small>(fija)</small>' : '') + '</span>';
      [['▲', -1], ['▼', 1]].forEach(([t, d]) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        b.setAttribute('aria-label', (d < 0 ? 'Subir ' : 'Bajar ') + E.nombreCarrera(id));
        const j = i + d; b.disabled = locked(i) || j < 0 || j > 5 || locked(j);
        b.addEventListener('click', () => { [ed.prefs[i], ed.prefs[j]] = [ed.prefs[j], ed.prefs[i]]; draw(); });
        li.appendChild(b);
      });
      ol.appendChild(li);
    });
  }
  ed.sync = () => { const a = getArea(); if (a !== ed.area) { ed.area = a; ed.prefs = a ? E.prefsPorDefecto(a) : []; } draw(); };
  ed.sync();
  return ed;
}

/* ---------- subida de documentos (se comprimen las fotos) ---------- */
const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };
const extDe = f => (f.name.split('.').pop() || '').toLowerCase();
async function comprimir(file) {
  const t = file.type || MIME[extDe(file)] || '';
  if (t === 'application/pdf' || !/^image\/(jpeg|png|webp)$/.test(t)) return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
    return blob && blob.size < file.size ? new File([blob], 'doc.jpg', { type: 'image/jpeg' }) : file;
  } catch (e) { return file; }
}
async function subirDoc(file, carpeta, tipo) {
  const f = await comprimir(file);
  if (f.size > 5 * 1024 * 1024) throw new Error('"' + file.name + '" pesa más de 5 MB. Sube una foto más liviana o un PDF más pequeño.');
  const tipoMime = f.type || MIME[extDe(f)] || 'application/octet-stream';
  const ext = Object.keys(MIME).find(k => MIME[k] === tipoMime && k !== 'jpeg') || 'bin';
  const path = carpeta + '/' + tipo + '.' + ext;
  const { error } = await sb.storage.from('of-docs').upload(path, f, { contentType: tipoMime, upsert: false });
  if (error) throw new Error('No se pudo subir "' + file.name + '". Revisa tu conexión e intenta de nuevo.');
  return path;
}
const nuevaCarpeta = pre => pre + '/' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
