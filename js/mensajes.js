/* Pestaña "Mensajes": mensajes de WhatsApp listos para enviar a padres, profesores y estudiantes. */
const FIRMA = 'Ing. Rolando Santillan\nOlimpiadas FICAM 2026';
const LINK_FORM = '📄 Descargue el formulario aquí: https://drive.google.com/file/d/1W71iCQPR_MxkEKYxp5u-1Jdwk6H8DeKk/view?usp=drivesdk';
const DOCS_MSG = ['Fotocopia de la cédula de identidad', 'Recibo fiscalizado: original y fotocopia', 'Fotocopia de una boleta de calificaciones de esta gestión', 'Formulario de autorización y consentimiento, firmado (original)'];
const titulo = t => String(t || '').trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const celWa = v => { let d = soloDigitos(v); if (d.length === 11 && d.startsWith('591')) d = d.slice(3); return /^[67]\d{7}$/.test(d) ? '591' + d : ''; };
const lineaEst = e => '• ' + titulo(e.nombre) + ': ' + E.nombreArea(e.area) + ', ' + CURSO[e.curso] + ' de secundaria';
const bloqueExamen = () => '📅 *Mañana martes 17 de noviembre se realiza el examen.* El examen inicia a las *9:00 de la mañana* y termina a las *12:00 del mediodía*.\n📍 Facultad de Ingeniería y Ciencias Aplicadas Meca-Electrónicas (*FICAM*), ex-Refisur, Sucre.';
const bloqueDocs = () => 'Deben llevar *en físico*:\n' + DOCS_MSG.map(x => '• ' + x).join('\n') + '\n' + LINK_FORM;
const bloqueUtiles = ests => { const f = ests.filter(e => e.area === 'FISICA'), q = ests.filter(e => e.area === 'QUIMICA_APLICADA'), n = l => ests.length > 1 ? ' (' + l.map(e => titulo(e.nombre).split(' ')[0]).join(', ') + ')' : ''; return 'Útiles: lápiz, borrador, tajador y bolígrafo.' + (f.length ? '\n*Solo en Física:* calculadora científica sencilla' + n(f) + '.' : '') + (q.length ? '\n*Solo en Química:* pueden llevar calculadora, especialmente en cuarto, quinto y sexto' + n(q) + '.' : ''); };

function msgPadres(ests, tutorNombre) {
  const uno = ests.length === 1, e0 = ests[0];
  const par = [...new Set(ests.map(x => x.tutorParentesco))];
  const nom = titulo(tutorNombre), gt = ests[0].generoTutor, saludo = gt === 'F' ? 'Estimada señora ' + nom : gt === 'M' ? 'Estimado señor ' + nom : 'Estimado(a) señor(a) ' + nom;
  const ge = e0.generoEst, hijo = ge === 'F' ? 'hija' : ge === 'M' ? 'hijo' : 'hijo(a)', insc = ge === 'F' ? 'inscrita' : ge === 'M' ? 'inscrito' : 'inscrito(a)';
  const gs = ests.map(x => x.generoEst), todasF = gs.every(x => x === 'F'), hayNull = gs.some(x => !x), hijos = hayNull ? 'hijos(as)' : todasF ? 'hijas' : 'hijos', inscs = hayNull ? 'inscritos(as)' : todasF ? 'inscritas' : 'inscritos';
  const intro = uno ? '¡Felicitaciones! Su ' + hijo + ' *' + titulo(e0.nombre) + '* está ' + insc + ' en las *Olimpiadas FICAM 2026*, área de *' + E.nombreArea(e0.area) + '* (' + CURSO[e0.curso] + ' de secundaria). Es un logro que refleja su esfuerzo y el de su familia.'
    : '¡Felicitaciones! Sus ' + hijos + ' están ' + inscs + ' en las *Olimpiadas FICAM 2026*:\n' + ests.map(lineaEst).join('\n') + '\nEs un logro que refleja su esfuerzo y el de su familia.';
  return saludo + ':\n\n' + intro + '\n\n' + bloqueExamen() + '\n\n' + bloqueDocs().replace('Deben llevar', uno ? 'Debe llevar' : 'Cada estudiante debe llevar') + '\n\n' + bloqueUtiles(ests) + '\n\nGracias por su apoyo. Cualquier consulta, escríbame a este número.\n' + FIRMA;
}
function msgProfesor(ests, nombre) {
  const uno = ests.length === 1, multi = new Set(ests.map(e => e.colegio)).size > 1;
  return 'Estimado(a) profesor(a) ' + titulo(nombre) + ':\n\nLe saludo de la Facultad de Ingeniería y Ciencias Aplicadas Meca-Electrónicas (FICAM). Le informo sobre ' + (uno ? 'su estudiante inscrito(a)' : 'sus estudiantes inscritos') + ' en las *Olimpiadas FICAM 2026*:\n' + ests.map(e => lineaEst(e) + (multi ? ' (' + e.colegio + ')' : '')).join('\n') + '\n\n' + bloqueExamen() + '\n\n' + bloqueDocs().replace('Deben llevar', 'Deben llevar los estudiantes') + '\n\n' + bloqueUtiles(ests) + '\n\nLe agradecemos recordárselo a ' + (uno ? 'su estudiante' : 'sus estudiantes') + '. Gracias por su apoyo.\n' + FIRMA;
}
function msgEstudiante(e) {
  return '¡Hola, ' + (e.nombrePila || titulo(e.nombre).split(' ')[0]) + '! Estás ' + (e.generoEst === 'F' ? 'inscrita' : e.generoEst === 'M' ? 'inscrito' : 'inscrito(a)') + ' en las *Olimpiadas FICAM 2026*, área de *' + E.nombreArea(e.area) + '*. ¡Felicitaciones!\n\n' + bloqueExamen() + '\n\nDebes llevar *en físico*:\n' + DOCS_MSG.map(x => '• ' + x).join('\n') + '\n' + LINK_FORM.replace('Descargue','Descarga') + '\n\n' + bloqueUtiles([e]) + '\n\n¡Mucho éxito!\n' + FIRMA;
}

