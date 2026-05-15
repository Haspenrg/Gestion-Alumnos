// Variable global para acumular temporalmente la bolsa de horas en caliente (Profesor)
let catedrasTemporales = [];

document.addEventListener("DOMContentLoaded", async function() {
    // 1. Validar que exista una sesión activa del Administrador general (Neutralizando mayúsculas)
    const datosSesion = localStorage.getItem('usuarioActivo');
    if (!datosSesion) {
        window.location.href = "index.html";
        return;
    }
    const usuarioLogueado = JSON.parse(datosSesion);
    if (usuarioLogueado.rol.toLowerCase().trim() !== "administrador") {
        alert("Acceso denegado: Su rol no posee permisos de administración de cuentas.");
        window.location.href = "panel.html";
        return;
    }

    // 2. Cargar el selector de roles dinámicos antes de inicializar el formulario
    await cargarRolesEnSelector();

    // 3. Inicializar componentes y selectores basados en cursos reales de LocalStorage
    await inicializarSelectoresCursos();
    await renderizarTablaUsuarios();

    // 4. Registrar los escuchadores de eventos del Formulario
    const selectRol = document.getElementById('rolUsuario');
    if (selectRol) selectRol.addEventListener('change', gestionarPanelesFormulario);

    const checkProfesor = document.getElementById('checkEsProfesor');
    if (checkProfesor) checkProfesor.addEventListener('change', gestionarPanelesFormulario);

    const selectAnioProfesor = document.getElementById('anioProfesor');
    if (selectAnioProfesor) selectAnioProfesor.addEventListener('change', cargarMateriasPorCursoSeleccionado);

    const btnAgregarCatedra = document.getElementById('btnAgregarCatedra');
    if (btnAgregarCatedra) btnAgregarCatedra.addEventListener('click', agregarCatedraProfesorBolsa);

    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) formUsuario.addEventListener('submit', procesarGuardarUsuario);

    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
    if (btnCancelarEdicion) btnCancelarEdicion.addEventListener('click', desactivarModoEdicion);
});

// --- NUEVA FUNCIÓN: INYECCIÓN DINÁMICA DE ROLES DESDE LOCALSTORAGE ---
async function cargarRolesEnSelector() {
    const selectRol = document.getElementById('rolUsuario');
    if (!selectRol) return;

    // Limpiar opciones fijas del HTML manteniendo la instrucción inicial
    selectRol.innerHTML = '<option value="" disabled selected>Seleccione un rol...</option>';

    try {
        const rolesRaw = localStorage.getItem('rolesColegio');
        const roles = rolesRaw ? JSON.parse(rolesRaw) : [];

        // Si no existen roles cargados, se genera una contención visual preventiva
        if (roles.length === 0) {
            selectRol.add(new Option("Administrador (Por Defecto)", "administrador"));
            return;
        }

        // Inyectar dinámicamente cada perfil guardado en el sub-sistema RBAC
        roles.forEach(rol => {
            selectRol.add(new Option(rol.nombre, rol.id));
        });
    } catch (error) {
        console.error("Error al inyectar catálogo de roles dinámicos:", error);
    }
}

// --- LÓGICA DE INICIALIZACIÓN DE SELECTORES REALES ---
async function inicializarSelectoresCursos() {
    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
    
    const selectPrep1 = document.getElementById('altaAnio1');
    const selectPrep2 = document.getElementById('altaAnio2');
    const selectProfCurso = document.getElementById('anioProfesor');
    
    if (!selectPrep1 || !selectPrep2 || !selectProfCurso) return;

    selectPrep1.innerHTML = '<option value="" disabled selected>Seleccione curso...</option><option value="Ninguno">Ninguno / Sin asignar</option>';
    selectPrep2.innerHTML = '<option value="" disabled selected>Seleccione curso...</option><option value="Ninguno">Ninguno / Sin asignar</option>';
    selectProfCurso.innerHTML = '<option value="" disabled selected>Seleccione estructura...</option>';

    if (cursos.length === 0) return;

    cursos.forEach(curso => {
        const textoOpcion = `${curso.ciclo} - Div: ${curso.division} (${curso.turno})`;
        selectPrep1.add(new Option(textoOpcion, curso.id));
        selectPrep2.add(new Option(textoOpcion, curso.id));
        selectProfCurso.add(new Option(textoOpcion, curso.id));
    });
}

