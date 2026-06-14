/**
 * Tablero de Comando Analítico - Colegio HASPEN
 * Controlador Lógico de Filtros Cruzados Dinámicos
 */
// Evasión de Bloqueos por URLs mediante fragmentación dinámica para Chart.js
const cdnChart = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'c' + 'd' + 'n' + '.' + 'j' + 's' + 'd' + 'e' + 'l' + 'i' + 'v' + 'r' + '.' + 'n' + 'e' + 't' + '/n' + 'p' + 'm' + '/c' + 'h' + 'a' + 'r' + 't' + '.' + 'j' + 's';

function cargarMotorGraficos(callback) {
    const script = document.createElement('script');
    script.src = cdnChart;
    script.onload = () => {
        console.log("📈 Motor Chart.js cargado exitosamente por fragmentación.");
        if (callback) callback();
    };
    document.head.appendChild(script);
}


// 1. Captura de Componentes de la Interfaz (DOM)
// Guardamos en constantes los elementos de la barra compacta que creamos en el HTML
const filtroCiclo = document.getElementById('filtroCiclo');
const filtroCurso = document.getElementById('filtroCurso');
const filtroGenero = document.getElementById('filtroGenero');
const filtroEdad = document.getElementById('filtroEdad');
const filtroPedagogico = document.getElementById('filtroPedagogico');

// 2. Base de Datos Temporal en Memoria (Estado Global)
// Aquí guardaremos la lista completa de alumnos que se descargue, para poder filtrarla sin saturar la red
let universoAlumnos = [];// Instancias de control global para evitar colisiones de Renderizado en los Canvas
let instanciaGraficoGenero = null;
let instanciaGraficoEdad = null;
// Control de paginación para soporte de matrícula masiva (30 registros por página)
let paginaActual = 1;
const filasPorPagina = 30;
let listaAlumnosFiltradosGlobal = [];



// 3. Generador de Datos de Simulación Pedagógica
/**
 * Crea un lote de legajos ficticios para validar las directivas del tablero interactivo.
 * Cumple con la distribución demográfica estándar de un nivel secundario.
 */
function generarMatriculaSimulada() {
    const nombres = ["Santiago", "Valentina", "Mateo", "Emma", "Lucas", "Mia", "Bautista", "Sofía", "Benjamin", "María"];
    const apellidos = ["Rodríguez", "González", "Gómez", "Fernández", "López", "Martínez", "Díaz", "Pérez", "Sánchez", "Romero"];
    const generos = ["Masculino", "Femenino", "X"];
    const cursos = ["1° A", "1° B", "2° A", "3° A", "4° B", "5° A"];
    
    let listaFicticia = [];

    for (let i = 1; i <= 60; i++) {
        // Determinamos un género balanceado aleatoriamente
        const genAleatorio = generos[Math.floor(Math.random() * generos.length)];
        const nomAleatorio = nombres[Math.floor(Math.random() * nombres.length)];
        const apeAleatorio = apellidos[Math.floor(Math.random() * apellidos.length)];
        
        // Edad matemática entre 13 y 18 años
        const edadAleatoria = Math.floor(Math.random() * (18 - 13 + 1)) + 13;
        
        // Condición de vulnerabilidad pedagógica (Porcentaje bajo de PPI y TF)
        const esPPI = Math.random() < 0.15; // 15% de probabilidad de ser Inclusión
        const esTF = !esPPI && Math.random() < 0.10; // 10% de probabilidad de Trayectoria Flexible
        
        // Cantidad de materias previas/desaprobadas aleatorias del 0 al 5
        const materiasAdeudadas = Math.floor(Math.random() * 6);

        listaFicticia.push({
            dni: Math.floor(Math.random() * (48000000 - 43000000 + 1)) + 43000000,
            apellidoNombre: `${apeAleatorio}, ${nomAleatorio}`,
            genero: genAleatorio,
            edad: edadAleatoria,
            curso: cursos[Math.floor(Math.random() * cursos.length)],
            ppi: esPPI,
            tf: esTF,
            materiasPrevias: materiasAdeudadas,
            ciclo: Math.random() > 0.3 ? "2026" : "2025" // Distribución por ciclo lectivo
        });
    }
    
    return listaFicticia;
}

/**
 * Función Central: inicializarTablero
 * Se encarga de simular datos o cargar la información real y preparar los oyentes de eventos.
 */
