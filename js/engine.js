/* Motor de reglas Olimpiadas FICAM 2026 (borrador). Sin dependencias. */
const Engine = (function () {
  const BIO = 'ING_BIOMEDICA';
  const CARRERAS = [
    { id: 'ING_ELECTROMECANICA', nombre: 'Ing. Electromecánica' },
    { id: 'ING_MECATRONICA', nombre: 'Ing. Mecatrónica' },
    { id: 'ING_ELECTRONICA', nombre: 'Ing. Electrónica' },
    { id: 'ING_ELECTRICA', nombre: 'Ing. Eléctrica' },
    { id: BIO, nombre: 'Ing. Biomédica' },
    { id: 'ING_MECANICA', nombre: 'Ing. Mecánica' }
  ];
  const AREAS = [
    { id: 'FISICA', nombre: 'Física' },
    { id: 'QUIMICA_APLICADA', nombre: 'Química Aplicada' },
    { id: 'MATEMATICAS', nombre: 'Matemáticas' },
    { id: 'ROBOTICA', nombre: 'Robótica' },
    { id: 'BIOINGENIERIA', nombre: 'Bioingeniería' }
  ];
  const nombreCarrera = id => (CARRERAS.find(c => c.id === id) || {}).nombre || id;
  const nombreArea = id => (AREAS.find(a => a.id === id) || {}).nombre || id;

  /* Restricciones de preferencia por área */
  function reglas(area) {
    const a = nombreArea(area);
    if (area === 'QUIMICA_APLICADA' || area === 'BIOINGENIERIA')
      return { primera: BIO, ultima: null, texto: 'Como compites en el área de ' + a + ', Ingeniería Biomédica ya está colocada como tu primera opción y no se puede mover. Ordena las otras 5 carreras de la que más te interesa a la que menos.' };
    if (area === 'MATEMATICAS' || area === 'ROBOTICA')
      return { primera: null, ultima: BIO, texto: 'Como compites en el área de ' + a + ', Ingeniería Biomédica queda como tu última opción y no se puede mover. Ordena las otras 5 carreras de la que más te interesa a la que menos.' };
    return { primera: null, ultima: null, texto: 'Como compites en el área de ' + a + ', puedes ordenar las 6 carreras libremente, de la que más te interesa a la que menos.' };
  }

  function validarPrefs(area, p) {
    const ids = CARRERAS.map(c => c.id);
    if (!Array.isArray(p) || p.length !== 6) return ['Debes ordenar las 6 carreras.'];
    const e = [];
    if (new Set(p).size !== 6 || !p.every(x => ids.includes(x))) e.push('El orden tiene carreras repetidas o desconocidas.');
    const r = reglas(area);
    if (r.primera && p[0] !== r.primera) e.push('La primera opción debe ser ' + nombreCarrera(r.primera) + '.');
    if (r.ultima && p[5] !== r.ultima) e.push(nombreCarrera(r.ultima) + ' debe quedar en último lugar.');
    return e;
  }

  function prefsPorDefecto(area) {
    const r = reglas(area);
    const rest = CARRERAS.map(c => c.id).filter(id => id !== r.primera && id !== r.ultima);
    return [].concat(r.primera ? [r.primera] : [], rest, r.ultima ? [r.ultima] : []);
  }

  /* Asignación de plazas.
     Entrada: lista de { id, area, curso, nota, registro, prefs, comision? }
     Reglas: solo sexto; mínimo 51; podio (3 mejores de cada área) entra a su 1.ª opción;
     el resto compite en un ranking mezclado; tope 12 por área y 10 por carrera. */
  function asignar(lista, opts) {
    const o = Object.assign({ minNota: 51, porCarrera: 10, porArea: 12, podio: 3 }, opts || {});
    const cupo = {}, cupoArea = {}, res = {};
    CARRERAS.forEach(c => (cupo[c.id] = o.porCarrera));
    AREAS.forEach(a => (cupoArea[a.id] = o.porArea));
    const ord = s => (s.comision == null ? 1e9 : s.comision);
    const cmp = (a, b) => b.nota - a.nota || ord(a) - ord(b) || a.registro - b.registro;

    const elegibles = [];
    for (const s of lista) {
      let m = null;
      if (s.curso !== 6) m = 'NO_SEXTO';
      else if (s.nota == null) m = 'SIN_NOTA';
      else if (s.nota < o.minNota) m = 'BAJO_MINIMO';
      else if (validarPrefs(s.area, s.prefs).length) m = 'PREFS_INVALIDAS';
      if (m) res[s.id] = { estado: 'NO_ADMITIDO', motivo: m, carrera: null, puesto: null };
      else elegibles.push(s);
    }

    const porArea = {};
    AREAS.forEach(a => (porArea[a.id] = elegibles.filter(s => s.area === a.id).sort(cmp)));
    const podio = new Set();
    for (const a of AREAS) {
      porArea[a.id].forEach((s, i) => (res[s.id] = { estado: 'PENDIENTE', puesto: i + 1, carrera: null, motivo: null }));
      porArea[a.id].slice(0, o.podio).forEach(s => {
        const c = s.prefs[0];
        if (cupo[c] > 0 && cupoArea[a.id] > 0) {
          cupo[c]--; cupoArea[a.id]--; podio.add(s.id);
          res[s.id] = Object.assign(res[s.id], { estado: 'ADMITIDO_PODIO', carrera: c, preferenciaN: 1 });
        }
      });
    }

    const pool = elegibles.filter(s => !podio.has(s.id)).sort(cmp);
    pool.forEach((s, i) => {
      const r = res[s.id];
      r.puestoGlobal = i + 1;
      if (cupoArea[s.area] <= 0) { r.estado = 'NO_ADMITIDO'; r.motivo = 'AREA_LLENA'; return; }
      const c = s.prefs.find(x => cupo[x] > 0);
      if (c) {
        cupo[c]--; cupoArea[s.area]--;
        Object.assign(r, { estado: 'ADMITIDO_RANKING', carrera: c, preferenciaN: s.prefs.indexOf(c) + 1 });
      } else { r.estado = 'NO_ADMITIDO'; r.motivo = 'SIN_CUPO'; }
    });

    /* Empates que la comisión del área debe resolver */
    const resuelto = g => g.every(s => s.comision != null) && new Set(g.map(s => s.comision)).size === g.length;
    const empates = [];
    for (const a of AREAS) {
      const L = porArea[a.id];
      if (L.length > o.podio && L[o.podio - 1].nota === L[o.podio].nota) {
        const g = L.filter(s => s.nota === L[o.podio].nota);
        empates.push({ tipo: 'PODIO', area: a.id, nota: g[0].nota, ids: g.map(s => s.id), resuelto: resuelto(g) });
      }
    }
    const porNota = {};
    pool.forEach(s => (porNota[s.nota] = porNota[s.nota] || []).push(s));
    for (const n in porNota) {
      const g = porNota[n];
      if (g.length < 2) continue;
      /* Solo importa si el orden del empate puede cambiar quién entra:
         uno admitido y otro rechazado por falta de cupo en carreras,
         o rechazado por área llena mientras otro de su misma área sí entró. */
      const entran = g.filter(s => res[s.id].carrera);
      const afecta = g.some(b => {
        const r = res[b.id];
        if (r.carrera) return false;
        if (r.motivo === 'SIN_CUPO') return entran.length > 0;
        if (r.motivo === 'AREA_LLENA') return entran.some(a => a.area === b.area);
        return false;
      });
      if (afecta) empates.push({ tipo: 'RANKING', area: null, nota: +n, ids: g.map(s => s.id), resuelto: resuelto(g) });
    }

    const ocupC = {}, ocupA = {}, eleg = {};
    CARRERAS.forEach(c => (ocupC[c.id] = o.porCarrera - cupo[c.id]));
    AREAS.forEach(a => { ocupA[a.id] = o.porArea - cupoArea[a.id]; eleg[a.id] = porArea[a.id].length; });
    const admitidos = Object.values(ocupC).reduce((x, y) => x + y, 0);
    return { res, carreras: ocupC, areas: ocupA, elegibles: eleg, empates, admitidos, plazasLibres: o.porCarrera * CARRERAS.length - admitidos, opts: o };
  }

  /* Podios por área y categoría, para los certificados (todas las categorías) */
  function podiosCertificados(lista) {
    const out = {};
    AREAS.forEach(a => {
      out[a.id] = {};
      [3, 4, 5, 6].forEach(c => {
        out[a.id][c] = lista
          .filter(s => s.area === a.id && s.curso === c && s.nota != null)
          .sort((x, y) => y.nota - x.nota || x.registro - y.registro)
          .slice(0, 3);
      });
    });
    return out;
  }

  return { CARRERAS, AREAS, BIO, nombreCarrera, nombreArea, reglas, validarPrefs, prefsPorDefecto, asignar, podiosCertificados };
})();
if (typeof module !== 'undefined') module.exports = Engine;
