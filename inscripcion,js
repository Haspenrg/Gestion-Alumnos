document.addEventListener("DOMContentLoaded", async function() {
    // 1. Validar e identificar la sesión activa del usuario
    const datosSesion = localStorage.getItem('usuarioActivo');
    if (!datosSesion) {
        window.location.href = "index.html";
        return;
    }
    const usuarioLogueado = JSON.parse(datosSesion);

    // 2. Control Operativo por Rol: Interfaz de Solo Lectura para Preceptores
    if (usuarioLogueado.rol === "Preceptor") {
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
});

// --- CARGA ASÍNCRONA DE ESTRUCTURAS CURRICULARES REALES ---
async function inicializarSelectoresCursos() {
    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];

    const selectForm = document.getElementById('selectCursoAlumno');
    const selectFiltro = document.getElementById('filtroCursoEstructural');

    if (!selectForm || !selectFiltro) return;

    selectForm.innerHTML = '<option value="" disabled selected>Seleccione el curso destino...</option>';
    selectFiltro.innerHTML = '<option value="">Todos los Cursos</option>';

    cursos.forEach(curso => {
        const texto = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
        selectForm.add(new Option(texto, curso.id));
        selectFiltro.add(new Option(`${curso.ciclo.split(" ")}° "${curso.division}"`, curso.id));
    });
}

// --- MOTOR DE FILTRADO AVANZADO Y RENDERIZADO MASIVO ---
async function procesarFiltrosYNómina() {
    const tbody = document.getElementById('tablaAlumnosBody');
    if (!tbody) return;

    const datosSesion = JSON.parse(localStorage.getItem('usuarioActivo'));
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

    // RESTRECCIÓN BIOLÓGICA DE PRECEPTOR: Cruzar datos de usuariosColegio
    if (datosSesion.rol === "Preceptor") {
        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        const preceptorReal = usuarios.find(u => u.dni === datosSesion.dni);
        const cursosAsignados = preceptorReal ? preceptorReal.cursosAsignados : [];

        // Filtro nativo forzado: Solo sus 2 cursos asignados + Solo regulares o entrantes
        alumnos = alumnos.filter(a => 
            cursosAsignados.includes(a.cursoId) && 
            (a.estado === "Regular" || a.estado === "Entrante")
        );
    }

    // Cascada de Filtros del Panel Superior
    let alumnosFiltrados = alumnos.filter(alumno => {
        // 1. Filtro por Ciclo Lectivo indexado
        if (alumno.cicloLectivo !== ciclo) return false;

        // 2. Filtro por Curso Estructural
        if (cursoFiltro && alumno.cursoId !== cursoFiltro) return false;

        // 3. Filtro por Estado de Matrícula
        if (estadoFiltro && alumno.estado !== estadoFiltro) return false;

        // 4. Filtro por Auditoría Documental Completa (docs)
        if (docFiltro) {
            const esCompleto = alumno.documentos && alumno.documentos.length === 6;
            if (docFiltro === "Completo" && !esCompleto) return false;
            if (docFiltro === "Incompleto" && esCompleto) return false;
        }

        // 5. Filtro de Búsqueda Rápida de Texto (Nombre, DNI o Tutor)
        if (busqueda) {
            const matchNombre = alumno.nombre.toLowerCase().includes(busqueda);
            const matchDni = alumno.dni.includes(busqueda);
            const matchTutor = alumno.tutorNombre && alumno.tutorNombre.toLowerCase().includes(busqueda);
            if (!matchNombre && !matchDni && !matchTutor) return false;
        }

        return true;
    });

    // Actualización del marcador numérico superior
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

        // Evento de click para editar en caliente (Exclusivo si no es preceptor)
        if (datosSesion.rol !== "Preceptor") {
            tr.addEventListener('click', (e) => {
                if (e.target.tagName !== "BUTTON") cargarLegajoEnFormulario(alumno.dni);
            });
        }

        const curso = cursos.find(c => c.id === alumno.cursoId);
        const textoCurso = curso ? `${curso.ciclo.split(" ")}° "${curso.division}"` : "Sin Asignar";

        // Alerta visual según cantidad de checkboxes completados en el legajo
        const totalDocs = alumno.documentos ? alumno.documentos.length : 0;
        const auditoriaHtml = totalDocs === 6 
            ? `<span class="documentos-completos">✓ Legajo Completo</span>`
            : `<span class="alerta-documentos">⚠ Incompleto (${totalDocs}/6)</span><br><span style="font-size:11px; color:#64748b">${alumno.documentos.join(", ")}</span>`;

        // Badge estilizado por estado
        const badgeEstado = alumno.estado === "Regular" ? `<span class="badge-curso" style="background:#e2f0d9; color:#385723;">Regular</span>`
            : alumno.estado === "Pase" ? `<span class="badge-pase">Pase</span>`
            : alumno.estado === "Baja" ? `<span class="badge-baja">Baja</span>`
            : `<span class="badge-curso">Mesa Entrada</span>`;

        tr.innerHTML = `
            <td>
                <strong>${alumno.nombre}</strong><br>
                <span style="font-size:11px; color:#64748b;">DNI: ${alumno.dni} | Nacionalidad: ${alumno.nacionalidad}</span>
            </td>
            <td><span class="badge-curso">${textoCurso}</span></td>
            <td>${badgeEstado}<br><span style="font-size:10px; color:#64748b;">Insc.: ${alumno.fechaInscripcion}</span></td>
            <td>${auditoriaHtml}</td>
            <td style="text-align:center;">
                ${datosSesion.rol === "Preceptor" 
                    ? `<span style="color:#94a3b8; font-size:11px;">Solo Vista</span>`
                    : `<button type="button" class="btn-eliminar" onclick="removerLegajoAlumno('${alumno.dni}')" style="background:#ef4444; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:11px;">Eliminar</button>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- GUARDADO ASÍNCRONO MULTABLE JSON ---
async function guardarLegajoDigital(e) {
    e.preventDefault();

    const idEdicion = document.getElementById('idOriginalEdicion').value;
    const dni = document.getElementById('dniAlumno').value.trim();
    const cicloActual = document.getElementById('filtroCicloLectivo').value;

    const checkboxes = document.querySelectorAll('input[name="docs"]:checked');
    const documentos = Array.from(checkboxes).map(cb => cb.value);

    // Fecha en formato DD/MM/AAAA por sistema interno
    const fecha = new Date();
    const fechaFormateada = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;

    const alumnosRaw = localStorage.getItem('alumnosColegio');
    let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];

    // Validar duplicado de DNI en caso de ser un nuevo alta
    if (!idEdicion && alumnos.some(a => a.dni === dni)) {
        alert("Error: El número de DNI ya está registrado en la base de legajos.");
        return;
    }

    const datosLegajo = {
        dni: dni,
        cuil: document.getElementById('cuilAlumno').value.trim(),
        nombre: document.getElementById('nombreAlumno').value.trim(),
        fechaNacimiento: document.getElementById('fechaNacimiento').value,
        lugarNacimiento: document.getElementById('lugarNacimiento').value.trim(),
        nacionalidad: document.getElementById('nacionalidad').value.trim(),
        cursoId: document.getElementById('selectCursoAlumno').value,
        estado: document.getElementById('estadoAlumno').value,
        direccion: document.getElementById('direccionAlumno').value.trim(),
        telefono: document.getElementById('telefonoAlumno').value.trim(),
        telefonoAlternativo: document.getElementById('telefonoAlternativo').value.trim(),
        escuelaProcedencia: document.getElementById('escuelaProcedencia').value.trim(),
        folioLibro: document.getElementById('folioLibroLegajo').value.trim(),
        tutorNombre: document.getElementById('nombreTutor').value.trim(),
        tutorDni: document.getElementById('dniTutor').value.trim(),
        documentos: documentos,
        observaciones: document.getElementById('observacionesAlumno').value.trim(),
        cicloLectivo: cicloActual,
        fechaInscripcion: idEdicion ? (alumnos.find(a => a.dni === idEdicion)?.fechaInscripcion || fechaFormateada) : fechaFormateada
    };

    if (idEdicion) {
        const idx = alumnos.findIndex(a => a.dni === idEdicion);
        if (idx !== -1) alumnos[idx] = datosLegajo;
    } else {
        alumnos.push(datosLegajo);
    }

    localStorage.setItem('alumnosColegio', JSON.stringify(alumnos));
    alert(idEdicion ? "Legajo actualizado con éxito." : "Estudiante matriculado con éxito.");
    
    salirModoEdicion();
    await procesarFiltrosYNómina();
}

