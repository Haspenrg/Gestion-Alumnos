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

    // Variables de contexto operativo
    let usuarioLogueado = null;
    let rolNormalizado = "";
    let esModoLectura = false;

    document.addEventListener("DOMContentLoaded", async () => {
        await verificarAutenticacion();
        await cargarSelectoresIniciales();
        
        // Escuchadores reactivos en cascada
        if (selectCurso) selectCurso.addEventListener('change', gestionarCambioCurso);
        if (selectMateria) selectMateria.addEventListener('change', cargarNominaEstudiantes);
        if (formPlanilla) formPlanilla.addEventListener('submit', procesarGuardarPlanilla);
    });

    // --- CONTROL DE ACCESO INSTITUCIONAL RBAC ---
    async function verificarAutenticacion() {
        const datosSesion = localStorage.getItem('usuarioActivo');
        if (!datosSesion) {
            window.location.href = "index.html";
            return;
        }
        usuarioLogueado = JSON.parse(datosSesion);
        rolNormalizado = usuarioLogueado.rol.toLowerCase().trim();

        // Si es Preceptor (bajo vista filtrada) o Directivo, operan en modo monitor
        if (rolNormalizado === "preceptor" || rolNormalizado === "directivo") {
            esModoLectura = true;
            if (bannerLectura) bannerLectura.style.display = "block";
        }
    }

    // --- CARGA DINÁMICA DE SELECTORES MUTABLES ---
    async function cargarSelectoresIniciales() {
        if (!selectCurso) return;
        selectCurso.innerHTML = '<option value="" disabled selected>Seleccione estructura...</option>';

        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];

        // Si es preceptor, la directiva del legajo filtra sus 2 cursos de responsabilidad
        if (rolNormalizado === "preceptor") {
            const usuariosRaw = localStorage.getItem('usuariosColegio');
            const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
            const preceptorReal = usuarios.find(u => u.dni === usuarioLogueado.dni);
            const cursosAsignados = preceptorReal ? preceptorReal.cursosAsignados : [];

            cursos.forEach(curso => {
                if (cursosAsignados.includes(curso.id)) {
                    selectCurso.add(new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id));
                }
            });
        } else {
            // El administrador o directivo listan toda la planta institucional
            cursos.forEach(curso => {
                selectCurso.add(new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id));
            });
        }
    }

    async function gestionarCambioCurso() {
        if (!selectMateria) return;
        selectMateria.innerHTML = '<option value="" disabled selected>Seleccione la asignatura...</option>';
        tablaNotasBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: #94a3b8; padding: 30px;">Seleccione la Asignatura para cargar la nómina.</td></tr>`;
        if (bloqueGuardar) bloqueGuardar.style.display = "none";

        const cursoId = selectCurso.value;
        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
        const cursoEncontrado = cursos.find(c => c.id === cursoId);

        if (!cursoEncontrado || !cursoEncontrado.materias) return;

        // Si es operador Profesor, filtramos estrictamente contra su Bolsa de Horas
        if (rolNormalizado === "profesor" || usuarioLogueado.esProfesor) {
            const usuariosRaw = localStorage.getItem('usuariosColegio');
            const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
            const profesorReal = usuarios.find(u => u.dni === usuarioLogueado.dni);
            const bolsaDocente = profesorReal ? profesorReal.bolsaHoras : [];

            cursoEncontrado.materias.forEach(materia => {
                // Buscamos coincidencia estructural cruzada en la bolsa
                const matchBolsa = bolsaDocente.some(b => b.includes(cursoEncontrado.division) && b.includes(materia));
                if (matchBolsa || rolNormalizado === "administrador") {
                    selectMateria.add(new Option(materia, materia));
                }
            });
            
            if (selectMateria.options.length === 1) {
                selectMateria.add(new Option("Sin asignaturas autorizadas en este curso", ""));
            }
        } else {
            // Para administradores o directivos listamos todas las materias del plan
            cursoEncontrado.materias.forEach(materia => {
                selectMateria.add(new Option(materia, materia));
            });
        }
    }

    // --- MOTOR DE GENERACIÓN DEL SPREADSHEET DE CALIFICACIONES ---
    async function cargarNominaEstudiantes() {
        const cursoId = selectCurso.value;
        const materiaId = selectMateria.value;
        if (!cursoId || !materiaId) return;

        tablaNotasBody.innerHTML = "";

        // 1. Mapear datos de cabecera (Docente de la bolsa y Preceptor)
        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        
        const docentesCatedra = usuarios.filter(u => u.bolsaHoras && u.bolsaHoras.some(b => b.includes(materiaId) && b.includes(cursoId)));
        txtDocente.textContent = docentesCatedra.length > 0 ? docentesCatedra.map(d => d.nombre).join(" / ") : "Sin asignar";

        const preceptorCurso = usuarios.find(u => u.rol === "preceptor" && u.cursosAsignados && u.cursosAsignados.includes(cursoId));
        txtPreceptor.textContent = preceptorCurso ? preceptorCurso.nombre : "Sin asignar";

        // 2. Extraer nómina de alumnos regulares indexados de ese curso
        const alumnosRaw = localStorage.getItem('alumnosColegio');
        const alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
        const alumnosCurso = alumnos.filter(a => a.cursoId === cursoId && a.estado === "Regular");

        if (alumnosCurso.length === 0) {
            tablaNotasBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: #94a3b8; padding: 30px;">No hay alumnos Regulares inscritos en esta división estructural.</td></tr>`;
            if (bloqueGuardar) bloqueGuardar.style.display = "none";
            return;
        }

        // 3. Extraer historial de calificaciones existentes para este casillero curricular
        const notasRaw = localStorage.getItem('calificacionesColegio');
        const registroGlobalNotas = notasRaw ? JSON.parse(notasRaw) : [];

        // Ordenar alfabéticamente por apellido y nombre como el Google Sheet real
        alumnosCurso.sort((a, b) => a.nombre.localeCompare(b.nombre));

        alumnosCurso.forEach((alumno, index) => {
            const tr = document.createElement('tr');
            
            // Buscar si ya posee fila guardada en el casillero
            const persistenciaNota = registroGlobalNotas.find(n => n.alumnoDni === alumno.dni && n.cursoId === cursoId && n.materia === materiaId) || {};
            const d = persistenciaNota.notas || { trim1: {}, trim2: {} }; // Mapeo de almacenamiento unificado cuatrimestral

            // Marcar si el alumno posee Proyecto Pedagógico para la Inclusión (PPI)
            const esPPI = alumno.nombre.toUpperCase().includes("PPI") || (alumno.observaciones && alumno.observaciones.toUpperCase().includes("PPI"));
            const badgePPI = esPPI ? '<span class="tag-ppi">PPI</span>' : '';

            tr.innerHTML = `
                <td style="text-align:center; font-weight:bold; color:#64748b;">${index + 1}</td>
                <td style="font-weight:500;">${alumno.nombre} ${badgePPI}<br><span style="font-size:11px; color:#94a3b8;">DNI: ${alumno.dni}</span></td>
                
                <!-- 1ER CUATRIMESTRE -->
                <td><input type="number" class="input-nota c1-n1" min="1" max="10" value="${d.trim1.n1 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c1-n2" min="1" max="10" value="${d.trim1.n2 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c1-ef" min="1" max="10" value="${d.trim1.ef || ''}" data-dni="${alumno.dni}"></td>
                <td class="col-calculada c1-prom">-</td>

                <!-- 2DO CUATRIMESTRE -->
                <td><input type="number" class="input-nota c2-n1" min="1" max="10" value="${d.trim2.n1 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c2-n2" min="1" max="10" value="${d.trim2.n2 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c2-ef" min="1" max="10" value="${d.trim2.ef || ''}" data-dni="${alumno.dni}"></td>
                <td class="col-calculada c2-prom">-</td>

                <!-- INSTANCIAS ANUALES DE EXAMEN -->
                <td class="col-calculada nota-anual">-</td>
                <td><input type="number" class="input-nota inst-dic" min="1" max="10" value="${persistenciaNota.diciembre || ''}" data-dni="${alumno.dni}" disabled></td>
                <td><input type="number" class="input-nota inst-feb" min="1" max="10" value="${persistenciaNota.febrero || ''}" data-dni="${alumno.dni}" disabled></td>
                <td class="col-calculada nota-def">-</td>
            `;

            tablaNotasBody.appendChild(tr);

            // Blindar inputs y registrar cálculo dinámico reactivo en caliente
            const inputsFila = tr.querySelectorAll('.input-nota');
            inputsFila.forEach(input => {
                if (esModoLectura) input.disabled = true; // Forzar bloqueo visual RBAC
                
                input.addEventListener('input', (e) => {
                    sanitizarEntradaNotaEntera(e.target);
                    calcularMatrizFilaCalificaciones(tr);
                });
            });

            // Disparar primer cómputo de celdas basado en datos históricos
            calcularMatrizFilaCalificaciones(tr);
        });

        if (bloqueGuardar && !esModoLectura) bloqueGuardar.style.display = "block";
    }

    // --- REGLA PEDAGÓGICA: NOTAS NUMÉRICAS ENTERAS PURAS (1 AL 10, SIN LETRAS) ---
    function sanitizarEntradaNotaEntera(input) {
        let valor = input.value.replace(/[^0-9]/g, ''); // Machacar cualquier letra o caracter decimal
        if (valor !== '') {
            let num = parseInt(valor, 10);
            if (num < 1) num = 1;
            if (num > 10) num = 10;
            input.value = num;
        } else {
            input.value = '';
        }
    }

    // --- MOTOR DE CÓMPUTO AUTOMÁTICO EN CALIENTE (EMULADOR DE GOOGLE SHEET) ---
    function calcularMatrizFilaCalificaciones(filaTr) {
        // Captura de inputs de notas de la fila
        const c1n1 = parseInt(filaTr.querySelector('.c1-n1').value, 10);
        const c1n2 = parseInt(filaTr.querySelector('.c1-n2').value, 10);
        const c1ef = parseInt(filaTr.querySelector('.c1-ef').value, 10);

        const c2n1 = parseInt(filaTr.querySelector('.c2-n1').value, 10);
        const c2n2 = parseInt(filaTr.querySelector('.c2-n2').value, 10);
        const c2ef = parseInt(filaTr.querySelector('.c2-ef').value, 10);

        const dic = parseInt(filaTr.querySelector('.inst-dic').value, 10);
        const feb = parseInt(filaTr.querySelector('.inst-feb').value, 10);

        // Referencias de celdas calculadas
        const celdaC1Prom = filaTr.querySelector('.c1-prom');
        const celdaC2Prom = filaTr.querySelector('.c2-prom');
        const celdaAnual = filaTr.querySelector('.nota-anual');
        const celdaDef = filaTr.querySelector('.nota-def');
        const inputDic = filaTr.querySelector('.inst-dic');
        const inputFeb = filaTr.querySelector('.inst-feb');

        // Cálculo 1° Cuatrimestre: Promedia solo las ingresadas (evita tirar abajo la planilla)
        let prom1 = 0;
        let c1Notas = [c1n1, c1n2, c1ef].filter(n => !isNaN(n));
        if (c1Notas.length > 0) {
            prom1 = Math.round(c1Notas.reduce((a, b) => a + b, 0) / c1Notas.length);
            celdaC1Prom.textContent = prom1;
            aplicarColorFormatoPedagógico(celdaC1Prom, prom1);
        } else {
            celdaC1Prom.textContent = "-";
            celdaC1Prom.className = "col-calculada c1-prom";
        }

        // Cálculo 2° Cuatrimestre
        let prom2 = 0;
        let c2Notas = [c2n1, c2n2, c2ef].filter(n => !isNaN(n));
        if (c2Notas.length > 0) {
            prom2 = Math.round(c2Notas.reduce((a, b) => a + b, 0) / c2Notas.length);
            celdaC2Prom.textContent = prom2;
            aplicarColorFormatoPedagógico(celdaC2Prom, prom2);
        } else {
            celdaC2Prom.textContent = "-";
            celdaC2Prom.className = "col-calculada c2-prom";
        }

        // Cálculo Nota Anual (Cierre de los dos cuatrimestres parciales)
        let notaAnual = 0;
        if (c1Notas.length > 0 && c2Notas.length > 0) {
            notaAnual = Math.round((prom1 + prom2) / 2);
            celdaAnual.textContent = notaAnual;
            aplicarColorFormatoPedagógico(celdaAnual, notaAnual);
        } else {
            celdaAnual.textContent = "-";
            celdaAnual.className = "col-calculada nota-anual";
            celdaDef.textContent = "-";
            celdaDef.className = "col-calculada nota-def";
            if (!esModoLectura) { inputDic.disabled = true; inputFeb.disabled = true; }
            return;
        }

        // REGLA CRÍTICA DE CORTE: Se desaprueba con 5 o menos, se aprueba con 6 o más
        if (notaAnual >= 6) {
            // Aprobación Directa: El alumno cierra el año y se bloquean recuperatorios
            celdaDef.textContent = notaAnual;
            aplicarColorFormatoPedagógico(celdaDef, notaAnual);
            if (!esModoLectura) {
                inputDic.disabled = true; inputDic.value = "";
                inputFeb.disabled = true; inputFeb.value = "";
            }
        } else {
            // Desaprobación (Menor o igual a 5): Se habilitan comisiones de examen de Dic/Feb
            if (!esModoLectura) {
                inputDic.disabled = false;
                inputFeb.disabled = false;
            }

            // La nota definitiva se evalúa según los exámenes complementarios
            let notaFinalCierre = notaAnual;
            if (!isNaN(feb)) {
                notaFinalCierre = feb; // Febrero tiene prioridad por ser la última instancia
            } else if (!isNaN(dic)) {
                notaFinalCierre = dic;
            }

            celdaDef.textContent = notaFinalCierre;
            aplicarColorFormatoPedagógico(celdaDef, notaFinalCierre);
        }
    }

    function aplicarColorFormatoPedagógico(celda, nota) {
        celda.className = "col-calculada"; // Reset clases
        if (nota >= 6) {
            celda.classList.add("nota-aprobada");
        } else {
            celda.classList.add("nota-desaprobada");
        }
    }

    // --- PERSISTENCIA ASÍNCRONA MUTABLE JSON ---
    async function procesarGuardarPlanilla(e) {
        e.preventDefault();
        if (esModoLectura) return;

        const cursoId = selectCurso.value;
        const materiaId = selectMateria.value;
        if (!cursoId || !materiaId) return;

        const filas = tablaNotasBody.querySelectorAll('tr');
        const notasRaw = localStorage.getItem('calificacionesColegio');
        let registroGlobalNotas = notasRaw ? JSON.parse(notasRaw) : [];

        // Limpiar registros antiguos de este casillero de cátedra específico para sobreescribir limpio
        registroGlobalNotas = registroGlobalNotas.filter(n => !(n.cursoId === cursoId && n.materia === materiaId));

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
            const notaDefinitiva = parseInt(fila.querySelector('.nota-def').textContent, 10);

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
                notaFinal: isNaN(notaDefinitiva) ? null : notaDefinitiva,
                estadoMateria: notaDefinitiva >= 6 ? "Aprobada" : "Previa" // Conexión automática con el RBAC de previas
            };

            registroGlobalNotas.push(estructuraCalificacionAlumno);
        });

        localStorage.setItem('calificacionesColegio', JSON.stringify(registroGlobalNotas));
        alert("Planilla de calificaciones guardada y sincronizada con éxito en el sistema central.");
        await cargarNominaEstudiantes();
    }
})();
