/* Pestaña "Mensajes": mensajes de WhatsApp listos para enviar a padres, profesores y estudiantes. */
const FIRMA = 'Ing. Rolando Santillan\nOlimpiadas FICAM 2026';
const DOCS_MSG = ['Fotocopia de la cédula de identidad', 'Recibo fiscalizado: original y fotocopia', 'Fotocopia de una boleta de calificaciones de esta gestión', 'Formulario de autorización y consentimiento, firmado (original)'];
const titulo = t => String(t || '').trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const celWa = v => { let d = soloDigitos(v); if (d.length === 11 && d.startsWith('591')) d = d.slice(3); return /^[67]\d{7}$/.test(d) ? '591' + d : ''; };
const lineaEst = e => '• ' + titulo(e.nombre) + ': ' + E.nombreArea(e.area) + ', ' + CURSO[e.curso] + ' de secundaria';
const bloqueExamen = () => '📅 *Mañana martes 17 de noviembre se realiza el examen.* Los esperamos de *9:00 a 12:00* de la mañana.\n📍 Facultad de Ingeniería y Ciencias Aplicadas Meca-Electrónicas (*FICAM*), ex-Refisur, Sucre.';
const bloqueDocs = () => 'Deben llevar *en físico*:\n' + DOCS_MSG.map(x => '• ' + x).join('\n');
const bloqueUtiles = ests => 'Útiles: lápiz, borrador, tajador y bolígrafo.' + (ests.some(e => e.area === 'FISICA') ? '\n*Solo en Física:* calculadora científica sencilla.' : '');

function msgPadres(ests, tutorNombre) {
  const uno = ests.length === 1, e0 = ests[0];
  const par = [...new Set(ests.map(x => x.tutorParentesco))];
  const saludo = par.length === 1 && par[0] === 'Madre' ? 'Estimada madre de familia' : par.length === 1 && par[0] === 'Padre' ? 'Estimado padre de familia' : 'Estimado(a) padre, madre o tutor';
  const intro = uno ? '¡Felicitaciones! Su hijo(a) *' + titulo(e0.nombre) + '* está inscrito(a) en las *Olimpiadas FICAM 2026*, área de *' + E.nombreArea(e0.area) + '* (' + CURSO[e0.curso] + ' de secundaria). Es un logro que refleja su esfuerzo y el de su familia.'
    : '¡Felicitaciones! Sus hijos(as) están inscritos(as) en las *Olimpiadas FICAM 2026*:\n' + ests.map(lineaEst).join('\n') + '\nEs un logro que refleja su esfuerzo y el de su familia.';
  return saludo + ':\n\n' + intro + '\n\n' + bloqueExamen() + '\n\n' + bloqueDocs().replace('Deben llevar', uno ? 'Debe llevar' : 'Cada estudiante debe llevar') + '\n\n' + bloqueUtiles(ests).replace('Solo en Física', uno ? 'Solo en Física' : 'Solo en Física (' + ests.filter(e => e.area === 'FISICA').map(e => titulo(e.nombre).split(' ')[0]).join(', ') + ')') + '\n\nGracias por su apoyo. Cualquier consulta, escríbame a este número.\n' + FIRMA;
}
function msgProfesor(ests, nombre) {
  const uno = ests.length === 1;
  return 'Estimado(a) profesor(a) ' + titulo(nombre) + ':\n\nLe saludo de la Facultad de Ingeniería y Ciencias Aplicadas Meca-Electrónicas (FICAM). Le informo sobre ' + (uno ? 'su estudiante inscrito(a)' : 'sus estudiantes inscritos') + ' en las *Olimpiadas FICAM 2026*:\n' + ests.map(lineaEst).join('\n') + '\n\n' + bloqueExamen() + '\n\n' + bloqueDocs().replace('Deben llevar', 'Deben llevar los estudiantes') + '\n\n' + bloqueUtiles(ests) + '\n\nLe agradecemos recordárselo a ' + (uno ? 'su estudiante' : 'sus estudiantes') + '. Gracias por su apoyo.\n' + FIRMA;
}
function msgEstudiante(e) {
  return '¡Hola, ' + titulo(e.nombre).split(' ')[0] + '! Estás inscrito(a) en las *Olimpiadas FICAM 2026*, área de *' + E.nombreArea(e.area) + '*. ¡Felicitaciones!\n\n' + bloqueExamen().replace('Los esperamos', 'Te esperamos') + '\n\nDebes llevar *en físico*:\n' + DOCS_MSG.map(x => '• ' + x).join('\n') + '\n\n' + bloqueUtiles([e]) + '\n\n¡Mucho éxito!\n' + FIRMA;
}