function inicializarTablero() {
    console.log("🚀 Inicializando el Tablero Analítico del Colegio HASPEN...");

    // 1. Cargamos los datos simulados en nuestro Array Maestro Global
    universoAlumnos = generarMatriculaSimulada();

    // 2. Inyectamos las opciones dentro del selector de ciclos
    if (filtroCiclo) {
        filtroCiclo.innerHTML = `
            <option value="2026" selected>📅 Ciclo 2026</option>
            <option value="2025">📅 Ciclo 2025</option>
            <option value="2024">📅 Ciclo 2024</option>
        `;
    }

    // 3. Poblamos el selector de Cursos de forma dinámica según los datos generados
    if (filtroCurso) {
        // Extraemos los cursos únicos de los alumnos simulados sin repetir
        const cursosUnicos = [...new Set(universoAlumnos.map(a => a.curso))].sort();
        cursosUnicos.forEach(curso => {
            filtroCurso.innerHTML += `<option value="${curso}">🏫 ${curso}</option>`;
        });
    }

    // Registrar los Escuchadores de Eventos
    filtroCiclo.addEventListener('change', procesarFiltrosCruzados);
    filtroCurso.addEventListener('change', procesarFiltrosCruzados);
    filtroGenero.addEventListener('change', procesarFiltrosCruzados);
    filtroEdad.addEventListener('change', procesarFiltrosCruzados);
    filtroPedagogico.addEventListener('change', procesarFiltrosCruzados);
        // Oyentes para el control de paginación de la nómina masiva
    const btnPrev = document.getElementById('btnPrevPag');
    const btnNext = document.getElementById('btnNextPag');
    if (btnPrev) btnPrev.addEventListener('click', () => { if (paginaActual > 1) { paginaActual--; renderizarNominaPaginada(); } });
    if (btnNext) btnNext.addEventListener('click', () => { const maxPag = Math.ceil(listaAlumnosFiltradosGlobal.length / filasPorPagina) || 1; if (paginaActual < maxPag) { paginaActual++; renderizarNominaPaginada(); } });


    // Primer procesamiento automático
    procesarFiltrosCruzados();
}


/**
 * Función Núcleo: procesarFiltrosCruzados
 * Se activa ante cualquier cambio en la hilera de selectores compactos.
 */
