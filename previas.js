(async function() {
'use strict';

// 📦 1. IMPORTACIONES ENLAZADAS CON LA ARQUITECTURA DEL COLEGIO
const b = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';

const { db } = await import('./firebase-config.js');
const { doc, getDoc, setDoc, serverTimestamp } = await import(b + 'firebase-firestore.js');
const { getAuth, onAuthStateChanged } = await import(b + 'firebase-auth.js');

const auth = getAuth();

// Variables globales de control de la pantalla
let selectCursoModal;
let selectMateriaModal;
let selectOrientacionModal; // PARCHE: Control dinámico de orientación
let formAltaManual;


// 🛡️ 2. PROTECCIÓN COERCITIVA RBAC (Sincronizado fielmente con tu clave 'usuarioActivo')
function verificarAutenticacionPrevias() {
    const datosSesion = localStorage.getItem('usuarioActivo');
    if (!datosSesion) {
        window.location.href = "index.html";
        return "ninguno";
    }

    const usuarioLogueado = JSON.parse(datosSesion);
    
    // Si el usuario es el administrador general del sistema, damos acceso de escritura total
    const rolUsuario = usuarioLogueado.rol ? usuarioLogueado.rol.toLowerCase().trim() : "";
    if (rolUsuario.includes("admin") || rolUsuario.includes("direc")) {
        return "escritura";
    }

    // Validación para el resto de los roles del establecimiento mediante la matriz
    const permisosModulo = usuarioLogueado.permisosDelRol?.controlPrevias;
    const nivelAcceso = permisosModulo ? permisosModulo.toLowerCase().trim() : "ninguno";

    if (nivelAcceso === "ninguno" || nivelAcceso === "none") {
        alert("Acceso denegado: Su rol no posee permisos para visualizar el Control de Previas.");
        window.location.href = "panel.html";
        return "ninguno";
    }

    return nivelAcceso;
}

// 📊 3. HIDRATACIÓN EN CASCADA DE CURSOS Y MATERIAS (Sincronizado nativamente con Firestore)
async function cargarCursosEnModal() {
    if (!selectCursoModal) return;

    // 1. Intentar leer del cache primero
    const cursosRaw = localStorage.getItem('cursosColegio');
    let cursos = cursosRaw ? JSON. parse(cursosRaw) : [];

    // 2. Si el cache está vacío, vamos directo a Firestore usando las herramientas importadas
    if (cursos.length === 0 && typeof db !== 'undefined') {
        try {
            console.log("Cache vacío. Descargando cursos limpios desde Firestore...");
            // Traemos las funciones asíncronas dinámicamente desde el SDK ya cargado
            const { collection, getDocs } = await import(b + 'firebase-firestore.js');
            const querySnapshot = await getDocs(collection(db, "cursos"));
            
            cursos = querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));

            // Guardamos en cache para la próxima carga veloz
            localStorage.setItem('cursosColegio', JSON.stringify(cursos));
        } catch (error) {
            console.error("Error al recuperar cursos de Firestore en previas:", error);
        }
    }

    selectCursoModal.innerHTML = '<option value="" disabled selected>Seleccione estructura origen...</option>';
    if (selectMateriaModal) selectMateriaModal.innerHTML = '<option value="" disabled selected>Seleccione primero un curso...</option>';

    if (cursos.length === 0) {
        selectCursoModal.innerHTML = '<option value="">No hay cursos cargados en el sistema</option>';
        return;
    }

    // 3. Renderizado lineal sin leyendas obsoletas
    cursos.forEach(curso => {
        // En tu estructura de cursos.html se usa: ciclo, division y turno
        const textoVisor = `${curso.ciclo || ''} - Div: ${curso.division || ''} (${curso.turno || ''})`;
        const opcion = document.createElement('option');
        opcion.value = curso.id; // Ejemplo: "4-A-M"
        opcion.textContent = textoVisor.toUpperCase();
        selectCursoModal.appendChild(opcion);
    });
}