/* ---------- asignación de estudiantes a profesores: por colegio y área ---------- */
const AREA_MAT = m => { m = String(m || '').toLowerCase(); return /f[ií]sic/.test(m) ? 'FISICA' : /matem/.test(m) ? 'MATEMATICAS' : /qu[ií]m/.test(m) ? 'QUIMICA_APLICADA' : /biolog|bioing/.test(m) ? 'BIOINGENIERIA' : /rob[oó]t/.test(m) ? 'ROBOTICA' : null; };
const claveCol = c => String(c || '').replace(/\s*"[AB]"\s*$/, '').trim();
/* Colegios donde todos los estudiantes se agrupan con una sola profesora, que luego difunde el aviso. */
const OVERRIDE_PROF = { 'U.E. Nazareno': /mirna\s+fern[aá]ndez/i };
function asignarProfes() {
  const profs = new Map(), porCA = new Map(), res = new Map(), sin = [];
  state.est.forEach(e => { const w = celWa(e.profesorWa); if (w && !profs.has(w)) profs.set(w, { wa: w, nombre: e.profesorNombre, area: AREA_MAT(e.profesorMateria) }); });
  state.est.forEach(e => {
    const w = celWa(e.profesorWa), pa = w && profs.get(w).area; if (!w || !pa) return;
    const k = claveCol(e.colegio) + '|' + pa; if (!porCA.has(k)) porCA.set(k, new Map()); porCA.get(k).set(w, (porCA.get(k).get(w) || 0) + 1);
  });
  state.est.forEach(e => {
    const cc = claveCol(e.colegio); let w = '';
    const ov = OVERRIDE_PROF[cc]; if (ov) { const hit = [...profs.values()].find(p => ov.test(p.nombre || '')); if (hit) w = hit.wa; }
    if (!w) w = celWa(e.profesorWa);
    if (!w) { const m = porCA.get(cc + '|' + e.area); if (m) w = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]; }
    if (!w) { sin.push(e); return; }
    if (!res.has(w)) res.set(w, { wa: w, nombre: profs.get(w).nombre, ests: [] }); res.get(w).ests.push(e);
  });
  return { res, sin };
}