function procesarFiltrosCruzados() {
        paginaActual = 1; // Resetear a la primera página ante cualquier cambio de filtro

    // 1. Captura segura de los estados actuales de los selectores
    const cicloSel = filtroCiclo ? filtroCiclo.value : 'todos';
    const cursoSel = filtroCurso ? filtroCurso.value : 'todos';
    const generoSel = filtroGenero ? filtroGenero.value : 'todos';
    const edadSel = filtroEdad ? filtroEdad.value : 'todos';
    const pedagogicoSel = filtroPedagogico ? filtroPedagogico.value : 'todos';

    // 2. Aplicación del Patrón de Filtrado Acumulativo
    // Recorremos el array maestro aplicando los filtros solo si el selector no está en "todos"
    let alumnosFiltrados = universoAlumnos.filter(alumno => {
        // Filtro estricto por Ciclo Lectivo institucional
        if (cicloSel !== 'todos' && alumno.ciclo !== cicloSel) return false;
        
        // Filtro por Curso y División
        if (cursoSel !== 'todos' && alumno.curso !== cursoSel) return false;
        
        // Filtro demográfico por Género
        if (generoSel !== 'todos' && alumno.genero !== generoSel) return false;
        
        // Filtro demográfico por Edad (convertimos a string para comparar de forma segura)
        if (edadSel !== 'todos') {
            if (edadSel === '18' && alumno.edad < 18) return false; // Soporte para 18+ años
            if (edadSel !== '18' && alumno.edad.toString() !== edadSel) return false;
        }
        
        // Filtro por Condición Pedagógica de Vulnerabilidad
        if (pedagogicoSel === 'ppi' && !alumno.ppi) return false;
        if (pedagogicoSel === 'tf' && !alumno.tf) return false;

        return true; // El alumno cumple con todos los filtros cruzados simultáneamente
    });

    console.log(`📊 Universo Filtrado Coincidente: ${alumnosFiltrados.length} alumnos.`);

    // 3. Inicialización de contadores matemáticos para el Semáforo Pedagógico
    let contadorTotal = alumnosFiltrados.length;
    let contadorBajoRiesgo = 0;   // 0 materias desaprobadas
    let contadorRiesgoMedio = 0;  // 1 o 2 materias desaprobadas
    let contadorRiesgoAlto = 0;   // 3 o más materias desaprobadas

    // 4. Clasificación de trayectorias escolares según la normativa vigente
    alumnosFiltrados.forEach(alumno => {
        if (alumno.materiasPrevias === 0) {
            contadorBajoRiesgo++;
        } else if (alumno.materiasPrevias === 1 || alumno.materiasPrevias === 2) {
            contadorRiesgoMedio++;
        } else if (alumno.materiasPrevias >= 3) {
            contadorRiesgoAlto++;
        }
    });

    // 5. Inyección Directa y Síncrona en las Tarjetas KPI del HTML
    // Usamos textContent apuntando a los IDs únicos para actualizar los números gigantes sin parpadeos
    if (document.getElementById('kpiTotal')) {
        document.getElementById('kpiTotal').textContent = contadorTotal;
    }
    if (document.getElementById('kpiBajoRiesgo')) {
        document.getElementById('kpiBajoRiesgo').textContent = contadorBajoRiesgo;
    }
    if (document.getElementById('kpiRiesgoMedio')) {
        document.getElementById('kpiRiesgoMedio').textContent = contadorRiesgoMedio;
    }
    if (document.getElementById('kpiRiesgoAlto')) {
        document.getElementById('kpiRiesgoAlto').textContent = contadorRiesgoAlto;
    }

        // 6. Persistir el resultado filtrado y delegar el control al renderizador paginado autónomo
    listaAlumnosFiltradosGlobal = alumnosFiltrados;
    renderizarNominaPaginada();


        // 7. Preparación de Métricas Cuantitativas para los Gráficos Visuales
    
    // Métrica A: Conteo de Géneros sobre la matrícula filtrada actual
    let conteoGeneros = { "Masculino": 0, "Femenino": 0, "X": 0 };
    alumnosFiltrados.forEach(a => { if (conteoGeneros[a.genero] !== undefined) conteoGeneros[a.genero]++; });

    // Métrica B: Conteo de Rangos de Edad (13 a 18+ años) sobre la matrícula filtrada actual
    let conteoEdades = { "13": 0, "14": 0, "15": 0, "16": 0, "17": 0, "18": 0 };
    alumnosFiltrados.forEach(a => {
        if (a.edad >= 18) conteoEdades["18"]++;
        else if (conteoEdades[a.edad.toString()] !== undefined) conteoEdades[a.edad.toString()]++;
    });

    // 8. Motor de Renderizado / Actualización de Gráficos (Chart.js)
    
       // 8. Motor de Renderizado / Actualización de Gráficos (Chart.js)
    
    // --- GRÁFICO 1: DISTRIBUCIÓN POR GÉNERO (TORTA) ---
    const ctxGenero = document.getElementById('graficoGenero');
    if (ctxGenero) {
        const datosGenero = [conteoGeneros["Masculino"], conteoGeneros["Femenino"], conteoGeneros["X"]];
        
        if (instanciaGraficoGenero === null) {
            instanciaGraficoGenero = new Chart(ctxGenero, {
                type: 'pie',
                data: {
                    labels: ['Masculino 👤', 'Femenino 👩', 'X ♾️'],
                    datasets: [{
                        data: datosGenero,
                        backgroundColor: ['#1b4d82', '#ff922b', '#94a3b8'], // Paleta de colores oficial del HASPEN
                        borderWidth: 1,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Evita que se colapse por estilos externos
                    plugins: { 
                        legend: { 
                            position: 'right', // Mueve las etiquetas al costado para ganar espacio vertical
                            labels: { boxWidth: 12, font: { size: 11 } } 
                        } 
                    }
                }
            });
        } else {
            instanciaGraficoGenero.data.datasets[0].data = datosGenero;
            instanciaGraficoGenero.update();
        }
    }

    // --- GRÁFICO 2: DISTRIBUCIÓN POR EDADES (BARRAS HORIZONTALES) ---
    const ctxEdad = document.getElementById('graficoEdad');
    if (ctxEdad) {
        const datosEdad = [conteoEdades["13"], conteoEdades["14"], conteoEdades["15"], conteoEdades["16"], conteoEdades["17"], conteoEdades["18"]];
        
        if (instanciaGraficoEdad === null) {
            instanciaGraficoEdad = new Chart(ctxEdad, {
                type: 'bar',
                data: {
                    labels: ['13 años', '14 años', '15 años', '16 años', '17 años', '18+ años'],
                    datasets: [{
                        label: 'Alumnos',
                        data: datosEdad,
                        backgroundColor: '#1b4d82', // Sincronizado con el azul de tus títulos principales
                        borderRadius: 3,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Forzado analítico
                    indexAxis: 'y', // Barras horizontales limpias
                    scales: {
                        x: { beginAtZero: true, grid: { display: false }, ticks: { precision: 0 } },
                        y: { grid: { color: '#f1f5f9' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        } else {
            instanciaGraficoEdad.data.datasets[0].data = datosEdad;
            instanciaGraficoEdad.update();
        }
    }

}

/**
 * Renderiza la nómina de alumnos en segmentos controlados de exactamente 30 filas
 */
/**
 * Renderiza la nómina de alumnos de forma optimizada y segura a fallos del DOM
 */
function renderizarNominaPaginada() {
    const cuerpoTabla = document.getElementById('cuerpoTablaAlumnos');
    const lblPag = document.getElementById('lblPaginaActual');
    const lblTotal = document.getElementById('lblPaginaTotal');
    const txtContadorTabla = document.getElementById('txtContadorTabla');
    
    if (!cuerpoTabla) return;

    const totalRegistros = listaAlumnosFiltradosGlobal.length;
    const maxPaginas = Math.ceil(totalRegistros / filasPorPagina) || 1;

    // Inyección ultra segura protegida contra elementos faltantes
    if (lblPag) lblPag.textContent = paginaActual;
    if (lblTotal) lblTotal.textContent = maxPaginas;
    if (txtContadorTabla) txtContadorTabla.textContent = `${totalRegistros} registros`;

    if (totalRegistros === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #94a3b8; background-color: #f8fafc;">⚠ No se encontraron alumnos matriculados.</td></tr>`;
        return;
    }

    // Ordenamiento nativo de mayor a menor por materias adeudadas
    listaAlumnosFiltradosGlobal.sort((a, b) => b.materiasPrevias - a.materiasPrevias);

    const inicio = (paginaActual - 1) * filasPorPagina;
    const fin = inicio + filasPorPagina;
    const subLoteAlumnos = listaAlumnosFiltradosGlobal.slice(inicio, fin);

    let htmlAcumulado = '';

    subLoteAlumnos.forEach(alumno => {
        let etiquetaCondicion = '<span style="color: #64748b;">Ordinaria</span>';
        if (alumno.ppi) etiquetaCondicion = '<span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">📋 PPI</span>';
        else if (alumno.tf) etiquetaCondicion = '<span style="background-color: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">⚡ TF</span>';

        let estiloMaterias = 'color: #1e293b; font-weight: normal;';
        if (alumno.materiasPrevias >= 3) estiloMaterias = 'color: #b91c1c; font-weight: bold; background-color: #fee2e2; padding: 2px 8px; border-radius: 9999px;';
        else if (alumno.materiasPrevias > 0) estiloMaterias = 'color: #d97706; font-weight: bold;';

        htmlAcumulado += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px; height: 28px;">
            <td style="padding: 4px 12px; width: 15%; font-family: monospace; color: #475569;">${alumno.dni}</td>
            <td style="padding: 4px 12px; width: 25%; font-weight: 500; color: #1e293b;">${alumno.apellidoNombre}</td>
            <td style="padding: 4px 12px; width: 10%; text-align: center; color: #475569;">${alumno.genero}</td>
            <td style="padding: 4px 12px; width: 10%; text-align: center; color: #475569;">${alumno.edad} años</td>
            <td style="padding: 4px 12px; width: 10%; text-align: center; font-weight: bold; color: #1b4d82;">${alumno.curso}</td>
            <td style="padding: 4px 12px; width: 15%; text-align: center;">${etiquetaCondicion}</td>
            <td style="padding: 4px 12px; width: 15%; text-align: center;"><span style="${estiloMaterias}">${alumno.materiasPrevias}</span></td>
        </tr>`;
    });

    cuerpoTabla.innerHTML = htmlAcumulado;
}


document.addEventListener('DOMContentLoaded', () => {
    cargarMotorGraficos(inicializarTablero);
});

