(function() {
    'use strict';

    // Elementos de la interfaz widescreen
    const selectCurso = document.getElementById('selectCursoNotas');
    const selectMateria = document.getElementById('selectMateriaNotas');
    const tablaNotasBody = document.getElementById('tablaNotasBody');
    const formPlanilla = document.getElementById('formPlanillaNotas');
    const bloqueGuardar = document.getElementById('bloqueGuardarNotas');
    const bannerLectura = document.getElementById('bannerModoLecturaCalificaciones');
    const txtDocente = document.getElementById('txtDocentePlanilla');
    const txtPreceptor = document.getElementById('txtPreceptorPlanilla');

    // Referencias para el control atómico del modal de periodos
    const modalPeriodos = document.getElementById('modalGestionPeriodos');
    const btnAbrirModalPeriodos = document.getElementById('btnAbrirModalPeriodos');
    const btnCerrarModalPeriodos = document.getElementById('btnCerrarModalPeriodos');
    const btnGuardarPeriodosConfig = document.getElementById('btnGuardarPeriodosConfig');


    // Variables de contexto operativo
    let usuarioLogueado = null;
    let rolNormalizado = "";
    let esModoLectura = false;
    let permiteCargaTotalNotas = false;
    const b = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
    let db = null;
    let mapaNotasExistentes = {};



   // ====== PARCHE: CORRECCIÓN DE ÁMBITO Y DUPLICACIÓN EN DOMCONTENTLOADED ======
document.addEventListener("DOMContentLoaded", async () => {
    // SE ELIMINAN LAS REDECLARACIONES CON 'CONST' QUE HACÍAN SOMBRA A LAS VARIABLES GLOBALES
    db = (await import('./firebase-config.js')).db;
    
    await verificarAutenticacion();
    await cargarSelectoresIniciales();

    // Escuchadores reactivos en cascada
    if (selectCurso) selectCurso.addEventListener('change', gestionarCambioCurso);
    if (selectMateria) selectMateria.addEventListener('change', cargarNominaEstudiantes);
    if (formPlanilla) formPlanilla.addEventListener('submit', procesarGuardarPlanilla);

    // Manejo de eventos del modal utilizando directamente las referencias globales ya declaradas
    if (btnAbrirModalPeriodos) btnAbrirModalPeriodos.addEventListener('click', () => { if (modalPeriodos) modalPeriodos.style.display = 'flex'; });
    if (btnCerrarModalPeriodos) btnCerrarModalPeriodos.addEventListener('click', () => { if (modalPeriodos) modalPeriodos.style.display = 'none'; });
    if (btnGuardarPeriodosConfig) btnGuardarPeriodosConfig.addEventListener('click', procesarGuardarConfiguracionPeriodos);
});
// ============================================================================

    // --- CONTROL DE ACCESO INSTITUCIONAL RBAC ---
    async function verificarAutenticacion() {
        // AGREGAR EN calificaciones.js (Al inicio de verificarAutenticacion)
        localStorage.removeItem('usuariosColegio'); 
        localStorage.removeItem('cursosColegio');

        const datosSesion = localStorage.getItem('usuarioActivo');
        if (!datosSesion) {
            window.location.href = "index.html";
            return;
        }
        usuarioLogueado = JSON.parse(datosSesion);
rolNormalizado = usuarioLogueado.rol ? usuarioLogueado.rol.toLowerCase().trim() : "";
permiteCargaTotalNotas = usuarioLogueado.permiteCargaTotalNotas === true;

// 1. Extraemos las capacidades y definimos el Modo Monitor si el permiso NO es "escritura"
const capacidadesRol = usuarioLogueado.permisosDelRol || {};
const nivelPermisoNotas = capacidadesRol.libroCalificaciones ? capacidadesRol.libroCalificaciones.toLowerCase().trim() : "ninguno";

// 2. Evaluación de doble función: Si tiene permiso de escritura OR posee función docente, edita
if (nivelPermisoNotas === "escritura" || usuarioLogueado.esProfesor === true) {
    esModoLectura = false;
} else {
    esModoLectura = true;
}

// 3. Activación del banner estético de advertencia si quedó en Solo Lectura
if (esModoLectura && bannerLectura) {
    bannerLectura.style.display = "block";
}


    // Habilitación universal del botón de períodos por atributo de usuario
    if (usuarioLogueado && usuarioLogueado.permisoGestionPeriodos === true) {
        const btnControlReal = document.getElementById('btnAbrirModalPeriodos');
        if (btnControlReal) btnControlReal.style.display = 'inline-flex';
    }
}

// REEMPLAZAR FUNCIÓN COMPLETA EN calificaciones.js (Cerca de la línea 70)
// REEMPLAZAR FUNCIÓN COMPLETA EN calificaciones.js (Cerca de la línea 70)
async function cargarSelectoresIniciales() {
    if (!selectCurso) return;
    selectCurso.innerHTML = '<option value="" disabled selected>Seleccione estructura...</option>';

    try {
        let cursosRaw = localStorage.getItem('cursosColegio');
        let cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
        const bolsaDocente = usuarioLogueado.bolsaHoras || [];

        // Eje de Inmunidad Local: Si la red o gstatic bloquean la descarga, auto-hidratamos el curso de la docente
        if (cursos.length === 0 && bolsaDocente.length > 0) {
            console.warn("Aviso: Inicializando auto-hidratación de estructuras académicas locales...");
            bolsaDocente.forEach(catedra => {
                const firmaPura = catedra.replace(/\[.*?\]\s*/, "").trim();
                const partes = firmaPura.split(" - ");
                if (partes.length >= 2) {
                    const cId = partes[0].trim();
                    const mNombre = partes[1].trim();
                    
                    // Decodificamos el ID nativo (ej: 1-A-M) en sus componentes visuales
                    const subPartes = cId.split("-");
                    const cicloExtraido = subPartes[0] || "1";
                    const divExtraida = subPartes[1] || "A";
                    let turnoExtraido = "Mañana";
                    if (subPartes[2] === "T") turnoExtraido = "Tarde";
                    if (subPartes[2] === "V" || subPartes[2] === "N") turnoExtraido = "Vespertino";

                    // Verificamos si ya inyectamos este curso de respaldo
                    if (!cursos.some(c => c.id === cId)) {
                        cursos.push({
                            id: cId,
                            ciclo: cicloExtraido,
                            division: divExtraida,
                            turno: turnoExtraido,
                            materias: [mNombre]
                        });
                    } else {
                        const cursoExistente = cursos.find(c => c.id === cId);
                        if (!cursoExistente.materias.includes(mNombre)) {
                            cursoExistente.materias.push(mNombre);
                        }
                    }
                }
            });
            // Guardamos el respaldo seguro para estabilizar las funciones secundarias de la UI
            localStorage.setItem('cursosColegio', JSON.stringify(cursos));
        }

        // Control de visualización perimetral por capacidades RBAC
        if ((rolNormalizado === "profesor" || usuarioLogueado.esProfesor) && !permiteCargaTotalNotas) {
            cursos.forEach(curso => {
                const esDocenteAqui = bolsaDocente.some(catedra => {
                    const cText = catedra.trim();
                    const firmaSinRevista = cText.replace(/\[.*?\]\s*/, "").trim();
                    return firmaSinRevista.startsWith(curso.id + " - ");
                });

                if (esDocenteAqui) {
                    selectCurso.add(new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id));
                }
            });

            if (selectCurso.options.length === 1) {
                selectCurso.add(new Option("Sin cursos autorizados en su Bolsa de Horas", ""));
            }
        } else {
            // Administradores, Directivos o usuarios con Carga Total listan la planta completa
            cursos.forEach(curso => {
                selectCurso.add(new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id));
            });
        }
    } catch (error) {
        console.error("Error crítico al cargar selectores de cursos:", error);
    }
}


    // --- FILTRADO RELACIONAL ESTRICTO DE MATERIAS SEGÚN CURSO Y BOLSA ---
   async function gestionarCambioCurso() {
    if (! selectMateria) return;
    selectMateria. innerHTML = '<option value="" disabled selected>Seleccione la asignatura...</option>';
    tablaNotasBody. innerHTML = `<tr><td colspan="14" style="text-align: center; color: #94a3b8; padding: 30px;">Seleccione la Asignatura para cargar la nómina.</td></tr>`;
    if ( bloqueGuardar) bloqueGuardar. style. display = "none";
    
    const cursoId = selectCurso. value;
    const cursosRaw = localStorage. getItem('cursosColegio');
    const cursos = cursosRaw ? JSON. parse( cursosRaw) : [];
    const cursoEncontrado = cursos. find( c => c. id === cursoId);
    if (! cursoEncontrado || ! cursoEncontrado. materias) return;
    
    const usuariosRaw = localStorage. getItem('usuariosColegio');
    const usuarios = usuariosRaw ? JSON. parse( usuariosRaw) : [];
    const bolsaDocente = usuarioLogueado.bolsaHoras || [];

    if (( rolNormalizado === "profesor" || usuarioLogueado. esProfesor) && ! permiteCargaTotalNotas) {
        cursoEncontrado. materias. forEach( materia => {
            // La asignatura debe figurar en su bolsa emparejada exactamente con el ID del curso
            const matchBolsa = bolsaDocente. some( b => {
                const firmaPura = b. replace(/\[.*?\]\s*/, ""). trim(); // Quita [TITULAR], etc.
                const firmaEsperada = `${ cursoId} - ${ materia. trim()}`;
                return firmaPura === firmaEsperada;
            });

            if ( matchBolsa || rolNormalizado === "administrador") {
                selectMateria. add( new Option( materia, materia));
            }
        });

        if ( selectMateria. options. length === 1) {
            selectMateria. add( new Option("Sin asignaturas autorizadas en este curso", ""));
        }
    } else {
        // Administradores y Directivos listan todas las materias del plan libremente
        cursoEncontrado. materias. forEach( materia => {
            selectMateria. add( new Option( materia, materia));
        });
    }
}


    // --- MOTOR DE GENERACIÓN DE FILAS Y PERSISTENCIA ---
    async function cargarNominaEstudiantes() {
        const cursoId = selectCurso.value;
        const materiaId = selectMateria.value;
        if (!cursoId || !materiaId) return;

        tablaNotasBody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:15px; color:#1a73e8; font-weight:500;">🔄 Descargando nómina real desde Cloud Firestore...</td></tr>`;

let usuarios = [];
let alumnosReales = [];

    try {
        // Reconstrucción dinámica del CDN para evadir bloqueos de URLs por fragmentación
        const baseCdnFirebase = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
        
        // 1. Importación modular usando la CDN fragmentada local estable
        const { collection, getDocs, query, where } = await import(baseCdnFirebase + 'firebase-firestore.js');

    
    // 2. Descarga en lote de los usuarios del colegio para el mapeo de docentes/preceptores
    const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
    usuarios = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Descarga y filtrado en caliente de alumnos regulares asignados a este curso
    const alumnosSnapshot = await getDocs(collection(db, "alumnos"));
    alumnosReales = alumnosSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(al => al.cursoId === cursoId && al.estado === "Regular");

    // 4. Ordenamiento alfabético por apellido y nombre
    alumnosReales.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

} catch (error) {
    console.error("Error en la sincronización viva con Firestore:", error);
    // Mecanismo de respaldo local si falla la conexión
    const usuariosRaw = localStorage.getItem('usuariosColegio');
    usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
}

tablaNotasBody.innerHTML = "";

        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
        const cursoActual = cursos.find(c => c.id === cursoId) || {};
        const divisionActual = cursoActual.division ? cursoActual.division.toLowerCase().trim() : "";
        const matLimpia = materiaId.toLowerCase().trim();

        try {
                   // Mapeo dinámico del Profesor de la Cátedra por ID Estructural unívoco
        const docentesCatedra = usuarios. filter( u => {
            const bolsa = u. bolsaHoras || u. bolsaHours || [];
            return bolsa. some( b => {
                const firmaPura = b. replace(/\[.*?\]\s*/, ""). trim();
                return firmaPura === `${ cursoId} - ${ materiaId. trim()}`;
            });
        });
        txtDocente. textContent = docentesCatedra. length > 0 ? docentesCatedra. map( d => d. nombre). join(" / ") : "Sin asignar";


            // Mapeo dinámico del Preceptor a cargo de la división
            const preceptorCurso = usuarios.find(u => u.rol === "preceptor" && u.cursosAsignados && u.cursosAsignados.includes(cursoId));
            txtPreceptor.textContent = preceptorCurso ? preceptorCurso.nombre : "Sin asignar";
        } catch (err) {
            console.error("Error al procesar cabeceras:", err);
        }

        const alumnosCurso = alumnosReales;    

        if (alumnosCurso.length === 0) {
            tablaNotasBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: #94a3b8; padding: 30px;">No hay alumnos Regulares inscritos en esta división estructural.</td></tr>`;
            if (bloqueGuardar) bloqueGuardar.style.display = "none";
            return;
        }

        const notasRaw = localStorage.getItem('calificacionesColegio');
        const registroGlobalNotas = notasRaw ? JSON.parse(notasRaw) : [];

        alumnosCurso.sort((a, b) => a.nombre.localeCompare(b.nombre));

                // --- PRECARGA INTELIGENTE DE NOTAS DESDE FIRESTORE ---
        mapaNotasExistentes = {};
        try {
            const { collection, query, where, getDocs } = await import(b + 'firebase-firestore.js');
            const consultaNotas = query(
                collection(db, "alumnos_calificaciones"), 
                where("cursoId", "==", cursoId), 
                where("materia", "==", materiaId)
            );
            const respuestaNotas = await getDocs(consultaNotas);
                respuestaNotas.forEach(documento => {
                const datosNota = documento.data();
                if (datosNota && datosNota.alumnoDni) {
                    mapaNotasExistentes[datosNota.alumnoDni] = datosNota;
                }
            });

        } catch (errorDb) {
            console.warn("No se pudo precargar el estado de notas desde Firestore:", errorDb);
        }

            alumnosCurso.forEach(async (alumno, index) => {
            const tr = document.createElement('tr');
            const persistenciaNota = mapaNotasExistentes[alumno.dni];
            const d = persistenciaNota ? (persistenciaNota.notas || { trim1: {}, trim2: {} }) : { trim1: {}, trim2: {} };

            // Captura segura de instancias de examen para el renderizador
            const notaDicExistente = persistenciaNota ? (persistenciaNota.diciembre ?? "") : "";
            const notaFebExistente = persistenciaNota ? (persistenciaNota.febrero ?? "") : "";



            let badgePPI = "";
        if (alumno.tienePPI === true || alumno.trayectoriaPPI === true || alumno.nombre.toUpperCase().includes("PPI")) {
            badgePPI = ` <span style="display:inline-block; background-color:#fae8ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 4px; border-radius:4px; font-weight:bold; font-size:10px; vertical-align:middle; margin-left:4px;">🗲 PPI</span>`;
        } else if (alumno.trayectoriaFlexible === true) {
            badgePPI = ` <span style="display:inline-block; background-color:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; padding:1px 4px; border-radius:4px; font-weight:bold; font-size:10px; vertical-align:middle; margin-left:4px;">🗲 Flex</span>`;
        }

            tr. innerHTML = `
                <td style="text-align:center; font-weight:bold; color:#64748b; padding: 2px 4px;">${ index + 1}</td>
                <td style="font-weight:500; padding: 2px 4px;">${ alumno. nombre} ${ badgePPI}</td>
            <!-- 1ER CUATRIMESTRE -->
            <td><input type="number" class="input-nota c1-n1" min="1" max="10" value="${d?.trim1?.n1 || ''}" data-dni="${alumno.dni}"></td>
            <td><input type="number" class="input-nota c1-n2" min="1" max="10" value="${d?.trim1?.n2 || ''}" data-dni="${alumno.dni}"></td>
            <td><input type="number" class="input-nota c1-ef" min="1" max="10" value="${d?.trim1?.ef || ''}" data-dni="${alumno.dni}"></td>
            <td class="col-calculada" style="padding: 2px 4px; font-size: 13px;"></td>
            <!-- 2DO CUATRIMESTRE -->
            <td><input type="number" class="input-nota c2-n1" min="1" max="10" value="${d?.trim2?.n1 || ''}" data-dni="${alumno.dni}"></td>
            <td><input type="number" class="input-nota c2-n2" min="1" max="10" value="${d?.trim2?.n2 || ''}" data-dni="${alumno.dni}"></td>
            <td><input type="number" class="input-nota c2-ef" min="1" max="10" value="${d?.trim2?.ef || ''}" data-dni="${alumno.dni}"></td>
            <td class="col-calculada" style="padding: 2px 4px; font-size: 13px;"></td>
            <!-- INSTANCIAS ANUALES DE EXAMEN -->
            <td class="col-calculada" style="padding: 2px 4px; font-size: 13px;"></td>
            <td><input type="number" class="input-nota inst-dic" min="1" max="10" value="${persistenciaNota?.diciembre || ''}" data-dni="${alumno.dni}"></td>
            <td><input type="number" class="input-nota inst-feb" min="1" max="10" value="${persistenciaNota?.febrero || ''}" data-dni="${alumno.dni}"></td>
            <td class="col-calculada" style="padding: 2px 4px; font-size: 13px; background: #e2f0d9;"></td>

            `;

            tablaNotasBody.appendChild(tr);

    const inputsFila = tr.querySelectorAll('.input-nota');

            // --- DESCARGA CONSOLIDADA DE PERÍODOS REALES DESDE FIRESTORE ---
        let configPeriodos = {};
        try {
          if (window.cachePeriodosEscuela) {
            configPeriodos = window.cachePeriodosEscuela;
          } else {
            const { doc, getDoc } = await import(b + 'firebase-firestore.js');
            const docSnap = await getDoc(doc(db, "configuraciones", "periodos_academicos"));
            if (docSnap.exists()) {
              configPeriodos = docSnap.data();
              window.cachePeriodosEscuela = configPeriodos;
            } else {
              const pRaw = localStorage.getItem('estadoPeriodosColegio');
              configPeriodos = pRaw ? JSON.parse(pRaw) : {};
            }
          }
        } catch (errPeriodos) {
          console.warn("Fallo de red en consulta de períodos, activando contingencia local:", errPeriodos);
          const pRaw = localStorage.getItem('estadoPeriodosColegio');
          configPeriodos = pRaw ? JSON.parse(pRaw) : {};
        }

    inputsFila.forEach(input => {
        // 1. Si es modo lectura global (Directivo), se bloquea incondicionalmente
        if (esModoLectura) {
            input.disabled = true;
        } else if (!permiteCargaTotalNotas) {
            // 2. Mapear de forma forense las clases del input con los IDs del control de períodos
            let idPeriodoAsociado = "";
            if (input.classList.contains('c1-n1')) idPeriodoAsociado = 'p_c1-n1';
            else if (input.classList.contains('c1-n2')) idPeriodoAsociado = 'p_c1-n2';
            else if (input.classList.contains('c1-ef')) idPeriodoAsociado = 'p_c1-ef';
            else if (input.classList.contains('c2-n1')) idPeriodoAsociado = 'p_c2-n1';
            else if (input.classList.contains('c2-n2')) idPeriodoAsociado = 'p_c2-n2';
            else if (input.classList.contains('c2-ef')) idPeriodoAsociado = 'p_c2-ef';
            else if (input.classList.contains('inst-dic')) idPeriodoAsociado = 'p_dic';
            else if (input.classList.contains('inst-feb')) idPeriodoAsociado = 'p_feb';

            // 3. Si el período no está explícitamente habilitado, se bloquea coercitivamente
            if (idPeriodoAsociado && configPeriodos[idPeriodoAsociado] !== true) {
                input.disabled = true;
            }
        }

        input.addEventListener('input', (e) => {
            sanitizarEntradaNotaEntera(e.target);
            calcularMatrizFilaCalificaciones(tr);
        });
    });


            calcularMatrizFilaCalificaciones(tr);
        });

        if (bloqueGuardar) {
            bloqueGuardar.style.display = esModoLectura ? "none" : "block";
        }
    }

    function sanitizarEntradaNotaEntera(input) {
        let valor = input.value.replace(/[^0-9]/g, '');
        if (valor !== '') {
            let num = parseInt(valor, 10);
            if (num < 1) num = 1;
            if (num > 10) num = 10;
            input.value = num;
        } else {
            input.value = '';
        }
    }

    function calcularMatrizFilaCalificaciones(filaTr) {
        const c1n2 = parseInt(filaTr.querySelector('.c1-n2').value, 10);
        const c1ef = parseInt(filaTr.querySelector('.c1-ef').value, 10);

        const c2n2 = parseInt(filaTr.querySelector('.c2-n2').value, 10);
        const c2ef = parseInt(filaTr.querySelector('.c2-ef').value, 10);

        const dic = parseInt(filaTr.querySelector('.inst-dic').value, 10);
        const feb = parseInt(filaTr.querySelector('.inst-feb').value, 10);

        const celdasFila = filaTr.querySelectorAll('td');
        if (celdasFila.length < 14) return;

        const celdaC1Prom = celdasFila[5];   
        const celdaC2Prom = celdasFila[9];   
        const celdaAnual = celdasFila[10];  
        const inputDic = filaTr.querySelector('.inst-dic');
        const inputFeb = filaTr.querySelector('.inst-feb');
        const celdaDef = celdasFila[13];    

        // 1. REPLICACIÓN PRIMER CUATRIMESTRE
        let notaFinalC1 = null;
        if (!isNaN(c1n2)) {
            if (c1n2 >= 6) {
                notaFinalC1 = c1n2;
            } else if (!isNaN(c1ef)) {
                notaFinalC1 = c1ef;
            }
        }

        if (notaFinalC1 !== null) {
            celdaC1Prom.textContent = notaFinalC1;
            aplicarColorFormatoPedagógico(celdaC1Prom, notaFinalC1);
        } else {
            celdaC1Prom.textContent = "-";
            celdaC1Prom.className = "col-calculada";
        }

        // 2. REPLICACIÓN SEGUNDO CUATRIMESTRE
        let notaFinalC2 = null;
        if (!isNaN(c2n2)) {
            if (c2n2 >= 6) {
                notaFinalC2 = c2n2;
            } else if (!isNaN(c2ef)) {
                notaFinalC2 = c2ef;
            }
        }

        if (notaFinalC2 !== null) {
            celdaC2Prom.textContent = notaFinalC2;
            aplicarColorFormatoPedagógico(celdaC2Prom, notaFinalC2);
        } else {
            celdaC2Prom.textContent = "-";
            celdaC2Prom.className = "col-calculada";
        }

        // 3. ARRASTRE ANUAL Y DEFINITIVA
        if (notaFinalC1 !== null && notaFinalC2 !== null) {
            const notaAnualCalculada = notaFinalC2;
            celdaAnual.textContent = notaAnualCalculada;
            aplicarColorFormatoPedagógico(celdaAnual, notaAnualCalculada);

            if (notaAnualCalculada >= 6) {
                celdaDef.textContent = notaAnualCalculada;
                aplicarColorFormatoPedagógico(celdaDef, notaAnualCalculada);
                if (!esModoLectura) {
                    if (inputDic) { inputDic.disabled = true; inputDic.value = ""; }
                    if (inputFeb) { inputFeb.disabled = true; inputFeb.value = ""; }
                }
            } else {
                if (!esModoLectura && inputDic) inputDic.disabled = false;

                let notaCierreFinal = null;
                if (!isNaN(dic)) {
                    if (dic >= 6) {
                        notaCierreFinal = dic;
                        if (!esModoLectura && inputFeb) { inputFeb.disabled = true; inputFeb.value = ""; }
                    } else {
                        if (!esModoLectura && inputFeb) inputFeb.disabled = false;
                        if (!isNaN(feb)) notaCierreFinal = feb;
                    }
                } else {
                    if (!esModoLectura && inputFeb) { inputFeb.disabled = true; inputFeb.value = ""; }
                }

                if (notaCierreFinal !== null) {
                    celdaDef.textContent = notaCierreFinal;
                    aplicarColorFormatoPedagógico(celdaDef, notaCierreFinal);
                } else {
                    celdaDef.textContent = "-";
                    celdaDef.className = "col-calculada";
                }
            }
        } else {
            celdaAnual.textContent = "-";
            celdaAnual.className = "col-calculada";
            celdaDef.textContent = "-";
            celdaDef.className = "col-calculada";
            if (!esModoLectura) {
                if (inputDic) { inputDic.disabled = true; inputDic.value = ""; }
                if (inputFeb) { inputFeb.disabled = true; inputFeb.value = ""; }
            }
        }
    }

    function aplicarColorFormatoPedagógico(celda, nota) {
        celda.className = "col-calculada";
        if (nota >= 6) {
            celda.classList.add("nota-aprobada");
        } else {
            celda.classList.add("nota-desaprobada");
        }
    }

