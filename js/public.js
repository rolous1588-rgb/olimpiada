/* Página pública: información, inscripción, consulta por carnet, consultas y resultados. */
const state = { abierto: true, cierre: null, ampliado: false, resultados: false, cargado: false };
const FECHAS = { examen: 'martes 17 de noviembre de 2026', horarios: 'lunes 9 de noviembre de 2026', lugar: 'Todos los exámenes se rinden en la ciudad de Sucre.' };

/* ---------- enlaces y pago (se cambian aquí) ---------- */
const ENLACES = {
  docs: [
    ['Convocatoria', 'Condiciones, fechas, áreas y admisión especial.', ''],
    ['Formulario de autorización y consentimiento', 'Descárgalo, imprímelo, fírmalo y súbelo al inscribirte.', '']
  ],
  contenidos: {
    MATEMATICAS: 'https://docs.google.com/document/d/1MbMsPU2Ds73SBHQHKNKIRgSyvsmyo6j0lOh9EyuVFz4/edit?usp=sharing',
    FISICA: 'https://docs.google.com/document/d/1SKxAyefcD-VW0wcYic_JsKZNlqA7FjXSYrWZmG2sdNw/edit?usp=sharing',
    QUIMICA_APLICADA: 'https://docs.google.com/document/d/1qjm3b7e4WNf84mvH9Sahhet2w_ekUacazS1dhgDmbzk/edit?usp=sharing',
    BIOINGENIERIA: 'https://docs.google.com/document/d/1r254AOIxbVOyBBWv4ybByG7xZB0RmV6VsI0L7wd_5Ww/edit?usp=sharing',
    ROBOTICA: 'https://docs.google.com/document/d/1VJIM4kyDLbIulIe_J-HfiTdXiGwzqQQozZlzc-cHKHw/edit?usp=sharing' },
  nomada: 'https://rutanomada.org/',
  /* Pega aquí el enlace de invitación del grupo de WhatsApp de cada carrera. */
  grupos: { ING_ELECTROMECANICA: '', ING_MECATRONICA: '', ING_ELECTRONICA: '', ING_ELECTRICA: '', ING_BIOMEDICA: '', ING_MECANICA: '' }
};
const PAGO = { banco: 'Banco Unión', titular: 'U.M.R.P.S.F.X.CH. - FICAM', cuenta: '', monto: 'Bs. 20',
  lugarFacultad: 'Se paga en la Facultad de Ingeniería y Ciencias Aplicadas Meca-Electrónicas (FICAM), en la calle de la ex-Refisur. Pregunta por la Lic. Elena Cabezas. Se entrega recibo fiscalizado.' };

/* ---------- estado del servidor ---------- */
async function cargarEstado() {
  const { data, error } = await sb.rpc('of_estado');
  if (error || !data) { avisoRed('No pudimos conectar con el servidor. Revisa tu conexión y recarga la página.'); return false; }
  avisoRed('');
  state.abierto = data.abierto; state.cierre = new Date(data.cierre); state.ampliado = data.ampliado; state.resultados = data.resultados; state.cargado = true;
  renderFechas(); return true;
}
function renderFechas() {
  const ab = state.abierto, c = state.cierre ? fmtF(state.cierre) : '';
  $('i-pills').innerHTML = (ab ? '<span class="pill warn">Cierre: ' + c + '</span>' : '<span class="pill crit">Inscripciones cerradas</span>') + ' <span class="pill info">Costo: Bs. 20 por estudiante</span>' + (state.ampliado && ab ? ' <span class="pill ok">Plazo ampliado</span>' : '');
  document.querySelectorAll('.cierre-txt').forEach(e => (e.textContent = ab ? 'Cierre de inscripciones: ' + c + '. Costo: Bs. 20 por estudiante.' : 'Las inscripciones están cerradas.'));
  const kv = (k, v) => '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>';
  $('i-fechas').innerHTML = kv('Cierre de inscripciones', c || '—') + kv('Examen presencial', FECHAS.examen) + kv('Horarios y turnos', 'Se publican el ' + FECHAS.horarios) + kv('Lugar', 'Ciudad de Sucre') +
    '<p class="muted" style="margin:8px 0"><small>' + FECHAS.lugar + ' El horario y el aula de cada área se indican en la publicación del ' + FECHAS.horarios + '.</small></p>';
}