// Carga las materias dinámicamente en el formulario según el curso estructural seleccionado
async function cargarMateriasPorCursoSeleccionado() {
    const cursoId = document.getElementById('anioProfesor').value;
    const selectMateria = document.getElementById('materiaProfesor');
    if (!selectMateria) return;

    selectMateria.innerHTML = '<option value="" disabled selected>Seleccione materia...</option>';
    if (!cursoId) return;

    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
    const cursoEncontrado = cursos.find(c => c.id === cursoId);

    if (cursoEncontrado && cursoEncontrado.materias) {
        cursoEncontrado.materias.forEach(materia => {
            selectMateria.add(new Option(materia, materia));
        });
    }
}

// --- GESTIÓN INTERACTIVA DE PANELES MULTIRROL (NORMALIZADO A MINÚSCULAS) ---
function gestionarPanelesFormulario() {
    const rol = document.getElementById('rolUsuario').value; // Retorna el ID técnico en minúsculas
    const bloqueCheck = document.getElementById('bloqueCheckProfesor');
    const panelPreceptor = document.getElementById('grupoCursosPreceptor');
    const panelProfesor = document.getElementById('grupoAsignacionProfesor');
    const altaAnio1 = document.getElementById('altaAnio1');
    const altaAnio2 = document.getElementById('altaAnio2');

    // Regla de Negocio: Si el rol base ya es Profesor, ocultamos el checkbox para evitar redundancias
    if (rol === "profesor") {
        if (bloqueCheck) bloqueCheck.style.display = "none";
        document.getElementById('checkEsProfesor').checked = true;
    } else {
        if (bloqueCheck) bloqueCheck.style.display = "flex";
    }

    // Evaluación en tiempo real para visibilidad de paneles bajo identificador normalizado
    if (rol === "preceptor") {
        if (panelPreceptor) panelPreceptor.style.display = "block";
        if (altaAnio1) altaAnio1.setAttribute('required', 'true');
        if (altaAnio2) altaAnio2.setAttribute('required', 'true');
    } else {
        if (panelPreceptor) panelPreceptor.style.display = "none";
        if (altaAnio1) altaAnio1.removeAttribute('required');
        if (altaAnio2) altaAnio2.removeAttribute('required');
    }

    // El panel de cátedras se inyecta de forma combinada si es rol Profesor u otro rol con check activo
    if (rol === "profesor" || document.getElementById('checkEsProfesor').checked) {
        if (panelProfesor) panelProfesor.style.display = "block";
    } else {
        if (panelProfesor) panelProfesor.style.display = "none";
    }
}

// --- BOLSA DE HORAS DINÁMICA DE PROFESORES ---
function agregarCatedraProfesorBolsa() {
    const selectCurso = document.getElementById('anioProfesor');
    const selectMateria = document.getElementById('materiaProfesor');

    if (!selectCurso || !selectMateria || selectCurso.selectedIndex <= 0 || selectMateria.selectedIndex <= 0) {
        alert("Error: Seleccione un Curso y una Materia válida para agregar a la bolsa de horas.");
        return;
    }

    const textoCurso = selectCurso.options[selectCurso.selectedIndex].text;
    const nombreMateria = selectMateria.value;
    const identificadorCatedra = `${textoCurso} -> ${nombreMateria}`;

    if (catedrasTemporales.includes(identificadorCatedra)) {
        alert("Esta cátedra ya ha sido añadida a la bolsa de horas.");
        return;
    }

    catedrasTemporales.push(identificadorCatedra);
    actualizarTagsBolsaHoras();
}

function actualizarTagsBolsaHoras() {
    const contenedor = document.getElementById('listaCatedrasProfesor');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (catedrasTemporales.length === 0) {
        contenedor.innerHTML = '<span style="color: #94a3b8; font-size: 13px;" id="sinCatedrasMensaje">No hay cátedras asignadas aún.</span>';
        return;
    }

    catedrasTemporales.forEach((catedra, indice) => {
        const tag = document.createElement('span');
        tag.className = "catedra-tag";
        tag.style.background = "#e8f0fe";
        tag.style.color = "#1a73e8";
        tag.style.padding = "5px 10px";
        tag.style.borderRadius = "4px";
        tag.style.fontSize = "12px";
        tag.style.fontWeight = "500";
        tag.style.display = "inline-flex";
        tag.style.alignItems = "center";
        tag.style.gap = "6px";
        tag.style.margin = "4px";
        tag.innerHTML = `
            ${catedra}
            <strong style="color:#d93025; cursor:pointer; font-size: 14px;" onclick="removerCatedraBolsa(${indice})">×</strong>
        `;
        contenedor.appendChild(tag);
    });
}

