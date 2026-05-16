// Variable global para interactuar con la consola de matriculación
document.addEventListener("DOMContentLoaded", async function() {
    // 1. Validar e identificar la sesión activa del usuario
    const datosSesion = localStorage.getItem('usuarioActivo');
    if (!datosSesion) {
        window.location.href = "index.html";
        return;
    }
    const usuarioLogueado = JSON.parse(datosSesion);
    const rolNormalizado = usuarioLogueado.rol.toLowerCase().trim();

    // 2. Control Operativo por Rol: Interfaz de Solo Lectura para Preceptores (CORREGIDO a minúsculas)
    if (rolNormalizado === "preceptor") {
        const formulario = document.getElementById('contenedorFormularioAlta');
        const banner = document.getElementById('bannerPreceptor');
        if (formulario) formulario.style.display = "none";
        if (banner) banner.style.display = "block";
    }

    // 3. Cargar dinámicamente estructuras de datos en selectores
    await inicializarSelectoresCursos();

    // 4. Renderizar lista inicial con filtros aplicados
    await procesarFiltrosYNómina();

    // 5. Registro de Escuchadores de Eventos del Formulario (Escritura)
    const formInscripcion = document.getElementById('formInscripcion');
    if (formInscripcion) {
        formInscripcion.addEventListener('submit', guardarLegajoDigital);
    }

    const btnCancelar = document.getElementById('btnCancelarEdicion');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', salirModoEdicion);
    }

    // 6. Registro de Escuchadores para la Barra de Filtros Avanzados
    document.getElementById('filtroCicloLectivo').addEventListener('change', procesarFiltrosYNómina);
    document.getElementById('filtroBusquedaRapida').addEventListener('input', procesarFiltrosYNómina);
    document.getElementById('filtroCursoEstructural').addEventListener('change', procesarFiltrosYNómina);
    document.getElementById('filtroEstadoMatricula').addEventListener('change', procesarFiltrosYNómina);
    document.getElementById('filtroAuditoriaDocs').addEventListener('change', procesarFiltrosYNómina);

    // 7. Registro de la Regla de Negocio Reactiva para Mesa de Entrada
    const selectEstado = document.getElementById('estadoAlumno');
    if (selectEstado) {
        selectEstado.addEventListener('change', evaluarEstadoMesaEntrada);
    }
});

// --- REGLA DE NEGOCIO: DESACTIVACIÓN DE CURSO PARA MESA DE ENTRADA ---
function evaluarEstadoMesaEntrada() {
    const estado = document.getElementById('estadoAlumno').value;
    const selectCurso = document.getElementById('selectCursoAlumno');
    if (!selectCurso) return;

    if (estado === "Entrante") {
        selectCurso.removeAttribute('required');
        selectCurso.disabled = true;
        selectCurso.value = "";
    } else {
        selectCurso.setAttribute('required', 'true');
        selectCurso.disabled = false;
    }
}

// --- CARGA ASÍNCRONA DE ESTRUCTURAS CURRICULARES REALES ---
async function inicializarSelectoresCursos() {
    const coursesRaw = localStorage.getItem('cursosColegio');
    const cursos = coursesRaw ? JSON.parse(coursesRaw) : [];
    const selectForm = document.getElementById('selectCursoAlumno');
    const selectFiltro = document.getElementById('filtroCursoEstructural');
    if (!selectForm || !selectFiltro) return;

    selectForm.innerHTML = '<option value="" disabled selected>Seleccione el curso destino...</option>';
    selectFiltro.innerHTML = '<option value="">Todos los Cursos</option>';

    cursos.forEach(curso => {
        const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
        selectForm.add(new Option(texto, curso.id));
        selectFiltro.add(new Option(`${curso.ciclo.split("-")[0].trim()} ° "${curso.division}"`, curso.id));
    });
}

