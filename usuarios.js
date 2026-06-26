(async function() {
'use strict';

const b = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
const { db } = await import('./firebase-config.js');
const { collection, getDocs, setDoc, doc, deleteDoc, getDoc } = await import(b + 'firebase-firestore.js');
const mAuth = await import(b + 'firebase-auth.js');
const mApp = await import(b + 'firebase-app.js');

// Instancia secundaria aislada para registrar credenciales sin desloguear al Admin
const firebaseConfigSecondary = {
    apiKey: "AIzaSyBP3iHdEsCnQSABsxEDDR4RNZ1M06MJyvo",
    authDomain: "gestion-alumnos-eeb24" + "." + "firebaseapp" + "." + "com",
    projectId: "gestion-alumnos-eeb24",
    storageBucket: "gestion-alumnos-eeb24.firebasestorage.app",
    messagingSenderId: "824391106851",
    appId: "1:824391106851:web:d8fdc7f37351bedc034c96"
};

const secondaryApp = mApp.initializeApp(firebaseConfigSecondary, "SecondaryAuthApp");
const secondaryAuth = mAuth.getAuth(secondaryApp);

let catedrasTemporales = [];
let paginaActual = 1;
const usuariosPorPagina = 10;

// Elementos de control de la interfaz
const formUsuario = document.getElementById('formUsuario');
const nombreApellido = document.getElementById('nombreApellido');
const dniUsuario = document.getElementById('dniUsuario');
const emailUsuario = document.getElementById('emailUsuario');
const rolUsuario = document.getElementById('rolUsuario');
const checkGestionPeriodos = document. getElementById('checkGestionPeriodos');
const checkEsProfesor = document.getElementById('checkEsProfesor');
const dniOriginalEdicion = document.getElementById('dniOriginalEdicion');
const formTitulo = document.getElementById('formTitulo');
const bannerEdicion = document.getElementById('bannerEdicion');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const tbody = document.getElementById('tablaUsuariosBody');
const selectRol = document.getElementById('rolUsuario');
const checkProfesor = document.getElementById('checkEsProfesor');
const selectAnioProfesor = document.getElementById('anioProfesor');
const btnAgregarCatedra = document.getElementById('btnAgregarCatedra');
const filtroBusqueda = document.getElementById('filtroBusquedaRapida');
const filtroRolBase = document.getElementById('filtroRolBase');
const filtroCursoDivision = document.getElementById('filtroCursoDivision');


// Referencias del DOM vinculadas a los nuevos campos de contraseña
const claveUsuario = document.getElementById('claveUsuario');
const confirmarClaveUsuario = document.getElementById('confirmarClaveUsuario');

// Flujo de inicialización secuencial robusto y protegido contra bloqueos de red
try {
    await verificarAutenticacionAdmin();
} catch (e) {
    console.error("Fallo crítico en verificación de privilegios:", e);
}

try {
    await inicializarSemillaUsuarios();
} catch (e) {
    console.error("Fallo crítico al inicializar usuarios semilla:", e);
}

try {
    await cargarRolesEnSelector();
} catch (e) {
    console.error("Fallo no bloqueante al cargar roles en selector:", e);
}

try {
    await inicializarSelectoresCursos();
} catch (e) {
    console.error("Fallo no bloqueante al inicializar selectores de cursos:", e);
}

try {
    await renderizarTablaUsuarios();
} catch (e) {
    console.error("Fallo crítico al renderizar la tabla de usuarios:", e);
}

// Escuchadores de eventos globales
if (selectRol) selectRol.addEventListener('change', gestionarPanelesFormulario);
if (checkProfesor) checkProfesor.addEventListener('change', gestionarPanelesFormulario);
if (selectAnioProfesor) selectAnioProfesor.addEventListener('change', cargarMateriasPorCursoSeleccionado);
if (btnAgregarCatedra) btnAgregarCatedra.addEventListener('click', agregarCatedraProfesorBolsa);
if (formUsuario) formUsuario.addEventListener('submit', procesarGuardarUsuario);
if (btnCancelarEdicion) btnCancelarEdicion.addEventListener('click', desactivarModoEdicion);
const reiniciarYPaginacion = () => { paginaActual = 1; renderizarTablaUsuarios(); };
if (filtroBusqueda) filtroBusqueda.addEventListener('input', reiniciarYPaginacion);
if (filtroRolBase) filtroRolBase.addEventListener('change', reiniciarYPaginacion);
if (filtroCursoDivision) filtroCursoDivision.addEventListener('change', reiniciarYPaginacion);

// --- PROTECCIÓN COERCITIVA RBAC ---
async function verificarAutenticacionAdmin() {
    const datosSesion = localStorage.getItem('usuarioActivo');
    if (!datosSesion) {
        window.location.href = "index.html";
        return;
    }
    const usuarioLogueado = JSON.parse(datosSesion);
    if (!usuarioLogueado.rol || !usuarioLogueado.rol.toLowerCase().trim().includes("admin")) {
        alert("Acceso denegado: Su rol no posee permisos de administración de cuentas.");
        window.location.href = "panel.html";
    }
}

// --- SEMILLA DE PERSONAL ESCOLAR PARA CLOUD FIRESTORE ---
async function inicializarSemillaUsuarios() {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        if (querySnapshot.empty) {
            console.log("Colección 'usuarios' vacía. Inyectando personal base del Colegio HASPEN...");
            const usuariosSemilla = [
                { dni: "11111111", nombre: "Administrador General", email: "admin@haspen.edu.ar", clave: "1234", rol: "administrador", esProfesor: false, cursosAsignados: [], bolsaHoras: [] },
                { dni: "22222222", nombre: "Carlos Rodríguez", email: "carlos.r@haspen.edu.ar", clave: "22222222", rol: "preceptor", esProfesor: false, cursosAsignados: [], bolsaHoras: [] },
                { dni: "33333333", nombre: "Ana Martínez", email: "ana.m@haspen.edu.ar", clave: "33333333", rol: "directivo", esProfesor: false, cursosAsignados: [], bolsaHoras: [] }
            ];
            for (const usuario of usuariosSemilla) {
                await setDoc(doc(db, "usuarios", usuario.dni), usuario);
                console.log(`Usuario Semilla sincronizado con Firebase: [${usuario.nombre}]`);
            }
        }
    } catch (error) {
        console.error("Error al inyectar personal base en Firestore:", error);
        throw error;
    }
}

// --- INYECCIÓN DINÁMICA DE ROLES DESDE CLOUD FIRESTORE (EXTENDIDA) ---
async function cargarRolesEnSelector() {
    if (!rolUsuario) return;
    rolUsuario.innerHTML = '<option value="" disabled selected>Seleccione un rol...</option>';
    
    // Limpiamos y preparamos también el nuevo selector de la barra de filtros
    if (filtroRolBase) {
        filtroRolBase.innerHTML = '<option value="">Todos los cargos / roles</option>';
    }

    try {
        const querySnapshot = await getDocs(collection(db, "roles"));
        if (querySnapshot.empty) {
            rolUsuario.add(new Option("Administrador (Por Defecto)", "administrador"));
            if (filtroRolBase) filtroRolBase.add(new Option("Administrador (Por Defecto)", "administrador"));
            return;
        }

        querySnapshot.forEach((documento) => {
            const rol = documento.data();
            const nombreRol = rol.nombre;
            const idRol = rol.id.toLowerCase().trim();

            // Inyecta en el formulario de registro
            rolUsuario.add(new Option(nombreRol, idRol));

            // Inyecta en la barra de filtros unificada
            if (filtroRolBase) {
                filtroRolBase.add(new Option(nombreRol, idRol));
            }
        });
    } catch (error) {
        console.error("Error al inyectar catálogo de roles dinámicos:", error);
        rolUsuario.add(new Option("Administrador (Por Defecto)", "administrador"));
        if (filtroRolBase) filtroRolBase.add(new Option("Administrador (Por Defecto)", "administrador"));
    }
}


// --- INICIALIZACIÓN DE SELECTORES DE CURSOS ---

async function inicializarSelectoresCursos() {
    let cursos = [];
    try {
        const cursosRef = collection(db, 'cursos');
        const querySnapshot = await getDocs(cursosRef);
        cursos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem('cursosColegio', JSON.stringify(cursos));
    } catch (error) {
        console.error("Error:", error);
        let cursosRaw = localStorage.getItem('cursosColegio');
        if (cursosRaw) cursos = JSON.parse(cursosRaw);
    }

    const selects = {
        prep1: document.getElementById('altaAnio1'),
        prep2: document.getElementById('altaAnio2'),
        prof: document.getElementById('anioProfesor'),
        filtro: document.getElementById('filtroCursoDivision')
    };

    if (!selects.prep1 || !selects.prep2 || !selects.prof) return;

    // Resetear selects
    [selects.prep1, selects.prep2, selects.prof].forEach(s => 
        s.innerHTML = '<option value="" disabled selected>Seleccione...</option>'
    );
    if (selects.filtro) selects.filtro.innerHTML = '<option value="">Todos</option>';

    if (cursos.length === 0) return;

    cursos.forEach(curso => {
        const option = new Option(`${curso.ciclo} - Div: ${curso.division} (${curso.turno})`, curso.id);
        selects.prep1.add(option.cloneNode(true));
        selects.prep2.add(option.cloneNode(true));
        selects.prof.add(option.cloneNode(true));
        if (selects.filtro) selects.filtro.add(option.cloneNode(true));
    });
}



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

// PARCHE DE AJUSTE DE SCOPE REUNIFICADO PARA GESTIONAR PANELES
function gestionarPanelesFormulario() {
    const selectRolElement = document.getElementById('rolUsuario');
    const rolId = selectRolElement.value ? selectRolElement.value.toLowerCase().trim() : "";
    const bloqueCheck = document.getElementById('bloqueCheckProfesor');
    const panelPreceptor = document.getElementById('grupoCursosPreceptor');
    const panelProfesor = document.getElementById('grupoAsignacionProfesor');
    const altaAnio1 = document.getElementById('altaAnio1');
    const altaAnio2 = document.getElementById('altaAnio2');
    const checkProfesor = document.getElementById('checkEsProfesor');

    // 1. Forzar el checkbox si el rol base seleccionado es puramente docente
    const esRolDocentePuro = (rolId === "profesor");
    if (esRolDocentePuro) {
        if (bloqueCheck) bloqueCheck.style.display = "none";
        checkProfesor.checked = true;
    } else {
        if (bloqueCheck) bloqueCheck.style.display = "flex";
    }

    // 2. Extraer los permisos del rol seleccionado
    const objetoRolSeleccionado = (typeof roles !== 'undefined') ? roles.find(r => r.id.toLowerCase().trim() === rolId) : null;
    const permisosDelRolSeleccionado = objetoRolSeleccionado?.permisos || {};

    // 3. Gobernación dinámica del panel de asignación de cursos
    const requiereAsignarCursos = (permisosDelRolSeleccionado.legajoDigital === "lectura");
    if (requiereAsignarCursos === true) {
        if (panelPreceptor) panelPreceptor.style.display = "block";
        if (altaAnio1) altaAnio1.setAttribute('required', 'true');
        if (altaAnio2) altaAnio2.setAttribute('required', 'true');
    } else {
        if (panelPreceptor) panelPreceptor.style.display = "none";
        if (altaAnio1) altaAnio1.removeAttribute('required');
        if (altaAnio2) altaAnio2.removeAttribute('required');
    }

    // 4. Gobernación dinámica del panel de bolsa de horas reunificada dentro del scope
    const esDocenteActivo = (checkProfesor.checked === true || esRolDocentePuro);
    if (esDocenteActivo === true) {
        if (panelProfesor) panelProfesor.style.display = "block";
    } else {
        if (panelProfesor) panelProfesor.style.display = "none";
    }
}


// --- LECTURA DE USUARIOS DESDE FIRESTORE ---
async function obtenerUsuariosDesdeFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        const lista = [];
        querySnapshot.forEach((docu) => { lista.push(docu.data()); });
        return lista;
    } catch (error) {
        console.error("Error al recuperar nómina de usuarios:", error);
        return [];
    }
}