window.removerCatedraBolsa = function(indice) {
    catedrasTemporales.splice(indice, 1);
    actualizarTagsBolsaHoras();
};

// --- MECÁNICA PERSISTENCIA: ALTA Y MODIFICACIÓN EN CALIENTE ---
async function procesarGuardarUsuario(e) {
    e.preventDefault();
    const dni = document.getElementById('dniUsuario').value.trim();
    const nombreCompleto = document.getElementById('nombreApellido').value.trim();
    const email = document.getElementById('emailUsuario').value.trim();
    const rol = document.getElementById('rolUsuario').value; // ID en minúsculas
    const esProfesor = document.getElementById('checkEsProfesor').checked;
    const dniOriginalEdicion = document.getElementById('dniOriginalEdicion').value;

    if (!dni || !nombreCompleto || !email || !rol) {
        alert("Por favor, complete todos los campos obligatorios del formulario.");
        return;
    }

    let rolesCursos = [];
    if (rol === "preceptor") {
        const c1 = document.getElementById('altaAnio1').value;
        const c2 = document.getElementById('altaAnio2').value;
        if (!c1 || !c2 || c1 === "Ninguno" || c2 === "Ninguno" || c1 === c2) {
            alert("Error: Un preceptor debe tener asignados exactamente 2 cursos estructurales distintos.");
            return;
        }
        rolesCursos = [c1, c2];
    }

    const usuariosRaw = localStorage.getItem('usuariosColegio');
    let usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];

    if (!dniOriginalEdicion && usuarios.some(u => u.dni === dni)) {
        alert("Error: Ya existe un usuario registrado con el DNI ingresado.");
        return;
    }

    const bolsaFinal = (rol === "profesor" || esProfesor) ? [...catedrasTemporales] : [];

    if (dniOriginalEdicion) {
        const index = usuarios.findIndex(u => u.dni === dniOriginalEdicion);
        if (index !== -1) {
            usuarios[index].dni = dni;
            usuarios[index].nombre = nombreCompleto;
            usuarios[index].email = email;
            usuarios[index].rol = rol; // Guarda ID en minúsculas
            usuarios[index].esProfesor = esProfesor;
            usuarios[index].cursosAsignados = rolesCursos;
            usuarios[index].bolsaHoras = bolsaFinal;
        }
    } else {
        const nuevoUsuario = {
            dni: dni,
            nombre: nombreCompleto,
            email: email,
            rol: rol, // Guarda ID en minúsculas
            esProfesor: esProfesor,
            clave: dni,
            cursosAsignados: rolesCursos,
            bolsaHoras: bolsaFinal
        };
        usuarios.push(nuevoUsuario);
    }

    localStorage.setItem('usuariosColegio', JSON.stringify(usuarios));
    alert(dniOriginalEdicion ? "Datos de cuenta actualizados correctamente." : "Cuenta registrada con éxito.");
    desactivarModoEdicion();
    await renderizarTablaUsuarios();
}