/* ---------- pestañas ---------- */
document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', async () => {
  document.querySelectorAll('nav.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('section.view').forEach(s => (s.hidden = s.id !== 'v-' + b.dataset.v));
  if (b.dataset.v === 'insc') { await cargarEstado(); mostrarInsc('pick'); }
}));
E.AREAS.forEach(a => $('e-area').add(new Option(a.nombre, a.id)));
$('i-go').addEventListener('click', () => document.querySelector('[data-v=insc]').click());

/* ---------- información ---------- */
function enlace(titulo, sub, url, verbo) {
  const on = !!url, tag = on ? 'a' : 'div';
  return '<' + tag + (on ? ' href="' + esc(url) + '" target="_blank" rel="noopener"' : '') + ' class="dl' + (on ? '' : ' off') + '"><span><b>' + esc(titulo) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><span class="go">' + (on ? (verbo || 'Descargar') : 'Enlace pendiente') + '</span></' + tag + '>';
}
function renderInfo() {
  $('i-docs').innerHTML = ENLACES.docs.map(d => enlace(d[0], d[1], d[2])).join('');
  $('i-cont').innerHTML = ['MATEMATICAS', 'FISICA', 'QUIMICA_APLICADA', 'BIOINGENIERIA', 'ROBOTICA'].map(id => enlace(E.nombreArea(id), '', ENLACES.contenidos[id])).join('');
  $('i-wa').innerHTML = E.CARRERAS.map(c => enlace(c.nombre, '', ENLACES.grupos[c.id], 'Unirme')).join('');
  $('i-nomada').innerHTML = enlace('Ir a Ruta Nómada', 'Plataforma de estudio gratuita', ENLACES.nomada, 'Abrir');
  const kv = (k, v) => '<div class="kv"><span>' + k + '</span>' + (v ? '<b class="mono">' + esc(v) + '</b>' : '<span class="muted">Por definir</span>') + '</div>';
  $('i-pago').innerHTML = '<div class="alert warn" style="margin-top:0"><b>Paga solo a la cuenta institucional.</b> Los pagos se hacen únicamente a cuentas de la Universidad. Nunca deposites ni transfieras a cuentas personales.</div>' +
    '<div class="acct">' + kv('Banco', PAGO.banco) + kv('Titular de la cuenta', PAGO.titular) + kv('N.º de cuenta', PAGO.cuenta) + kv('Monto', PAGO.monto) + '</div>' +
    '<p style="margin:0 0 4px"><b>Formas de pago</b></p><ol class="steps">' +
    '<li><b>Transferencia electrónica</b> desde la banca por internet o la aplicación del banco.</li>' +
    '<li><b>Depósito bancario</b> en una agencia del Banco Unión.</li>' +
    '<li><b>Pago en persona en la Facultad</b>, si no puedes hacer una transferencia ni un depósito bancario. ' + (PAGO.lugarFacultad ? esc(PAGO.lugarFacultad) : '<span class="muted">Lugar y horario por definir.</span>') + '</li></ol>' +
    '<p class="muted" style="margin:6px 0 0"><small>Conserva tu comprobante de pago: lo subes al momento de inscribirte.</small></p>';
}

/* ---------- inscripción: pantallas ---------- */
function mostrarInsc(modo) {
  const ab = state.abierto;
  $('insc-cerrada').hidden = ab;
  $('insc-pick').hidden = !ab || modo !== 'pick'; $('insc-est').hidden = !ab || modo !== 'est'; $('f-tut').hidden = !ab || modo !== 'tut';
}
$('m-est').addEventListener('click', () => mostrarInsc('est'));
$('m-tut').addEventListener('click', () => mostrarInsc('tut'));
document.querySelectorAll('.back').forEach(b => b.addEventListener('click', () => mostrarInsc('pick')));