// --- MOTOR DE FILTRADO AVANZADO Y RENDERIZADO MASIVO ---
async function procesarFiltrosYNómina() {
    const tbody = document.getElementById('tablaAlumnosBody');
    if (!tbody) return;

    const datosSesion = JSON.parse(localStorage.getItem('usuarioActivo'));
    const rolSesionNormalizado = datosSesion.rol.toLowerCase().trim();

    const alumnosRaw = localStorage.getItem('alumnosColegio');
    let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];

    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];

    // Captura de valores de los componentes de filtrado de la interfaz
    const ciclo = document.getElementById('filtroCicloLectivo').value;
    const busqueda = document.getElementById('filtroBusquedaRapida').value.toLowerCase().trim();
    const cursoFiltro = document.getElementById('filtroCursoEstructural').value;
    const estadoFiltro = document.getElementById('filtroEstadoMatricula').value;
    const docFiltro = document.getElementById('filtroAuditoriaDocs').value;

    // RESTRICCIÓN BIOLÓGICA DE PRECEPTOR: Cruzar datos de usuariosColegio (CORREGIDO a minúsculas)
    if (rolSesionNormalizado === "preceptor") {
        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        const preceptorReal = usuarios.find(u => String(u.dni).trim() === String(datosSesion.dni).trim());
        const cursosAsignados = preceptorReal ? preceptorReal.cursosAsignados : [];

        alumnos = alumnos.filter(a => 
            cursosAsignados.includes(a.cursoId) && 
            (a.estado === "Regular" || a.estado === "Entrante")
        );
    }

    // Cascada de Filtros del Panel Superior
    let alumnosFiltrados = alumnos.filter(alumno => {
        if (alumno.cicloLectivo !== ciclo) return false;
        if (cursoFiltro && alumno.cursoId !== cursoFiltro) return false;
        if (estadoFiltro && alumno.estado !== estadoFiltro) return false;
        
        if (docFiltro) {
            const esCompleto = alumno.documentos && alumno.documentos.length === 6;
            if (docFiltro === "Completo" && !esCompleto) return false;
            if (docFiltro === "Incompleto" && esCompleto) return false;
        }

        if (busqueda) {
            const matchNombre = alumno.nombre.toLowerCase().includes(busqueda);
            const matchDni = String(alumno.dni).includes(busqueda);
            const matchTutor = alumno.tutorNombre && alumno.tutorNombre.toLowerCase().includes(busqueda);
            if (!matchNombre && !matchDni && !matchTutor) return false;
        }
        return true;
    });

    document.getElementById('contadorEstudiantes').textContent = `Matrículas Visualizadas: ${alumnosFiltrados.length}`;
    tbody.innerHTML = "";

    if (alumnosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:25px;">No se encontraron legajos con los criterios seleccionados.</td></tr>`;
        return;
    }

    // Inyección dinámica de las filas en la tabla masiva widescreen
    alumnosFiltrados.forEach(alumno => {
        const tr = document.createElement('tr');
        tr.className = "fila-alumno";
        tr.style.borderBottom = "1px solid #e2e8f0";

        if (rolSesionNormalizado !== "preceptor") {
            tr.addEventListener('click', (e) => {
                if (e.target.tagName !== "BUTTON") cargarLegajoEnFormulario(alumno.dni);
            });
        }

        const curso = cursos.find(c => c.id === alumno.cursoId);
        let textoCurso = "Sin Asignar";
        if (curso) {
            const cicloLimpio = curso.ciclo.split("-")[0].replace(/,/g, '').trim();
            textoCurso = `${cicloLimpio} ° "${curso.division}"`;
        }

        const totalDocs = alumno.documentos ? alumno.documentos.length : 0;
        const auditoriaHtml = totalDocs === 6
            ? `<span class="documentos-completos">✓ Legajo Completo</span>`
            : `<span class="alerta-documentos">⚠ Incompleto (${totalDocs}/6)</span><br><span style="font-size:11px; color:#64748b">${alumno.documentos.join(", ").toLowerCase()}</span>`;

        const badgeEstado = alumno.estado === "Regular"
            ? `<span class="badge-curso" style="background:#e2f0d9; color:#385723; border-color:#c3e6cb;">Regular</span>`
            : alumno.estado === "Pase"
            ? `<span class="badge-pase">Pase</span>`
            : alumno.estado === "Baja"
            ? `<span class="badge-baja">Baja</span>`
            : `<span class="badge-curso">Mesa Entrada</span>`;

        // Renderizado unificado con Bloque Inteligente de Contacto de Emergencia y clase de botón .btn-accion-eliminar corregida
        tr.innerHTML = `
            <td style="padding: 12px 10px; vertical-align: top;">
                <strong style="font-size: 14px; color: #1e293b;">${alumno.nombre}</strong><br>
                <span style="font-size: 11px; color: #64748b; display: block; margin-top: 2px;">DNI: ${alumno.dni} | Nac: ${alumno.nacionalidad}</span>
                <div class="datos-contacto-emergencia" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #475569;">
                    📍 <strong>Dir:</strong> ${alumno.direccion}<br>
                    📞 <strong>Tel:</strong> ${alumno.telefono} ${alumno.telefonoAlternativo ? `| 🚑 <strong>Alt:</strong> ${alumno.telefonoAlternativo}` : ''}<br>
                    👤 <strong>Tutor:</strong> ${alumno.tutorNombre || 'Sin Registrar'} ${alumno.tutorDni ? `(DNI: ${alumno.tutorDni})` : ''}
                </div>
            </td>
            <td style="vertical-align: top; padding-top: 14px;"><span class="badge-curso">${textoCurso}</span></td>
            <td style="vertical-align: top; padding-top: 14px;">${badgeEstado}<br><span style="font-size:10px; color:#64748b;">Insc.: ${alumno.fechaInscripcion}</span></td>
            <td style="vertical-align: top; padding-top: 14px;">${auditoriaHtml}</td>
            <td style="text-align:center; vertical-align: top; padding-top: 14px;">
                单元 ${rolSesionNormalizado === "preceptor"
                    ? `<span style="color:#94a3b8; font-size:11px; font-weight:500;">Solo Vista</span>`
                    : `<button type="button" class="btn-accion-eliminar" onclick="removerLegajoAlumno('${alumno.dni}')" style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:
