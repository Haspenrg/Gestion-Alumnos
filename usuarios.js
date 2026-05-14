// Variable global para acumular temporalmente la bolsa de horas en caliente (Profesor)
let catedrasTemporales = [];

document.addEventListener("DOMContentLoaded", async function() {
    // 1. Validar que exista una sesión activa del Administrador
    const datosSesion = localStorage.getItem('usuarioActivo');
    if (!datosSesion) {
        window.location.href = "index.html";
        return;
    }
    const usuarioLogueado = JSON.parse(datosSesion);
    if (usuarioLogueado.rol !== "Administrador") {
        alert("Acceso denegado: Su rol no posee permisos de administración de cuentas.");
        window.location.href = "panel.html";
        return;
    }

    // 2. Inicializar componentes y selectores basados en cursos reales de LocalStorage
    await inicializarSelectoresCursos();
    await renderizarTablaUsuarios();

    // 3. Registrar los escuchadores de eventos del Formulario
    const selectRol = document.getElementById('rolUsuario');
    selectRol.addEventListener('change', configurarCamposRequeridos);

    const selectAnioProfesor = document.getElementById('anioProfesor');
    selectAnioProfesor.addEventListener('change', cargarMateriasPorCursoSeleccionado);

    const btnAgregarCatedra = document.getElementById('btnAgregarCatedra');
    btnAgregarCatedra.addEventListener('click', agregarCatedraProfesorBolsa);

    const formUsuario = document.getElementById('formUsuario');
    formUsuario.addEventListener('submit', procesarGuardarUsuario);

    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
    btnCancelarEdicion.addEventListener('click', desactivarModoEdicion);
});

// --- LÓGICA DE INICIALIZACIÓN DE SELECTORES REALES ---
async function inicializarSelectoresCursos() {
    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];

    const selectPrep1 = document.getElementById('altaAnio1');
    const selectPrep2 = document.getElementById('altaAnio2');
    const selectProfCurso = document.getElementById('anioProfesor');

    // Limpiamos los encabezados de opciones
    selectPrep1.innerHTML = '<option value="" disabled selected>Seleccione curso estructural...</option><option value="Ninguno">Ninguno / Sin curso asignado</option>';
    selectPrep2.innerHTML = '<option value="" disabled selected>Seleccione curso estructural...</option><option value="Ninguno">Ninguno / Sin curso asignado</option>';
    selectProfCurso.innerHTML = '<option value="" disabled selected>Seleccione estructura...</option>';

    if (cursos.length === 0) {
        return;
    }

    cursos.forEach(curso => {
        const textoOpcion = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
        const valorOpcion = `${curso.ciclo} - División ${curso.division}`; // Formato estándar de coincidencia

        const opt1 = new Option(textoOpcion, valorOpcion);
        const opt2 = new Option(textoOpcion, valorOpcion);
        const optProf = new Option(textoOpcion, curso.id); // Guardamos el ID del curso para buscar sus materias rápido

        selectPrep1.add(opt1);
        selectPrep2.add(opt2);
        selectProfCurso.add(optProf);
    });
}

// Carga las materias dinámicamente en el formulario del profesor según el curso seleccionado
async function cargarMateriasPorCursoSeleccionado() {
    const cursoId = document.getElementById('anioProfesor').value;
    const selectMateria = document.getElementById('materiaProfesor');
    selectMateria.innerHTML = '<option value="" disabled selected>Seleccione materia...</option>';

    if (!cursoId) return;

    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
    const cursoEncontrado = cursos.find(c => c.id === cursoId);

    if (cursoEncontrado && cursoEncontrado.materias) {
        cursoEncontrado.materias.forEach(materia => {
            const opt = new Option(materia, materia);
            selectMateria.add(opt);
        });
    }
}

// --- GESTIÓN DE ROLES DINÁMICOS (configurarCamposRequeridos) ---
function configurarCamposRequeridos() {
    const rol = document.getElementById('rolUsuario').value;
    const panelPreceptor = document.getElementById('grupoCursosPreceptor');
    const panelProfesor = document.getElementById('grupoAsignacionProfesor');

    // Desactivamos paneles inicialmente
    panelPreceptor.style.display = "none";
    panelProfesor.style.display = "none";

    document.getElementById('altaAnio1').removeAttribute('required');
    document.getElementById('altaAnio2').removeAttribute('required');

    // Limpieza de índices y temporales al alternar
    document.getElementById('altaAnio1').selectedIndex = 0;
    document.getElementById('altaAnio2').selectedIndex = 0;
    document.getElementById('anioProfesor').selectedIndex = 0;
    document.getElementById('materiaProfesor').innerHTML = '<option value="" disabled selected>Seleccione primero un curso...</option>';
    
    // Solo si no estamos en Modo Edición limpiamos la bolsa de horas
    if (!document.getElementById('dniOriginalEdicion').value) {
        catedrasTemporales = [];
        actualizarTagsBolsaHoras();
    }

    // Activación selectiva por reglas de negocio
    if (rol === "Preceptor") {
        panelPreceptor.style.display = "block";
        document.getElementById('altaAnio1').setAttribute('required', 'true');
        document.getElementById('altaAnio2').setAttribute('required', 'true');
    } else if (rol === "Profesor") {
        panelProfesor.style.display = "block";
    }
}

