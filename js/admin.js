/* Administración: inicio de sesión, datos reales, revisión de pagos, plazo, resultados e informes. */
const state = { est: [], min: 51, plazo: { cierre: '', gracia: 12, ampliado: false, nuevo: '' }, resultadosPub: false, consultas: [], enc: {} };
const ahora = () => new Date();
const aDate = s => new Date(s + ':00-04:00');
const aLocal = ts => bo(new Date(ts)).toISOString().slice(0, 16);
const cierreOficial = () => aDate(state.plazo.ampliado && state.plazo.nuevo ? state.plazo.nuevo : state.plazo.cierre);
const inscAbierta = () => ahora().getTime() <= cierreOficial().getTime() + (+state.plazo.gracia || 0) * 60000;
E.AREAS.forEach(a => $('x-fa').add(new Option(a.nombre, a.id)));

function mapRow(r) {
  return { id: r.id, codigo: r.codigo, nombre: r.nombre, ci: r.ci, area: r.area, curso: r.curso, colegio: r.colegio, municipio: r.municipio, departamento: r.departamento, tipoColegio: r.tipo_colegio,
    nota: r.nota == null ? null : +r.nota, registro: Date.parse(r.creado), prefs: r.prefs, comision: r.comision, tutorNombre: r.tutor_nombre, tutorParentesco: r.tutor_parentesco, tutorCelular: r.tutor_celular,
    via: r.via, profesorCi: r.profesor_ci, profesorNombre: r.profesor_nombre, profesorWa: r.profesor_wa, profesorMateria: r.profesor_materia, wa: r.wa,
    pago: r.pago, motivo: r.motivo, tx: r.tx, reenvios: r.reenvios, docs: r.docs || {}, resultado: r.resultado };
}
async function cargarInscritos() {
  let all = [], from = 0;
  for (;;) {
    const { data, error } = await sb.from('of_inscritos').select('*').order('creado').range(from, from + 999);
    if (error) throw error; all = all.concat(data); if (data.length < 1000) break; from += 1000;
  }
  state.est = all.map(mapRow);
}
async function cargarConsultas() {
  const { data, error } = await sb.from('of_consultas').select('*').order('creado', { ascending: false });
  if (error) throw error;
  state.consultas = data.map(c => ({ id: c.id, cod: c.cod, nombre: c.nombre, wa: c.wa, msg: c.msg, fecha: new Date(c.creado), resp: c.resp || '' }));
}
async function cargarConfig() {
  const { data, error } = await sb.from('of_config').select('*').eq('id', 1).single();
  if (error) throw error;
  state.plazo = { cierre: aLocal(data.cierre), gracia: data.gracia_min, ampliado: data.ampliado, nuevo: data.nuevo_cierre ? aLocal(data.nuevo_cierre) : '' };
  state.resultadosPub = data.resultados_pub; state.min = data.min_nota; state.enc = data.encargados || {};
  $('x-min').value = state.min;
}
async function guardar(s, campos) {
  const { error } = await sb.from('of_inscritos').update(campos).eq('id', s.id);
  if (error) { avisoRed('No se pudo guardar el cambio de ' + s.nombre + ': ' + error.message); return false; }
  avisoRed(''); return true;
}
let tenc; function guardarEnc() { clearTimeout(tenc); tenc = setTimeout(async () => { const { error } = await sb.from('of_config').update({ encargados: state.enc }).eq('id', 1); if (error) avisoRed('No se pudieron guardar los nombres de los encargados.'); }, 700); }

/* ---------- acceso ---------- */
let entrado = false;
function verLogin(msg) { $('v-login').hidden = false; $('a-tabs').hidden = true; ['v-panel', 'v-sim'].forEach(i => ($(i).hidden = true)); if (msg) $('l-msg').innerHTML = msg; }
async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { verLogin(); return; }
  const { data: ok, error } = await sb.rpc('of_is_admin');
  if (error || !ok) { verLogin('<div class="alert crit"><b>Este correo (' + esc(session.user.email) + ') no tiene acceso.</b> <button class="btn ghost sm" id="l-out" type="button">Salir</button></div>'); $('l-out').addEventListener('click', salir); return; }
  if (entrado) return; entrado = true;
  try { await cargarConfig(); await Promise.all([cargarInscritos(), cargarConsultas()]); }
  catch (e) { entrado = false; verLogin('<div class="alert crit">No se pudieron cargar los datos: ' + esc(e.message) + '</div>'); return; }
  $('v-login').hidden = true; $('a-tabs').hidden = false; irTab('panel');
}
async function salir() { await sb.auth.signOut(); entrado = false; state.est = []; location.reload(); }
$('a-salir').addEventListener('click', salir);
$('l-send').addEventListener('click', async () => {
  const m = $('l-mail').value.trim();
  if (!/^\S+@\S+\.\S+$/.test(m)) { $('l-msg').innerHTML = '<div class="alert warn">Escribe un correo válido.</div>'; return; }
  $('l-send').disabled = true;
  const { error } = await sb.auth.signInWithOtp({ email: m, options: { emailRedirectTo: location.origin + location.pathname } });
  $('l-send').disabled = false;
  $('l-msg').innerHTML = error ? '<div class="alert crit">No se pudo enviar el enlace: ' + esc(error.message) + '</div>' : '<div class="alert ok"><b>Te enviamos un enlace a ' + esc(m) + '.</b> Ábrelo en este mismo dispositivo para entrar.</div>';
});
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN' && !entrado) iniciar(); });

/* ---------- pestañas ---------- */
function irTab(v) {
  document.querySelectorAll('nav.tabs button[data-v]').forEach(x => x.setAttribute('aria-selected', x.dataset.v === v));
  ['panel', 'sim'].forEach(k => ($('v-' + k).hidden = k !== v));
  if (v === 'panel') renderPanel();
  if (v === 'sim') { renderSim(); renderEnc(); }
}
document.querySelectorAll('nav.tabs button[data-v]').forEach(b => b.addEventListener('click', () => irTab(b.dataset.v)));

