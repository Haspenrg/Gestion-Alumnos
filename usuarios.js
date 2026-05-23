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
    authDomain: "://firebaseapp.com",
    projectId: "gestion-alumnos-eeb24",
    storageBucket: "gestion-alumnos-eeb24.firebasestorage.app",
    messagingSenderId: "824391106851",
    appId: "1:824391106851:web:d8fdc7f37351bedc034c96"
};

const secondaryApp = mApp.initializeApp(firebaseConfigSecondary, "SecondaryAuthApp");
const secondaryAuth = mAuth.getAuth(secondaryApp);

let catedrasTemporales = [];

// Elementos de control de la interfaz
const formUsuario = document.getElementById('formUsuario');
const nombreApellido = document.getElementById('nombreApellido');
const dniUsuario = document.getElementById('dniUsuario');
const emailUsuario = document.getElementById('emailUsuario');
const rolUsuario = document.getElementById('rolUsuario');
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
const filtroSuper = document.getElementById('filtroSuperpoblacion');

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
if (filtroBusqueda) filtroBusqueda.addEventListener('input', renderizarTablaUsuarios);
if (filtroSuper) filtroSuper.addEventListener('change', renderizarTablaUsuarios);
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

// --- INYECCIÓN DINÁMICA DE ROLES DESDE CLOUD FIRESTORE ---
async function cargarRolesEnSelector() {
    if (!rolUsuario) return;
    rolUsuario.innerHTML = '<option value="" disabled selected>Seleccione un rol...</option>';
    try {
        const querySnapshot = await getDocs(collection(db, "roles"));
        if (querySnapshot.empty) {
            rolUsuario.add(new Option("Administrador (Por Defecto)", "administrador"));
            return;
        }
        querySnapshot.forEach((documento) => {
            const rol = documento.data();
            rolUsuario.add(new Option(rol.nombre, rol.id.toLowerCase().trim()));
        });
    } catch (error) {
        console.error("Error al inyectar catálogo de roles dinámicos:", error);
        rolUsuario.add(new Option("Administrador (Por Defecto)", "administrador"));
    }
}

// --- INICIALIZACIÓN DE SELECTORES DE CURSOS ---
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

