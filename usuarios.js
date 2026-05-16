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

    // 5. Escuchadores reactivos para la barra de auditoría masiva e interactiva
    const filtroBusqueda = document.getElementById('filtroBusquedaRapida');
    if (filtroBusqueda) filtroBusqueda.addEventListener('input', renderizarTablaUsuarios);

    const filtroSuper = document.getElementById('filtroSuperpoblacion');
    if (filtroSuper) filtroSuper.addEventListener('change', renderizarTablaUsuarios);
});

// --- INYECCIÓN DINÁMICA DE ROLES DESDE LOCALSTORAGE NORMALIZADO ---
async function cargarRolesEnSelector() {
    const selectRol = document.getElementById('rolUsuario');
    if (!selectRol) return;
    selectRol.innerHTML = '<option value="" disabled selected>Seleccione un rol...</option>';
    
    try {
        const rolesRaw = localStorage.getItem('rolesColegio');
        const roles = rolesRaw ? JSON.parse(rolesRaw) : [];
        
        if (roles.length === 0) {
            selectRol.add(new Option("Administrador (Por Defecto)", "administrador"));
            return;
        }
        
        roles.forEach(rol => {
            selectRol.add(new Option(rol.nombre, rol.id.toLowerCase().trim()));
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

// --- GESTIÓN INTERACTIVA DE PANELES POR CAPACIDAD DE ROL (DINÁMICO RBAC) ---
function gestionarPanelesFormulario() {
    const selectRolElement = document.getElementById('rolUsuario');
    const rolId = selectRolElement.value ? selectRolElement.value.toLowerCase().trim() : "";
    const bloqueCheck = document.getElementById('bloqueCheckProfesor');
    const panelPreceptor = document.getElementById('grupoCursosPreceptor');
    const panelProfesor = document.getElementById('grupoAsignacionProfesor');
    const altaAnio1 = document.getElementById('altaAnio1');
    const altaAnio2 = document.getElementById('altaAnio2');
    const checkProfesor = document.getElementById('checkEsProfesor');

    // Forzar activación si el cargo base es profesor puro
    if (rolId === "profesor") {
        if (bloqueCheck) bloqueCheck.style.display = "none";
        checkProfesor.checked = true;
    } else {
        if (bloqueCheck) bloqueCheck.style.display = "flex";
    }

    // El panel de preceptoría se abre si el rol es preceptor estructural
    if (rolId === "preceptor") {
        if (panelPreceptor) panelPreceptor.style.display = "block";
        if (altaAnio1) altaAnio1.setAttribute('required', 'true');
        if (altaAnio2) altaAnio2.setAttribute('required', 'true');
    } else {
        if (panelPreceptor) panelPreceptor.style.display = "none";
        if (altaAnio1) altaAnio1.removeAttribute('required');
        if (altaAnio2) altaAnio2.removeAttribute('required');
    }

    // La bolsa de horas se despliega si es Profesor base o posee la función docente activa
    if (rolId === "profesor" || checkProfesor.checked) {
        if (panelProfesor) panelProfesor.style.display = "block";
    } else {
        if (panelProfesor) panelProfesor.style.display = "none";
    }
}

// --- BOLSA DE HORAS DINÁMICA DE PROFESORES CON ESCALAFÓN Y AUDITORÍA ---
function agregarCatedraProfesorBolsa() {
    const selectCurso = document.getElementById('anioProfesor');
    const selectMateria = document.getElementById('materiaProfesor');
    const selectRevista = document.getElementById('revistaProfesor');
    
    if (!selectCurso || !selectMateria || !selectRevista || selectCurso.selectedIndex <= 0 || selectMateria.selectedIndex <= 0) {
        alert("Error: Seleccione un Curso, Materia y Situación de Revista válida para operar.");
        return;
    }
    
    const textoCurso = selectCurso.options[selectCurso.selectedIndex].text;
    const nombreMateria = selectMateria.value;
    const situacionRevista = selectRevista.value; // TITULAR, SUPLENTE o SUPL_SUPL
    const baseCatedraId = `${textoCurso} -> ${nombreMateria}`;
    const identificadorCompleto = `[${situacionRevista}] ${baseCatedraId}`;
    
    // 1. Validar que este mismo docente no tenga ya cargada la materia en el formulario
    if (catedrasTemporales.some(c => c.includes(baseCatedraId))) {
        alert("Este profesor ya posee una asignación registrada para esta misma materia y curso.");
        return;
    }
    
    // 2. Escaneo analítico de superpoblación jerárquica en LocalStorage
    try {
        const usuariosRaw = localStorage.getItem('usuariosColegio');
        const usuariosTotales = usuariosRaw ? JSON.parse(usuariosRaw) : [];
        const dniOriginalEdicion = document.getElementById('dniOriginalEdicion').value;
        
        let docentesAsignados = [];
        usuariosTotales.forEach(u => {
            if (dniOriginalEdicion && u.dni === dniOriginalEdicion) return;
            const bolsa = u.bolsaHoras || u.bolsaHours || [];
            bolsa.forEach(h => {
                if (h.includes(baseCatedraId)) {
                    const revistaOtro = h.match(/\[(.*?)\]/)?.[1] || "DESCONOCIDO";
                    docentesAsignados.push({ nombre: u.nombre, revista: revistaOtro });
                }
            });
        });
        
        if (docentesAsignados.length > 0) {
            const tieneTitular = docentesAsignados.some(d => d.revista === "TITULAR");
            if (situacionRevista === "TITULAR" && tieneTitular) {
                const nombreTitular = docentesAsignados.find(d => d.revista === "TITULAR").nombre;
                alert(`ALERTA REGLAMENTARIA:\nNo se puede asignar como TITULAR. Este curso ya posee un Docente Titular activo: ${nombreTitular}.\nModifique la situación de revista de la hora a tipo Suplente.`);
                return;
            }
            
            const listaDetalle = docentesAsignados.map(d => `• ${d.nombre} (${d.revista})`).join("\n");
            const autorizar = confirm(
                `⚠ AUDITORÍA EN CALIENTE - DETECCIÓN DE MULTI-DOCENTES:\n\n` +
                `La cátedra [ ${baseCatedraId} ] ya tiene personal asociado:\n${listaDetalle}\n\n` +
                `¿Desea autorizar el ingreso de este nuevo registro bajo la condición de ${situacionRevista}?`
            );
            if (!autorizar) return;
        }
    } catch (e) {
        console.error("Error en validación de revista:", e);
    }
    
    catedrasTemporales.push(identificadorCompleto);
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
        let colorFondo = "#e8f0fe";
        let colorTexto = "#1a73e8";
        if (catedra.includes("[TITULAR]")) { colorFondo = "#e6fffa"; colorTexto = "#0d9488"; }
        else if (catedra.includes("[SUPLENTE]")) { colorFondo = "#fff8e1"; colorTexto = "#b78103"; }
        else if (catedra.includes("[SUPL_SUPL]")) { colorFondo = "#fef2f2"; colorTexto = "#dc2626"; }
        
        const tag = document.createElement('span');
        tag.style.background = colorFondo;
        tag.style.color = colorTexto;
        tag.style.padding = "5px 10px";
        tag.style.borderRadius = "4px";
        tag.style.fontSize = "12px";
        tag.style.fontWeight = "600";
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
    const dniInput = document.getElementById('dniUsuario');
    const dni = dniInput.value.replace(/[^0-9]/g, '').trim(); // Sanitización coercitiva inmutable
    const nombreCompleto = document.getElementById('nombreApellido').value.trim();
    const email = document.getElementById('emailUsuario').value.trim();
    const rol = document.getElementById('rolUsuario').value.toLowerCase().trim();
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
            usuarios[index].rol = rol;
            usuarios[index].esProfesor = esProfesor;
            usuarios[index].cursosAsignados = rolesCursos;
            usuarios[index].bolsaHoras = bolsaFinal;
        }
    } else {
        const nuevoUsuario = {
            dni: dni,
            nombre: nombreCompleto,
            email: email,
            rol: rol,
            esProfesor: esProfesor,
            clave: dni, // Clave transitoria (Firebase Auth heredará esto de manera transparente)
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

// --- RENDERIZADO CON FILTRADO MASIVO DE AUDITORÍA DE SUPERPOBLACIÓN ---
async function renderizarTablaUsuarios() {
    const tbody = document.getElementById('tablaUsuariosBody');
    if (!tbody) return;
    tbody.innerHTML = "";

    const usuariosRaw = localStorage.getItem('usuariosColegio');
    const usuarios = usuariosRaw ? JSON.parse(usuariosRaw) : [];
    
    const rolesRaw = localStorage.getItem('rolesColegio');
    const roles = rolesRaw ? JSON.parse(rolesRaw) : [];
    
    const txtBusqueda = document.getElementById('filtroBusquedaRapida')?.value.toLowerCase().trim() || "";
    const modoAuditoria = document.getElementById('filtroSuperpoblacion')?.value || "TODOS";

    // 1. PASO ANALÍTICO MASIVO: Calcular densidad de docentes por asignatura pura
    const mapaPoblacionCatedras = {};
    usuarios.forEach(u => {
        const bolsa = u.bolsaHoras || u.bolsaHours || [];
        bolsa.forEach(h => {
            const materiaPura = h.replace(/\[.*?\]\s*/, "").trim();
            mapaPoblacionCatedras[materiaPura] = (mapaPoblacionCatedras[materiaPura] || 0) + 1;
        });
    });

    // 2. Filtrado en Cascada de la Nómina Completa
    let usuariosFiltrados = usuarios.filter(user => {
        if (txtBusqueda) {
            const mNombre = user.nombre.toLowerCase().includes(txtBusqueda);
            const mDni = user.dni.includes(txtBusqueda);
            const mEmail = user.email.toLowerCase().includes(txtBusqueda);
            if (!mNombre && !mDni && !mEmail) return false;
        }

        if (modoAuditoria === "SUPERPOBLADO") {
            const bolsa = user.bolsaHoras || user.bolsaHours || [];
            if (bolsa.length === 0) return false;
            const tieneMateriaSuperpoblada = bolsa.some(h => {
                const materiaPura = h.replace(/\[.*?\]\s*/, "").trim();
                return mapaPoblacionCatedras[materiaPura] > 1;
            });
            if (!tieneMateriaSuperpoblada) return false;
        }
        return true;
    });

    if (usuariosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No se encontraron registros bajo los criterios de auditoría seleccionados.</td></tr>`;
        return;
    }

    // 3. Inyección y renderizado físico
    usuariosFiltrados.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = "fila-usuario";
        tr.style.borderBottom = "1px solid #f1f3f4";

        const userRolNormalizado = user.rol ? user.rol.toLowerCase().trim() : "";
        const objetoRolEncontrado = roles.find(r => r.id.toLowerCase().trim() === userRolNormalizado);
        const nombreVisibleRol = objetoRolEncontrado ? objetoRolEncontrado.nombre : user.rol;

        let bloquesResponsabilidad = [];

        if (userRolNormalizado === "preceptor" && user.cursosAsignados && user.cursosAsignados.length > 0) {
            const cursosRaw = localStorage.getItem('cursosColegio');
            const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];
            const nombresCursos = user.cursosAsignados.map(id => {
                const c = listaCursos.find(cur => cur.id === id);
                return c ? `${c.ciclo.split("-")[0].trim()} ° "${c.division}"` : "Sin Asignar";
            });
            bloquesResponsabilidad.push(`🔹 <strong>Cursos Preceptoría:</strong> ${nombresCursos.join(" y ")}`);
        }

        const bolsa = user.bolsaHoras || user.bolsaHours || [];
        if (bolsa.length > 0) {
            const liMaterias = bolsa.map(h => {
                let estiloColor = "color: #0d9488; font-weight:600;";
                if (h.includes("[SUPLENTE]")) estiloColor = "color: #b78103; font-weight:600;";
                if (h.includes("[SUPL_SUPL]")) estiloColor = "color: #dc2626; font-weight:600;";
                return `<span style="${estiloColor}">${h}</span>`;
            }).join("<br>");
            bloquesResponsabilidad.push(`💼 <strong>Bolsa de Horas Docente:</strong><br><span style="font-size:11px; display:block; margin-top:2px; line-height:1.4;">${liMaterias}</span>`);
        }

        const celdaResponsabilidad = bloquesResponsabilidad.length > 0 ? bloquesResponsabilidad.join("<div style='margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0;'></div>") : "<span style='color:#94a3b8;'>Ninguna asignada</span>";
        
        const badgeRolHtml = `
            <span class="badge-rol">${nombreVisibleRol}</span>
            ${user.esProfesor && userRolNormalizado !== "profesor" ? '<br><span class="badge-docente">✓ Función Docente</span>' : ''}
        `;

        tr.innerHTML = `
            <td style="padding:12px; font-weight:500;">${user.nombre}<br><span style="font-size:12px; color:#5f6368;">DNI: ${user.dni}</span></td>
            <td style="padding:12px; color:#5f6368; font-size:13px;">${user.dni}</td>
            <td style="padding:12px; color:#5f6368; font-size:13px;">${user.email}</td>
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

    const dniInput = document.getElementById('dniUsuario');
    if (dniInput) {
        dniInput.value = usuario.dni;
        dniInput.disabled = true;
    }
    
    document.getElementById('nombreApellido').value = usuario.nombre || "";
    document.getElementById('emailUsuario').value = usuario.email || "";
    document.getElementById('rolUsuario').value = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
    document.getElementById('checkEsProfesor').checked = usuario.esProfesor || false;
    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    document.getElementById('formTitulo').textContent = "Modificar Datos de Usuario";
    
    const banner = document.getElementById('bannerEdicion');
    if (banner) banner.style.display = "block";
    
    gestionarPanelesFormulario();

    const userRolNormalizado = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
    if (userRolNormalizado === "preceptor" && usuario.cursosAsignados && usuario.cursosAsignados.length >= 2) {
        document.getElementById('altaAnio1').value = usuario.cursosAsignados[0];
        document.getElementById('altaAnio2').value = usuario.cursosAsignados[1];
    }
    
    catedrasTemporales = usuario.bolsaHoras ? [...usuario.bolsaHoras] : (usuario.bolsaHours ? [...usuario.bolsaHours] : []);
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
    
    const dniInput = document.getElementById('dniUsuario');
    if (dniInput) dniInput.disabled = false;
    
    document.getElementById('checkEsProfesor').checked = false;
    catedrasTemporales = [];
    actualizarTagsBolsaHoras();
    gestionarPanelesFormulario();
}