/* ---------- estudiante ---------- */
const edE = prefsEditor($('e-prefs'), $('e-prefrule'), () => $('e-area').value);
const togglePref = () => { $('e-prefcard').hidden = $('e-curso').value !== '6'; edE.sync(); };
$('e-curso').addEventListener('change', togglePref); $('e-area').addEventListener('change', togglePref);
function syncProf() { $('e-pt-w').hidden = !$('e-pt').checked; $('e-po-w').hidden = $('e-pm').value !== 'otra'; }
$('e-pt').addEventListener('change', syncProf); $('e-pm').addEventListener('change', syncProf);
$('f-est').addEventListener('reset', () => setTimeout(() => { syncProf(); togglePref(); }, 0));
let enviando = false;
async function conBoton(btn, textoEnvio, fn) {
  if (enviando) return; enviando = true; const t0 = btn.textContent; btn.disabled = true; btn.textContent = textoEnvio;
  try { await fn(); } finally { enviando = false; btn.disabled = false; btn.textContent = t0; }
}
function constancia(el, cod, nombre, area, curso) {
  return '<div class="const"><p class="muted">Constancia de inscripción</p><div class="code">' + esc(cod) + '</div><p><b>' + esc(nombre) + '</b><br>' + esc(E.nombreArea(area)) + ' · ' + CURSO[curso] + ' de secundaria</p>' +
    '<div class="alert ok">Recibimos tus datos y tus documentos. La organización verificará tu pago antes del examen.</div>' +
    '<p class="muted"><small>Guarda este código. Con tu número de carnet puedes consultar el estado de tu inscripción en la pestaña Información.</small></p></div>';
}
$('f-est').addEventListener('submit', async ev => {
  ev.preventDefault();
  const v = id => $(id).value.trim(), errs = [];
  if (v('e-nombre').length < 5) errs.push('Escribe tu nombre completo.');
  const ci = soloDigitos(v('e-ci'));
  if (!/^\d{5,10}$/.test(ci)) errs.push('La cédula debe tener entre 5 y 10 números.');
  if (!fechaPasada($('e-nac').value)) errs.push('Indica tu fecha de nacimiento.');
  if (!celularOk(v('e-wa'))) errs.push('Escribe tu número de WhatsApp' + MSG_CEL + '.');
  if (!$('e-curso').value) errs.push('Elige tu curso.');
  if (!$('e-area').value) errs.push('Elige tu área de competencia.');
  if (!v('e-col')) errs.push('Escribe tu unidad educativa.');
  if (!v('e-mun')) errs.push('Escribe tu municipio.');
  if (v('e-tn').length < 5) errs.push('Escribe el nombre completo del padre, madre o tutor.');
  if (!celularOk(v('e-tc'))) errs.push('Escribe el celular del padre, madre o tutor' + MSG_CEL + '.');
  const conProf = $('e-pt').checked;
  if (conProf) {
    if (v('e-pn').length < 5) errs.push('Escribe el nombre completo de tu profesor.');
    if (!celularOk(v('e-pw'))) errs.push('Escribe el WhatsApp de tu profesor' + MSG_CEL + '.');
    if (!$('e-pm').value) errs.push('Elige la asignatura que dicta tu profesor.');
    else if ($('e-pm').value === 'otra' && v('e-po').length < 3) errs.push('Escribe el nombre de la asignatura de tu profesor.');
  }
  const prefs = $('e-curso').value === '6' ? edE.prefs.slice() : null;
  if (prefs) E.validarPrefs($('e-area').value, prefs).forEach(e => errs.push(e));
  const DOC = [['d1', 'ci', 'Cédula de identidad'], ['d2', 'aut', 'Autorización firmada'], ['d3', 'comp', 'Comprobante de pago'], ['d4', 'curso', 'Documento del curso']];
  DOC.forEach(([id, , nom]) => { const f = $(id).files[0]; if (!f) errs.push('Sube el documento: ' + nom + '.'); else if (!archivoOk(f)) errs.push(nom + ': sube una imagen o un PDF.'); });
  if (v('e-tx').length < 3) errs.push('Escribe el número de transacción del pago.');
  if (!fechaPasada($('e-fp').value)) errs.push('Indica la fecha del pago.');
  errsList($('e-errs'), errs);
  if (errs.length) { $('e-errs').scrollIntoView({ block: 'center' }); return; }
  await conBoton(ev.submitter || $('f-est').querySelector('[type=submit]'), 'Subiendo documentos…', async () => {
    try {
      const carpeta = nuevaCarpeta('i'), docs = {};
      for (const [id, k] of DOC) docs[k] = await subirDoc($(id).files[0], carpeta, k);
      const { data, error } = await sb.rpc('of_inscribir', { p: { nombre: v('e-nombre'), ci, fecha_nac: $('e-nac').value, wa: v('e-wa'), curso: +$('e-curso').value, area: $('e-area').value, colegio: v('e-col'), municipio: v('e-mun'), departamento: $('e-dep').value, tipo_colegio: $('e-tipo').value, prefs, tutor_nombre: v('e-tn'), tutor_parentesco: $('e-tp').value, tutor_celular: v('e-tc'), via: 'individual',
        profesor_nombre: conProf ? v('e-pn') : null, profesor_wa: conProf ? v('e-pw') : null, profesor_materia: conProf ? ($('e-pm').value === 'otra' ? v('e-po') : $('e-pm').value) : null, tx: v('e-tx'), fecha_pago: $('e-fp').value, docs } });
      if (error) throw error;
      $('f-est').hidden = true; $('e-ok').hidden = false;
      $('e-ok').innerHTML = constancia($('e-ok'), data.codigo, v('e-nombre'), $('e-area').value, $('e-curso').value) + '<p style="margin-top:12px"><button class="btn ghost" id="e-again">Inscribir a otro estudiante</button></p>';
      $('e-again').addEventListener('click', () => { $('e-ok').hidden = true; $('f-est').hidden = false; $('f-est').reset(); $('e-errs').innerHTML = ''; });
      window.scrollTo({ top: 0 });
    } catch (e) { errsList($('e-errs'), [msgErr(e)]); $('e-errs').scrollIntoView({ block: 'center' }); }
  });
});