// --- BOLSA DE HORAS DINÁMICA DE PROFESORES ---
function agregarCatedraProfesorBolsa() {
    const selectCurso = document.getElementById('anioProfesor');
    const selectMateria = document.getElementById('materiaProfesor');

    if (selectCurso.selectedIndex <= 0 || selectMateria.selectedIndex <= 0) {
        alert("Error: Seleccione un Curso y una Materia válida para agregar a la bolsa de horas.");
        return;
    }

    const textoCurso = selectCurso.options[selectCurso.selectedIndex].text;
    const nombreMateria = selectMateria.value;
    
    // Formato de cadena de texto acumulable según contexto
    const identificadorCatedra = `${textoCurso} -> ${nombreMateria}`;

    if (catedrasTemporales.includes(identificadorCatedra)) {
        alert("Esta cátedra ya ha sido añadida a la bolsa de horas del profesor.");
        return;
    }

    // Almacenamiento e inyección visual en caliente (Licencias Docentes permitidas de forma nativa)
    catedrasTemporales.push(identificadorCatedra);
    actualizarTagsBolsaHoras();
}

function actualizarTagsBolsaHoras() {
    const contenedor = document.getElementById('listaCatedrasProfesor');
    contenedor.innerHTML = "";

    if (catedrasTemporales.length === 0) {
        contenedor.innerHTML = '<span style="color: #94a3b8; font-size: 13px;" id="sinCatedrasMensaje">No hay cátedras asignadas aún.</span>';
        return;
    }

    catedrasTemporales.forEach((catedra, indice) => {
        const tag = document.createElement('span');
        tag.className = "catedra-tag";
        // Estilos inline de reseteo institucional
        tag.style.background = "#e8f0fe";
        tag.style.color = "#1a73e8";
        tag.style.padding = "5px 10px";
        tag.style.borderRadius = "4px";
        tag.style.fontSize = "12px";
        tag.style.fontWeight = "500";
        tag.style.display = "inline-flex";
        tag.style.alignItems = "center";
        tag.style.gap = "6px";

        tag.innerHTML = `
            ${catedra} 
            <strong style="color:#d93025; cursor:pointer;" onclick="removerCatedraBolsa(${indice})">×</strong>
        `;
        contenedor.appendChild(tag);
    });
}

function removerCatedraBolsa(indice) {
    catedrasTemporales.splice(indice, 1);
    actualizarTagsBolsaHoras();
}

// --- MECÁNICA PERSISTENCIA: ALTA Y MODIFICACIÓN EN CALIENTE ---
async function procesarGuardarUsuario(e) {
    e.preventDefault();

    const dni = document.getElementById('dniUsuario').value.trim();
    const nombreCompleto = document.getElementById('nombreApellido').value.trim();
    const email = document.getElementById('emailUsuario').value.trim();
    const rol = document.getElementById('rolUsuario').value;
    const dniOriginal = document.getElementById('dniOriginalEdicion').value;

    let listaUsuarios = JSON.parse(localStorage.getItem('usuariosColegio')) || [];

    // Validar duplicidad de DNI solo en altas nuevas
    if (!dniOriginal && listaUsuarios.find(u => u.dni === dni)) {
        alert("Error: Ya existe una cuenta registrada con ese número de DNI.");
        return;
    }

    let datosCurriculares = "";
    if (rol === "Preceptor") {
        const c1 = document.getElementById('altaAnio1').value;
        const c2 = document.getElementById('altaAnio2').value;
        datosCurriculares = [c1, c2];
    } else if (rol === "Profesor") {
        if (catedrasTemporales.length === 0) {
            alert("Error: Un perfil pedagógico de Profesor debe poseer al menos una cátedra en su bolsa de horas.");
            return;
        }
        datosCurriculares = [...catedrasTemporales];
    }

    if (dniOriginal) {
        // --- MODO EDICIÓN EN CALIENTE ---
        const index = listaUsuarios.findIndex(u => u.dni === dniOriginal);
        if (index !== -1) {
            // Mantener la contraseña existente si no se provee campo de actualización
            const claveExistente = listaUsuarios[index].clave || dni;
            
            listaUsuarios[index] = {
                dni,
                usuario: dni,
                nombreCompleto,
                email,
                rol,
                clave: claveExistente,
                asignacion: datosCurriculares
            };
            alert("Cuenta de usuario reconfigurada y actualizada con éxito.");
        }
    } else {
        // --- ALTA NUEVA SEMILLA ---
        listaUsuarios.push({
            dni,
            usuario: dni,
            nombreCompleto,
            email,
            rol,
            clave: dni, // Contraseña inicial por defecto es su DNI
            asignacion: datosCurriculares
        });
        alert("Nuevo usuario incorporado al sistema HASPEN.");
    }

    localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));
    desactivarModoEdicion();
    await renderizarTablaUsuarios();
}

