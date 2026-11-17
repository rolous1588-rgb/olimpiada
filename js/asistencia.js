/* Pestaña "Asistencia": quién se presentó al examen. Orden: área y curso (como los exámenes). */
const AREAS_A = { FISICA: 'Física', QUIMICA_APLICADA: 'Química Aplicada', MATEMATICAS: 'Matemáticas', BIOINGENIERIA: 'Bioingeniería', ROBOTICA: 'Robótica' };
let asDatos = [];
async function cargarAsi() {
  try {
    const [i, a] = await Promise.all([
      sb.from('of_inscritos').select('id,nombre,ci,tx,area,curso,colegio,agregado_examen').range(0, 999),
      sb.from('of_asist').select('inscrito_id,presente,cuando').range(0, 999)
    ]);
    if (i.error || a.error) throw (i.error || a.error);
    const m = {}; (a.data || []).forEach(x => (m[x.inscrito_id] = x));
    asDatos = (i.data || []).map(s => Object.assign({}, s, { a: m[s.id] || null }));
    pintarAsi();
  } catch (e) { $('as-res').innerHTML = '<div class="alert crit">No se pudo cargar: ' + esc(e.message || e) + '</div>'; }
}
function pintarAsi() {
  const q = $('as-q').value.trim().toLowerCase(), solo = $('as-pend').checked;
  const pres = asDatos.filter(s => s.a && s.a.presente).length, aus = asDatos.filter(s => s.a && !s.a.presente).length, sin = asDatos.length - pres - aus, ag = asDatos.filter(s => s.agregado_examen).length;
  $('as-res').innerHTML = '<div class="alert ' + (sin ? 'warn' : 'ok') + '"><b>' + pres + ' presentados</b> de ' + asDatos.length + ' · ' + aus + ' no se presentaron · ' + sin + ' sin marcar · ' + ag + ' agregados en el examen</div>';
  let html = '';
  Object.keys(AREAS_A).forEach(ar => {
    const g = asDatos.filter(s => s.area === ar); if (!g.length) return;
    html += '<div class="card"><h3>' + AREAS_A[ar] + ' · ' + g.filter(s => s.a && s.a.presente).length + ' de ' + g.length + '</h3>';
    [3, 4, 5, 6].forEach(c => {
      const L = g.filter(s => s.curso === c).sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')).filter(s => (!q || (s.nombre + ' ' + s.ci).toLowerCase().includes(q)) && (!solo || !s.a));
      if (!L.length) return;
      html += '<p><b>' + c + 'º de secundaria</b> <small class="muted">' + g.filter(s => s.curso === c && s.a && s.a.presente).length + ' de ' + g.filter(s => s.curso === c).length + '</small></p>' + L.map(s => '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd"><div><b>' + esc(s.nombre) + '</b>' + (s.agregado_examen ? ' <small style="color:#b45309">· agregado en el examen</small>' : '') + '<br><small class="muted">CI ' + esc(s.ci) + ' · ' + esc(s.colegio) + '</small></div><div style="white-space:nowrap"><button class="btn sm ' + (s.a && s.a.presente ? 'red' : 'ghost') + '" data-id="' + s.id + '" data-p="1" type="button">' + (s.a && s.a.presente ? '✔ Se presentó' : 'Se presentó') + '</button> <button class="btn sm ' + (s.a && !s.a.presente ? 'red' : 'ghost') + '" data-id="' + s.id + '" data-p="0" type="button">No</button></div></div>').join('');
    });
    html += '</div>';
  });
  $('as-lista').innerHTML = html || '<p class="muted">Nada que mostrar.</p>';
  $('as-lista').querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => marcarAsi(b.dataset.id, b.dataset.p === '1')));
}
async function marcarAsi(id, presente) {
  const s = asDatos.find(x => x.id === id); if (!s) return;
  if (s.a && s.a.presente === presente) { const r = await sb.from('of_asist').delete().eq('inscrito_id', id); if (r.error) { alert(r.error.message); return; } s.a = null; }
  else { const r = await sb.from('of_asist').upsert({ inscrito_id: id, presente, cuando: new Date().toISOString() }); if (r.error) { alert(r.error.message); return; } s.a = { presente, cuando: new Date().toISOString() }; }
  pintarAsi();
}
$('as-q').addEventListener('input', pintarAsi);
$('as-pend').addEventListener('change', pintarAsi);
$('as-add').addEventListener('click', () => ($('as-form').hidden = !$('as-form').hidden));
$('af-no').addEventListener('click', () => ($('as-form').hidden = true));
$('af-ok').addEventListener('click', async () => {
  const nombre = $('af-nom').value.trim().replace(/\s+/g, ' '), ci = $('af-ci').value.trim().replace(/\s+/g, ''), col = $('af-col').value.trim();
  if (nombre.length < 5 || ci.length < 4 || col.length < 2) { $('af-m').textContent = 'Completa nombre, carnet y colegio.'; return; }
  const cod = 'OF26-X' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const r = await sb.from('of_inscritos').insert({ codigo: cod, nombre, ci, colegio: col, curso: +$('af-cur').value, area: $('af-area').value, tx: $('af-tx').value.trim() || null, municipio: 'Sucre', departamento: 'Chuquisaca', tipo_colegio: 'por definir', tutor_nombre: 'Agregado en el examen', tutor_celular: '00000000', via: 'individual', pago: 'pendiente', agregado_examen: true }).select('id').single();
  if (r.error) { $('af-m').textContent = 'No se pudo: ' + r.error.message; return; }
  const a = await sb.from('of_asist').upsert({ inscrito_id: r.data.id, presente: true });
  if (a.error) { $('af-m').textContent = 'Se registró pero no se marcó: ' + a.error.message; return; }
  ['af-nom', 'af-ci', 'af-col', 'af-tx'].forEach(k => ($(k).value = '')); $('af-m').textContent = ''; $('as-form').hidden = true; cargarAsi();
});
$('as-csv').addEventListener('click', () => {
  const cab = ['Área', 'Curso', 'Nombre', 'Carnet', 'Colegio', 'Recibo', 'Asistencia', 'Agregado en el examen'];
  const f = asDatos.slice().sort((x, y) => Object.keys(AREAS_A).indexOf(x.area) - Object.keys(AREAS_A).indexOf(y.area) || x.curso - y.curso || x.nombre.localeCompare(y.nombre, 'es')).map(s => [AREAS_A[s.area], s.curso, s.nombre, s.ci, s.colegio, s.tx || '', !s.a ? 'Sin marcar' : (s.a.presente ? 'Se presentó' : 'No se presentó'), s.agregado_examen ? 'Sí' : ''].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(','));
  const blob = new Blob(['﻿' + [cab.join(',')].concat(f).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'asistencia_ficam.csv'; a.click();
});
window.cargarAsi = cargarAsi;