// --- GESTIÓN INTERACTIVA DE PANELES POR ROL (RBAC DINÁMICO) ---
function gestionarPanelesFormulario() {
    const selectRolElement = document.getElementById('rolUsuario');
    const rolId = selectRolElement.value ? selectRolElement.value.toLowerCase().trim() : "";
    const bloqueCheck = document.getElementById('bloqueCheckProfesor');
    const panelPreceptor = document.getElementById('grupoCursosPreceptor');
    const panelProfesor = document.getElementById('grupoAsignacionProfesor');
    const altaAnio1 = document.getElementById('altaAnio1');
    const altaAnio2 = document.getElementById('altaAnio2');
    const checkProfesor = document.getElementById('checkEsProfesor');

    if (rolId === "profesor") {
        if (bloqueCheck) bloqueCheck.style.display = "none";
        checkProfesor.checked = true;
    } else {
        if (bloqueCheck) bloqueCheck.style.display = "flex";
    }

    if (rolId === "preceptor") {
        if (panelPreceptor) panelPreceptor.style.display = "block";
        if (altaAnio1) altaAnio1.setAttribute('required', 'true');
        if (altaAnio2) altaAnio2.setAttribute('required', 'true');
    } else {
        if (panelPreceptor) panelPreceptor.style.display = "none";
        if (altaAnio1) altaAnio1.removeAttribute('required');
        if (altaAnio2) altaAnio2.removeAttribute('required');
    }

    if (rolId === "profesor" || checkProfesor.checked) {
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

// --- BOLSA DE HORAS CON ESCALAFÓN Y AUDITORÍA ---
async function agregarCatedraProfesorBolsa() {
    const selectCurso = document.getElementById('anioProfesor');
    const selectMateria = document.getElementById('materiaProfesor');
    const selectRevista = document.getElementById('revistaProfesor');

    if (!selectCurso || !selectMateria || !selectRevista || selectCurso.selectedIndex <= 0 || selectMateria.selectedIndex <= 0) {
        alert("Error: Seleccione un Curso, Materia y Situación de Revista válida para operar.");
        return;
    }

    const textoCurso = selectCurso.options[selectCurso.selectedIndex].text;
    const nombreMateria = selectMateria.value;
    const situacionRevista = selectRevista.value;
    const baseCatedraId = `${textoCurso} -> ${nombreMateria}`;
    const identificadorCompleto = `[${situacionRevista}] ${baseCatedraId}`;

    if (catedrasTemporales.some(c => c.includes(baseCatedraId))) {
        alert("Este profesor ya posee una asignación registrada para esta misma materia y curso.");
        return;
    }

    try {
        const usuariosTotales = await obtenerUsuariosDesdeFirestore();
        const dniEdicion = document.getElementById('dniOriginalEdicion').value;
        let docentesAsignados = [];

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
    const dniOriginal = document.getElementById('dniOriginalEdicion').value;

    const valClave = claveUsuario ? claveUsuario.value : "";
    const valConfirmar = confirmarClaveUsuario ? confirmarClaveUsuario.value : "";

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
                // Corrección de sintaxis estricta modular v10 para la instancia secundaria
                await mAuth.createUserWithEmailAndPassword(secondaryAuth, email, valClave);
                await mAuth.signOut(secondaryAuth);
            } catch (authError) {
                console.error("Error al registrar credenciales en Firebase Auth:", authError);
                if (authError.code === "auth/email-already-in-use") {
                    console.log("El correo ya existía en el canal de autenticación.");
                } else {
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
            bolsaHoras: bolsaFinal
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
    
    const trCarga = document.createElement('t' + 'r');
    const tdCarga = document.createElement('t' + 'd');
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
    const modoAuditoria = document.getElementById('filtroSuperpoblacion')?.value || "TODOS";
    tbody.innerHTML = "";

    const mapaPoblacionCatedras = {};
    usuarios.forEach(u => {
        const bolsa = u.bolsaHoras || [];
        usuarios.forEach(user2 => {
            if (u.dni === user2.dni) return;
            const bolsa2 = user2.bolsaHoras || [];
            bolsa.forEach(h1 => {
                const mat1 = h1.replace(/\[.*?\]\s*/, "").trim();
                bolsa2.forEach(h2 => {
                    const mat2 = h2.replace(/\[.*?\]\s*/, "").trim();
                    if (mat1 === mat2) { mapaPoblacionCatedras[mat1] = (mapaPoblacionCatedras[mat1] || 0) + 1; }
                });
            });
        });
    });

    let usuariosFiltrados = usuarios.filter(user => {
        if (txtBusqueda) {
            const mNombre = user.nombre?.toLowerCase().includes(txtBusqueda);
            const mDni = user.dni?.includes(txtBusqueda);
            const mEmail = user.email?.toLowerCase().includes(txtBusqueda);
            if (!mNombre && !mDni && !mEmail) return false;
        }
        if (modoAuditoria === "SUPERPOBLADO") {
            const bolsa = user.bolsaHoras || [];
            if (bolsa.length === 0) return false;
            const tieneMateriaSuperpoblada = bolsa.some(h => {
                const materiaPura = h.replace(/\[.*?\]\s*/, "").trim();
                return mapaPoblacionCatedras[materiaPura] > 0;
            });
            if (!tieneMateriaSuperpoblada) return false;
        }
        return true;
    });

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
                return c ? (c.ciclo.split("-").trim() + " ° " + c.division) : "Sin Asignar";
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
            dDoc.innerHTML = "💼 <strong>Bolsa de Horas Docente:</strong>";
            const dLista = document.createElement('s' + 'p' + 'a' + 'n');
            dLista.style.cssText = "font-size:11px; display:block; margin-top:2px; line-height:1.4;";
            
            bolsaUser.forEach(h => {
                let estiloColor = "color: #0d9488; font-weight:600; display:block;";
                if (h.includes("[SUPLENTE]")) estiloColor = "color: #b78103; font-weight:600; display:block;";
                if (h.includes("[SUPL_SUPL]")) estiloColor = "color: #dc2626; font-weight:600; display:block;";
                const sItem = document.createElement('s' + 'p' + 'a' + 'n');
                sItem.style.cssText = estiloColor;
                sItem.textContent = h;
                dLista.appendChild(sItem);
            });
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

        const btnEditar = document.createElement('b' + 'u' + 't' + 't' + 'o' + 'n');
        btnEditar.type = "button";
        btnEditar.style.cssText = "background:#1a73e8; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = function() { activarModoEdicion(user.dni); };

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
    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    document.getElementById('formTitulo').textContent = "Modificar Datos de Usuario";

    if (bannerEdicion) bannerEdicion.style.display = "block";
    gestionarPanelesFormulario();

    const userRol = usuario.rol ? usuario.rol.toLowerCase().trim() : "";
    if (userRol === "preceptor" && usuario.cursosAsignados && usuario.cursosAsignados.length >= 2) {
        document.getElementById('altaAnio1').value = usuario.cursosAsignados;
        document.getElementById('altaAnio2').value = usuario.cursosAsignados;
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
    catedrasTemporales = [];
    actualizarTagsBolsaHoras();
    gestionarPanelesFormulario();
}

})();