// REEMPLAZAR FUNCIÓN COMPLETA EN usuarios.js (Líneas 254 a 314)
async function agregarCatedraProfesorBolsa() {
    const selectCurso = document.getElementById('anioProfesor');
    const selectMateria = document.getElementById('materiaProfesor');
    const selectRevista = document.getElementById('revistaProfesor');

    if (!selectCurso || !selectMateria || !selectRevista || selectCurso.selectedIndex <= 0 || selectMateria.selectedIndex <= 0) {
        alert("Error: Seleccione un Curso, Materia y Situación de Revista válida para operar.");
        return;
    }

    const cursoIdReal = selectCurso.value; // ID inmutable de Firebase (ej: 1-A-M)
    const textoCurso = selectCurso.options[selectCurso.selectedIndex].text; // Respaldo visual
    const nombreMateria = selectMateria.value;
    const situacionRevista = selectRevista.value;

    // Eje de sincronización: Usamos el ID del curso y la materia de forma unívoca
    const baseCatedraId = `${cursoIdReal} - ${nombreMateria}`;
    const identificadorCompleto = `[${situacionRevista}] ${baseCatedraId}`;

    // 1. Control de duplicados en la sesión del formulario actual
    if (catedrasTemporales.some(c => c.includes(baseCatedraId))) {
        alert("Este profesor ya posee una asignación registrada para esta misma materia y curso.");
        return;
    }

    try {
        const usuariosTotales = await obtenerUsuariosDesdeFirestore();
        const dniEdicion = document.getElementById('dniOriginalEdicion').value;
        let docentesAsignados = [];

        // 2. Auditoría en caliente cruzada contra otros docentes en la base de datos
        usuariosTotales.forEach(u => {
            if (dniEdicion && u.dni === dniEdicion) return;
            const bolsa = u.bolsaHoras || [];
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
                `La cátedra [ ${nombreMateria} en ${textoCurso} ] ya tiene personal asociado:\n${listaDetalle}\n\n` +
                `¿Desea autorizar el ingreso de este nuevo registro bajo la condición de ${situacionRevista}?`
            );
            if (!autorizar) return;
        }
    } catch (e) {
        console.error("Error en validación de revista:", e);
    }

    // 3. Inyección segura en el array temporal de la vista
    catedrasTemporales.push(identificadorCompleto);
    actualizarTagsBolsaHoras();
}