/* ---------- datos agrupados ---------- */
function gruposMsg() {
  const mapa = (arr, clave) => { const m = new Map(); arr.forEach(e => { const k = clave(e); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); }); return m; };
  const ord = a => a.sort((x, y) => x.nombre.localeCompare(y.nombre));
  const padres = [...mapa(state.est, e => celWa(e.tutorCelular)).entries()].map(([wa, ests]) => ({ id: 'p' + wa, wa, titulo: titulo(ests[0].tutorNombre), sub: 'Celular ' + wa.slice(3) + ' · ' + ests.map(e => titulo(e.nombre) + ' (' + E.nombreArea(e.area) + ')').join(', '), texto: msgPadres(ests, ests[0].tutorNombre), buscar: [ests[0].tutorNombre, ...ests.map(e => e.nombre), wa].join(' ') }));
  const prof = [...mapa(state.est, e => celWa(e.profesorWa)).entries()].map(([wa, ests]) => ({ id: 'f' + wa, wa, titulo: titulo(ests[0].profesorNombre) || 'Profesor', sub: 'Celular ' + wa.slice(3) + ' · ' + [...new Set(ests.map(e => e.colegio))].join(', ') + ' · ' + ests.length + ' estudiante(s)', texto: msgProfesor(ord(ests.slice()), ests[0].profesorNombre), buscar: [ests[0].profesorNombre, ests[0].colegio, wa].join(' ') }));
  const est = state.est.filter(e => celWa(e.wa)).map(e => ({ id: 'e' + e.id, wa: celWa(e.wa), titulo: titulo(e.nombre), sub: 'Celular ' + celWa(e.wa).slice(3) + ' · ' + E.nombreArea(e.area) + ' · ' + CURSO[e.curso], texto: msgEstudiante(e), buscar: [e.nombre, e.wa].join(' ') }));
  const por = (a, b) => a.titulo.localeCompare(b.titulo);
  return { padres: padres.sort(por), profes: prof.sort(por), ests: est.sort(por) };
}

/* ---------- estado de enviados (solo en este dispositivo) ---------- */
const KEY_ENV = 'of_msg_enviados';
let enviadosMsg = {};
try { enviadosMsg = JSON.parse(localStorage.getItem(KEY_ENV) || '{}') || {}; } catch (e) { enviadosMsg = {}; }
const guardarEnv = () => { try { localStorage.setItem(KEY_ENV, JSON.stringify(enviadosMsg)); } catch (e) { /* sin almacenamiento: el ✔ solo dura mientras la página esté abierta */ } };
let vistaMsg = 'padres', filtroMsg = '', ocultarEnv = false;
const TITULOS_MSG = { padres: 'Padres de familia', profes: 'Profesores', ests: 'Estudiantes' };

function renderMsg() {
  const g = gruposMsg(), lista = g[vistaMsg], q = filtroMsg.trim().toLowerCase();
  document.querySelectorAll('#msg-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === vistaMsg));
  Object.keys(TITULOS_MSG).forEach(k => { const n = g[k].length, e = g[k].filter(x => enviadosMsg[x.id]).length; $('msg-n-' + k).textContent = e + '/' + n; });
  const env = lista.filter(x => enviadosMsg[x.id]).length;
  $('msg-res').innerHTML = '<div class="alert ' + (env === lista.length && lista.length ? 'ok' : 'warn') + '"><b>' + TITULOS_MSG[vistaMsg] + ': ' + env + ' enviados de ' + lista.length + '.</b>' + (vistaMsg === 'padres' ? ' Un mensaje por familia: si hay hermanos, el mensaje los nombra a todos.' : '') + '</div>';
  const vis = lista.filter(x => (!ocultarEnv || !enviadosMsg[x.id]) && (!q || x.buscar.toLowerCase().includes(q)));
  $('msg-lista').innerHTML = vis.length ? vis.map(x => '<div class="card" style="margin:8px 0;' + (enviadosMsg[x.id] ? 'opacity:.6' : '') + '"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>' + (enviadosMsg[x.id] ? '✔ ' : '') + esc(x.titulo) + '</b><br><small class="muted">' + esc(x.sub) + '</small></div></div>' +
    '<details style="margin-top:6px"><summary class="muted"><small>Ver mensaje</small></summary><pre style="white-space:pre-wrap;font:inherit;margin:6px 0 0">' + esc(x.texto) + '</pre></details>' +
    '<p style="margin:10px 0 0"><a class="btn red sm" style="display:inline-block;text-decoration:none" data-id="' + esc(x.id) + '" data-w="1" target="_blank" rel="noopener" href="https://wa.me/' + x.wa + '?text=' + encodeURIComponent(x.texto) + '">Enviar por WhatsApp</a> <button class="btn ghost sm" data-id="' + esc(x.id) + '" data-c="1" type="button">Copiar mensaje</button> <button class="btn ghost sm" data-id="' + esc(x.id) + '" data-m="1" type="button">' + (enviadosMsg[x.id] ? 'Desmarcar' : 'Marcar enviado') + '</button></p></div>').join('') : '<p class="muted">No hay nada que mostrar con ese filtro.</p>';
  $('msg-lista').querySelectorAll('[data-w]').forEach(a => a.addEventListener('click', () => { enviadosMsg[a.dataset.id] = Date.now(); guardarEnv(); setTimeout(renderMsg, 400); }));
  $('msg-lista').querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { if (enviadosMsg[b.dataset.id]) delete enviadosMsg[b.dataset.id]; else enviadosMsg[b.dataset.id] = Date.now(); guardarEnv(); renderMsg(); }));
  $('msg-lista').querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', async () => {
    const x = lista.find(y => y.id === b.dataset.id); if (!x) return;
    try { await navigator.clipboard.writeText(x.texto); b.textContent = '¡Copiado!'; } catch (e) { b.textContent = 'No se pudo copiar'; }
    setTimeout(() => (b.textContent = 'Copiar mensaje'), 1500);
  }));
}
document.querySelectorAll('#msg-seg button').forEach(b => b.addEventListener('click', () => { vistaMsg = b.dataset.k; renderMsg(); }));
$('msg-q').addEventListener('input', () => { filtroMsg = $('msg-q').value; renderMsg(); });
$('msg-oc').addEventListener('change', () => { ocultarEnv = $('msg-oc').checked; renderMsg(); });