/* ---------- panel ---------- */
function barras(el, items, total) {
  el.innerHTML = items.map(([n, v]) => '<div class="row"><span>' + esc(n) + '</span><div class="bar"><i style="width:' + (total ? Math.round(v / total * 100) : 0) + '%"></i></div><span class="v">' + v + '</span></div>').join('');
}
function renderPanel() {
  const L = state.est, N = L.length;
  const comp = L.filter(s => s.pago === 'verificado').length;
  const pend = L.filter(s => s.pago === 'pendiente').length;
  const profs = profesores();
  $('p-kpis').innerHTML = [[N, 'inscritos'], [L.filter(s => s.curso === 6).length, 'de sexto'], [comp, 'pagos verificados'], [pend, 'pagos por verificar'], [profs.length, 'profesores'], [L.filter(s => s.departamento === 'Potosí').length, 'de Potosí']].map(([v, t]) => '<div class="kpi"><b>' + v + '</b><span>' + t + '</span></div>').join('');
  const max = Math.max(1, ...E.AREAS.map(a => L.filter(s => s.area === a.id).length));
  barras($('p-areas'), E.AREAS.map(a => [a.nombre, L.filter(s => s.area === a.id).length]), max);
  const mc = Math.max(1, ...[3, 4, 5, 6].map(c => L.filter(s => s.curso === c).length));
  barras($('p-cursos'), [3, 4, 5, 6].map(c => [CURSO[c], L.filter(s => s.curso === c).length]), mc);
  const deps = {}; L.forEach(s => (deps[s.departamento] = (deps[s.departamento] || 0) + 1));
  barras($('p-dep'), Object.entries(deps).sort((a, b) => b[1] - a[1]), N);
  renderProfes(profs);
  const rech = L.filter(s => s.pago === 'rechazado').length;
  $('p-pagos').innerHTML = '<p><span class="pill ok">' + comp + ' verificados</span> <span class="pill warn">' + pend + ' por verificar</span> <span class="pill crit">' + rech + ' por corregir</span></p><p class="muted"><small><b>Por verificar:</b> falta que la organización revise el pago y los documentos. <b>Por corregir:</b> se rechazó con un motivo y el estudiante debe volver a subir el documento. <b>Verificado:</b> ya fue aprobado. Se revisan en la vista Gestión.</small></p>';
  if (!$('s-n').dataset.set) { $('s-n').value = Math.round(N / 10) * 10; $('s-n').dataset.set = 1; }
  renderStorage();
  if (!$('pv-dep').hidden) renderDeptos();
  if (!$('pv-ges').hidden) renderGestion();
}
function profesores() {
  const m = new Map();
  state.est.forEach(s => {
    const wa = soloDigitos(s.profesorWa); if (!wa) return;
    const o = m.get(wa) || { nombre: s.profesorNombre, wa: s.profesorWa, materia: s.profesorMateria, propio: false, n: 0 };
    o.n++; if (s.via === 'tutor') o.propio = true; m.set(wa, o);
  });
  return [...m.values()].sort((a, b) => b.n - a.n);
}
function renderProfes(P) {
  $('p-prof').innerHTML = P.length ? '<p class="muted"><b>' + P.length + '</b> profesores. Unos se registraron ellos mismos y otros fueron indicados por un estudiante.</p><div class="tw" style="max-height:340px;overflow-y:auto"><table><tr><th>N.º</th><th>Profesor</th><th>WhatsApp</th><th>Materia</th><th>Estudiantes</th><th>Origen</th></tr>' +
    P.map((o, i) => '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(o.nombre) + '</td><td class="mono">' + esc(o.wa) + '</td><td>' + esc(o.materia) + '</td><td class="n">' + o.n + '</td><td>' + (o.propio ? 'Se registró él mismo' : 'Lo indicó un estudiante') + '</td></tr>').join('') + '</table></div>'
    : '<p class="muted">Todavía no hay profesores registrados.</p>';
}
function setPanel(v) {
  ['gen', 'dep', 'ges'].forEach(k => { $('pm-' + k).setAttribute('aria-pressed', k === v); $('pv-' + k).hidden = k !== v; });
  if (v === 'dep') renderDeptos();
  if (v === 'ges') renderGestion();
}
$('pm-gen').addEventListener('click', () => setPanel('gen'));
$('pm-dep').addEventListener('click', () => setPanel('dep'));
$('pm-ges').addEventListener('click', () => setPanel('ges'));
function renderDeptos() {
  const L = state.est;
  const rows = DEPTOS.map(d => {
    const s = L.filter(x => x.departamento === d);
    return { d, n: s.length, areas: E.AREAS.map(a => s.filter(x => x.area === a.id).length), sex: s.filter(x => x.curso === 6).length,
      comp: s.filter(x => x.pago === 'verificado').length, pend: s.filter(x => x.pago === 'pendiente').length };
  }).sort((a, b) => b.n - a.n);
  $('d-tab').innerHTML = '<table><tr><th>Departamento</th><th>Inscritos</th>' + E.AREAS.map(a => '<th>' + a.nombre + '</th>').join('') + '<th>De sexto</th><th>Pagos verificados</th><th>Por verificar</th></tr>' +
    rows.map(r => '<tr' + (r.n ? '' : ' style="color:var(--muted)"') + '><td><b>' + r.d + '</b></td><td class="n"><b>' + r.n + '</b></td>' + r.areas.map(v => '<td class="n">' + v + '</td>').join('') + '<td class="n">' + r.sex + '</td><td class="n">' + r.comp + '</td><td class="n">' + r.pend + '</td></tr>').join('') +
    '<tr><td><b>Total</b></td><td class="n"><b>' + L.length + '</b></td>' + E.AREAS.map(a => '<td class="n">' + L.filter(x => x.area === a.id).length + '</td>').join('') + '<td class="n">' + L.filter(x => x.curso === 6).length + '</td><td class="n">' + L.filter(x => x.pago === 'verificado').length + '</td><td class="n">' + L.filter(x => x.pago === 'pendiente').length + '</td></tr></table>';
  const sel = $('d-sel');
  if (!sel.options.length) { DEPTOS.forEach(d => sel.add(new Option(d, d))); sel.value = rows[0].d; }
  renderDeptDetalle();
}
function renderDeptDetalle() {
  const d = $('d-sel').value, s = state.est.filter(x => x.departamento === d);
  if (!s.length) { $('d-det').innerHTML = '<p class="muted">Todavía no hay inscritos de ' + esc(d) + '.</p>'; return; }
  const cnt = (arr, f) => { const m = {}; arr.forEach(x => (m[f(x)] = (m[f(x)] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const comp = s.filter(x => x.pago === 'verificado').length, pend = s.filter(x => x.pago === 'pendiente').length;
  const kp = [[s.length, 'inscritos'], [s.filter(x => x.curso === 6).length, 'de sexto'], [comp, 'pagos verificados'], [pend, 'por verificar']].map(([v, t]) => '<div class="kpi"><b>' + v + '</b><span>' + t + '</span></div>').join('');
  const colegios = cnt(s, x => x.colegio + '||' + x.municipio + '||' + x.tipoColegio);
  $('d-det').innerHTML = '<div class="kpis">' + kp + '</div><h3 class="ah">Por área</h3><div id="d-a"></div><h3 class="ah">Por municipio</h3><div id="d-m"></div><h3 class="ah">Unidades educativas</h3><div class="tw"><table><tr><th>Unidad educativa</th><th>Municipio</th><th>Tipo</th><th>Inscritos</th></tr>' +
    colegios.slice(0, 15).map(([k, v]) => { const p = k.split('||'); return '<tr><td>' + esc(p[0]) + '</td><td>' + esc(p[1]) + '</td><td>' + esc(p[2]) + '</td><td class="n">' + v + '</td></tr>'; }).join('') + '</table></div>';
  barras($('d-a'), E.AREAS.map(a => [a.nombre, s.filter(x => x.area === a.id).length]), s.length);
  barras($('d-m'), cnt(s, x => x.municipio), s.length);
}
$('d-sel').addEventListener('change', renderDeptDetalle);
function renderStorage() {
  const n = +$('s-n').value, mb = +$('s-mb').value || 1, q = +$('s-q').value || 1, b = +$('s-b').value || 0;
  $('s-nv').textContent = n + ' inscritos';
  const usado = b + n * mb / 1024, pct = Math.min(100, usado / q * 100), libre = Math.max(0, q - usado);
  const quedan = Math.max(0, Math.floor(libre * 1024 / mb));
  const col = pct >= 95 ? 'var(--crit)' : pct >= 85 ? 'var(--accent)' : pct >= 70 ? 'var(--warn)' : 'var(--ok)';
  $('s-bar').style.width = pct + '%'; $('s-bar').style.background = col;
  $('s-txt').innerHTML = '<b class="mono">' + usado.toFixed(2) + ' GB</b> de ' + q + ' GB (' + pct.toFixed(0) + ' %). Caben unas <b class="mono">' + quedan + '</b> inscripciones más.';
  const [cl, msg] = pct >= 95 ? ['crit', 'Riesgo alto. Pasa al plan Pro ahora para no perder subidas de documentos.'] : pct >= 85 ? ['warn', 'Se recomienda comprar el plan Pro hoy. Queda poco margen para el cierre.'] : pct >= 70 ? ['warn', 'Vas por encima del 70 %. Revisa el ritmo de inscripciones.'] : ['ok', 'Espacio suficiente por ahora.'];
  $('s-alert').innerHTML = '<div class="alert ' + cl + '">' + msg + '</div>';
}
['s-n', 's-mb', 's-q', 's-b'].forEach(id => $(id).addEventListener('input', renderStorage));
$('p-csv').addEventListener('click', () => {
  const cab = ['nombre', 'ci', 'curso', 'area', 'colegio', 'departamento', 'pago', 'padre_o_madre', 'celular', 'profesor', 'whatsapp_profesor'];
  const csv = [cab.join(',')].concat(state.est.map(s => [s.nombre, s.ci, s.curso, s.area, s.colegio, s.departamento, s.pago, s.tutorNombre || '', s.tutorCelular, s.profesorNombre || '', s.profesorWa || ''].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(','))).join('\n');
  const ok = () => ($('p-csvm').textContent = 'Copiado (' + state.est.length + ' filas).');
  const fb = () => ($('p-csvm').textContent = 'No se pudo copiar desde aquí.');
  (navigator.clipboard ? navigator.clipboard.writeText(csv).then(ok, fb) : fb());
});

/* ---------- asignación ---------- */
const MOT = { NO_SEXTO: 'No es de sexto', SIN_NOTA: 'Sin nota', BAJO_MINIMO: 'Bajo el mínimo', PREFS_INVALIDAS: 'Orden de carreras inválido', AREA_LLENA: 'Su área ya tiene 12', SIN_CUPO: 'Sin cupo en sus carreras' };
function renderSim() {
  const r = E.asignar(state.est, { minNota: state.min });
  const por = Object.fromEntries(state.est.map(s => [s.id, s]));
  const sextos = state.est.filter(s => s.curso === 6);
  $('x-kpis').innerHTML = [[r.admitidos + '/60', 'plazas ocupadas'], [r.plazasLibres, 'plazas sin ocupar'], [Object.values(r.elegibles).reduce((a, b) => a + b, 0), 'sextos habilitados'], [r.empates.filter(e => !e.resuelto).length, 'empates por resolver']].map(([v, t]) => '<div class="kpi"><b>' + v + '</b><span>' + t + '</span></div>').join('');
  barras2($('x-car'), E.CARRERAS.map(c => [c.nombre, r.carreras[c.id]]), 10);
  barras2($('x-are'), E.AREAS.map(a => [a.nombre + ' (' + r.elegibles[a.id] + ' habilitados)', r.areas[a.id]]), 12);
  /* empates */
  const pend = r.empates.filter(e => !e.resuelto);
  $('x-emp').innerHTML = pend.length ? '<div class="card"><h3>Empates que decide la comisión</h3>' + pend.map((e, k) => '<div class="alert warn" style="margin:0 0 8px"><b>' + (e.tipo === 'PODIO' ? 'Empate por el podio de ' + E.nombreArea(e.area) : 'Empate en el ranking mezclado') + ' (nota ' + e.nota + ')</b><div class="grid" style="margin-top:8px">' + e.ids.map(id => '<div><label>' + esc(por[id].nombre) + '</label><select data-id="' + id + '" data-g="' + k + '"><option value="">Orden…</option>' + e.ids.map((_, i) => '<option value="' + (i + 1) + '"' + (por[id].comision == i + 1 ? ' selected' : '') + '>' + (i + 1) + '.º</option>').join('') + '</select></div>').join('') + '</div></div>').join('') + '<p class="muted"><small>Elige el orden que fija la comisión. Cuando todos tengan un número distinto, el empate queda resuelto y se recalculan las plazas.</small></p></div>' : '<div class="alert ok" style="margin-bottom:14px">No hay empates por resolver.</div>';
  $('x-emp').querySelectorAll('select').forEach(sel => sel.addEventListener('change', async () => { const s = por[sel.dataset.id]; s.comision = sel.value ? +sel.value : null; renderSim(); await guardar(s, { comision: s.comision }); }));
  /* tabla */
  const fa = $('x-fa').value, fe = $('x-fe').value;
  let rows = sextos.filter(s => (!fa || s.area === fa)).map(s => ({ s, x: r.res[s.id] }));
  if (fe === 'adm') rows = rows.filter(o => o.x.carrera); if (fe === 'no') rows = rows.filter(o => !o.x.carrera);
  rows.sort((a, b) => (b.s.nota == null ? -1 : b.s.nota) - (a.s.nota == null ? -1 : a.s.nota));
  $('x-tab-n').innerHTML = '<b>' + rows.length + '</b> estudiantes de sexto en esta lista.';
  $('x-tab').innerHTML = '<tr><th>N.º</th><th>Estudiante</th><th>Área</th><th>Nota</th><th>Puesto</th><th>Resultado</th></tr>' + rows.map(({ s, x }, i) => '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(s.nombre) + '</td><td>' + E.nombreArea(s.area) + '</td><td class="n">' + (s.nota == null ? '—' : s.nota) + '</td><td class="n">' + (x.puesto || '—') + '</td><td>' +
    (x.estado === 'ADMITIDO_PODIO' ? '<span class="pill ok">Podio · ' + E.nombreCarrera(x.carrera) + '</span>' : x.estado === 'ADMITIDO_RANKING' ? '<span class="pill info">Ranking · ' + E.nombreCarrera(x.carrera) + ' (opción ' + x.preferenciaN + ')</span>' : '<span class="pill crit">' + MOT[x.motivo] + '</span>') + '</td></tr>').join('');
  /* podios por asignatura y ranking del 4.º al 12.º */
  const ORD = ['MATEMATICAS', 'FISICA', 'QUIMICA_APLICADA', 'BIOINGENIERIA', 'ROBOTICA'];
  const fa2 = $('x-fa').value;
  const ver = ORD.filter(id => !fa2 || id === fa2);
  $('x-podio').innerHTML = ver.map(id => {
    const top = sextos.filter(s => s.area === id && r.res[s.id].puesto && r.res[s.id].puesto <= 3).sort((a, b) => r.res[a.id].puesto - r.res[b.id].puesto);
    let filas = '';
    for (let i = 0; i < 3; i++) {
      const s = top[i];
      filas += s ? '<tr><td class="n">' + (i + 1) + '.º</td><td>' + esc(s.nombre) + '</td><td class="n">' + s.nota + '</td><td>' + (r.res[s.id].carrera ? '<span class="pill ok">' + E.nombreCarrera(r.res[s.id].carrera) + '</span>' : '<span class="pill crit">Sin cupo</span>') + '</td></tr>'
        : '<tr><td class="n">' + (i + 1) + '.º</td><td colspan="3" class="muted">Sin estudiante habilitado en este puesto</td></tr>';
    }
    return '<h4 class="ah">' + E.nombreArea(id) + ' <small>· ' + r.elegibles[id] + ' habilitados de sexto</small></h4><div class="tw"><table><tr><th>Puesto</th><th>Estudiante</th><th>Nota</th><th>Carrera de ingreso directo</th></tr>' + filas + '</table></div>';
  }).join('');
  const rk = sextos.filter(s => ver.includes(s.area) && r.res[s.id].puesto >= 4 && r.res[s.id].puesto <= 12)
    .sort((a, b) => b.nota - a.nota || (a.comision == null ? 1e9 : a.comision) - (b.comision == null ? 1e9 : b.comision) || a.registro - b.registro);
  $('x-rk-info').innerHTML = '<b>' + rk.length + ' estudiantes.</b> ' + (fa2 ? 'Del puesto 4 al 12 del área de ' + E.nombreArea(fa2) + ', ' : 'Del puesto 4 al 12 de cada área, mezclados y ') + 'ordenados por nota de mayor a menor. Cada uno recibe la primera carrera de su lista que tenga cupo.';
  $('x-rank').innerHTML = '<tr><th>N.º</th><th>Estudiante</th><th>Área</th><th>Nota</th><th>Puesto en su área</th><th>Carrera asignada</th></tr>' + (rk.length ? rk.map((s, i) => {
    const x = r.res[s.id];
    return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(s.nombre) + '</td><td>' + E.nombreArea(s.area) + '</td><td class="n">' + s.nota + '</td><td class="n">' + x.puesto + '.º</td><td>' +
      (x.carrera ? '<span class="pill info">' + E.nombreCarrera(x.carrera) + ' (opción ' + x.preferenciaN + ')</span>' : '<span class="pill crit">' + (MOT[x.motivo] || 'Sin cupo') + '</span>') + '</td></tr>';
  }).join('') : '<tr><td colspan="6" class="muted">No hay estudiantes en este tramo.</td></tr>');
  /* podios certificados */
  const pc = E.podiosCertificados(state.est);
  $('x-pod').innerHTML = '<div class="tw"><table><tr><th>Área</th>' + [3, 4, 5, 6].map(c => '<th>' + CURSO[c] + '</th>').join('') + '</tr>' + E.AREAS.map(a => '<tr><td>' + a.nombre + '</td>' + [3, 4, 5, 6].map(c => '<td class="wrapcell">' + celdaPodio(a.id, c, pc, r) + '</td>').join('') + '</tr>').join('') + '</table></div><p class="muted"><small>Todos estos reciben certificado. En sexto de secundaria se listan además los 9 admitidos por ranking de cada área (12 por área), que son quienes entran a la admisión especial.</small></p>';
}
function celdaPodio(area, curso, pc, r) {
  const corto = s => esc(s.nombre.split(' ').slice(0, 2).join(' '));
  if (curso !== 6) return pc[area][curso].map((s, i) => (i + 1) + '. ' + corto(s) + ' <span class="mono">' + s.nota + '</span>').join('<br>') || '—';
  const adm = state.est.filter(s => s.curso === 6 && s.area === area && r.res[s.id].carrera);
  const pod = adm.filter(s => r.res[s.id].estado === 'ADMITIDO_PODIO').sort((a, b) => r.res[a.id].puesto - r.res[b.id].puesto);
  const rkg = adm.filter(s => r.res[s.id].estado === 'ADMITIDO_RANKING').sort((a, b) => r.res[a.id].puesto - r.res[b.id].puesto);
  const li = s => r.res[s.id].puesto + '. ' + corto(s) + ' <span class="mono">' + s.nota + '</span>';
  if (!pod.length && !rkg.length) return '—';
  return '<b>Podio</b>' + pod.map(li).join('<br>') + '<b>Admitidos por ranking (' + rkg.length + ')</b>' + rkg.map(li).join('<br>');
}
function barras2(el, items, tope) {
  el.innerHTML = items.map(([n, v]) => '<div class="row"><span style="font-size:13px">' + esc(n) + '</span><div class="bar"><i style="width:' + Math.round(v / tope * 100) + '%;background:' + (v >= tope ? 'var(--ok)' : 'var(--primary)') + '"></i></div><span class="v">' + v + '/' + tope + '</span></div>').join('');
}
let tmin; $('x-min').addEventListener('input', () => { const v = +$('x-min').value; if (v >= 0 && v <= 100) { state.min = v; renderSim(); clearTimeout(tmin); tmin = setTimeout(async () => { const { error } = await sb.from('of_config').update({ min_nota: v }).eq('id', 1); if (error) avisoRed('No se pudo guardar la nota mínima.'); }, 600); } });
$('x-fa').addEventListener('change', renderSim); $('x-fe').addEventListener('change', renderSim);


/* ---------- gestión ---------- */
const MOTIVOS = ['Comprobante ilegible o cortado', 'El monto no corresponde (son Bs. 20 por estudiante)', 'El número de transacción no coincide con el comprobante', 'El depósito no es a la cuenta de la Universidad', 'Cédula ilegible o incorrecta', 'Autorización sin firma o incompleta', 'Documento del curso ilegible o no válido'];
async function guardarPlazo() {
  const P = state.plazo;
  const { error } = await sb.from('of_config').update({ cierre: aDate(P.cierre).toISOString(), gracia_min: +P.gracia, ampliado: P.ampliado, nuevo_cierre: P.nuevo ? aDate(P.nuevo).toISOString() : null }).eq('id', 1);
  if (error) avisoRed('No se pudo guardar el plazo: ' + error.message); else avisoRed('');
}
function renderGestion() {
  const P = state.plazo, ab = inscAbierta();
  if (document.activeElement !== $('g-cierre')) $('g-cierre').value = P.cierre;
  $('g-gra').value = P.gracia; $('g-amp').checked = P.ampliado; $('g-nuevo-w').hidden = !P.ampliado; $('g-nuevo').value = P.nuevo;
  $('g-est').innerHTML = '<div class="alert ' + (ab ? 'ok' : 'crit') + '">' + (ab ? 'Inscripciones <b>abiertas</b>. Cierre que ve el público: <b>' + fmtF(cierreOficial()) + '</b>.' : 'Inscripciones <b>cerradas</b>.') + ' Recibe hasta las <b>' + fmtC(new Date(cierreOficial().getTime() + (+P.gracia || 0) * 60000)) + '</b>.</div>';
  renderRev(); renderConsultasAdmin();
  const r = E.asignar(state.est, { minNota: state.min }), np = r.empates.filter(e => !e.resuelto).length;
  $('g-pub').checked = state.resultadosPub;
  $('g-pub-n').innerHTML = np ? '<div class="alert warn">Hay ' + np + ' empate(s) sin resolver: esos estudiantes verán “resultado en revisión”.</div>' : '';
}
async function verDocs(s, el) {
  el.innerHTML = '<small>Cargando documentos…</small>';
  const nom = { ci: 'Cédula', aut: 'Autorización', comp: 'Comprobante de pago', curso: 'Documento del curso' }, out = [];
  for (const k of Object.keys(nom)) {
    const p = s.docs && s.docs[k]; if (!p) continue;
    const { data } = await sb.storage.from('of-docs').createSignedUrl(p, 3600);
    if (data) out.push('<a href="' + esc(data.signedUrl) + '" target="_blank" rel="noopener">' + nom[k] + '</a>');
  }
  el.innerHTML = out.length ? '<small>' + out.join(' · ') + '</small>' : '<small>Sin documentos.</small>';
}
function renderRev() {
  const L = state.est, pend = L.filter(s => s.pago === 'pendiente').sort((a, b) => a.registro - b.registro), rech = L.filter(s => s.pago === 'rechazado');
  const cnt = {}; pend.forEach(s => s.tx && (cnt[s.tx] = (cnt[s.tx] || 0) + 1));
  const rows = pend.slice(0, 12).map(s => '<div class="card" style="background:var(--bg);padding:12px"><p style="margin:0"><b>' + esc(s.nombre) + '</b></p><p class="muted" style="margin:0"><small><span class="mono">' + esc(s.ci) + '</span> · ' + E.nombreArea(s.area) + ' · ' + CURSO[s.curso] + (s.reenvios ? ' · corregido ' + s.reenvios + ' vez' : '') + '</small></p><p style="margin:4px 0 4px"><small>N.º de transacción: <span class="mono">' + esc(s.tx || '—') + '</span>' + (s.tx && cnt[s.tx] > 1 ? ' · ' + cnt[s.tx] + ' inscritos con este N.º' : '') + '</small></p>' +
    '<p style="margin:0 0 8px"><button class="btn ghost sm" data-docs="' + s.id + '">Ver documentos</button> <span data-dl="' + s.id + '"></span></p>' +
    '<select data-m="' + s.id + '"><option value="">Motivo si se rechaza…</option>' + MOTIVOS.map(m => '<option>' + esc(m) + '</option>').join('') + '</select><input data-d="' + s.id + '" placeholder="Detalle opcional" style="margin-top:6px">' +
    '<p style="margin:8px 0 0"><button class="btn sm" data-ok="' + s.id + '">Verificar</button> <button class="btn ghost sm" data-no="' + s.id + '">Rechazar</button>' + (s.tx && cnt[s.tx] > 1 ? ' <button class="btn ghost sm" data-grp="' + esc(s.tx) + '">Verificar los ' + cnt[s.tx] + '</button>' : '') + '</p><div class="err" data-e="' + s.id + '"></div></div>').join('');
  $('g-rev').innerHTML = '<p><span class="pill warn">' + pend.length + ' por revisar</span> <span class="pill crit">' + rech.length + ' esperando corrección</span></p>' +
    (pend.length ? rows + (pend.length > 12 ? '<p class="muted"><small>Se muestran 12 de ' + pend.length + '. Al resolver estas aparecen las siguientes.</small></p>' : '') : '<div class="alert ok">No hay inscripciones por revisar.</div>');
  const por = Object.fromEntries(L.map(s => [s.id, s])), g = $('g-rev');
  g.querySelectorAll('[data-docs]').forEach(b => b.addEventListener('click', () => verDocs(por[b.dataset.docs], g.querySelector('[data-dl="' + b.dataset.docs + '"]'))));
  g.querySelectorAll('[data-ok]').forEach(b => b.addEventListener('click', async () => { const s = por[b.dataset.ok]; if (await guardar(s, { pago: 'verificado', motivo: null })) { s.pago = 'verificado'; s.motivo = null; refrescarRev(); } }));
  g.querySelectorAll('[data-grp]').forEach(b => b.addEventListener('click', async () => {
    const grupo = L.filter(s => s.pago === 'pendiente' && s.tx === b.dataset.grp), ids = grupo.map(s => s.id);
    const { error } = await sb.from('of_inscritos').update({ pago: 'verificado', motivo: null }).in('id', ids);
    if (error) { avisoRed('No se pudo verificar el grupo: ' + error.message); return; }
    grupo.forEach(s => { s.pago = 'verificado'; s.motivo = null; }); refrescarRev();
  }));
  g.querySelectorAll('[data-no]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.no, m = g.querySelector('[data-m="' + id + '"]').value, d = g.querySelector('[data-d="' + id + '"]').value.trim();
    if (!m) { g.querySelector('[data-e="' + id + '"]').textContent = 'Elige el motivo.'; return; }
    const motivo = m + (d ? '. ' + d : '') + '.';
    if (await guardar(por[id], { pago: 'rechazado', motivo })) { por[id].pago = 'rechazado'; por[id].motivo = motivo; refrescarRev(); }
  }));
}
function refrescarRev() { renderRev(); if (!$('pv-gen').hidden) renderPanel(); }
function renderConsultasAdmin() {
  const C = state.consultas.slice().sort((a, b) => (a.resp ? 1 : 0) - (b.resp ? 1 : 0) || b.fecha - a.fecha);
  const sin = C.filter(c => !c.resp).length;
  $('g-con').innerHTML = !C.length ? '<p class="muted">Todavía no hay consultas.</p>' : '<p><span class="pill warn">' + sin + ' sin responder</span></p>' + C.map(c => '<div class="card" style="background:var(--bg)"><p style="margin:0"><b>' + esc(c.nombre) + '</b> <span class="mono">' + esc(c.cod) + '</span> <small>· WhatsApp ' + esc(c.wa) + ' · ' + fmtC(c.fecha) + '</small></p><p style="margin:6px 0">' + esc(c.msg) + '</p>' +
    '<textarea data-r="' + c.cod + '" placeholder="Escribe la respuesta…">' + esc(c.resp) + '</textarea><p style="margin:8px 0 0"><button class="btn sm" data-resp="' + c.cod + '">' + (c.resp ? 'Actualizar respuesta' : 'Responder') + '</button> ' + (c.resp ? '<span class="pill ok">Respondida</span>' : '') + '</p></div>').join('');
  $('g-con').querySelectorAll('[data-resp]').forEach(b => b.addEventListener('click', async () => {
    const c = state.consultas.find(x => x.cod === b.dataset.resp), t = $('g-con').querySelector('[data-r="' + c.cod + '"]').value.trim();
    if (!t) return;
    const { error } = await sb.from('of_consultas').update({ resp: t, resp_en: new Date().toISOString() }).eq('id', c.id);
    if (error) { avisoRed('No se pudo guardar la respuesta: ' + error.message); return; }
    c.resp = t; renderConsultasAdmin();
  }));
}
const cambioPlazo = async () => { renderGestion(); await guardarPlazo(); };
$('g-cierre').addEventListener('change', () => { if ($('g-cierre').value) { state.plazo.cierre = $('g-cierre').value; cambioPlazo(); } });
$('g-gra').addEventListener('change', () => { const v = +$('g-gra').value; if (v >= 0 && v <= 30) { state.plazo.gracia = v; cambioPlazo(); } });
$('g-amp').addEventListener('change', () => { state.plazo.ampliado = $('g-amp').checked; if (state.plazo.ampliado && !state.plazo.nuevo) state.plazo.nuevo = state.plazo.cierre; cambioPlazo(); });
$('g-nuevo').addEventListener('change', () => { state.plazo.nuevo = $('g-nuevo').value; cambioPlazo(); });
$('g-pub').addEventListener('change', async () => {
  const pub = $('g-pub').checked;
  try {
    if (pub) {
      const r = E.asignar(state.est, { minNota: state.min }), pend = new Set(r.empates.filter(e => !e.resuelto).flatMap(e => e.ids));
      const arr = state.est.filter(s => s.curso === 6).map(s => { const x = r.res[s.id]; return { id: s.id, r: { carrera: x.carrera || null, estado: x.estado || null, motivo: x.motivo || null, pendiente: pend.has(s.id) } }; });
      for (let i = 0; i < arr.length; i += 400) { const { error } = await sb.rpc('of_set_resultados', { p: arr.slice(i, i + 400) }); if (error) throw error; }
      arr.forEach(o => (state.est.find(s => s.id === o.id).resultado = o.r));
    }
    const { error } = await sb.from('of_config').update({ resultados_pub: pub }).eq('id', 1); if (error) throw error;
    state.resultadosPub = pub; avisoRed('');
  } catch (e) { avisoRed('No se pudo cambiar la publicación: ' + e.message); $('g-pub').checked = !pub; }
});
$('n-go').addEventListener('click', async () => {
  const filas = $('n-txt').value.split('\n').map(l => l.trim()).filter(Boolean), ok = [], mal = [];
  filas.forEach(l => { const m = l.split(/[;,\s\t]+/); const ci = soloDigitos(m[0]), n = parseFloat(String(m[1] || '').replace(',', '.')); if (ci.length >= 5 && n >= 0 && n <= 100) ok.push({ ci, nota: n }); else mal.push(l); });
  if (!ok.length) { $('n-out').innerHTML = '<div class="alert warn">No encontré líneas válidas. Formato: carnet;nota</div>'; return; }
  const { data, error } = await sb.rpc('of_set_notas', { p: ok });
  if (error) { $('n-out').innerHTML = '<div class="alert crit">No se pudieron guardar: ' + esc(error.message) + '</div>'; return; }
  await cargarInscritos();
  $('n-out').innerHTML = '<div class="alert ' + (data === ok.length && !mal.length ? 'ok' : 'warn') + '"><b>' + data + ' notas guardadas</b> de ' + ok.length + ' líneas válidas.' + (data < ok.length ? ' ' + (ok.length - data) + ' carnets no corresponden a ningún inscrito.' : '') + (mal.length ? '<br>Líneas no válidas: ' + mal.map(esc).join(' | ') : '') + '</div>';
});
$('g-buscar').addEventListener('click', () => {
  const q = soloDigitos($('g-ci').value), s = state.est.find(x => soloDigitos(x.ci) === q), out = $('g-edit');
  if (q.length < 5 || !s) { out.innerHTML = '<div class="alert crit">No se encontró ese carnet.</div>'; return; }
  const opt = (arr, v) => arr.map(([k, t]) => '<option value="' + k + '"' + (String(k) === String(v) ? ' selected' : '') + '>' + t + '</option>').join('');
  out.innerHTML = '<div class="grid" style="margin-top:12px"><div><label>Nombre completo</label><input id="ge-n" value="' + esc(s.nombre) + '"></div><div><label>Curso</label><select id="ge-cu">' + opt([[3, 'Tercero'], [4, 'Cuarto'], [5, 'Quinto'], [6, 'Sexto']], s.curso) + '</select></div>' +
    '<div><label>Área</label><select id="ge-ar">' + opt(E.AREAS.map(a => [a.id, a.nombre]), s.area) + '</select></div><div><label>Unidad educativa</label><input id="ge-co" value="' + esc(s.colegio) + '"></div><div><label>Municipio</label><input id="ge-mu" value="' + esc(s.municipio) + '"></div>' +
    '<div><label>Departamento</label><select id="ge-de">' + opt(DEPTOS.map(d => [d, d]), s.departamento) + '</select></div><div><label>Padre o madre</label><input id="ge-tn" value="' + esc(s.tutorNombre) + '"></div><div><label>Celular del padre o madre</label><input id="ge-tc" value="' + esc(s.tutorCelular) + '"></div>' +
    '<div><label>Nota del examen</label><input id="ge-no" type="number" min="0" max="100" value="' + (s.nota == null ? '' : s.nota) + '"></div></div><div id="ge-e"></div><p style="margin-top:12px"><button class="btn" id="ge-g" type="button">Guardar cambios</button></p>';
  $('ge-g').addEventListener('click', async () => {
    const errs = [];
    if ($('ge-n').value.trim().length < 5) errs.push('El nombre es muy corto.');
    if (!celularOk($('ge-tc').value)) errs.push('El celular del padre o madre no es válido' + MSG_CEL + '.');
    const no = $('ge-no').value; if (no !== '' && (+no < 0 || +no > 100)) errs.push('La nota debe estar entre 0 y 100.');
    errsList($('ge-e'), errs); if (errs.length) return;
    const cu = +$('ge-cu').value, ar = $('ge-ar').value, cambia = ar !== s.area || cu !== s.curso;
    const nuevo = { nombre: $('ge-n').value.trim(), curso: cu, area: ar, colegio: $('ge-co').value.trim(), municipio: $('ge-mu').value.trim(), departamento: $('ge-de').value, tutorNombre: $('ge-tn').value.trim(), tutorCelular: $('ge-tc').value, nota: no === '' ? null : +no };
    const prefs = cambia ? (cu === 6 ? E.prefsPorDefecto(ar) : null) : s.prefs;
    const ok = await guardar(s, { nombre: nuevo.nombre, curso: cu, area: ar, colegio: nuevo.colegio, municipio: nuevo.municipio, departamento: nuevo.departamento, tutor_nombre: nuevo.tutorNombre, tutor_celular: nuevo.tutorCelular, nota: nuevo.nota, prefs });
    if (!ok) return;
    Object.assign(s, nuevo, { prefs });
    $('ge-e').innerHTML = '<div class="alert ok"><b>Cambios guardados.</b>' + (cambia && cu === 6 ? ' Como cambió el área o el curso, el orden de carreras volvió al orden por defecto de esa área.' : '') + '</div>';
  });
});

/* ---------- informes para imprimir ---------- */
const ROLES = { final: ['Decano(a) de la Facultad', 'Coordinador(a) general de las Olimpiadas', 'Responsable del sistema de inscripciones'], area: ['Presidente(a) de la comisión del área', 'Miembro de la comisión', 'Miembro de la comisión'] };
E.AREAS.forEach(a => $('inf-sel').add(new Option('Informe del área de ' + a.nombre, a.id)));
function renderEnc() {
  const k = $('inf-sel').value, roles = k === 'final' ? ROLES.final : ROLES.area;
  state.enc[k] = state.enc[k] || roles.map(() => '');
  $('inf-enc').innerHTML = roles.map((r, i) => '<div><label>' + r + '</label><input data-i="' + i + '" value="' + esc(state.enc[k][i]) + '" placeholder="Nombre completo"></div>').join('');
  $('inf-enc').querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { state.enc[k][+inp.dataset.i] = inp.value; renderInforme(); guardarEnc(); }));
  renderInforme();
}
function firmasHTML(k) {
  const roles = k === 'final' ? ROLES.final : ROLES.area;
  return '<div class="firmas">' + roles.map((r, i) => '<div class="firma"><div class="ln"></div><b>' + esc((state.enc[k] || [])[i] || '') + '</b><small>' + r + '</small></div>').join('') + '</div>';
}
function renderInforme() {
  const k = $('inf-sel').value, r = E.asignar(state.est, { minNota: state.min }), pc = E.podiosCertificados(state.est), L = state.est;
  const tabla = (cab, filas) => '<div class="tw"><table><tr>' + cab.map(c => '<th>' + c + '</th>').join('') + '</tr>' + filas.map(f => '<tr>' + f.map((c, i) => '<td' + (typeof c === 'number' ? ' class="n"' : '') + '>' + (typeof c === 'number' ? c : esc(c)) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  const cab = '<div class="cab"><b>Universidad Mayor, Real y Pontificia de San Francisco Xavier de Chuquisaca</b><br>Facultad de Ingeniería y Ciencias Aplicadas Meca-Electrónicas<br><b>Olimpiadas FICAM 2026</b></div>';
  const fecha = '<p><small>Sucre, ' + fmtF(ahora()).replace(/, \d\d:\d\d$/, '') + '</small></p>';
  const adm = (lista) => lista.sort((a, b) => E.nombreCarrera(r.res[a.id].carrera).localeCompare(E.nombreCarrera(r.res[b.id].carrera)) || r.res[a.id].puesto - r.res[b.id].puesto).map(s => [s.nombre, E.nombreArea(s.area), s.nota, r.res[s.id].puesto, E.nombreCarrera(r.res[s.id].carrera), r.res[s.id].estado === 'ADMITIDO_PODIO' ? 'Podio' : 'Ranking']);
  let h;
  if (k === 'final') {
    const admitidos = L.filter(s => s.curso === 6 && r.res[s.id].carrera);
    h = cab + '<h2 style="text-align:center">Informe final</h2>' + fecha +
      '<h3>1. Participación</h3>' + tabla(['Área', 'Inscritos', 'Tercero', 'Cuarto', 'Quinto', 'Sexto'], E.AREAS.map(a => [a.nombre, L.filter(s => s.area === a.id).length, ...[3, 4, 5, 6].map(c => L.filter(s => s.area === a.id && s.curso === c).length)]).concat([['Total', L.length, ...[3, 4, 5, 6].map(c => L.filter(s => s.curso === c).length)]])) +
      '<h3>2. Admisión especial</h3><p>Se ocuparon <b>' + r.admitidos + ' de 60</b> plazas; quedaron sin ocupar <b>' + r.plazasLibres + '</b>. Nota mínima aplicada: ' + state.min + ' puntos.</p>' +
      tabla(['Carrera', 'Plazas ocupadas'], E.CARRERAS.map(c => [c.nombre, r.carreras[c.id] + ' de 10'])) +
      '<h3>3. Admitidos</h3>' + tabla(['Estudiante', 'Área', 'Nota', 'Puesto', 'Carrera', 'Vía'], adm(admitidos)) +
      '<h3>4. Empates</h3>' + (r.empates.length ? '<p>' + r.empates.filter(e => e.resuelto).length + ' resueltos por la comisión del área y ' + r.empates.filter(e => !e.resuelto).length + ' pendientes.</p>' : '<p>No hubo empates que afecten el ingreso.</p>') +
      firmasHTML('final');
  } else {
    const a = E.AREAS.find(x => x.id === k), S = L.filter(s => s.area === k), con = S.filter(s => s.nota != null);
    const prom = con.length ? (con.reduce((t, s) => t + s.nota, 0) / con.length).toFixed(1) : '—';
    h = cab + '<h2 style="text-align:center">Informe del área de ' + a.nombre + '</h2>' + fecha +
      '<h3>1. Participación</h3><p>' + S.length + ' inscritos, ' + con.length + ' con nota. Promedio: ' + prom + '. Nota más alta: ' + (con.length ? Math.max(...con.map(s => s.nota)) : '—') + '.</p>' +
      tabla(['Curso', 'Inscritos', 'Con nota'], [3, 4, 5, 6].map(c => [CURSO[c], S.filter(s => s.curso === c).length, con.filter(s => s.curso === c).length])) +
      '<h3>2. Podio por curso</h3>' + tabla(['Curso', 'Primero', 'Segundo', 'Tercero'], [3, 4, 5, 6].map(c => [CURSO[c], ...[0, 1, 2].map(i => { const s = pc[k][c][i]; return s ? s.nombre + ' (' + s.nota + ')' : '—'; })])) +
      '<h3>3. Sexto de secundaria: admitidos del área (' + L.filter(s => s.curso === 6 && s.area === k && r.res[s.id].carrera).length + ' de 12)</h3>' + tabla(['Estudiante', 'Área', 'Nota', 'Puesto', 'Carrera', 'Vía'], adm(L.filter(s => s.curso === 6 && s.area === k && r.res[s.id].carrera))) +
      '<h3>4. Desempates</h3>' + (r.empates.filter(e => e.area === k).length ? '<p>' + r.empates.filter(e => e.area === k && e.resuelto).length + ' empate(s) resuelto(s) y ' + r.empates.filter(e => e.area === k && !e.resuelto).length + ' pendiente(s) por la comisión del área.</p>' : '<p>Sin empates que afecten el ingreso.</p>') +
      firmasHTML(k);
  }
  $('inf-out').innerHTML = h;
}
$('inf-sel').addEventListener('change', renderEnc);
$('inf-print').addEventListener('click', () => { try { window.print(); } catch (e) { } $('inf-m').textContent = 'Si no se abre la impresión, usa Imprimir del navegador o copia el informe.'; });


iniciar();