function cargarMateriasPorCursoModal() {
    if (!selectCursoModal || !selectMateriaModal) return;
    
    const cursoIdSeleccionado = selectCursoModal.value;
    selectMateriaModal.innerHTML = '<option value="" disabled selected>Seleccione materia...</option>';
    
    if (!cursoIdSeleccionado) return;
    
    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
    
    // Buscar el curso correspondiente en base al ID seleccionado
    const cursoEncontrado = cursos.find(c => c.id === cursoIdSeleccionado);
    
    if (cursoEncontrado && cursoEncontrado.materias && cursoEncontrado.materias.length > 0) {
        // Ordenar alfabéticamente las asignaturas
        const materiasOrdenadas = [...cursoEncontrado.materias].sort((a, b) => a.localeCompare(b));
        materiasOrdenadas.forEach(materia => {
            const opcion = document.createElement('option');
            opcion.value = materia.toUpperCase().trim();
            opcion.textContent = materia.toUpperCase().trim();
            selectMateriaModal.appendChild(opcion);
        });
    } else {
        selectMateriaModal.innerHTML = '<option value="" disabled selected>El curso no posee materias asociadas</option>';
    }
}
// PARCHE PASO 3: DETECCIÓN Y ASIGNACIÓN DINÁMICA DE ORIENTACIÓN AL SELECCIONAR EL CURSO
function actualizarOrientacionModal() {
    if (!selectCursoModal || !selectOrientacionModal) return;
    
    const cursoIdSeleccionado = selectCursoModal.value;
    selectOrientacionModal.innerHTML = '';

    if (!cursoIdSeleccionado) {
        selectOrientacionModal.appendChild(new Option("Seleccione primero un curso...", ""));
        return;
    }

    const cursosRaw = localStorage.getItem('cursosColegio');
    const courses = cursosRaw ? JSON.parse(cursosRaw) : [];
    const cursoEncontrado = courses.find(c => c.id === cursoIdSeleccionado);

    if (cursoEncontrado) {
        const ciclo = cursoEncontrado.ciclo || '';
        const esCicloBajo = ciclo.includes("1°") || ciclo.includes("2°") || ciclo.includes("3°");

        if (esCicloBajo) {
            selectOrientacionModal.appendChild(new Option("Ciclo Básico", "Ciclo Básico"));
            selectOrientacionModal.value = "Ciclo Básico";
            selectOrientacionModal.disabled = true;
            selectOrientacionModal.style.backgroundColor = "#e2e8f0";
        } else {
            const orientacionReal = cursoEncontrado.orientacion || "Sin Especificar";
            selectOrientacionModal.appendChild(new Option(orientacionReal.toUpperCase(), orientacionReal));
            selectOrientacionModal.value = orientacionReal;
            selectOrientacionModal.disabled = true;
            selectOrientacionModal.style.backgroundColor = "#e2e8f0";
        }
    } else {
        selectOrientacionModal.appendChild(new Option("Estructura no encontrada", ""));
    }
}