/* ---------- datos agrupados ---------- */
function gruposMsg() {
  const mapa = (arr, clave) => { const m = new Map(); arr.forEach(e => { const k = clave(e); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); }); return m; };
  const ord = a => a.sort((x, y) => x.nombre.localeCompare(y.nombre));
  const padres = [...mapa(state.est, e => celWa(e.tutorCelular)).entries()].map(([wa, ests]) => ({ id: 'p' + wa, wa, titulo: titulo(ests[0].tutorNombre), sub: 'Celular ' + wa.slice(3) + ' · ' + ests.map(e => titulo(e.nombre) + ' (' + E.nombreArea(e.area) + ')').join(', ') + (ests[0].generoTutor && ests.every(e => e.generoEst) ? '' : ' · ⚠ género sin confirmar: el saludo sale con (a)'), texto: msgPadres(ests, ests[0].tutorNombre), buscar: [ests[0].tutorNombre, ...ests.map(e => e.nombre), wa].join(' ') }));
  const { res: asig, sin } = asignarProfes();
  const prof = [...asig.values()].map(p => ({ id: 'f' + p.wa, wa: p.wa, titulo: titulo(p.nombre) || 'Profesor', sub: 'Celular ' + p.wa.slice(3) + ' · ' + [...new Set(p.ests.map(e => e.colegio))].join(', ') + ' · ' + p.ests.length + ' estudiante(s)', texto: msgProfesor(ord(p.ests.slice()), p.nombre), buscar: [p.nombre, ...p.ests.map(e => e.colegio + ' ' + e.nombre), p.wa].join(' ') }));
  const est = state.est.filter(e => celWa(e.wa)).map(e => ({ id: 'e' + e.id, wa: celWa(e.wa), titulo: titulo(e.nombre), sub: 'Celular ' + celWa(e.wa).slice(3) + ' · ' + E.nombreArea(e.area) + ' · ' + CURSO[e.curso], texto: msgEstudiante(e), buscar: [e.nombre, e.wa].join(' ') }));
  const idP = new Map(padres.map(p => [p.wa, p])), idF = new Map(prof.map(p => [p.wa, p]));
  padres.forEach(p => { if (idF.has(p.wa)) { p.cruce = idF.get(p.wa).id; p.cruceDe = 'profesor'; } });
  prof.forEach(p => { if (idP.has(p.wa)) { p.cruce = idP.get(p.wa).id; p.cruceDe = 'padre de familia'; } });
  const por = (a, b) => a.titulo.localeCompare(b.titulo);
  return { padres: padres.sort(por), profes: prof.sort(por), ests: est.sort(por), sinProf: sin };
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
  $('msg-res').innerHTML = '<div class="alert ' + (env === lista.length && lista.length ? 'ok' : 'warn') + '"><b>' + TITULOS_MSG[vistaMsg] + ': ' + env + ' enviados de ' + lista.length + '.</b>' + (vistaMsg === 'padres' ? ' Un mensaje por familia: si hay hermanos, el mensaje los nombra a todos.' : '') + '</div>' + (vistaMsg === 'profes' && g.sinProf.length ? '<div class="alert warn"><b>' + g.sinProf.length + ' estudiantes no tienen profesor asignado</b> (no hay profesor de su área en su colegio). Ellos reciben el aviso solo por sus padres: ' + Object.entries(g.sinProf.reduce((m, e) => { const c = claveCol(e.colegio); m[c] = (m[c] || 0) + 1; return m; }, {})).map(([c, n]) => esc(c) + ' (' + n + ')').join(', ') + '.</div>' : '');
  const vis = lista.filter(x => (!ocultarEnv || !enviadosMsg[x.id]) && (!q || x.buscar.toLowerCase().includes(q)));
  $('msg-lista').innerHTML = vis.length ? vis.map(x => '<div class="card" style="margin:8px 0;' + (enviadosMsg[x.id] ? 'opacity:.6' : '') + '"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>' + (enviadosMsg[x.id] ? '✔ ' : '') + esc(x.titulo) + '</b><br><small class="muted">' + esc(x.sub) + (x.cruce ? (enviadosMsg[x.cruce] ? ' <b style="color:#15803d">· ✔ Ya se le envió el mensaje como ' + x.cruceDe + '</b>' : ' <b style="color:#b45309">· ⚠ También está registrado como ' + x.cruceDe + ': con un solo mensaje basta</b>') : '') + '</small></div></div>' +
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