/* ---------- profesor ---------- */
const edT = prefsEditor($('t-pl'), $('t-prule'), () => $('t-ear').value);
const togglePrefT = () => { $('t-pw').hidden = $('t-ecu').value !== '6'; edT.sync(); };
$('t-ecu').addEventListener('change', togglePrefT); $('t-ear').addEventListener('change', togglePrefT);
$('t-mat').addEventListener('change', () => { $('t-otra-w').hidden = $('t-mat').value !== 'otra'; });
let mt = 0;
async function renderMios() {
  const ci = soloDigitos($('t-ci').value), n = ++mt;
  if (ci.length < 5) { $('t-mine').hidden = true; return; }
  const { data } = await sb.rpc('of_mis_estudiantes', { p_ci: ci });
  if (n !== mt) return;
  const mine = data || [];
  $('t-mine').hidden = !mine.length; if (!mine.length) return;
  $('t-mine-h').textContent = 'Mis estudiantes registrados (' + mine.length + ')';
  $('t-mine-t').innerHTML = '<table><tr><th>N.º</th><th>Estudiante</th><th>Curso</th><th>Área</th><th>Pago</th><th>Código</th></tr>' + mine.map((s, i) => '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(s.nombre) + '</td><td>' + CURSO[s.curso] + '</td><td>' + E.nombreArea(s.area) + '</td><td>' + (s.pago === 'verificado' ? '<span class="pill ok">Verificado</span>' : s.pago === 'rechazado' ? '<span class="pill crit">Corregir</span>' : '<span class="pill warn">Por verificar</span>') + '</td><td class="mono">' + esc(s.codigo || '—') + '</td></tr>').join('') + '</table>';
}
let tt; $('t-ci').addEventListener('input', () => { clearTimeout(tt); tt = setTimeout(renderMios, 350); });
$('t-send').addEventListener('click', async () => {
  const errs = [], tv = id => $(id).value.trim();
  if (tv('t-n').length < 5) errs.push('Escribe tu nombre completo.');
  if (!/^\d{5,10}$/.test(soloDigitos(tv('t-ci')))) errs.push('Escribe tu cédula (5 a 10 números).');
  if (!celularOk(tv('t-wa'))) errs.push('Escribe tu WhatsApp' + MSG_CEL + '.');
  if (!$('t-mat').value) errs.push('Elige la materia que dictas.');
  if ($('t-mat').value === 'otra' && tv('t-otra').length < 3) errs.push('Escribe el nombre de la materia que dictas.');
  if (!tv('t-col')) errs.push('Escribe tu unidad educativa.');
  if (!tv('t-mun')) errs.push('Escribe el municipio de tu unidad educativa.');
  const n = tv('t-en'), ci = soloDigitos($('t-eci').value), cu = $('t-ecu').value, ar = $('t-ear').value, tn = tv('t-etn'), tc = $('t-etc').value;
  if (n.length < 5) errs.push('Escribe el nombre completo del estudiante.');
  if (!/^\d{5,10}$/.test(ci)) errs.push('Escribe una cédula válida del estudiante (5 a 10 números).');
  if (!cu) errs.push('Elige el curso del estudiante.');
  if (!ar) errs.push('Elige el área de competencia del estudiante.');
  if (tn.length < 5) errs.push('Escribe el nombre del padre o madre.');
  if (!celularOk(tc)) errs.push('Escribe un celular válido del padre o madre' + MSG_CEL + '.');
  if (cu === '6' && ar) E.validarPrefs(ar, edT.prefs).forEach(e => errs.push(e));
  const DOC = [['t-ef1', 'ci', 'Cédula de identidad'], ['t-ef2', 'aut', 'Autorización firmada'], ['t-ef3', 'curso', 'Documento del curso'], ['t-ecomp', 'comp', 'Comprobante de pago']];
  DOC.forEach(([id, , nom]) => { const f = $(id).files[0]; if (!f) errs.push('Sube el documento: ' + nom + '.'); else if (!archivoOk(f)) errs.push(nom + ': sube una imagen o un PDF.'); });
  if (tv('t-etx').length < 3) errs.push('Escribe el número de transacción del pago.');
  if (!fechaPasada($('t-efp').value)) errs.push('Indica la fecha del pago.');
  errsList($('t-errs'), errs);
  if (errs.length) { $('t-errs').scrollIntoView({ block: 'center' }); return; }
  await conBoton($('t-send'), 'Subiendo documentos…', async () => {
    try {
      const carpeta = nuevaCarpeta('i'), docs = {};
      for (const [id, k] of DOC) docs[k] = await subirDoc($(id).files[0], carpeta, k);
      const { data, error } = await sb.rpc('of_inscribir', { p: { nombre: n, ci, curso: +cu, area: ar, colegio: tv('t-col'), municipio: tv('t-mun'), departamento: $('t-dep').value, tipo_colegio: $('t-tipo').value, prefs: cu === '6' ? edT.prefs.slice() : null, tutor_nombre: tn, tutor_celular: tc, via: 'tutor',
        profesor_ci: soloDigitos(tv('t-ci')), profesor_nombre: tv('t-n'), profesor_wa: tv('t-wa'), profesor_materia: $('t-mat').value === 'otra' ? tv('t-otra') : $('t-mat').value, tx: tv('t-etx'), fecha_pago: $('t-efp').value, docs } });
      if (error) throw error;
      ['t-en', 't-eci', 't-etn', 't-etc', 't-etx', 't-efp', 't-ef1', 't-ef2', 't-ef3', 't-ecomp', 't-ecu', 't-ear'].forEach(id => ($(id).value = ''));
      togglePrefT(); $('t-errs').innerHTML = '';
      $('t-ok').hidden = false;
      $('t-ok').innerHTML = '<div class="alert ok"><b>' + esc(n) + ' quedó inscrito.</b> Código: <span class="mono">' + esc(data.codigo) + '</span>. El formulario está en blanco para registrar al siguiente estudiante.</div>';
      renderMios();
    } catch (e) { errsList($('t-errs'), [msgErr(e)]); $('t-errs').scrollIntoView({ block: 'center' }); }
  });
});

/* ---------- consulta por carnet, corrección y resultado ---------- */
const MOTIVO_AMIGABLE = { AREA_LLENA: 'el cupo de tu área ya se completó con estudiantes de mayor nota', SIN_CUPO: 'las carreras que elegiste ya tenían todos sus cupos ocupados por estudiantes de mayor nota', BAJO_MINIMO: 'tu nota quedó por debajo del mínimo de 51 puntos', SIN_NOTA: 'todavía no tenemos tu nota', PREFS_INVALIDAS: 'tu orden de carreras no es válido' };
function resultadoHTML(r) {
  if (!r || !r.publicado) return '<div class="alert warn">Los resultados todavía no se publican.</div>';
  if (r.nota == null) return '<div class="alert warn">Todavía no tenemos una nota registrada para ti.</div>';
  const x = r.resultado;
  let h = '<div class="kpis" style="margin:10px 0"><div class="kpi"><b>' + r.nota + '</b><span>tu nota</span></div><div class="kpi"><b>' + r.puesto + '.º</b><span>puesto de ' + r.de + ' en ' + E.nombreArea(r.area) + ' · ' + CURSO[r.curso] + '</span></div></div>';
  if (r.curso === 6) {
    if (!x) h += '<div class="alert warn">La asignación de plazas todavía no está publicada.</div>';
    else if (x.pendiente) h += '<div class="alert warn"><b>Tu resultado de admisión está en revisión.</b> Hay un empate que debe resolver la comisión del área. Vuelve a consultar más tarde.</div>';
    else h += x.carrera ? '<div class="alert ok"><b>¡Felicidades! Obtuviste una plaza</b> en la admisión especial: ' + esc(E.nombreCarrera(x.carrera)) + '.</div>'
      : '<div class="alert warn"><b>No obtuviste plaza de admisión especial.</b> Motivo: ' + (MOTIVO_AMIGABLE[x.motivo] || 'no alcanzaste cupo') + '.</div>';
  }
  return h;
}
async function consultar(aviso) {
  const q = soloDigitos($('c-ci').value), out = $('c-out');
  if (q.length < 5) { out.innerHTML = '<div class="alert warn">Escribe tu número de carnet (solo números).</div>'; return; }
  out.innerHTML = '<p class="muted">Buscando…</p>';
  const { data: s, error } = await sb.rpc('of_consultar', { p_ci: q });
  if (error) { out.innerHTML = '<div class="alert crit">No pudimos consultar. Revisa tu conexión e intenta de nuevo.</div>'; return; }
  if (!s.encontrado) { out.innerHTML = '<div class="alert crit"><b>No encontramos una inscripción con ese carnet.</b> Revisa el número. ' + (state.abierto && state.cierre ? 'Si aún no te inscribiste, puedes hacerlo hasta el ' + fmtF(state.cierre) + '.' : 'Las inscripciones ya cerraron.') + '</div>'; return; }
  let est;
  if (s.pago === 'verificado') est = '<div class="alert ok"><b>Estás inscrito.</b> Tus documentos y tu pago fueron verificados.</div>';
  else if (s.pago === 'rechazado') est = '<div class="alert crit"><b>Tu inscripción necesita una corrección.</b><br>Motivo: ' + esc(s.motivo || 'revisa tus documentos') + '</div>' +
    '<div style="margin-top:12px"><p style="margin:0 0 8px"><b>Vuelve a subir el documento</b> (imagen o PDF)</p><div class="grid">' +
    '<div><label for="rc-doc">¿Qué documento subes?</label><select id="rc-doc"><option value="comp">Comprobante de pago</option><option value="ci">Cédula de identidad</option><option value="aut">Autorización firmada</option><option value="curso">Documento del curso</option></select></div>' +
    '<div><label for="rc-file">Archivo</label><input type="file" id="rc-file" accept="image/*,.pdf"></div>' +
    '<div class="rc-p"><label for="rc-tx">N.º de transacción</label><input id="rc-tx" value="' + esc(s.tx || '') + '"></div>' +
    '<div class="rc-p"><label for="rc-fp">Fecha del pago</label><input id="rc-fp" type="date"></div></div>' +
    '<div id="rc-err"></div><p style="margin-top:10px"><button class="btn red" id="rc-send" type="button">Enviar corrección</button></p></div>';
  else est = '<div class="alert ok"><b>Estás inscrito.</b> Tus documentos están completos. Tu pago está pendiente de verificación.</div>';
  out.innerHTML = (aviso || '') + '<div class="card" style="margin:12px 0 0"><p style="margin:0"><b>' + esc(s.nombre) + '</b></p><p class="muted" style="margin:0">' + E.nombreArea(s.area) + ' · ' + CURSO[s.curso] + ' de secundaria</p>' + est +
    (state.resultados ? '<p style="margin:12px 0 0"><button class="btn" id="c-res-b" type="button">Ver mi resultado</button></p><div id="c-res"></div>' : '') + '</div>';
  if (s.pago === 'rechazado') {
    const sync = () => document.querySelectorAll('.rc-p').forEach(e => (e.hidden = $('rc-doc').value !== 'comp'));
    $('rc-doc').addEventListener('change', sync); sync();
    $('rc-send').addEventListener('click', async () => {
      const errs = [], f = $('rc-file').files[0], esPago = $('rc-doc').value === 'comp';
      if (!f) errs.push('Sube el archivo.'); else if (!archivoOk(f)) errs.push('Sube una imagen o un PDF.');
      if (esPago && $('rc-tx').value.trim().length < 3) errs.push('Escribe el número de transacción.');
      if (esPago && !fechaPasada($('rc-fp').value)) errs.push('Indica la fecha del pago.');
      errsList($('rc-err'), errs); if (errs.length) return;
      await conBoton($('rc-send'), 'Enviando…', async () => {
        try {
          const path = await subirDoc(f, nuevaCarpeta('r'), $('rc-doc').value);
          const { error: er } = await sb.rpc('of_reenviar', { p_ci: q, p_doc: $('rc-doc').value, p_path: path, p_tx: esPago ? $('rc-tx').value.trim() : null, p_fecha: esPago ? $('rc-fp').value : null });
          if (er) throw er;
          consultar('<div class="alert ok"><b>Recibimos tu corrección.</b> La organización la revisará nuevamente.</div>');
        } catch (e) { errsList($('rc-err'), [msgErr(e)]); }
      });
    });
  }
  if (state.resultados) $('c-res-b').addEventListener('click', async () => {
    const { data, error: er } = await sb.rpc('of_resultado', { p_ci: q });
    $('c-res').innerHTML = er ? '<div class="alert crit">No pudimos cargar tu resultado.</div>' : resultadoHTML(data);
  });
}
$('c-btn').addEventListener('click', () => consultar());
$('c-ci').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); consultar(); } });