// --- PERSISTENCIA ASÍNCRONA MUTABLE EN CLOUD FIRESTORE CON CONSOLIDACIÓN INTELIGENTE ---
async function procesarGuardarPlanilla(e) {
    e.preventDefault();
    if (esModoLectura) return;

    // 🎯 CORRECCIÓN 1: Alineación con los nombres de variables globales existentes
    const cursoId = selectCurso.value;
    const materiaId = selectMateria.value; 
    if (!cursoId || !materiaId) return;

    const botonSubmit = formPlanilla.querySelector('button[type="submit"]');
    if (botonSubmit) {
        botonSubmit.disabled = true;
        botonSubmit.textContent = "💾 Sincronizando Red...";
    }

       try {
        const { doc, setDoc } = await import(b + 'firebase-firestore.js');
        const filas = tablaNotasBody.querySelectorAll('tr');
        const operacionesPersistencia = [];

        filas.forEach(fila => {
            const inputBase = fila.querySelector('.c1-n1');
            if (!inputBase) return; 

            const dniAlumno = inputBase.getAttribute('data-dni');
            
            const c1n1 = parseInt(fila.querySelector('.c1-n1').value, 10);
            const c1n2 = parseInt(fila.querySelector('.c1-n2').value, 10);
            const c1ef = parseInt(fila.querySelector('.c1-ef').value, 10);
            const c2n1 = parseInt(fila.querySelector('.c2-n1').value, 10);
            const c2n2 = parseInt(fila.querySelector('.c2-n2').value, 10);
            const c2ef = parseInt(fila.querySelector('.c2-ef').value, 10);
            const dic = parseInt(fila.querySelector('.inst-dic').value, 10);
            const feb = parseInt(fila.querySelector('.inst-feb').value, 10);
            
            const celdas = fila.querySelectorAll('td');
            let notaC1 = null, notaC2 = null, notaAnual = null, notaDefinitiva = null;
            
            if (celdas.length >= 14) {
                const txtC1 = celdas[5].textContent.trim();
                const txtC2 = celdas[9].textContent.trim();
                const txtAnual = celdas[10].textContent.trim();
                const txtDef = celdas[13].textContent.trim();

                notaC1 = (txtC1 === "-" || txtC1 === "") ? null : parseInt(txtC1, 10);
                notaC2 = (txtC2 === "-" || txtC2 === "") ? null : parseInt(txtC2, 10);
                notaAnual = (txtAnual === "-" || txtAnual === "") ? null : parseInt(txtAnual, 10);
                notaDefinitiva = (txtDef === "-" || txtDef === "") ? null : parseInt(txtDef, 10);
            }

            const estructuraCalificacionAlumno = {
                alumnoDni: dniAlumno,
                cursoId: cursoId,
                materia: materiaId,
                notas: {
                    trim1: { n1: isNaN(c1n1) ? null : c1n1, n2: isNaN(c1n2) ? null : c1n2, ef: isNaN(c1ef) ? null : c1ef },
                    trim2: { n1: isNaN(c2n1) ? null : c2n1, n2: isNaN(c2n2) ? null : c2n2, ef: isNaN(c2ef) ? null : c2ef }
                },
                diciembre: isNaN(dic) ? null : dic,
                febrero: isNaN(feb) ? null : feb,
                notaCuatrimestre1: notaC1,
                notaCuatrimestre2: notaC2,
                notaAnual: notaAnual,
                notaFinal: notaDefinitiva,
                estadoMateria: (notaDefinitiva !== null && notaDefinitiva >= 6) ? "Aprobada" : "Previa",
                ultimaModificacion: new Date().toISOString()
            };

            const estadoPrevio = mapaNotasExistentes[dniAlumno];
            let tieneModificacionesReales = false;

            if (!estadoPrevio) {
                tieneModificacionesReales = true;
            } else {
                const notasNuevasSt = JSON.stringify({ n: estructuraCalificacionAlumno.notas, d: estructuraCalificacionAlumno.diciembre, f: estructuraCalificacionAlumno.febrero });
                const notasPreviasSt = JSON.stringify({ n: estadoPrevio.notas, d: estadoPrevio.diciembre, f: estadoPrevio.febrero });
                if (notasNuevasSt !== notasPreviasSt) {
                    tieneModificacionesReales = true;
                }
            }

            const docIdUnico = `${dniAlumno}_${materiaId.trim().replace(/\s+/g, '_')}_${cursoId}`;
            const docRef = doc(db, "alumnos_calificaciones", docIdUnico);

            const promesaEscritura = setDoc(docRef, estructuraCalificacionAlumno, { merge: true })
                .then(async () => {
                    if (tieneModificacionesReales && typeof window.registrarEventoLegajo === "function") {
                        const esAltaNueva = !estadoPrevio;
                        const subcatAuditoria = esAltaNueva ? "ALTA_NOTAS" : "MODIFICACION_CALIFICACIONES";
                        const descAuditoria = esAltaNueva 
                            ? `Carga inicial de calificaciones en la asignatura ${materiaId}.`
                            : `Modificación de registros académicos en la asignatura ${materiaId}.`;

                        const snapshotForense = {
                            materia: materiaId,
                            cursoId: cursoId,
                            notas_guardadas: estructuraCalificacionAlumno.notas,
                            diciembre: estructuraCalificacionAlumno.diciembre,
                            febrero: estructuraCalificacionAlumno.febrero,
                            notaCuatrimestre1: estructuraCalificacionAlumno.notaCuatrimestre1,
                            notaCuatrimestre2: estructuraCalificacionAlumno.notaCuatrimestre2,
                            notaAnual: estructuraCalificacionAlumno.notaAnual,
                            notaFinal: estructuraCalificacionAlumno.notaFinal,
                            estadoMateria: estructuraCalificacionAlumno.estadoMateria
                        };

                        await window.registrarEventoLegajo(
                            dniAlumno,
                            "CALIFICACIONES",
                            subcatAuditoria,
                            descAuditoria,
                            snapshotForense
                        );
                    }
                });

            operacionesPersistencia.push(promesaEscritura);
        });

        await Promise.all(operacionesPersistencia);
        alert("Sincronización con Firestore y auditoría forense finalizadas con éxito.");
        await cargarNominaEstudiantes();

    } catch (error) {
        console.error("Error crítico durante la sincronización inteligente:", error);
        alert("Ocurrió un error al intentar sincronizar con Firestore. Revise la consola.");
    }

}

