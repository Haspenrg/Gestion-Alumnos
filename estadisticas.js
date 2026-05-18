(function() {
    'use strict';

    // Estado global de la solapa y ciclo activo
    let cursoActivoId = null;

    document.addEventListener("DOMContentLoaded", () => {
        inicializarCiclosEstadisticos();
        inicializarModuloEstadistico();
        configurarEscuchadoresPeriodos();
    });

    // 1. INICIALIZAR ANUALIDADES DINÁMICAS (CICLO LECTIVO PERPETUO)
    function inicializarCiclosEstadisticos() {
        const selectorCiclo = document.getElementById('filtroEstadisticoCiclo');
        if (!selectorCiclo) return;

        const anioActual = new Date().getFullYear(); // Captura dinámicamente el año de la computadora
        const anioSiguiente = anioActual + 1;

        selectorCiclo.innerHTML = "";
        selectorCiclo.add(new Option(`Ciclo ${anioActual}`, `${anioActual}`));
        selectorCiclo.add(new Option(`Ciclo ${anioSiguiente}`, `${anioSiguiente}`));
        
        selectorCiclo.value = `${anioActual}`;
    }

    // 2. CARGA INICIAL Y GENERACIÓN DE SOLAPAS DINÁMICAS DE CURSOS
    function inicializarModuloEstadistico() {
        const cursos = JSON.parse(localStorage.getItem('cursosColegio')) || [];
        const contenedorSolapas = document.getElementById('contenedorSolapasCursos');

        if (!contenedorSolapas || cursos.length === 0) {
            procesarSabanaCalificaciones();
            return;
        }

        contenedorSolapas.innerHTML = "";
        cursos.forEach((curso, index) => {
            const btn = document.createElement('button');
            btn.className = `solapa-curso ${index === 0 ? 'activa' : ''}`;
            btn.textContent = `${curso.ciclo.charAt(0)}°"${curso.division}"`;
            btn.addEventListener('click', function() {
                document.querySelectorAll('.solapa-curso').forEach(b => b.classList.remove('activa'));
                this.classList.add('activa');
                cursoActivoId = curso.id;
                procesarSabanaCalificaciones();
            });

            contenedorSolapas.appendChild(btn);
        });

        cursoActivoId = cursos[0].id;
        procesarSabanaCalificaciones();
    }

    // 3. CONFIGURAR ESCUCHADORES REACTIVOS DE LOS FILTROS
    function configurarEscuchadoresPeriodos() {
        document.getElementById('filtroEstadisticoCiclo')?.addEventListener('change', procesarSabanaCalificaciones);
        document.getElementById('selectFiltroCuatrimestre')?.addEventListener('change', procesarSabanaCalificaciones);
        document.getElementById('selectFiltroInforme')?.addEventListener('change', procesarSabanaCalificaciones);
    }

    // 4. SINCRONIZAR SUBTÍTULO DE LA PLANILLA
    function sincronizarCabeceraAmarilla(cuatKey, infKey) {
        const lblPeriodo = document.getElementById('txtSubtituloPeriodo');
        if (!lblPeriodo) return;

        let tCuat = cuatKey === "trim1" ? "1ER CUAT" : "2DO CUAT";
        let tInf = "1ER INF";
        if (infKey === "n2") tInf = "2DO INF";
        if (infKey === "ef") tInf = "EVAL. FORTALECIMIENTO";

        lblPeriodo.textContent = `${tCuat} - ${tInf}`;
    }

    // 5. MOTOR CORE: FILTRADO MULTIDIMENSIONAL ESTILO GOOGLE SHEETS
    function procesarSabanaCalificaciones() {
        const alumnos = JSON.parse(localStorage.getItem('alumnosColegio')) || [];
        const calificaciones = JSON.parse(localStorage.getItem('calificacionesColegio')) || [];
        const cursos = JSON.parse(localStorage.getItem('cursosColegio')) || [];

        // Recuperar llaves de filtrado desde la interfaz
        const cicloSeleccionado = document.getElementById('filtroEstadisticoCiclo')?.value || "2026";
        const cuatKey = document.getElementById('selectFiltroCuatrimestre')?.value || "trim1";
        const infKey = document.getElementById('selectFiltroInforme')?.value || "n1";

        sincronizarCabeceraAmarilla(cuatKey, infKey);

        const cursoObj = cursos.find(c => c.id === cursoActivoId) || {};
        const materiasPlan = cursoObj.materias || [];
        const anioNumero = cursoObj.ciclo ? cursoObj.ciclo.charAt(0) : "1";

        const lblCurso = document.getElementById('txtCeldaCursoDestino');
        const lblTurno = document.getElementById('txtCeldaTurnoDestino');
        if (lblCurso) lblCurso.textContent = `${anioNumero}° AÑO "${cursoObj.division || ''}"`;
        if (lblTurno) lblTurno.textContent = (cursoObj.turno || 'MAÑANA').toUpperCase();

        // Filtrado estricto cruzado por Curso y Ciclo Lectivo
        const alumnosCurso = alumnos.filter(a => a.cursoId === cursoActivoId && a.cicloLectivo === cicloSeleccionado);

        const totalDesaprobadosPorMateria = {};
        const totalAprobadosPorMateria = {};
        materiasPlan.forEach(m => {
            totalDesaprobadosPorMateria[m] = 0;
            totalAprobadosPorMateria[m] = 0;
        });

        const resumenEspacios = Array(12).fill(0);
        let contadoresRiesgo = { sin: 0, medio: 0, alto: 0, ppi: 0 };

        const tbody = document.getElementById('tablaCeldasSheetsBody');
        if (!tbody) return;
        tbody.innerHTML = "";

        if (alumnosCurso.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${15 + materiasPlan.length}" style="text-align:center; color:#94a3b8; padding:30px; font-style:italic;">No se encontraron registros para este Ciclo Lectivo en esta división.</td></tr>`;
            actualizarCuadrosResumenInferiores(resumenEspacios, contadoresRiesgo);
            renderizarFilasTotalesColumnas(materiasPlan, totalAprobadosPorMateria, totalDesaprobadosPorMateria);
            return;
        }

        alumnosCurso.sort((a, b) => a.nombre.localeCompare(b.nombre));

        alumnosCurso.forEach((alumno, index) => {
            if (alumno.tienePPI) contadoresRiesgo.ppi++;

            const tr = document.createElement('tr');
            let htmlFila = `
                <td class="celda-num-centro" style="background:#f8fafc; color:#64748b;">${index + 1}</td>
                <td style="font-weight: 500; color:#1e293b;">${alumno.nombre.toUpperCase()}${alumno.tienePPI ? ' <span style="color:#b45309; font-weight:bold; font-size:10px;">[PPI]</span>' : ''}</td>
                <td class="celda-num-centro" style="color:#475569;">${alumno.dni}</td>
            `;

            let espaciosDesaprobadosAlumno = 0;
            let sumaNotasAlumno = 0;
            let materiasConNotaValida = 0;

            materiasPlan.forEach(materia => {
                const regNota = calificaciones.find(n => 
                    n.alumnoDni === alumno.dni && 
                    n.cursoId === cursoActivoId && 
                    n.materia === materia
                ) || {};

                const subNodoCuatrimestre = regNota.notas?.[cuatKey] || {};
                const notaFinalRaw = subNodoCuatrimestre[infKey] || "-";

                let claseNota = "";
                let textoNota = "-";

                if (notaFinalRaw !== "-") {
                    const notaNum = parseInt(notaFinalRaw, 10);
                    if (!isNaN(notaNum)) {
                        textoNota = notaNum;
                        sumaNotasAlumno += notaNum;
                        materiasConNotaValida++;

                        if (notaNum < 6) {
                            espaciosDesaprobadosAlumno++;
                            claseNota = "nota-desaprobada";
                            totalDesaprobadosPorMateria[materia]++;
                        } else {
                            claseNota = "nota-aprobada";
                            totalAprobadosPorMateria[materia]++;
                        }
                    }
                }

                htmlFila += `<td class="celda-num-centro ${claseNota}">${textoNota}</td>`;
            });

            const promedioFinal = materiasConNotaValida > 0 ? (sumaNotasAlumno / materiasConNotaValida).toFixed(2) : "-";

            htmlFila += `
                <td class="celda-num-centro" style="background:#fff5f5; color:#b91c1c; font-weight:bold;">${espaciosDesaprobadosAlumno}</td>
                <td class="celda-num-centro" style="background:#f0fdf4; color:#16a34a; font-weight:bold;">${promedioFinal}</td>
            `;

            tr.innerHTML = htmlFila;
            tbody.appendChild(tr);

            if (espaciosDesaprobadosAlumno === 0) contadoresRiesgo.sin++;
            if (espaciosDesaprobadosAlumno >= 1 && espaciosDesaprobadosAlumno <= 2) contadoresRiesgo.medio++;
            if (espaciosDesaprobadosAlumno >= 3) contadoresRiesgo.alto++;

            const indexMatriz = Math.min(espaciosDesaprobadosAlumno, 11);
            resumenEspacios[indexMatriz]++;
        });

        renderizarFilasTotalesColumnas(materiasPlan, totalAprobadosPorMateria, totalDesaprobadosPorMateria);
        actualizarCuadrosResumenInferiores(resumenEspacios, contadoresRiesgo);
    }

    // 6. RENDERIZAR FILAS INFERIORES DE LA GRILA EXCEL (DESAPROBADOS / APROBADOS)
    function renderizarFilasTotalesColumnas(materiasPlan, aprobadosMap, desaprobadosMap) {
        const filaDes = document.getElementById('filaTotalesDesaprobados');
        const filaApr = document.getElementById('filaTotalesAprobados');

        if (!filaDes || !filaApr) return;

        filaDes.innerHTML = `<td colspan="3" style="text-align: right; font-weight: bold; background: #f1f5f9; color:#b91c1c; border-right:1px solid #cbd5e1;">DESAPROBADOS</td>`;
        filaApr.innerHTML = `<td colspan="3" style="text-align: right; font-weight: bold; background: #f1f5f9; color:#15803d; border-right:1px solid #cbd5e1;">APROBADOS</td>`;

        materiasPlan.forEach(materia => {
            const des = desaprobadosMap[materia] || 0;
            const apr = aprobadosMap[materia] || 0;

            filaDes.innerHTML += `<td class="celda-num-centro" style="background:#fee2e2; color:#b91c1c; font-weight:bold;">${des}</td>`;
            filaApr.innerHTML += `<td class="celda-num-centro" style="background:#e2f0d9; color:#15803d; font-weight:bold;">${apr}</td>`;
        });

        filaDes.innerHTML += `<td style="background:#f1f5f9;" colspan="2"></td>`;
        filaApr.innerHTML += `<td style="background:#f1f5f9;" colspan="2"></td>`;
    }

    // 7. IMPACTAR RECUADROS DE SEGUIMIENTO EN LA ZONA INFERIOR
    function actualizarCuadrosResumenInferiores(resumenEspacios, contadoresRiesgo) {
        const tablaResumen = document.getElementById('tablaResumenSegmentadoEspacios');
        if (tablaResumen) {
            tablaResumen.innerHTML = "";
            resumenEspacios.forEach((cantidad, index) => {
                const tr = document.createElement('tr');
                let textoLabel = index === 11 ? "11 o más espacios" : `${index} ${index === 1 ? 'espacio' : 'espacios'}`;
                if (index === 0) textoLabel = "0 espacios (Al día)";
                
                tr.innerHTML = `
                    <td style="color:#475569; padding: 6px 12px;">${textoLabel}</td>
                    <td style="font-weight:bold; text-align:right; color:#1e293b; width:60px; padding: 6px 12px;">${cantidad}</td>
                `;
                tablaResumen.appendChild(tr);
            });
        }

        const lblSin = document.getElementById('lblRiesgoSin');
        const lblMedio = document.getElementById('lblRiesgoMedio');
        const lblAlto = document.getElementById('lblRiesgoAlto');
        const lblPPI = document.getElementById('lblTotalPPI');

        if (lblSin) lblSin.textContent = contadoresRiesgo.sin;
        if (lblMedio) lblMedio.textContent = contadoresRiesgo.medio;
        if (lblAlto) lblAlto.textContent = contadoresRiesgo.alto;
        if (lblPPI) lblPPI.textContent = contadoresRiesgo.ppi;
    }

})();
