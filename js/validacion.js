/* Pestaña "Validación": progreso, observaciones, historial y control del enlace. */
const AREA_V = { FISICA: 'Física', QUIMICA_APLICADA: 'Química Aplicada', MATEMATICAS: 'Matemáticas', ROBOTICA: 'Robótica', BIOINGENIERIA: 'Bioingeniería' };
const DOC_V = { nom: 'nombre exacto', ci: 'carnet', col: 'colegio/curso', ced: 'cédula', rec: 'recibo', bol: 'boleta', for: 'formulario', pago: 'pago Bs 20' };
let valDatos = [], valClave = null;
const linkVal = () => location.origin + location.pathname.replace(/admin\.html$/, '').replace(/\/$/, '') + '/validar.html?k=' + valClave.clave;

async function cargarVal() {
  try {
    const [c, v, i, l] = await Promise.all([
      sb.rpc('of_val_clave'),
      sb.from('of_val').select('inscrito_id,chk,ok,obs,por,foto,actualizado'),
      sb.from('of_inscritos').select('id,nombre,ci,tx,area,curso,colegio'),
      sb.from('of_val_log').select('inscrito_id,por,campo,antes,despues,cuando').order('cuando', { ascending: false }).limit(60)
    ]);
    if (c.error || v.error || i.error || l.error) throw (c.error || v.error || i.error || l.error);
    valClave = c.data;
    const por = {}; (v.data || []).forEach(x => (por[x.inscrito_id] = x));
    valDatos = (i.data || []).map(s => Object.assign({}, s, { v: por[s.id] || null }))
      .sort((a, b) => (parseInt(a.tx, 10) || 9e15) - (parseInt(b.tx, 10) || 9e15));
    const nom = {}; valDatos.forEach(s => (nom[s.id] = s.nombre));
    pintarVal(l.data || [], nom);
  } catch (e) { $('val-res').innerHTML = '<div class="alert crit">No se pudo cargar: ' + esc(e.message || e) + '</div>'; }
}
function pintarVal(log, nom) {
  $('val-link').value = linkVal();
  $('val-est').textContent = valClave.activa ? 'Enlace activo' : 'Enlace ANULADO';
  $('val-toggle').textContent = valClave.activa ? 'Anular' : 'Reactivar';
  const tot = valDatos.length, ok = valDatos.filter(s => s.v && s.v.ok && !s.v.obs).length, ob = valDatos.filter(s => s.v && !(s.v.ok && !s.v.obs)).length;
  $('val-res').innerHTML = '<div class="alert ' + (ok === tot ? 'ok' : 'warn') + '"><b>' + (ok + ob) + ' de ' + tot + ' revisados</b> · ' + ok + ' validados · ' + ob + ' con observación o faltantes · ' + (tot - ok - ob) + ' sin validar</div>';
  const prob = valDatos.filter(s => s.v && !(s.v.ok && !s.v.obs));
  $('val-obs').innerHTML = prob.length ? prob.map(s => {
    const falta = Object.keys(DOC_V).filter(k => !(s.v.chk || {})[k]).map(k => DOC_V[k]);
    return '<div style="margin:8px 0;padding-bottom:8px;border-bottom:1px solid #ddd"><b>Recibo ' + esc(s.tx) + ' · ' + esc(s.nombre) + '</b> <small class="muted">' + esc(AREA_V[s.area] || s.area) + ' · ' + s.curso + 'º · ' + esc(s.colegio) + ' · validó ' + esc(s.v.por) + '</small>' +
      (s.v.obs ? '<br>📝 ' + esc(s.v.obs) : '') + (falta.length ? '<br><small>Sin marcar: ' + esc(falta.join(', ')) + '</small>' : '') +
      (s.v.foto ? ' <button class="btn ghost sm" data-foto="' + esc(s.id) + '" type="button">Ver foto</button>' : '') + '</div>';
  }).join('') : '<p class="muted">Sin observaciones por ahora.</p>';
  $('val-obs').querySelectorAll('[data-foto]').forEach(b => b.addEventListener('click', async () => {
    const r = await sb.from('of_val').select('foto').eq('inscrito_id', b.dataset.foto).single();
    if (r.data && r.data.foto) { const w = window.open(); if (w) w.document.write('<img style="max-width:100%" src="' + r.data.foto + '">'); }
  }));
  $('val-log').innerHTML = log.length ? '<table><tr><th>Cuándo</th><th>Estudiante</th><th>Campo</th><th>Antes</th><th>Ahora</th><th>Por</th></tr>' + log.map(x => '<tr><td>' + new Date(x.cuando).toLocaleString('es-BO') + '</td><td>' + esc(nom[x.inscrito_id] || '') + '</td><td>' + esc(x.campo) + '</td><td>' + esc(x.antes ?? '') + '</td><td>' + esc(x.despues ?? '') + '</td><td>' + esc(x.por) + '</td></tr>').join('') + '</table>' : '<p class="muted">Aún no se ha corregido ningún dato.</p>';
}
$('val-rec').addEventListener('click', cargarVal);
$('val-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('val-link').value); $('val-copy').textContent = '¡Copiado!'; } catch (e) { $('val-link').select(); } setTimeout(() => ($('val-copy').textContent = 'Copiar enlace'), 1500); });
async function cambiarClave(accion) { const r = await sb.rpc('of_val_clave_cambiar', { p_accion: accion }); if (r.error) { alert(r.error.message); return; } cargarVal(); }
$('val-regen').addEventListener('click', () => { if (confirm('El enlace anterior dejará de funcionar. ¿Generar uno nuevo?')) cambiarClave('regenerar'); });
$('val-toggle').addEventListener('click', () => cambiarClave(valClave && valClave.activa ? 'anular' : 'activar'));
$('val-csv').addEventListener('click', () => {
  const cab = ['Recibo', 'Nombre', 'Carnet', 'Colegio', 'Curso', 'Área', 'Estado', 'Validado por', 'Observación', 'Sin marcar'];
  const f = valDatos.map(s => [s.tx, s.nombre, s.ci, s.colegio, s.curso, AREA_V[s.area] || s.area, !s.v ? 'Sin validar' : (s.v.ok && !s.v.obs ? 'Validado' : 'Con observación'), s.v ? s.v.por : '', s.v ? (s.v.obs || '') : '', s.v ? Object.keys(DOC_V).filter(k => !(s.v.chk || {})[k]).map(k => DOC_V[k]).join('; ') : ''].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(','));
  const blob = new Blob(['﻿' + [cab.join(',')].concat(f).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'validacion_ficam.csv'; a.click();
});
window.cargarVal = cargarVal;