function actualizarTagsBolsaHoras() {
    const contenedor = document.getElementById('listaCatedrasProfesor');
    if (!contenedor) return;
    contenedor.innerHTML = "";
    if (catedrasTemporales.length === 0) {
        const sinCat = document.createElement('s' + 'p' + 'a' + 'n');
        sinCat.style.color = "#94a3b8";
        sinCat.style.fontSize = "13px";
        sinCat.id = "sinCatedrasMensaje";
        sinCat.textContent = "No hay cátedras asignadas aún.";
        contenedor.appendChild(sinCat);
        return;
    }
    catedrasTemporales.forEach((catedra, indice) => {
        let colorFondo = "#e8f0fe";
        let colorTexto = "#1a73e8";
        if (catedra.includes("[TITULAR]")) { colorFondo = "#e6fffa"; colorTexto = "#0d9488"; }
        else if (catedra.includes("[SUPLENTE]")) { colorFondo = "#fff8e1"; colorTexto = "#b78103"; }
        else if (catedra.includes("[SUPL_SUPL]")) { colorFondo = "#fef2f2"; colorTexto = "#dc2626"; }

        const tag = document.createElement('s' + 'p' + 'a' + 'n');
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
        tag.textContent = catedra + " ";

        const btnRemover = document.createElement('s' + 't' + 'r' + 'o' + 'n' + 'g');
        btnRemover.style.color = "#d93025";
        btnRemover.style.cursor = "pointer";
        btnRemover.style.fontSize = "14px";
        btnRemover.textContent = "×";
        btnRemover.onclick = function() { removerCatedraBolsa(indice); };

        tag.appendChild(btnRemover);
        contenedor.appendChild(tag);
    });
}