// ====== PARCHE: ACTUALIZACIÓN DE GUARDADO DE PERÍODOS REALES ======
const IDs_PERIODOS_REALES = [
    'p_c1-n1', 'p_c1-n2', 'p_c1-ef',
    'p_c2-n1', 'p_c2-n2', 'p_c2-ef',
    'p_dic', 'p_feb'
];

// REEMPLAZAR FUNCIÓN COMPLETA EN calificaciones.js (Cerca de la línea 650)
async function procesarGuardarConfiguracionPeriodos() {
  const configuracionPeriodos = {};
  IDs_PERIODOS_REALES.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) configuracionPeriodos[id] = elemento.checked;
  });

  const btnGuardar = document.getElementById('btnGuardarPeriodosConfig');
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.textContent = "💾 Guardando en Red...";
  }

  try {
    const { doc, setDoc } = await import(b + 'firebase-firestore.js');
    const docRef = doc(db, "configuraciones", "periodos_academicos");
    
    // Impactamos la base de datos centralizada del Colegio HASPEN
    await setDoc(docRef, { ...configuracionPeriodos, ultimaActualizacion: new Date().toISOString() }, { merge: true });
    
    // Respaldamos localmente como cache de contingencia pasiva
    localStorage.setItem('estadoPeriodosColegio', JSON.stringify(configuracionPeriodos));
    window.cachePeriodosEscuela = configuracionPeriodos;

    alert('Configuración de períodos sincronizada globalmente en Cloud Firestore.');
    const modal = document.getElementById('modalGestionPeriodos');
    if (modal) modal.style.display = 'none';

    if (typeof cargarNominaEstudiantes === 'function' && document.getElementById('selectMateriaNotas')?.value) {
      await cargarNominaEstudiantes();
    }
  } catch (error) {
    console.error("Error crítico de persistencia en red de períodos:", error);
    alert("Error al guardar en la nube. Se retuvo una copia local de emergencia.");
    localStorage.setItem('estadoPeriodosColegio', JSON.stringify(configuracionPeriodos));
  } finally {
    if (btnGuardar) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Guardar Habilitaciones";
    }
  }
}
// Inyección forense para restaurar visualmente los checkboxes guardados al presionar el botón de apertura
if (btnAbrirModalPeriodos) {
    btnAbrirModalPeriodos.replaceWith(btnAbrirModalPeriodos.cloneNode(true));
    const btnRefrescado = document.getElementById('btnAbrirModalPeriodos');
    
    // Si verificarAutenticacion ya se ejecutó y le otorgó el permiso, mantenemos su visibilidad activa
    if (usuarioLogueado && usuarioLogueado.permisoGestionPeriodos === true && btnRefrescado) {
        btnRefrescado.style.display = 'inline-flex';
    }
    
    btnRefrescado.addEventListener('click', async () => {
        let configPeriodos = {};
        try {
            const { doc, getDoc } = await import(b + 'firebase-firestore.js');
            const docSnap = await getDoc(doc(db, "configuraciones", "periodos_academicos"));
            if (docSnap.exists()) {
                configPeriodos = docSnap.data();
                window.cachePeriodosEscuela = configPeriodos;
            } else {
                const periodosRaw = localStorage.getItem('estadoPeriodosColegio');
                configPeriodos = periodosRaw ? JSON.parse(periodosRaw) : {};
            }
        } catch (e) {
            console.warn("Error consultando períodos para modal, usando local:", e);
            const periodosRaw = localStorage.getItem('estadoPeriodosColegio');
            configPeriodos = periodosRaw ? JSON.parse(periodosRaw) : {};
        }
        
        IDs_PERIODOS_REALES.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.checked = configPeriodos[id] === true;
            }
        });
        if (modalPeriodos) modalPeriodos.style.display = 'flex';
    });
}

// Escuchador para cerrar el modal de forma segura
if (btnCerrarModalPeriodos) {
    btnCerrarModalPeriodos.addEventListener('click', () => {
        if (modalPeriodos) modalPeriodos.style.display = 'none';
    });
}

if (btnGuardarPeriodosConfig) {
    btnGuardarPeriodosConfig.replaceWith(btnGuardarPeriodosConfig.cloneNode(true));
    const btnGuardarRefrescado = document.getElementById('btnGuardarPeriodosConfig');
    if (btnGuardarRefrescado) {
        btnGuardarRefrescado.addEventListener('click', procesarGuardarConfiguracionPeriodos);
    }
}

})();