// PARCHE CORRECTOR: Motor de búsqueda conectado a la colección raíz unificada (12 columnas)
async function buscarYRenderizarPlanilla(dniForzado = null) {
    if (!db) return;
    const inputBuscador = document.getElementById('inputBuscarAlumno');
    const dniBusqueda = dniForzado || (inputBuscador ? inputBuscador.value.trim() : "");
    const tbody = document.getElementById('tbodyPreviasPlanilla');
    const txtNombre = document.getElementById('txtNombreAlumno');
    const txtDni = document.getElementById('txtDniAlumno');
    const contador = document.getElementById('contadorRegistros');

    if (!/^\d{7,8}$/.test(dniBusqueda)) {
        alert("Por favor, ingrese un DNI válido de 7 u 8 dígitos.");
        return;
    }

    try {
        if (!dniForzado && tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="padding: 30px; color: #1b4d82; font-weight: bold;">🔍 Buscando registros en la base de datos...</td></tr>`;
        }

        const { collection, getDocs, query, where } = await import(b + 'firebase-firestore.js');
        
        // Consultar la colección unificada de previas filtrando por el DNI del alumno
        const qPrevias = query(collection(db, "previas"), where("dni", "==", dniBusqueda));
        const previasSnapshot = await getDocs(qPrevias);

        if (previasSnapshot.empty) {
            if (!dniForzado && tbody) {
                tbody.innerHTML = `<tr><td colspan="12" style="padding: 40px; color: #475569; background-color: #f8fafc;">El alumno no registra materias previas cargadas en el sistema.</td></tr>`;
                if (txtNombre) txtNombre.textContent = "Ningún alumno seleccionado";
                if (txtDni) txtDni.textContent = "";
                if (contador) contador.textContent = "0 registros";
            }
            return;
        }

        // Obtener el nombre desde el primer registro de previa para hidratar la ficha superior
        let nombreAlumnoDetectado = "ALUMNO SIN NOMBRE";
        previasSnapshot.forEach(docSnap => {
            const d = docSnap.data();
            if (d.alumnoNombre) nombreAlumnoDetectado = d.alumnoNombre;
        });

        if (!dniForzado) {
            if (txtNombre) txtNombre.textContent = nombreAlumnoDetectado.toUpperCase();
            if (txtDni) txtDni.textContent = `(DNI: ${dniBusqueda})`;
            if (tbody) tbody.innerHTML = "";
        }

        if (tbody) {
            previasSnapshot.forEach((docPrevia) => {
                const data = docPrevia.data();
                const idDocumento = docPrevia.id;
                const fila = document.createElement('tr');
                const badgeEstado = data.estado === "Aprobada"
                    ? `<span class="badge-aprobada">Aprobada</span>`
                    : `<span class="badge-pendiente">Pendiente</span>`;

                fila.innerHTML = `
                    <td style="padding: 2px 4px !important; font-size: 12px !important; font-weight: bold; text-align: center;">${data.dni || ''}</td>
                    <td style="padding: 2px 4px !important; font-size: 12px !important; text-transform: uppercase; text-align: left;">${data.alumnoNombre || ''}</td>
                    <td style="padding: 2px 4px !important; font-size: 12px !important; font-weight: bold; color: #1b4d82; text-align: left;">${data.materia || ''}</td>
                    <td style="padding: 2px 4px !important; font-size: 11px !important; text-align: center; font-weight: bold; color: #334155;">${data.cursoOrigen || '-'}</td>
                    <td style="padding: 2px 4px !important; font-size: 11px !important; text-align: center; color: #1a73e8; font-weight: bold;">${(data.orientacion || 'CICLO BÁSICO').toUpperCase()}</td>
                    <td style="padding: 2px 4px !important; font-size: 12px !important; text-align: center;">${data.anioOrigen || '-'}</td>
                    <td style="padding: 2px 4px !important; font-size: 12px !important; text-align: center; font-weight: bold; color: #dc2626;">${data.notaFinalCursada || '-'}</td>
                    <td style="padding: 2px 4px !important;"><input type="text" class="input-celda txt-libro-folio" value="${data.libroFolio && data.libroFolio !== '-' ? data.libroFolio : ''}" disabled></td>
                    <td style="padding: 2px 4px !important;"><input type="text" class="input-celda txt-nota-examen" value="${data.notaExamen && data.notaExamen !== '-' ? data.notaExamen : ''}" disabled style="width: 100%; text-align: center;"></td>
                    <td style="padding: 2px 4px !important;"><input type="date" class="input-celda txt-fecha-examen" value="${data.fechaExamen && data.fechaExamen !== '-' ? data.fechaExamen : ''}" disabled></td>
                    <td style="padding: 2px 4px !important; text-align: center;">${badgeEstado}</td>
                    <td style="padding: 2px 4px !important; white-space: nowrap; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                            <button class="btn-principal btn-accion-editar" data-dni="${data.dni || ''}" data-id-doc="${idDocumento}" data-materia="${data.materia || ''}">Editar</button>
                            <button class="btn-cancelar-edicion" style="display: none !important; background-color: #e2e8f0; color: #1e293b; padding: 0 6px !important; margin: 0 !important; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 10px; height: 100% !important; box-sizing: border-box; font-weight: bold; display: flex; align-items: center; justify-content: center;">X</button>

                        </div>
                    </td>`;
                
                if (!dniForzado) {
                    tbody.appendChild(fila);
                } else {
                    if (tbody.innerHTML.includes("Conectando con la base") || tbody.innerHTML.includes("No hay registros")) {
                        tbody.innerHTML = "";
                    }
                    tbody.insertBefore(fila, tbody.firstChild);
                }
           });

            if (contador) {
                const filasReales = tbody.querySelectorAll('tr:not([colspan])').length;
                contador.textContent = `${filasReales} registros en pantalla`;
            }
        }
    } catch (error) {
        console.error("Error operativo al renderizar planilla en búsqueda:", error);
    }
}


// 🔄 FUNCIÓN PUENTE: MIGRACIÓN TRANSPARENTE AL PLAN ESTRUCTURAL EFICIENTE
async function migrarEstructuraViejaANueva() {
    try {
        const db = window.firebaseDB; 
        if (!db) return;

        // 1. Obtener los alumnos que aún no fueron migrados
        const q = window.firebaseQuery(
            window.firebaseCollection(db, "alumnos"),
            window.firebaseWhere("migradoAPreviasRaiz", "!=", true)
        );
        const querySnapshot = await window.firebaseGetDocs(q);
        
        if (querySnapshot.empty) return;

        for (const docAlumno of querySnapshot.docs) {
            const dniAlumno = docAlumno.id;
            const datosAlumno = docAlumno.data();
            
            // 2. Revisar si tiene la subcolección antigua de previas
            const subColeccionRef = window.firebaseCollection(db, `alumnos/${dniAlumno}/materias_previas`);
            const subSnap = await window.firebaseGetDocs(subColeccionRef);
            
            if (!subSnap.empty) {
                // 3. Clonar cada previa encontrada a la nueva colección raíz
                for (const docPrevia of subSnap.docs) {
                    const datosPrevia = docPrevia.data();
                    const idUnicoRaiz = `${dniAlumno}_${datosPrevia.materia}_${datosPrevia.anio || 'HISTORICO'}`;
                    
                    await window.firebaseSetDoc(window.firebaseDoc(db, "previas", idUnicoRaiz), {
                        dni: dniAlumno,
                        alumnoNombre: `${datosAlumno.apellido || ''} ${datosAlumno.nombre || ''}`.trim(),
                        materia: datosPrevia.materia,
                        anioOrigen: parseInt(datosPrevia.anio) || 2021,
                        nota: datosPrevia.nota || "",
                        estado: (datosPrevia.nota && parseInt(datosPrevia.nota) >= 6) ? "Aprobada" : "Pendiente",
                        origen: "MANUAL_HISTORICO"
                    }, { merge: true });
                }
            }
            
            // 4. Marcar al alumno como migrado con éxito
            await window.firebaseUpdateDoc(window.firebaseDoc(db, "alumnos", dniAlumno), {
                migradoAPreviasRaiz: true
            });
        }
        console.log("🚀 Migración de estructura de previas finalizada con éxito.");
    } catch (error) {
        console.error("❌ Error en la migración puente de previas:", error);
    }
}


// ⚙️ 4. INICIALIZADOR DIRECTO EN CALIENTE
const nivelAcceso = verificarAutenticacionPrevias();

// Captura de elementos del DOM
const btnAbrirAltaManual = document.getElementById('btnAbrirAltaManual');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const modalAltaManual = document.getElementById('modalAltaManual');

selectCursoModal = document.getElementById('modalCurso');
selectMateriaModal = document.getElementById('modalMateria');
selectOrientacionModal = document.getElementById('modalOrientacion');
formAltaManual = document.getElementById('formAltaManual');

// Forzar visibilidad del botón si el rol cuenta con los permisos de escritura/admin
if (nivelAcceso === "escritura" || nivelAcceso === "total") {
    if (btnAbrirAltaManual) btnAbrirAltaManual.style.display = 'block';
}

// Oyente de Apertura Directo con Hidratación Forzada de Datos locales
if (btnAbrirAltaManual) {
    btnAbrirAltaManual.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 1. Limpiar cualquier rastro de cargas anteriores
        if (formAltaManual) formAltaManual.reset();
        
        // 2. Forzar la lectura inmediata de tu clave 'cursos' en localStorage
        cargarCursosEnModal();
        if (selectCursoModal) {
    selectCursoModal.addEventListener('change', () => {
        cargarMateriasPorCursoModal();
        actualizarOrientacionModal();
    });
}

        
        // 3. Auto-copiar DNI del buscador principal si contiene 7 u 8 dígitos
        const buscadorPrincipal = document.getElementById('inputBuscarAlumno');
        const modalDniInput = document.getElementById('modalDni');
        if (buscadorPrincipal && modalDniInput && /^\d{7,8}$/.test(buscadorPrincipal.value.trim())) {
            modalDniInput.value = buscadorPrincipal.value.trim();
        }

        // 4. Desplegar visualmente la ventana flotante
        if (modalAltaManual) modalAltaManual.style.display = 'flex';
    });
}


if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', (e) => {
        e.preventDefault();
        if (modalAltaManual) modalAltaManual.style.display = 'none';
    });
}

if (selectCursoModal) {
    selectCursoModal.addEventListener('change', cargarMateriasPorCursoModal);
}
// Oyentes del Buscador Superior enlazados al Motor
const btnBuscarPrevia = document.getElementById('btnBuscarPrevia');
const inputBuscarAlumno = document.getElementById('inputBuscarAlumno');

if (btnBuscarPrevia) {
    btnBuscarPrevia.addEventListener('click', (e) => {
        e.preventDefault();
        buscarYRenderizarPlanilla();
    });
}

if (inputBuscarAlumno) {
    inputBuscarAlumno.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarYRenderizarPlanilla();
        }
    });
}

    // 💾 5. PROCESAMIENTO DEL FORMULARIO DE ALTA MANUAL - NUEVA ESTRUCTURA RAÍZ UNIFICADA
    if (formAltaManual) {
        formAltaManual.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dniInput = document.getElementById('modalDni').value.trim();
            const nombreInput = document.getElementById('modalNombre').value.trim().toUpperCase();
            const materiaInput = selectMateriaModal.value;
            const cursoIdInput = selectCursoModal.value;
            const anioInput = parseInt(document.getElementById('modalAnio').value);
            const notaInput = parseInt(document.getElementById('modalNotaFinal').value);
            const orientacionInput = document.getElementById('modalOrientacion') ? document.getElementById('modalOrientacion').value : "Ciclo Básico";


            // Obtener el texto visible del curso seleccionado para que se renderice bien en la tabla
            const cursoTextoHTML = selectCursoModal.options[selectCursoModal.selectedIndex] ? selectCursoModal.options[selectCursoModal.selectedIndex].textContent : '-';

            if (!/^\d{7,8}$/.test(dniInput)) {
                alert("Error: El DNI debe ser un número válido de 7 u 8 dígitos.");
                return;
            }
            if (notaInput < 1 || notaInput > 5) {
                alert("Error: La nota de previa debe estar entre 1 y 5.");
                return;
            }

            try {
                // Mantener el registro base del alumno en la colección 'alumnos' si no existiese
                const alumnoRef = doc(db, "alumnos", dniInput);
                const alumnoSnap = await getDoc(alumnoRef);
                if (!alumnoSnap.exists()) {
                    await setDoc(alumnoRef, {
                        dni: dniInput,
                        nombreCompletoPrevias: nombreInput,
                        soloPrevias: true,
                        estadoMatricula: "Exclusivo_Previa",
                        fechaAltaSistema: serverTimestamp(),
                        migradoAPreviasRaiz: true // Marcado directo para evitar futuras migraciones obsoletas
                    });
                }

                // Generar la clave única plana unificada: DNI_MATERIA_AÑO (Formato estándar verificado)
                const matId = materiaInput.toUpperCase().trim().replace(/\s+/g, '_');
                const idPreviaRaizUnico = `${dniInput}_${matId}_${anioInput}`;
                
                // Referenciar a la nueva colección raíz unificada 'previas'
                const previaRef = doc(db, "previas", idPreviaRaizUnico);
                const previaSnap = await getDoc(previaRef);
                
                if (previaSnap.exists()) {
                    alert(`La materia ${materiaInput} ya figura registrada para el alumno en el año ${anioInput}.`);
                    return;
                }

                // Guardado físico directo en la nueva estructura unificada
                await setDoc(previaRef, {
                    dni: dniInput,
                    alumnoNombre: nombreInput,
                    materia: materiaInput.toUpperCase().trim(),
                    curso: cursoTextoHTML, // Se almacena formateado para alta densidad de datos
                    cursoOrigen: cursoIdInput,
                    orientacion: orientacionInput,
                    anioOrigen: anioInput,
                    notaFinalCursada: notaInput,
                    libroFolio: "-",
                    notaExamen: "-",
                    fechaExamen: "-",
                    estado: "Pendiente",
                    origen: "ALTA_MANUAL_RAIZ",
                    fechaRegistro: serverTimestamp(),
                    ultimaModificacion: serverTimestamp()
                });

                if (typeof window.registrarEventoLegajo === "function") {
                    window.registrarEventoLegajo(dniInput, "CALIFICACIONES", "PREVIAS_ALTA", `Alta manual de materia previa: ${materiaInput} (Año: ${anioInput})`);
                }
                
                alert("Materia previa guardada con éxito en la nueva base de datos.");
                if (modalAltaManual) modalAltaManual.style.display = 'none';

                // Insertar dinámicamente la nueva fila arriba de la tabla actual sin recargar
                const tbody = document.getElementById('tbodyPreviasPlanilla');
                if (tbody) {
                    // Si estaba el mensaje de estado inicial vacío, lo removemos
                    if (tbody.innerHTML.includes("Ingrese un DNI") || tbody.innerHTML.includes("No hay registros")) {
                        tbody.innerHTML = "";
                    }

                    const fila = document.createElement('tr');
                    fila.innerHTML = `
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;font-weight:bold;">${dniInput}</td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-transform:uppercase;font-weight:bold;">${nombreInput}</td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;color:#1b4d82;font-weight:bold;">${materiaInput.toUpperCase().trim()}</td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;">${cursoTextoHTML}</td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;">${anioInput}</td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#dc2626;">${notaInput}</td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;"><input type="text" class="input-celda txt-libro-folio" value="" disabled style="text-align: center; height: 18px; padding: 2px; font-size: 12px; margin: 0 auto; box-sizing: border-box;"></td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;"><input type="text" class="input-celda txt-nota-examen" value="" disabled style="text-align: center; width: 40px; height: 18px; padding: 2px; font-size: 12px; margin: 0 auto; box-sizing: border-box;"></td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;"><input type="date" class="input-celda txt-fecha-examen" value="" disabled style="text-align: center; height: 18px; padding: 2px; font-size: 11px; margin: 0 auto; box-sizing: border-box;"></td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;"><span class="badge-pendiente">Pendiente</span></td>
                        <td style="padding:2px 6px;border:1px solid #cbd5e1;text-align:center;">
                            <button class="btn-principal btn-accion-editar" data-dni="${dniInput}" data-id-doc="${idPreviaRaizUnico}" data-materia="${materiaInput.toUpperCase().trim()}" style="background-color:#13365b;color:#ffffff;padding:1px 6px;font-size:11px;height:18px;line-height:14px;cursor:pointer;">Editar</button>
                        </td>
                    `;
                    tbody.insertBefore(fila, tbody.firstChild);

                    // Actualizar dinámicamente el totalizador numérico visible de la grilla
                    const contador = document.getElementById('contadorRegistros');
                    if (contador) {
                        const filasReales = tbody.querySelectorAll('tr:not([colspan])').length;
                        contador.textContent = `${filasReales} registros`;
                    }
                }

                formAltaManual.reset();
            } catch (err) {
                console.error("Fallo crítico en guardado de nueva estructura raíz:", err);
                alert("Ocurrió un error al guardar en la base de datos centralizada.");
            }
        });
    }


// 📝 LÓGICA DE EDICIÓN EN LÍNEA, GUARDADO Y CANCELACIÓN (VERSIÓN DEFINITIVA CORREGIDA)
document.getElementById('tbodyPreviasPlanilla').addEventListener('click', async (e) => {
    // 1. COMPORTAMIENTO DEL BOTÓN EDITAR / GUARDAR
    if (e.target.classList.contains('btn-accion-editar')) {
        const boton = e.target;
        const fila = boton.closest('tr');
        const dni = boton.getAttribute('data-dni');
        const materia = boton.getAttribute('data-materia');
        
        const inputLibro = fila.querySelector('.txt-libro-folio');
        const inputNota = fila.querySelector('.txt-nota-examen');
        const inputFecha = fila.querySelector('.txt-fecha-examen');
        const botonCancelar = fila.querySelector('.btn-cancelar-edicion');

        // MODO EDICIÓN: Activamos campos y guardamos valores antiguos en memoria por si cancela
        if (boton.textContent === "Editar") {
            fila.setAttribute('data-old-libro', inputLibro.value);
            fila.setAttribute('data-old-nota', inputNota.value);
            fila.setAttribute('data-old-fecha', inputFecha.value);

            if (inputLibro) inputLibro.disabled = false;
            if (inputNota) inputNota.disabled = false;
            if (inputFecha) inputFecha.disabled = false;
            
            fila.style.backgroundColor = "#fffde7"; 
            boton.textContent = "Guardar";
            boton.style.backgroundColor = "#2e7d32"; 
            boton.style.color = "#ffffff";
            
            if (botonCancelar) botonCancelar.style.display = "inline-block";
        } 
        // MODO GUARDAR: Enviamos los cambios reales a Firestore
        else {
            const libroVal = inputLibro ? inputLibro.value.trim() : "";
            const notaVal = inputNota ? inputNota.value.trim() : "";
            const fechaVal = inputFecha ? inputFecha.value : "";

            // Validación inteligente de nota únicamente al momento de guardar
            if (notaVal !== "" && notaVal !== "-") {
                const notaNum = parseFloat(notaVal);
                if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
                    alert("Por favor, ingrese una nota válida entre 1 y 10.");
                    return;
                }
            }

            boton.textContent = "⏳...";
            boton.disabled = true;
            if (botonCancelar) botonCancelar.style.display = "none";

            try {
                // Nota de aprobación escolar: 6 o más
                let nuevoEstado = "Pendiente";
                if (notaVal !== "" && notaVal !== "-" && parseFloat(notaVal) >= 6) {
                    nuevoEstado = "Aprobada";
                }

                await setDoc(doc(db, "alumnos", dni, "materias_previas", materia), {
                    libroFolio: libroVal,
                    notaExamen: notaVal,
                    fechaExamen: fechaVal,
                    estado: nuevoEstado
                }, { merge: true });

                if (inputLibro) inputLibro.disabled = true;
                if (inputNota) inputNota.disabled = true;
                if (inputFecha) inputFecha.disabled = true;
                
                fila.style.backgroundColor = ""; 
                boton.textContent = "Editar";
                boton.style.backgroundColor = "#13365b"; 
                boton.style.color = "#ffffff";
                boton.disabled = false;

                // Actualizamos visualmente el badge de estado en la fila (celda índice 9)
                if (fila.cells && fila.cells[9]) {
                    fila.cells[9].innerHTML = nuevoEstado === "Aprobada" 
                        ? `<span class="badge-aprobada">Aprobada</span>` 
                        : `<span class="badge-pendiente">Pendiente</span>`;
                }

            } catch (error) {
                console.error("Error al guardar:", error);
                alert("No se pudieron salvar los datos.");
                boton.textContent = "Guardar";
                boton.style.backgroundColor = "#2e7d32";
                boton.disabled = false;
                if (botonCancelar) botonCancelar.style.display = "inline-block";
            }
        }
        return;
    }

    // 2. COMPORTAMIENTO DEL BOTÓN CANCELAR (BOTÓN "X")
    if (e.target.classList.contains('btn-cancelar-edicion')) {
        const botonCancelar = e.target;
        const fila = botonCancelar.closest('tr');
        const botonEditar = fila.querySelector('.btn-accion-editar');
        
        const inputLibro = fila.querySelector('.txt-libro-folio');
        const inputNota = fila.querySelector('.txt-nota-examen');
        const inputFecha = fila.querySelector('.txt-fecha-examen');

        // Restauramos los valores desde el backup de la fila
        if (inputLibro) inputLibro.value = fila.getAttribute('data-old-libro') || "";
        if (inputNota) inputNota.value = fila.getAttribute('data-old-nota') || "";
        if (inputFecha) inputFecha.value = fila.getAttribute('data-old-fecha') || "";

        if (inputLibro) inputLibro.disabled = true;
        if (inputNota) inputNota.disabled = true;
        if (inputFecha) inputFecha.disabled = true;
        
        fila.style.backgroundColor = ""; 
        if (botonEditar) {
            botonEditar.textContent = "Editar";
            botonEditar.style.backgroundColor = "#13365b";
            botonEditar.style.color = "#ffffff";
            botonEditar.disabled = false;
        }
        botonCancelar.style.display = "none";
    }
});

// 🔄 FUNCIÓN PUENTE: MIGRACIÓN TRANSPARENTE AL PLAN ESTRUCTURAL EFICIENTE
async function migrarEstructuraViejaANueva() {
    try {
        const { collection, getDocs, doc, setDoc, updateDoc, query, where } = await import(b + 'firebase-firestore.js');
        if (!db) return;

        const q = query(collection(db, "alumnos"), where("migradoAPreviasRaiz", "!=", true));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return;

        for (const docAlumno of querySnapshot.docs) {
            const dniAlumno = docAlumno.id;
            const datosAlumno = docAlumno.data();
            
            const subColeccionRef = collection(db, `alumnos/${dniAlumno}/materias_previas`);
            const subSnap = await getDocs(subColeccionRef);
            
            if (!subSnap.empty) {
                for (const docPrevia of subSnap.docs) {
                    const datosPrevia = docPrevia.data();
                    const idUnicoRaiz = `${dniAlumno}_${datosPrevia.materia}_${datosPrevia.anio || 'HISTORICO'}`;
                    
                    await setDoc(doc(db, "previas", idUnicoRaiz), {
                        dni: dniAlumno,
                        alumnoNombre: `${datosAlumno.apellido || ''} ${datosAlumno.nombre || ''}`.trim(),
                        materia: datosPrevia.materia,
                        anioOrigen: parseInt(datosPrevia.anio) || 2021,
                        nota: datosPrevia.nota || "",
                        estado: (datosPrevia.nota && parseInt(datosPrevia.nota) >= 6) ? "Aprobada" : "Pendiente",
                        origen: "MANUAL_HISTORICO"
                    }, { merge: true });
                }
            }
            await updateDoc(doc(db, "alumnos", dniAlumno), { migradoAPreviasRaiz: true });
        }
        console.log("🚀 Migración de estructura de previas finalizada con éxito.");
    } catch (error) {
        console.error("❌ Error en la migración puente de previas:", error);
    }
}

async function cargarPlanillaGeneralAlArrancar() {
  const tbody = document.getElementById('tbodyPreviasPlanilla');
  if (!tbody) return;
  
  // Limpiamos el texto inicial estático inmediatamente para evitar falsos positivos
  tbody.innerHTML = `<tr><td colspan="11" style="padding:20px;text-align:center;color:#1b4d82;font-weight:bold;">Conectando con la base de datos...</td></tr>`;
  
  try {
    if (typeof db === 'undefined' || !db) {
      setTimeout(cargarPlanillaGeneralAlArrancar, 250);
      return;
    }
    const { collection, getDocs, doc, setDoc, updateDoc, query, where } = await import(b + 'firebase-firestore.js');
    
    // Lectura directa de alumnos para resolver el traspaso de registros históricos
    const snapAlumnos = await getDocs(collection(db, "alumnos"));
    
    if (!snapAlumnos.empty) {
      for (const docAlu of snapAlumnos.docs) {
        const dniAlu = docAlu.id;
        const dataAlu = docAlu.data();
        
        if (dataAlu.migradoAPreviasRaiz !== true) {
          // Acceso exacto al plural según la captura forense: 'materias_previas'
          const subRef = collection(db, `alumnos/${dniAlu}/materias_previas`);
          const snapSub = await getDocs(subRef);
          
          if (!snapSub.empty) {
            for (const docPre of snapSub.docs) {
              const dataPre = docPre.data();
              const matId = (dataPre.materia || docPre.id).toUpperCase().trim().replace(/\s+/g, '_');
              const anioId = parseInt(dataPre.anioOrigen || dataPre.anio) || 2021;
              const idUnico = `${dniAlu}_${matId}_${anioId}`;
              
              await setDoc(doc(db, "previas", idUnico), {
                dni: dniAlu,
                alumnoNombre: (dataAlu.nombreCompletoPrevias || dataAlu.nombre || "").toUpperCase().trim(),
                materia: (dataPre.materia || docPre.id).toUpperCase().trim(),
                anioOrigen: anioId,
                notaFinalCursada: parseInt(dataPre.notaFinalCursada || dataPre.nota) || 1,
                libroFolio: dataPre.libroFolio || "-",
                notaExamen: dataPre.notaExamen || "-",
                fechaExamen: dataPre.fechaExamen || "-",
                estado: "Pendiente",
                origen: "MIGRACION_MANGUERA"
              }, { merge: true });
            }
          }
          await updateDoc(doc(db, "alumnos", dniAlu), { migradoAPreviasRaiz: true });
        }
      }
    }

    // Consulta de visualización sobre la nueva estructura unificada
    const qPrevias = query(collection(db, "previas"), where("estado", "==", "Pendiente"));
    const snapshotNuevos = await getDocs(qPrevias);
    
    tbody.innerHTML = "";
    if (snapshotNuevos.empty) {
      tbody.innerHTML = `<tr><td colspan="11" style="padding:20px;text-align:center;color:#64748b;">No hay registros pendientes en la colección raíz 'previas'.</td></tr>`;
      return;
    }
    
       // PARCHE CORRECTOR: Botón Editar Azul + Letras Blancas y Borrar Condicional al arrancar
snapshotNuevos.forEach((docPrevia) => {
    const data = docPrevia.data();
    const idDoc = docPrevia.id;
    const fila = document.createElement('tr');
    const badgeEstado = data.estado === "Aprobada"
        ? `<span class="badge-aprobada">Aprobada</span>`
        : `<span class="badge-pendiente">Pendiente</span>`;

    // Regla de negocio: botón borrar activo únicamente para el bache histórico (<= 2023)
    const anioNum = parseInt(data.anioOrigen);
    const mostrarBorrar = (!isNaN(anioNum) && anioNum <= 2023);
    const botonBorrarHTML = mostrarBorrar 
        ? `<button class="btn-accion-borrar" data-id-doc="${idDoc}" data-materia="${data.materia || ''}" data-alumno="${data.alumnoNombre || ''}" style="background-color: #dc2626; color: #ffffff; padding: 2px 8px !important; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; height: 22px; line-height: 18px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;">Borrar</button>`
        : '';

// PARCHE CORRECTOR: Contenedor Flexbox rígido para forzar igualdad de altura al 100%
fila.innerHTML = `
    <td style="padding: 2px 4px !important; font-size: 12px !important; font-weight: bold; text-align: center;">${data.dni || ''}</td>
    <td style="padding: 2px 4px !important; font-size: 12px !important; text-transform: uppercase; text-align: left;">${data.alumnoNombre || ''}</td>
    <td style="padding: 2px 4px !important; font-size: 12px !important; font-weight: bold; color: #1b4d82; text-align: left;">${data.materia || '-'}</td>
    <td style="padding: 2px 4px !important; font-size: 11px !important; text-align: center; font-weight: bold; color: #334155;">${data.cursoOrigen || '-'}</td>
    <td style="padding: 2px 4px !important; font-size: 11px !important; text-align: center; color: #1a73e8; font-weight: bold;">${(data.orientacion || 'CICLO BÁSICO').toUpperCase()}</td>
    <td style="padding: 2px 4px !important; font-size: 12px !important; text-align: center;">${data.anioOrigen || '-'}</td>
    <td style="padding: 2px 4px !important; font-size: 12px !important; text-align: center; font-weight: bold; color: #dc2626;">${data.notaFinalCursada || '-'}</td>
    <td style="padding: 2px 4px !important;"><input type="text" class="input-celda txt-libro-folio" value="${data.libroFolio && data.libroFolio !== '-' ? data.libroFolio : ''}" disabled></td>
    <td style="padding: 2px 4px !important;"><input type="text" class="input-celda txt-nota-examen" value="${data.notaExamen && data.notaExamen !== '-' ? data.notaExamen : ''}" disabled style="width: 100%; text-align: center;"></td>
    <td style="padding: 2px 4px !important;"><input type="date" class="input-celda txt-fecha-examen" value="${data.fechaExamen && data.fechaExamen !== '-' ? data.fechaExamen : ''}" disabled></td>
    <td style="padding: 2px 4px !important; text-align: center;">${badgeEstado}</td>
    <td style="padding: 2px 4px !important; white-space: nowrap; text-align: center; vertical-align: middle;">
        <div style="display: flex !important; gap: 4px !important; justify-content: center !important; align-items: stretch !important; height: 19px !important; width: 100%;">
            <button class="btn-accion-editar" data-dni="${data.dni || ''}" data-id-doc="${idDoc}" data-materia="${data.materia || ''}" style="background-color: #13365b; color: #ffffff; padding: 0 8px !important; margin: 0 !important; border: none !important; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; height: 100% !important; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">Editar</button>
            <button class="btn-cancelar-edicion" style="display: none; background-color: #e2e8f0; color: #1e293b; padding: 0 6px !important; margin: 0 !important; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 10px; height: 100% !important; box-sizing: border-box; font-weight: bold; display: flex; align-items: center; justify-content: center;">X</button>
            ${mostrarBorrar ? `<button class="btn-accion-borrar" data-id-doc="${idDoc}" data-materia="${data.materia || ''}" data-alumno="${data.alumnoNombre || ''}" style="background-color: #dc2626; color: #ffffff; padding: 0 8px !important; margin: 0 !important; border: none !important; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; height: 100% !important; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">Borrar</button>` : ''}
        </div>
    </td>
`;



        tbody.appendChild(fila);
    });

    
    const contador = document.getElementById('contadorRegistros');
    if (contador) contador.textContent = `${snapshotNuevos.size} registros`;
    
  } catch (error) {
    console.error("Falla crítica en carga general:", error);
    tbody.innerHTML = `<tr><td colspan="11" style="padding:20px;text-align:center;color:#dc2626;">Error de comunicación con Firestore.</td></tr>`;
  }
}
cargarPlanillaGeneralAlArrancar();

})();