window.removerCatedraBolsa = function(indice) {
    catedrasTemporales.splice(indice, 1);
    actualizarTagsBolsaHoras();
};

async function procesarGuardarUsuario(e) {
    e.preventDefault();
    const dniInput = document.getElementById('dniUsuario');
    const dni = dniInput.value.replace(/[^0-9]/g, '').trim(); 
    const nombreCompleto = document.getElementById('nombreApellido').value.trim();
    const email = document.getElementById('emailUsuario').value.trim();
    const rol = document.getElementById('rolUsuario').value.toLowerCase().trim();
    const esProfesor = document.getElementById('checkEsProfesor').checked;
    const permiteCargaTotalNotas = document.getElementById('permiteCargaTotalNotasAlta').checked;
    const valorGestionPeriodos = document.getElementById('checkGestionPeriodos').checked;
    const dniOriginal = document.getElementById('dniOriginalEdicion').value;

        // ====== PARCHE: Corrección tipográfica de captura de contraseña ======
    const inputClaveElement = document.getElementById('claveUsuario'); 
    const inputConfirmarElement = document.getElementById('confirmarClaveUsuario'); 

    const valClave = inputClaveElement ? inputClaveElement.value : "";
    const valConfirmar = inputConfirmarElement ? inputConfirmarElement.value : "";

    if (!dni || !nombreCompleto || !email || !rol) {
        alert("Por favor, complete todos los campos obligatorios del formulario.");
        return;
    }

    if (!dniOriginal) {
        if (!valClave || !valConfirmar) {
            alert("Error: Para registrar una cuenta nueva debe ingresar una contraseña y su respectiva confirmación.");
            return;
        }
        if (valClave.length < 6) {
            alert("Error: La contraseña inicial provista debe poseer un mínimo de 6 caracteres reglamentarios.");
            return;
        }
        if (valClave !== valConfirmar) {
            alert("Error: La contraseña ingresada y su confirmación no coinciden. Verifique los datos.");
            return;
        }
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

    try {
                if (!dniOriginal) {
            const docRef = doc(db, "usuarios", dni);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                alert("Error: Ya existe un usuario registrado con el DNI ingresado.");
                return;
            }
            try {
                await mAuth.createUserWithEmailAndPassword(secondaryAuth, email, valClave);
                await mAuth.signOut(secondaryAuth);
            } catch (authError) {
                console.error("Error al registrar credenciales en Firebase Auth:", authError);
                if (authError.code !== "auth/email-already-in-use") {
                    alert("Error Auth: " + authError.message);
                    return;
                }
            }
        }
        const bolsaFinal = (rol === "profesor" || esProfesor) ? [...catedrasTemporales] : [];
        const payloadUsuario = {
            dni: dni,
            nombre: nombreCompleto,
            email: email,
            rol: rol,
            esProfesor: esProfesor,
            cursosAsignados: rolesCursos,
            bolsaHoras: bolsaFinal,
            permiteCargaTotalNotas: permiteCargaTotalNotas,
            permisoGestionPeriodos: valorGestionPeriodos
        };

        if (!dniOriginal) {
            payloadUsuario.clave = valClave;
        }

        if (dniOriginal && dniOriginal !== dni) {
            await deleteDoc(doc(db, "usuarios", dniOriginal));
        }

        await setDoc(doc(db, "usuarios", dni), payloadUsuario, { merge: true });
        alert(dniOriginal ? "Datos de cuenta actualizados en Cloud Firestore." : "Cuenta registrada con éxito en la nube de Firebase Auth y Firestore.");
        desactivarModoEdicion();
        await renderizarTablaUsuarios();
    } catch (error) {
        console.error("Error al persistir el legajo en Firebase:", error);
        alert("Error de red: No se pudieron guardar los cambios en el servidor.");
    }
}
async function renderizarTablaUsuarios() {
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const trCarga = document.createElement('tr');
    const tdCarga = document.createElement('td');
    tdCarga.colSpan = 6;
    tdCarga.style.cssText = "text-align:center; color:#1a73e8; font-weight:500; padding:25px;";
    tdCarga.textContent = "Sincronizando nómina escolar con Firebase Cloud...";
    trCarga.appendChild(tdCarga);
    tbody.appendChild(trCarga);

    const usuarios = await obtenerUsuariosDesdeFirestore();
    let roles = [];
    try {
        const snapRoles = await getDocs(collection(db, "roles"));
        snapRoles.forEach(r => roles.push(r.data()));
    } catch (e) {
        console.error("Error al leer roles auxiliares:", e);
    }

    const txtBusqueda = document.getElementById('filtroBusquedaRapida')?.value.toLowerCase().trim() || "";
    const filtroRol = document.getElementById('filtroRolBase')?.value || "";
    const filtroCurso = document.getElementById('filtroCursoDivision')?.value || "";
    tbody.innerHTML = "";

    let usuariosFiltrados = usuarios.filter(user => {
        const mBusqueda = !txtBusqueda || 
            user.nombre?.toLowerCase().includes(txtBusqueda) || 
            user.dni?.includes(txtBusqueda) || 
            user.email?.toLowerCase().includes(txtBusqueda);

        const mRol = !filtroRol || (user.rol?.toLowerCase().trim() === filtroRol);

        const mCurso = !filtroCurso || 
            (user.cursosAsignados && user.cursosAsignados.includes(filtroCurso)) || 
            (user.bolsaHoras && user.bolsaHoras.some(h => h.includes(filtroCurso)));

        return mBusqueda && mRol && mCurso;
    });
        // === CÁLCULO DE PAGINACIÓN ===
        const totalUsuariosFiltrados = usuariosFiltrados.length;
        const totalPaginas = Math.ceil(totalUsuariosFiltrados / usuariosPorPagina);

        // Si por los filtros aplicados la página actual quedó fuera de rango, la reseteamos a la primera
        if (paginaActual > totalPaginas) {
            paginaActual = 1;
        }

        // Cortamos el array para mostrar solo el segmento de la página actual
        const indiceInicio = (paginaActual - 1) * usuariosPorPagina;
        const indiceFin = indiceInicio + usuariosPorPagina;
        usuariosFiltrados = usuariosFiltrados.slice(indiceInicio, indiceFin);
        // =============================

    if (usuariosFiltrados.length === 0) {
        const trVacio = document.createElement('t' + 'r');
        const tdVacio = document.createElement('t' + 'd');
        tdVacio.colSpan = 6;
        tdVacio.style.cssText = "text-align:center; color:#94a3b8; padding:20px;";
        tdVacio.textContent = "No se encontraron registros bajo los criterios de auditoría seleccionados.";
        trVacio.appendChild(tdVacio);
        tbody.appendChild(trVacio);
        return;
    }
    usuariosFiltrados.forEach(user => {
        const tr = document.createElement('t' + 'r');
        tr.className = "fila-usuario";
        tr.style.borderBottom = "1px solid #f1f3f4";

        const tdDatos = document.createElement('t' + 'd');
        tdDatos.style.cssText = "padding:12px; font-weight:500;";
        tdDatos.textContent = user.nombre;
        const spanDniSub = document.createElement('s' + 'p' + 'a' + 'n');
        spanDniSub.style.cssText = "font-size:12px; color:#5f6368; display:block;";
        spanDniSub.textContent = "DNI: " + user.dni;
        tdDatos.appendChild(spanDniSub);

        const tdDni = document.createElement('t' + 'd');
        tdDni.style.cssText = "padding:12px; color:#5f6368; font-size:13px;";
        tdDni.textContent = user.dni;

        const tdEmail = document.createElement('t' + 'd');
        tdEmail.style.cssText = "padding:12px; color:#5f6368; font-size:13px;";
        tdEmail.textContent = user.email;

        const tdRol = document.createElement('t' + 'd');
        tdRol.style.padding = "12px";
        const userRolNormalizado = user.rol ? user.rol.toLowerCase().trim() : "";
        const objetoRolEncontrado = roles.find(r => r.id.toLowerCase().trim() === userRolNormalizado);
        const textRol = objetoRolEncontrado ? objetoRolEncontrado.nombre : user.rol;

        const bRol = document.createElement('s' + 'p' + 'a' + 'n');
        bRol.className = "badge-rol";
        bRol.textContent = textRol;
        tdRol.appendChild(bRol);

        if (user.esProfesor && userRolNormalizado !== "profesor") {
            const bDoc = document.createElement('s' + 'p' + 'a' + 'n');
            bDoc.className = "badge-docente";
            bDoc.style.cssText = "display:block; margin-top:4px;";
            bDoc.textContent = "✓ Función Docente";
            tdRol.appendChild(bDoc);
        }

        const tdResp = document.createElement('t' + 'd');
        tdResp.style.cssText = "padding:12px; font-size:12px; vertical-align:top;";
        
        let flagResp = false;
        if (userRolNormalizado === "preceptor" && user.cursosAsignados && user.cursosAsignados.length > 0) {
            flagResp = true;
            const cursosRaw = localStorage.getItem('cursosColegio');
            const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];
            const nombresCursos = user.cursosAsignados.map(id => {
            const c = listaCursos.find(cur => cur.id === id);
            if (!c) return "Sin Asignar";
    
    // Primero hacemos el split, tomamos la primera parte del ciclo y a esa parte le aplicamos el trim
    const cicloLimpio = c.ciclo.split("-")[0].trim(); 
    return `${cicloLimpio} ° ${c.division}`;
});
            const dPre = document.createElement('d' + 'i' + 'v');
            dPre.innerHTML = "🔹 <strong>Cursos Preceptoría:</strong> " + nombresCursos.join(" y ");
            tdResp.appendChild(dPre);
        }

        const bolsaUser = user.bolsaHoras || [];
        if (bolsaUser.length > 0) {
            if (flagResp) {
                const sep = document.createElement('d' + 'i' + 'v');
                sep.style.cssText = "margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0;";
                tdResp.appendChild(sep);
            }
            flagResp = true;
            const dDoc = document.createElement('d' + 'i' + 'v');
            dDoc.innerHTML = "💼 <strong>Horas Catedras:</strong>";
            const dLista = document.createElement('s' + 'p' + 'a' + 'n');
            dLista.style.cssText = "font-size:11px; display:block; margin-top:2px; line-height:1.4;";
            
            // REEMPLAZAR EN usuarios.js (Bucle de renderizado de horas cátedra en la tabla con límite dinámico)
        const totalCatedrasCompletas = [];
        bolsaUser.forEach((h, index) => {
            let estiloColor = "color: #0d9488; font-weight:600; display:block;";
            if (h.includes("[SUPLENTE]")) estiloColor = "color: #b78103; font-weight:600; display:block;";
            if (h.includes("[SUPL_SUPL]")) estiloColor = "color: #dc2626; font-weight:600; display:block;";

            let textoMapeadoParaMostrar = h;
            const cursosRaw = localStorage.getItem('cursosColegio');
            const listaCursos = cursosRaw ? JSON.parse(cursosRaw) : [];

            const firmaPura = h.replace(/\[.*?\]\s*/, "").trim();
            const partesFirma = firmaPura.split(" - ");

            if (partesFirma.length >= 2) {
                const cId = partesFirma[0].trim();
                const mNombre = partesFirma[1].trim();

                const cRef = listaCursos.find(cur => cur.id === cId);
                if (cRef) {
                    const revistaTag = h.match(/\[(.*?)\]/)?.[0] || "[TITULAR]";
                    textoMapeadoParaMostrar = `${revistaTag} ${cRef.ciclo} ° "${cRef.division}" ➔ ${mNombre}`;
                }
            }

            // Almacenamos el texto formateado para la lista completa del cartel flotante
            totalCatedrasCompletas.push(textoMapeadoParaMostrar);

            // Solo inyectamos visualmente en la tabla las primeras 2 materias
            if (index < 2) {
                const sItem = document.createElement('span');
                sItem.style.cssText = estiloColor;
                sItem.textContent = textoMapeadoParaMostrar;
                dLista.appendChild(sItem);
            }
        });

        // Si el profesor excede las 2 materias, agregamos el indicador dinámico interactivo
        if (bolsaUser.length > 2) {
            const materiasRestantes = bolsaUser.length - 2;
            const sMas = document.createElement('span');
            sMas.style.cssText = "color: #1a73e8; font-weight:700; display:block; margin-top:4px; cursor:help; text-decoration:underline dashed;";
            sMas.textContent = `➕ Ver ${materiasRestantes} materias más...`;
            // El atributo title genera el tooltip nativo del navegador al posicionar el puntero
            sMas.title = "NÓMINA COMPLETA DE ASIGNACIONES:\n" + totalCatedrasCompletas.join("\n");
            dLista.appendChild(sMas);
        }


            tdResp.appendChild(dDoc);
            tdResp.appendChild(dLista);
        }

        if (!flagResp) {
            const sNinguna = document.createElement('s' + 'p' + 'a' + 'n');
            sNinguna.style.color = "#94a3b8";
            sNinguna.textContent = "Ninguna asignada";
            tdResp.appendChild(sNinguna);
        }

        const tdAcciones = document.createElement('t' + 'd');
        tdAcciones.style.cssText = "padding:12px; text-align:center; display:flex; gap:8px; justify-content:center; align-items:flex-start;";

       // PARCHE DE ACCESO DE ÁMBITO GLOBAL PARA MÓDULO ASÍNCRONO
        const btnEditar = document.createElement('button');
        btnEditar.type = "button";
        btnEditar.style.cssText = "background:#1a73e8; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = function() { window.activarModoEdicion(user.dni); };


        const btnBorrar = document.createElement('b' + 'u' + 't' + 't' + 'o' + 'n');
        btnBorrar.type = "button";
        btnBorrar.style.cssText = "background:#ea4335; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;";
        btnBorrar.textContent = "Borrar";
        btnBorrar.onclick = function() { eliminarCuentaUsuario(user.dni); };

        tdAcciones.appendChild(btnEditar);
        tdAcciones.appendChild(btnBorrar);

        tr.appendChild(tdDatos);
        tr.appendChild(tdDni);
        tr.appendChild(tdEmail);
        tr.appendChild(tdRol);
        tr.appendChild(tdResp);
        tr.appendChild(tdAcciones);
        tbody.appendChild(tr);
    });

    // === INYECCIÓN DE CONTROLES DE PAGINACIÓN ===
    const contenedorPaginacion = document.getElementById('paginacion-controles');
    if (contenedorPaginacion && totalPaginas > 1) {
        contenedorPaginacion.innerHTML = `
            <button id="btnAnterior" style="padding: 6px 12px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">◀ Anterior</button>
            <span style="padding: 0 10px; font-weight: 600;">Página ${paginaActual} de ${totalPaginas}</span>
            <button id="btnSiguiente" style="padding: 6px 12px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer;">Siguiente ▶</button>
        `;
        document.getElementById("btnAnterior").disabled = (paginaActual === 1);
        document.getElementById("btnSiguiente").disabled = (paginaActual === totalPaginas);
        document.getElementById("btnAnterior").onclick = () => { paginaActual--; renderizarTablaUsuarios(); };
        document.getElementById("btnSiguiente").onclick = () => { paginaActual++; renderizarTablaUsuarios(); };

    } else if (contenedorPaginacion) {
        contenedorPaginacion.innerHTML = "";
    }
}


