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

        // Directivos entran de forma global en modo lectura sobre la planta institucional
        if (rolNormalizado === "directivo") {
            esModoLectura = true;
            if (bannerLectura) bannerLectura.style.display = "block";
        }
    }

    // --- CARGA DINÁMICA DE CURSOS FILTRADOS POR BOLSA DE HORAS ---
    async function cargarSelectoresIniciales() {
        if (!selectCurso) return;
        selectCurso.innerHTML = '<option value="" disabled selected>Seleccione estructura...</option>';

        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];

        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        const usuarioReal = usuarios.find(u => u.dni === usuarioLogueado.dni) || {};
        const bolsaDocente = usuarioReal.bolsaHoras || usuarioReal.bolsaHours || [];

        // Si es profesor o tiene la función activa (incluso siendo preceptor en otro módulo)
        if (rolNormalizado === "profesor" || usuarioLogueado.esProfesor) {
            cursos.forEach(curso => {
                const divLimpia = curso.division.toLowerCase().trim();
                
                // Escaneo directo de bolsa de horas por comillas o texto plano
                const esDocenteAqui = bolsaDocente.some(catedra => {
                    const cText = catedra.toLowerCase();
                    return cText.includes(`"${divLimpia}"`) || 
                           cText.includes(`'${divLimpia}'`) || 
                           cText.includes(`div: ${divLimpia}`) || 
                           cText.includes(`div ${divLimpia}`);
                });

                if (esDocenteAqui) {
                    selectCurso.add(new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id));
                }
            });

            if (selectCurso.options.length === 1) {
                selectCurso.add(new Option("Sin cursos autorizados en su Bolsa de Horas", ""));
            }
        } else {
            // Administradores y Directivos listan toda la planta institucional libremente
            cursos.forEach(curso => {
                selectCurso.add(new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id));
            });
        }
    }

    // --- FILTRADO RELACIONAL ESTRICTO DE MATERIAS SEGÚN CURSO Y BOLSA ---
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

        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        const profesorReal = usuarios.find(u => u.dni === usuarioLogueado.dni) || {};
        const bolsaDocente = profesorReal.bolsaHoras || profesorReal.bolsaHours || [];
        const divLimpia = cursoEncontrado.division.toLowerCase().trim();

        if (rolNormalizado === "profesor" || profesorReal.esProfesor) {
            cursoEncontrado.materias.forEach(materia => {
                const matLimpia = materia.toLowerCase().trim();

                // La asignatura debe figurar en su bolsa emparejada con la división seleccionada
                const matchBolsa = bolsaDocente.some(b => {
                    const bText = b.toLowerCase();
                    const tieneMateria = bText.includes(matLimpia);
                    const tieneDivision = bText.includes(`"${divLimpia}"`) || 
                                          bText.includes(`'${divLimpia}'`) || 
                                          bText.includes(`div: ${divLimpia}`) || 
                                          bText.includes(`div ${divLimpia}`);
                    return tieneMateria && tieneDivision;
                });

                if (matchBolsa || rolNormalizado === "administrador") {
                    selectMateria.add(new Option(materia, materia));
                }
            });

            if (selectMateria.options.length === 1) {
                selectMateria.add(new Option("Sin asignaturas autorizadas en este curso", ""));
            }
        } else {
            // Administradores y Directivos listan todas las materias del plan
            cursoEncontrado.materias.forEach(materia => {
                selectMateria.add(new Option(materia, materia));
            });
        }
    }

    // --- MOTOR DE GENERACIÓN DE FILAS Y PERSISTENCIA ---
    async function cargarNominaEstudiantes() {
        const cursoId = selectCurso.value;
        const materiaId = selectMateria.value;
        if (!cursoId || !materiaId) return;

        tablaNotasBody.innerHTML = "";

        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        
        const cursosRaw = localStorage.getItem('cursosColegio');
        const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
        const cursoActual = cursos.find(c => c.id === cursoId) || {};
        const divisionActual = cursoActual.division ? cursoActual.division.toLowerCase().trim() : "";
        const matLimpia = materiaId.toLowerCase().trim();

        try {
            // Mapeo dinámico del Profesor de la Cátedra
            const docentesCatedra = usuarios.filter(u => {
                const bolsa = u.bolsaHoras || u.bolsaHours || [];
                return bolsa.some(b => {
                    const bText = b.toLowerCase();
                    return bText.includes(matLimpia) && (
                        bText.includes(`"${divisionActual}"`) || 
                        bText.includes(`'${divisionActual}'`) || 
                        bText.includes(`div: ${divisionActual}`)
                    );
                });
            });
            txtDocente.textContent = docentesCatedra.length > 0 ? docentesCatedra.map(d => d.nombre).join(" / ") : "Sin asignar";

            // Mapeo dinámico del Preceptor a cargo de la división
            const preceptorCurso = usuarios.find(u => u.rol === "preceptor" && u.cursosAsignados && u.cursosAsignados.includes(cursoId));
            txtPreceptor.textContent = preceptorCurso ? preceptorCurso.nombre : "Sin asignar";
        } catch (err) {
            console.error("Error al procesar cabeceras:", err);
        }

        const alumnosRaw = localStorage.getItem('alumnosColegio');
        const alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
        const alumnosCurso = alumnos.filter(a => a.cursoId === cursoId && a.estado === "Regular");

        if (alumnosCurso.length === 0) {
            tablaNotasBody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: #94a3b8; padding: 30px;">No hay alumnos Regulares inscritos en esta división estructural.</td></tr>`;
            if (bloqueGuardar) bloqueGuardar.style.display = "none";
            return;
        }

        const notasRaw = localStorage.getItem('calificacionesColegio');
        const registroGlobalNotas = notasRaw ? JSON.parse(notasRaw) : [];

        alumnosCurso.sort((a, b) => a.nombre.localeCompare(b.nombre));

        alumnosCurso.forEach((alumno, index) => {
            const tr = document.createElement('tr');
            const persistenciaNota = registroGlobalNotas.find(n => n.alumnoDni === alumno.dni && n.cursoId === cursoId && n.materia === materiaId) || {};
            const d = persistenciaNota.notas || { trim1: {}, trim2: {} };

            const esPPI = alumno.nombre.toUpperCase().includes("PPI") || (alumno.observaciones && alumno.observaciones.toUpperCase().includes("PPI"));
            const badgePPI = esPPI ? '<span class="tag-ppi">PPI</span>' : '';

            tr.innerHTML = `
                <td style="text-align:center; font-weight:bold; color:#64748b;">${index + 1}</td>
                <td style="font-weight:500;">${alumno.nombre} ${badgePPI}<br><span style="font-size:11px; color:#94a3b8;">DNI: ${alumno.dni}</span></td>
                <!-- 1ER CUATRIMESTRE -->
                <td><input type="number" class="input-nota c1-n1" min="1" max="10" value="${d.trim1?.n1 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c1-n2" min="1" max="10" value="${d.trim1?.n2 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c1-ef" min="1" max="10" value="${d.trim1?.ef || ''}" data-dni="${alumno.dni}"></td>
                <td class="col-calculada">-</td>
                <!-- 2DO CUATRIMESTRE -->
                <td><input type="number" class="input-nota c2-n1" min="1" max="10" value="${d.trim2?.n1 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c2-n2" min="1" max="10" value="${d.trim2?.n2 || ''}" data-dni="${alumno.dni}"></td>
                <td><input type="number" class="input-nota c2-ef" min="1" max="10" value="${d.trim2?.ef || ''}" data-dni="${alumno.dni}"></td>
                <td class="col-calculada">-</td>
                <!-- INSTANCIAS ANUALES DE EXAMEN -->
                <td class="col-calculada">-</td>
                <td><input type="number" class="input-nota inst-dic" min="1" max="10" value="${persistenciaNota.diciembre || ''}" data-dni="${alumno.dni}" disabled></td>
                <td><input type="number" class="input-nota inst-feb" min="1" max="10" value="${persistenciaNota.febrero || ''}" data-dni="${alumno.dni}" disabled></td>
                <td class="col-calculada">-</td>
            `;

            tablaNotasBody.appendChild(tr);

            const inputsFila = tr.querySelectorAll('.input-nota');
            inputsFila.forEach(input => {
                if (esModoLectura) input.disabled = true;
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

    // --- PERSISTENCIA ASÍNCRONA MUTABLE JSON ---
    async function procesarGuardarPlanilla(e) {
        e.preventDefault();
        if (esModoLectura) return;

        const cursoId = selectCurso.value;
        const materiaId = selectMateria.value;
        if (!cursoId || !materiaId) return;

        const filas = tablaNotasBody.querySelectorAll('tr');
        const calendarRaw = localStorage.getItem('calificacionesColegio');
        let registroGlobalNotas = calendarRaw ? JSON.parse(calendarRaw) : [];

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

            const celdas = fila.querySelectorAll('td');
            let notaDefinitiva = null;
            if (celdas.length >= 14) {
                const textoDefinitiva = celdas[13].textContent;
                notaDefinitiva = textoDefinitiva === "-" ? null : parseInt(textoDefinitiva, 10);
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
                notaFinal: notaDefinitiva,
                estadoMateria: (notaDefinitiva !== null && notaDefinitiva >= 6) ? "Aprobada" : "Previa"
            };

            registroGlobalNotas.push(estructuraCalificacionAlumno);
        });

        localStorage.setItem('calificacionesColegio', JSON.stringify(registroGlobalNotas));
        alert("Planilla de calificaciones guardada y sincronizada con éxito en el sistema central.");
        await cargarNominaEstudiantes();
    }
})();