// --- RENDERIZADO ASÍNCRONO DE LA PLANILLA MUTABLE DE 6 COLUMNAS ---
async function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tablaUsuariosBody');
    if (!tbody) return;
    tbody.innerHTML = "";

    const usuariosRaw = localStorage.getItem('usuariosColegio');
    const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
    
    const rolesRaw = localStorage.getItem('rolesColegio');
    const roles = rolesRaw ? JSON.parse(rolesRaw) : [];

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    usuarios.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = "fila-usuario";
        tr.style.borderBottom = "1px solid #f1f3f4";

        // Mapeo relacional invertido para mostrar el Nombre del Rol legible en lugar del ID
        const objetoRolEncontrado = roles.find(r => r.id === user.rol);
        const nombreVisibleRol = objetoRolEncontrado ? objetoRolEncontrado.nombre : user.rol;

        let bloquesResponsabilidad = [];
        if (user.rol === "preceptor" && user.cursosAsignados && user.cursosAsignados.length > 0) {
            const cursosRaw = localStorage.getItem('cursosColegio');
            const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];
            const nombresCursos = user.cursosAsignados.map(id => {
                const c = listaCursos.find(cur => cur.id === id);
                return c ? `${c.ciclo.split("-")[0].trim()}° "${c.division}"` : "Sin Asignar";
            });
            bloquesResponsabilidad.push(`🔹 <strong>Cursos Preceptoria:</strong> ${nombresCursos.join(" y ")}`);
        }

        if (user.bolsaHoras && user.bolsaHoras.length > 0) {
            bloquesResponsabilidad.push(`💼 <strong>Bolsa de Horas Docente:</strong><br><span style="font-size:11px; color:#475569; display:block; margin-top:2px; line-height:1.4;">${user.bolsaHoras.join("<br>")}</span>`);
        }

        const celdaResponsabilidad = bloquesResponsabilidad.length > 0 ? bloquesResponsabilidad.join("<div style='margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0;'></div>") : "<span style='color:#94a3b8;'>Ninguna asignada</span>";

        // Badge compuesto dinámico acoplado
        const badgeRolHtml = `
            <span class="badge-rol">${nombreVisibleRol}</span>
            ${user.esProfesor && user.rol !== "profesor" ? '<br><span class="badge-docente">✓ Función Docente</span>' : ''}
        `;

        tr.innerHTML = `
            <td style="padding:12px; font-weight:500;">${user.nombre || 'Sin Nombre'}<br><span style="font-size:12px; color:#5f6368;">DNI: ${user.dni}</span></td>
            <td style="padding:12px; color:#5f6368; font-size:13px;">${user.dni}</td>
            <td style="padding:12px; color:#5f6368; font-size:13px;">${user.email || 'Sin Email'}</td>
            <td style="padding:12px; vertical-align: top;">${badgeRolHtml}</td>
            <td style="padding:12px; font-size:12px; vertical-align: top;">${celdaResponsabilidad}</td>
            <td style="padding:12px; text-align:center; display:flex; gap:8px; justify-content:center; align-items: flex-start;">
                <button type="button" onclick="activarModoEdicion('${user.dni}')" style="background:#1a73e8; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Editar</button>
                <button type="button" onclick="eliminarCuentaUsuario('${user.dni}')" style="background:#ea4335; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.activarModoEdicion = function(dni) {
    const usuariosRaw = localStorage.getItem('usuariosColegio');
    const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
    const usuario = usuarios.find(u => u.dni === dni);
    if (!usuario) return;

    document.getElementById('dniUsuario').value = usuario.dni;
    document.getElementById('nombreApellido').value = usuario.nombre || "";
    document.getElementById('emailUsuario').value = usuario.email || "";
    document.getElementById('rolUsuario').value = usuario.rol; // Carga ID en minúsculas perfectamente
    document.getElementById('checkEsProfesor').checked = usuario.esProfesor || false;
    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    document.getElementById('formTitulo').textContent = "Modificar Datos de Usuario";

    const banner = document.getElementById('bannerEdicion');
    if (banner) banner.style.display = "block";

    gestionarPanelesFormulario();

    if (usuario.rol === "preceptor" && usuario.cursosAsignados && usuario.cursosAsignados.length >= 2) {
        document.getElementById('altaAnio1').value = usuario.cursosAsignados[0];
        document.getElementById('altaAnio2').value = usuario.cursosAsignados[1];
    }

    catedrasTemporales = usuario.bolsaHoras ? [...usuario.bolsaHoras] : [];
    actualizarTagsBolsaHoras();
};

window.eliminarCuentaUsuario = function(dni) {
    const datosSesion = localStorage.getItem('usuarioActivo');
    const usuarioLogueado = datosSesion ? JSON.parse(datosSesion) : {};

    if (usuarioLogueado.dni === dni) {
        alert("Operación denegada: No puede eliminar la cuenta con la que se encuentra logueado.");
        return;
    }

    if (!confirm("¿Está seguro de que desea eliminar esta cuenta?")) return;

    const usuariosRaw = localStorage.getItem('usuariosColegio');
    let usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
    usuarios = usuarios.filter(u => u.dni !== dni);

    localStorage.setItem('usuariosColegio', JSON.stringify(usuarios));
    renderizarTablaUsuarios();
};

function desactivarModoEdicion() {
    document.getElementById('dniOriginalEdicion').value = "";
    document.getElementById('formTitulo').textContent = "Registrar Nuevo Usuario";
    const banner = document.getElementById('bannerEdicion');
    if (banner) banner.style.display = "none";
    
    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) formUsuario.reset();

    document.getElementById('checkEsProfesor').checked = false;
    catedrasTemporales = [];
    actualizarTagsBolsaHoras();
    gestionarPanelesFormulario();
}