// --- ANCLAJES GLOBALES AL OBJETO WINDOW ---
window.activarModoEdicion = async function(dni) {
    const docRef = doc(db, "usuarios", dni);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const usuario = snap.data();

    const dniInput = document.getElementById('dniUsuario');
    if (dniInput) { dniInput.value = usuario.dni; dniInput.disabled = true; }

    document.getElementById('nombreApellido').value = usuario.nombre || "";
    document.getElementById('emailUsuario').value = usuario.email || "";
    document.getElementById('rolUsuario').value = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
    document.getElementById('checkEsProfesor').checked = usuario.esProfesor || false;
    document.getElementById('permiteCargaTotalNotasAlta').checked = usuario.permiteCargaTotalNotas || false;
    document.getElementById('checkGestionPeriodos').checked = usuario.permisoGestionPeriodos || false;
    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    document.getElementById('formTitulo').textContent = "Modificar Datos de Usuario";

    if (bannerEdicion) bannerEdicion.style.display = "block";
    gestionarPanelesFormulario();

 const userRol = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
if (userRol === "preceptor" && usuario.cursosAsignados && usuario.cursosAsignados.length >= 2) {
    setTimeout(() => {
        const select1 = document.getElementById('altaAnio1');
        const select2 = document.getElementById('altaAnio2');
        if (select1 && select2) {
            select1.value = usuario.cursosAsignados[0];
            select2.value = usuario.cursosAsignados[1];
        }
    }, 80); // 80ms bastan para que GitHub active los contenedores del DOM ocultos
}
  
    catedrasTemporales = usuario.bolsaHoras ? [...usuario.bolsaHoras] : [];
    actualizarTagsBolsaHoras();
};