// --- CONTROLES DE EDICIÓN EN CALIENTE ---
function cargarLegajoEnFormulario(dni) {
    const alumnosRaw = localStorage.getItem('alumnosColegio');
    const alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
    const alumno = alumnos.find(a => a.dni === dni);

    if (!alumno) return;

    document.getElementById('idOriginalEdicion').value = alumno.dni;
    document.getElementById('formTitulo').textContent = "Editar Legajo de Alumno";
    document.getElementById('bannerEdicion').style.display = "block";

    // Mapeo inverso completo de los campos de la grilla extendida
    document.getElementById('nombreAlumno').value = alumno.nombre;
    document.getElementById('dniAlumno').value = alumno.dni;
    document.getElementById('cuilAlumno').value = alumno.cuil || "";
    document.getElementById('fechaNacimiento').value = alumno.fechaNacimiento;
    document.getElementById('lugarNacimiento').value = alumno.lugarNacimiento;
    document.getElementById('nacionalidad').value = alumno.nacionalidad;
    document.getElementById('selectCursoAlumno').value = alumno.cursoId;
    document.getElementById('estadoAlumno').value = alumno.estado;
    document.getElementById('direccionAlumno').value = alumno.direccion;
    document.getElementById('telefonoAlumno').value = alumno.telefono;
    document.getElementById('telefonoAlternativo').value = alumno.telefonoAlternativo || "";
    document.getElementById('escuelaProcedencia').value = alumno.escuelaProcedencia || "";
    document.getElementById('folioLibroLegajo').value = alumno.folioLibro || "";
    document.getElementById('nombreTutor').value = alumno.tutorNombre || "";
    document.getElementById('dniTutor').value = alumno.tutorDni || "";
    document.getElementById('observacionesAlumno').value = alumno.observaciones || "";

    // Resetear y marcar checkboxes interactivos
    const checkboxes = document.querySelectorAll('input[name="docs"]');
    checkboxes.forEach(cb => cb.checked = alumno.documentos.includes(cb.value));
}

window.removerLegajoAlumno = function(dni) {
    if (!confirm("¿Está seguro de eliminar permanentemente este legajo digital?")) return;

    const alumnosRaw = localStorage.getItem('alumnosColegio');
    let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];

    alumnos = alumnos.filter(a => a.dni !== dni);
    localStorage.setItem('alumnosColegio', JSON.stringify(alumnos));

    procesarFiltrosYNómina();
};

function salirModoEdicion() {
    document.getElementById('idOriginalEdicion').value = "";
    document.getElementById('formTitulo').textContent = "Matricular Estudiante";
    document.getElementById('bannerEdicion').style.display = "none";
    document.getElementById('formInscripcion').reset();
    document.getElementById('nacionalidad').value = "Argentina";
}
