// Variable global para interactuar con la consola de matriculación
document.addEventListener("DOMContentLoaded", async function() {
    
    // 1. Validar e identificar la sesión activa del usuario
    const datosSesionRaw = localStorage.getItem('usuarioActivo');
    if (!datosSesionRaw) {
        window.location.href = "index.html";
        return;
    }
    const usuarioLogueado = JSON.parse(datosSesionRaw);
    const rolNormalizado = usuarioLogueado.rol.toLowerCase().trim();

    // 2. Control Operativo por Rol: Interfaz de Solo Lectura para Preceptores
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

// --- CARGA ASÍNCRONA DE ESTRUCTURAS CURRICULARES REALES (CORREGIDA) ---
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
        
        // REPARACIÓN COMPATIBLE: Extrae de forma segura el año académico sin romper arrays en memoria
        const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
        selectFiltro.add(new Option(`${numeroAnio}° "${curso.division}"`, curso.id));
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

    const ciclo = document.getElementById('filtroCicloLectivo').value;
    const busqueda = document.getElementById('filtroBusquedaRapida').value.toLowerCase().trim();
    const cursoFiltro = document.getElementById('filtroCursoEstructural').value;
    const estadoFiltro = document.getElementById('filtroEstadoMatricula').value;
    const docFiltro = document.getElementById('filtroAuditoriaDocs').value;

    // RESTRICCIÓN DE SEGURIDAD DE PRECEPTOR
    if (rolSesionNormalizado === "preceptor") {
        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        const preceptorReal = usuarios.find(u => u.dni === datosSesion.dni);
        const cursosAsignados = preceptorReal ? preceptorReal.cursosAsignados : [];

        alumnos = alumnos.filter(a => 
            cursosAsignados.includes(a.cursoId) && 
            (a.estado === "Regular" || a.estado === "Entrante")
        );
    }

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
            const matchDni = alumno.dni.includes(busqueda);
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
            const numeroAnio = curso.ciclo ? curso.ciclo.charAt(0) : "1";
            textoCurso = `${numeroAnio}° "${curso.division}"`;
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

        // CORRECCIÓN LÍNEA 197: Se cerró herméticamente el literal de plantilla con la comilla invertida trasera
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
                ${rolSesionNormalizado === "preceptor"
                    ? `<span style="color:#94a3b8; font-size:11px; font-weight:500;">Solo Vista</span>`
                    : `<button type="button" class="btn-accion-eliminar" onclick="removerLegajoAlumno('${alumno.dni}')" style="background:#ef4444; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">Eliminar</button>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- PRIVACIDAD Y PERSISTENCIA DE ALUMNOS ---
async function guardarLegajoDigital(e) {
    e.preventDefault();
    
    const idEdicion = document.getElementById('idOriginalEdicion').value;
    const dni = document.getElementById('dniAlumno').value.trim();
    const cicloActual = document.getElementById('filtroCicloLectivo').value;
    
    const checkboxes = document.querySelectorAll('input[name="docs"]:checked');
    const documentos = Array.from(checkboxes).map(cb => cb.value);
    
    const fecha = new Date();
    const fechaFormateada = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;

    const alumnosRaw = localStorage.getItem('alumnosColegio');
    let alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];

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

function cargarLegajoEnFormulario(dni) {
    const alumnosRaw = localStorage.getItem('alumnosColegio');
    const alumnos = alumnosRaw ? JSON.parse(alumnosRaw) : [];
    const alumno = alumnos.find(a => a.dni === dni);
    if (!alumno) return;

    document.getElementById('idOriginalEdicion').value = alumno.dni;
    document.getElementById('formTitulo').textContent = "Editar Legajo de Alumno";
    document.getElementById('bannerEdicion').style.display = "block";

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
    document.getElementById('nombreTutor').value = alumno.tutorNombre || "";
    document.getElementById('dniTutor').value = alumno.tutorDni || "";
    document.getElementById('observacionesAlumno').value = alumno.observaciones || "";

    const checkboxes = document.querySelectorAll('input[name="docs"]');
    checkboxes.forEach(cb => cb.checked = alumno.documentos.includes(cb.value));

    evaluarEstadoMesaEntrada();
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
    evaluarEstadoMesaEntrada();
}