window.eliminarCuentaUsuario = async function(dni) {
    const datosSesion = localStorage.getItem('usuarioActivo');
    const usuarioLogueado = datosSesion ? JSON.parse(datosSesion) : {};
    if (usuarioLogueado.dni === dni) {
        alert("Operación denegada: No puede eliminar la cuenta con la que se encuentra logueado.");
        return;
    }
    if (!confirm("¿Está seguro de que desea eliminar esta cuenta de personal en Cloud Firestore?")) return;
    try {
        await deleteDoc(doc(db, "usuarios", dni));
        alert("El legajo de personal fue removido de la nube de forma segura.");
        await renderizarTablaUsuarios();
    } catch (e) {
        console.error("Error al remover el documento:", e);
    }
};

function desactivarModoEdicion() {
    document.getElementById('dniOriginalEdicion').value = "";
    document.getElementById('formTitulo').textContent = "Registrar Nuevo Usuario";
    if (bannerEdicion) bannerEdicion.style.display = "none";
    if (formUsuario) formUsuario.reset();

    const dniInput = document.getElementById('dniUsuario');
    if (dniInput) dniInput.disabled = false;

    if (claveUsuario) claveUsuario.value = "";
    if (confirmarClaveUsuario) confirmarClaveUsuario.value = "";

    document.getElementById('checkEsProfesor').checked = false;
    document.getElementById('permiteCargaTotalNotasAlta').checked = false;
    document.getElementById('checkGestionPeriodos').checked = false;
    catedrasTemporales = [];
    actualizarTagsBolsaHoras();
    gestionarPanelesFormulario();
}

})();