/* ---------- consultas de los usuarios ---------- */
$('q-send').addEventListener('click', async () => {
  const n = $('q-n').value.trim(), w = $('q-w').value, m = $('q-m').value.trim(), errs = [];
  if (n.length < 5) errs.push('Escribe tu nombre.');
  if (!celularOk(w)) errs.push('Escribe tu WhatsApp' + MSG_CEL + '.');
  if (m.length < 10) errs.push('Escribe tu consulta (al menos 10 letras).');
  errsList($('q-errs'), errs); if (errs.length) return;
  await conBoton($('q-send'), 'Enviando…', async () => {
    const { data, error } = await sb.rpc('of_consulta_enviar', { p_nombre: n, p_wa: w, p_msg: m });
    if (error) { errsList($('q-errs'), [msgErr(error)]); return; }
    ['q-n', 'q-w', 'q-m'].forEach(id => ($(id).value = ''));
    $('q-ok').innerHTML = '<div class="alert ok"><b>Recibimos tu consulta.</b> Tu código es <span class="mono">' + esc(data) + '</span>. Guárdalo: con él podrás ver la respuesta aquí mismo. Las consultas se revisan por las noches.</div>';
  });
});
$('q-ver').addEventListener('click', async () => {
  const { data, error } = await sb.rpc('of_consulta_ver', { p_cod: $('q-cod').value });
  $('q-resp').innerHTML = error ? '<div class="alert crit">No pudimos consultar. Intenta de nuevo.</div>' : !data || !data.msg ? '<div class="alert crit">No encontramos una consulta con ese código.</div>'
    : '<div class="card" style="margin:12px 0 0"><p class="muted" style="margin:0"><small>Tu consulta</small></p><p>' + esc(data.msg) + '</p>' + (data.resp ? '<div class="alert ok"><b>Respuesta de la organización</b><br>' + esc(data.resp) + '</div>' : '<div class="alert warn">Todavía no respondemos. Las consultas se revisan por las noches.</div>') + '</div>';
});

renderInfo(); cargarEstado();
