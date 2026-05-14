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
        const valorOpcion = curso.id; 

        const opt1 = new Option(textoOpcion, valorOpcion);
        const opt2 = new Option(textoOpcion, valorOpcion);
        const optProf = new Option(textoOpcion, curso.id); 

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
            // Se inyecta la materia respetando las mayúsculas institucionales
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
    
    const identificadorCatedra = `${textoCurso} -> ${nombreMateria}`;

    if (catedrasTemporales.includes(identificadorCatedra)) {
        alert("Esta cátedra ya ha sido añadida a la bolsa de horas del profesor.");
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
    const dniOriginalEdicion = document.getElementById('dniOriginalEdicion').value;

    if (!dni || !nombreCompleto || !email || !rol) {
        alert("Por favor, complete todos los campos obligatorios del formulario.");
        return;
    }

    let rolesCursos = [];
    if (rol === "Preceptor") {
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

    if (dniOriginalEdicion) {
        const index = usuarios.findIndex(u => u.dni === dniOriginalEdicion);
        if (index !== -1) {
            usuarios[index].dni = dni;
            usuarios[index].nombre = nombreCompleto;
            usuarios[index].email = email;
            usuarios[index].rol = rol;
            usuarios[index].cursosAsignados = rolesCursos;
            usuarios[index].bolsaHoras = rol === "Profesor" ? [...catedrasTemporales] : [];
        }
    } else {
        const nuevoUsuario = {
            dni: dni,
            nombre: nombreCompleto,
            email: email,
            rol: rol,
            clave: dni, 
            cursosAsignados: rolesCursos,
            bolsaHoras: rol === "Profesor" ? [...catedrasTemporales] : []
        };
        usuarios.push(nuevoUsuario);
    }

    localStorage.setItem('usuariosColegio', JSON.stringify(usuarios));
    alert(dniOriginalEdicion ? "Datos de cuenta actualizados correctamente." : "Cuenta registrada con éxito.");
    
    desactivarModoEdicion();
    await renderizarTablaUsuarios();
}

// --- RENDERIZADO ASÍNCRONO DE LA TABLA DE CUENTAS ---
async function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tablaUsuariosBody');
    if (!tbody) return;
    tbody.innerHTML = "";

    const usuariosRaw = localStorage.getItem('usuariosColegio');
    const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    usuarios.forEach(user => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f1f3f4";

        let detalleAsignacion = "<span style='color:#94a3b8;'>Ninguna</span>";
        if (user.rol === "Preceptor" && user.cursosAsignados && user.cursosAsignados.length > 0) {
            const cursosRaw = localStorage.getItem('cursosColegio');
            const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];
            const nombresCursos = user.cursosAsignados.map(id => {
                const c = listaCursos.find(cur => cur.id === id);
                return c ? `${c.ciclo.split(" ")[0]} ${c.division}` : "Curso Eliminado";
            });
            detalleAsignacion = `<strong>Cursos:</strong> ${nombresCursos.join(" y ")}`;
        } else if (user.rol === "Profesor" && user.bolsaHoras && user.bolsaHoras.length > 0) {
            detalleAsignacion = `<div style="max-height:60px; overflow-y:auto; font-size:11px; color:#5f6368;">${user.bolsaHoras.join("<br>")}</div>`;
        }

        tr.innerHTML = `
            <td style="padding:12px; font-weight:500;">${user.nombre}<br><span style="font-size:12px; color:#5f6368;">DNI: ${user.dni}</span></td>
            <td style="padding:12px; color:#5f6368; font-size:13px;">${user.email}</td>
            <td style="padding:12px;"><span class="badge-rol" style="background:#e8f0fe; color:#1a73e8; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:500;">${user.rol}</span></td>
            <td style="padding:12px; font-size:12px;">${detalleAsignacion}</td>
            <td style="padding:12px; text-align:center; display:flex; gap:8px; justify-content:center;">
                <button type="button" onclick="activarModoEdicion('${user.dni}')" style="background:#1a73e8; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">Editar</button>
                <button type="button" onclick="eliminarCuentaUsuario('${user.dni}')" style="background:#ea4335; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">Borrar</button>
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
    document.getElementById('nombreApellido').value = usuario.nombre;
    document.getElementById('emailUsuario').value = usuario.email;
    document.getElementById('rolUsuario').value = usuario.rol;
    
    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    const banner = document.getElementById('bannerEdicion');
    if (banner) banner.style.display = "block";

    configurarCamposRequeridos();

    if (usuario.rol === "Preceptor" && usuario.cursosAsignados.length >= 2) {
        document.getElementById('altaAnio1').value = usuario.cursosAsignados[0];
        document.getElementById('altaAnio2').value = usuario.cursosAsignados[1];
    } else if (usuario.rol === "Profesor") {
        catedrasTemporales = [...usuario.bolsaHoras];
        actualizarTagsBolsaHoras();
    }
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
    const banner = document.getElementById('bannerEdicion');
    if (banner) banner.style.display = "none";
    
    document.getElementById('formUsuario').reset();
    catedrasTemporales = [];
    actualizarTagsBolsaHoras();
}