// --- RENDERIZADO DE TABLA Y CONTROL DE PERMISOS BIOLÓGICOS ---
async function renderizarTablaUsuarios() {
    const tablaBody = document.getElementById('tablaUsuariosBody');
    const usuarios = JSON.parse(localStorage.getItem('usuariosColegio')) || [];
    
    // Consultamos la sesión activa para bloquear auto-eliminación
    const sesionActiva = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    tablaBody.innerHTML = "";

    usuarios.forEach(usuario => {
        const tr = document.createElement('tr');
        tr.className = "fila-usuario";

        let celdaAsignacion = `<span style="color:#64748b; font-size:13px;">No requiere (Permiso Institucional)</span>`;
        if (usuario.rol === "Preceptor" && Array.isArray(usuario.asignacion)) {
            celdaAsignacion = usuario.asignacion.map(c => `<span class="badge-rol" style="margin:2px; background:#f0fdf4; color:#16a34a;">${c}</span>`).join('');
        } else if (usuario.rol === "Profesor" && Array.isArray(usuario.asignacion)) {
            celdaAsignacion = usuario.asignacion.map(cat => `<span class="badge-rol" style="margin:2px; display:block; font-size:11px; text-align:left;">📚 ${cat}</span>`).join('');
        }

        // Mecánica de Bloqueo de Auto-eliminación segura
        const esMismoUsuarioLogueado = (usuario.nombreCompleto === sesionActiva.nombre);
        const botonEliminarHTML = esMismoUsuarioLogueado 
            ? `<span style="font-size:11px; color:#94a3b8; font-weight:bold;">[Sesión Activa]</span>`
            : `<button class="btn-accion btn-eliminar" onclick="eliminarUsuarioSeguro('${usuario.dni}')">Dar de Baja</button>`;

        tr.innerHTML = `
            <td style="font-weight:600;">${usuario.nombreCompleto}</td>
            <td><code>${usuario.dni}</code></td>
            <td>${usuario.email || 'sin-correo@haspen.edu.ar'}</td>
            <td><span class="badge-rol">${usuario.rol}</span><div style="margin-top:5px;">${celdaAsignacion}</div></td>
            <td style="text-align:center;">
                <button class="btn-accion btn-modificar" onclick="activarModoEdición('${usuario.dni}')">Modificar</button>
                ${botonEliminarHTML}
            </td>
        `;
        tablaBody.appendChild(tr);
    });
}

// --- ELIMINACIÓN SEGURA CON CONTROL DE REGLA ---
window.eliminarUsuarioSeguro = function(dni) {
    if (confirm("¿Está seguro de dar de baja esta cuenta de acceso institucional? Esta acción modificará los permisos inmediatamente.")) {
        let listaUsuarios = JSON.parse(localStorage.getItem('usuariosColegio')) || [];
        listaUsuarios = listaUsuarios.filter(u => u.dni !== dni);
        localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));
        renderizarTablaUsuarios();
    }
};

// --- GOBERNACIÓN EN CALIENTE: MODO EDICIÓN ---
window.activarModoEdición = function(dni) {
    const usuarios = JSON.parse(localStorage.getItem('usuariosColegio')) || [];
    const usuario = usuarios.find(u => u.dni === dni);

    if (!usuario) return;

    // Activamos elementos de UI del banner de alerta dinámico
    document.getElementById('bannerEdicion').style.display = "block";
    document.getElementById('formTitulo').textContent = "Modificar Datos de Usuario";
    document.getElementById('btnGuardarUsuario').textContent = "Actualizar Usuario";

    // Cargamos campos en el formulario gubernamental
    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    document.getElementById('dniUsuario').value = usuario.dni;
    document.getElementById('nombreApellido').value = usuario.nombreCompleto;
    document.getElementById('emailUsuario').value = usuario.email || "";
    document.getElementById('rolUsuario').value = usuario.rol;

    // Provocamos el cambio visual del rol y re-mapeamos asignaciones
    configurarCamposRequeridos();

    if (usuario.rol === "Preceptor" && Array.isArray(usuario.asignacion)) {
        document.getElementById('altaAnio1').value = usuario.asignacion[0] || "";
        document.getElementById('altaAnio2').value = usuario.asignacion[1] || "";
    } else if (usuario.rol === "Profesor" && Array.isArray(usuario.asignacion)) {
        catedrasTemporales = [...usuario.asignacion];
        actualizarTagsBolsaHoras();
    }
    
    // Auto-desplazamiento suave al formulario superior
    document.querySelector('.form-registro-usuario').scrollIntoView({ behavior: 'smooth' });
};

function desactivarModoEdicion() {
    document.getElementById('bannerEdicion').style.display = "none";
    document.getElementById('formTitulo').textContent = "Registrar Nuevo Usuario";
    document.getElementById('btnGuardarUsuario').textContent = "Guardar Usuario";
    document.getElementById('dniOriginalEdicion').value = "";
    
    document.getElementById('formUsuario').reset();
    catedrasTemporales = [];
    configurarCamposRequeridos();
}

