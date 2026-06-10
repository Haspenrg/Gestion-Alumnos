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
// 🔍 FUNCIÓN MOTOR: BUSCA EN FIRESTORE Y ACUMULA REGISTROS EN LA PLANILLA CENTRAL
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
            tbody.innerHTML = `<tr><td colspan="11" style="padding: 30px; color: #1b4d82; font-weight: bold;">🔍 Buscando registros en Cloud Firestore...</td></tr>`;
        }
        
        const { collection, getDocs } = await import(b + 'firebase-firestore.js');
        const alumnoSnap = await getDoc(doc(db, "alumnos", dniBusqueda));

        if (!alumnoSnap.exists()) {
            if (!dniForzado && tbody) {
                tbody.innerHTML = `<tr><td colspan="11" style="padding: 40px; color: #dc2626; background-color: #fee2e2;">⚠️ No se encontró ningún alumno registrado con el DNI ${dniBusqueda}.</td></tr>`;
                if (txtNombre) txtNombre.textContent = "Ningún alumno seleccionado";
                if (txtDni) txtDni.textContent = "";
                if (contador) contador.textContent = "0 registros";
            }
            return;
        }

        const datosAlumno = alumnoSnap.data();
        const nombreVisor = datosAlumno.nombreCompletoPrevias || datosAlumno.nombre || "ALUMNO SIN NOMBRE";

        if (!dniForzado) {
            if (txtNombre) txtNombre.textContent = nombreVisor;
            if (txtDni) txtDni.textContent = `(DNI: ${dniBusqueda})`;
        }

        const previasSnapshot = await getDocs(collection(db, "alumnos", dniBusqueda, "materias_previas"));

        if (previasSnapshot.empty) {
            if (!dniForzado && tbody) {
                tbody.innerHTML = `<tr><td colspan="11" style="padding: 40px; color: #475569; background-color: #f8fafc;">El alumno no registra materias previas cargadas.</td></tr>`;
                if (contador) contador.textContent = "0 registros";
            }
            return;
        }

        if (tbody) {
            if (!dniForzado) {
                tbody.innerHTML = "";
            } else {
                if (tbody.innerHTML.includes("Ingrese un DNI") || tbody.innerHTML.includes("No se encontró") || tbody.innerHTML.includes("Cargando historial")) {
                    tbody.innerHTML = "";
                }
            }

            previasSnapshot.docs.forEach(docSnap => {
                const previa = docSnap.data();
                const idDocumento = docSnap.id; // Sincroniza con la clave de la BD ("MATEMÁTICA_2021")
                const idFilaExistente = `fila-${dniBusqueda}-${idDocumento}`.replace(/\s+/g, '-');
                
                if (document.getElementById(idFilaExistente)) return;

                const fila = document.createElement('tr');
                fila.id = idFilaExistente;

                const badgeEstado = previa.estado === "Aprobada"
                    ? `<span class="badge-aprobada">Aprobada</span>`
                    : `<span class="badge-pendiente">Pendiente</span>`;

                fila.innerHTML = `
                    <td style="padding: 4px 6px; text-align: left; font-weight: bold; font-size: 13px;">${dniBusqueda}</td>
                    <td style="padding: 4px 6px; text-align: left; text-transform: uppercase; font-size: 13px;">${nombreVisor}</td>
                    <td style="padding: 4px 6px; font-weight: bold; color: #1b4d82; text-align: left; font-size: 13px;">${previa.materia || '-'}</td>
                    <td style="padding: 4px 6px; font-weight: bold; font-size: 13px;">${previa.cursoOrigen || '-'}</td>
                    <td style="padding: 4px 6px; font-size: 13px;">${previa.anioOrigen || '-'}</td>
                    <td style="padding: 4px 6px; font-size: 13px;">${previa.notaFinalCursada || '-'}</td>
                    <td style="padding: 4px 6px;"><input type="text" class="input-celda txt-libro-folio" value="${previa.libroFolio && previa.libroFolio !== '-' ? previa.libroFolio : ''}" disabled style="text-align: center; height: 22px; padding: 2px; font-size: 12px; margin: 0 auto; box-sizing: border-box;"></td>
                    <td style="padding: 4px 6px;"><input type="text" class="input-celda txt-nota-examen" value="${previa.notaExamen && previa.notaExamen !== '-' ? previa.notaExamen : ''}" disabled style="text-align: center; width: 40px; height: 22px; padding: 2px; font-size: 12px; margin: 0 auto; box-sizing: border-box;"></td>
                    <td style="padding: 4px 6px;"><input type="date" class="input-celda txt-fecha-examen" value="${previa.fechaExamen && previa.fechaExamen !== '-' ? previa.fechaExamen : ''}" disabled style="text-align: center; height: 22px; padding: 2px; font-size: 11px; margin: 0 auto; box-sizing: border-box;"></td>
                    <td style="padding: 4px 6px; font-size: 12px;">${badgeEstado}</td>
                    <td style="padding: 4px 6px; white-space: nowrap;">
                        <div class="contenedor-acciones-celda" style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                            <button class="btn-principal btn-accion-editar" data-dni="${dniBusqueda}" data-id-doc="${idDocumento}" style="background-color: #13365b; color: #ffffff; padding: 2px 6px; font-size: 11px; height: 22px; line-height: 18px; margin: 0; cursor: pointer;">Editar</button>
                            <button class="btn-cancelar-edicion" style="display: none; background-color: #d32f2f; color: #ffffff; padding: 2px 6px; font-size: 11px; height: 22px; line-height: 18px; margin: 0; cursor: pointer; border: none; border-radius: 4px;">X</button>
                        </div>
                    </td>
                `;

                if (!dniForzado) {
                    tbody.appendChild(fila);
                } else {
                    tbody.insertBefore(fila, tbody.firstChild);
                }
            });

            if (contador) {
                const filasReales = tbody.querySelectorAll('tr:not([colspan])').length;
                contador.textContent = `${filasReales} registros en pantalla`;
            }
        }
    } catch (error) {
        console.error("Error operativo al renderizar planilla:", error);
    }
}

// 📝 LÓGICA DE EDICIÓN EN LÍNEA, GUARDADO Y CANCELACIÓN (SOLUCIÓN DEFINITIVA)
document.getElementById('tbodyPreviasPlanilla').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-accion-editar')) {
        const boton = e.target;
        const fila = boton.closest('tr');
        const dni = boton.getAttribute('data-dni');
        const idDoc = boton.getAttribute('data-id-doc');
        
        const inputLibro = fila.querySelector('.txt-libro-folio');
        const inputNota = fila.querySelector('.txt-nota-examen');
        const inputFecha = fila.querySelector('.txt-fecha-examen');
        const botonCancelar = fila.querySelector('.btn-cancelar-edicion');

        if (boton.textContent === "Editar") {
            fila.setAttribute('data-old-libro', inputLibro ? inputLibro.value : "");
            fila.setAttribute('data-old-nota', inputNota ? inputNota.value : "");
            fila.setAttribute('data-old-fecha', inputFecha ? inputFecha.value : "");

            if (inputLibro) inputLibro.disabled = false;
            if (inputNota) inputNota.disabled = false;
            if (inputFecha) inputFecha.disabled = false;
            
            fila.style.backgroundColor = "#fffde7"; 
            boton.textContent = "Guardar";
            boton.style.backgroundColor = "#2e7d32"; 
            boton.style.color = "#ffffff";
            if (botonCancelar) botonCancelar.style.display = "inline-block";
        } 
        else {
            const libroVal = inputLibro ? inputLibro.value.trim() : "";
            const notaVal = inputNota ? inputNota.value.trim() : "";
            const fechaVal = inputFecha ? inputFecha.value : "";

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
                let nuevoEstado = "Pendiente";
                if (notaVal !== "" && notaVal !== "-" && parseFloat(notaVal) >= 6) {
                    nuevoEstado = "Aprobada";
                }

                await setDoc(doc(db, "alumnos", dni, "materias_previas", idDoc), {
                    libroFolio: libroVal || "-",
                    notaExamen: notaVal || "-",
                    fechaExamen: fechaVal || "-",
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

                // Forzamos la actualización del badge en la interfaz de forma segura
                const celdaBadge = fila.children[9];
                if (celdaBadge) {
                    celdaBadge.innerHTML = nuevoEstado === "Aprobada" 
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

    if (e.target.classList.contains('btn-cancelar-edicion')) {
        const botonCancelar = e.target;
        const fila = botonCancelar.closest('tr');
        const botonEditar = fila.querySelector('.btn-accion-editar');
        const inputLibro = fila.querySelector('.txt-libro-folio');
        const inputNota = fila.querySelector('.txt-nota-examen');
        const inputFecha = fila.querySelector('.txt-fecha-examen');

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


// ⚙️ 4. INICIALIZADOR DIRECTO EN CALIENTE
const nivelAcceso = verificarAutenticacionPrevias();

// Captura de elementos del DOM
const btnAbrirAltaManual = document.getElementById('btnAbrirAltaManual');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const modalAltaManual = document.getElementById('modalAltaManual');

selectCursoModal = document.getElementById('modalCurso');
selectMateriaModal = document.getElementById('modalMateria');
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

// 💾 5. PROCESAMIENTO DEL FORMULARIO DE ALTA MANUAL
if (formAltaManual) {
    formAltaManual.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dniInput = document.getElementById('modalDni').value.trim();
        const nombreInput = document.getElementById('modalNombre').value.trim().toUpperCase();
        const materiaInput = selectMateriaModal.value;
        const cursoIdInput = selectCursoModal.value;
        const anioInput = parseInt(document.getElementById('modalAnio').value);
        const notaInput = parseInt(document.getElementById('modalNotaFinal').value);
        
        if (!/^\d{7,8}$/.test(dniInput)) {
            alert("Error: El DNI debe ser un número válido de 7 u 8 dígitos.");
            return;
        }
        if (notaInput < 1 || notaInput > 5) {
            alert("Error: La nota de previa debe estar entre 1 y 5.");
            return;
        }

        try {
            const alumnoRef = doc(db, "alumnos", dniInput);
            const alumnoSnap = await getDoc(alumnoRef);
            
            if (!alumnoSnap.exists()) {
                await setDoc(alumnoRef, {
                    dni: dniInput,
                    nombreCompletoPrevias: nombreInput,
                    soloPrevias: true,
                    estadoMatricula: "Exclusivo_Previa",
                    fechaAltaSistema: serverTimestamp()
                });
            }

            const idPreviaUnico = `${materiaInput.replace(/\s+/g, '_')}_${anioInput}`;
            const previaRef = doc(db, "alumnos", dniInput, "materias_previas", idPreviaUnico);
            
            const previaSnap = await getDoc(previaRef);
            if (previaSnap.exists()) {
                alert(`La materia ${materiaInput} ya figura registrada para el año ${anioInput}.`);
                return;
            }

            await setDoc(previaRef, {
                materia: materiaInput,
                cursoOrigen: cursoIdInput,
                anioOrigen: anioInput,
                notaFinalCursada: notaInput,
                libroFolio: "-",
                notaExamen: "-",
                fechaExamen: "-",
                estado: "Pendiente",
                origen: "MANUAL_HISTORICO",
                fechaRegistro: serverTimestamp(),
                ultimaModificacion: serverTimestamp()
            });

            if (typeof window.registrarEventoLegajo === "function") {
                window.registrarEventoLegajo(dniInput, "CALIFICACIONES", "PREVIAS_ALTA", `Alta manual de materia previa: ${materiaInput} (Año: ${anioInput})`);
            }

            alert("Materia previa guardada con éxito.");
        if (modalAltaManual) modalAltaManual.style.display = 'none';

        // Inyecta el DNI cargado en el buscador superior y dibuja la fila automáticamente
        const inputBuscador = document.getElementById('inputBuscarAlumno');
        if (inputBuscador) inputBuscador.value = dniInput;
        
        // Ejecuta el motor pasándole el DNI que se acaba de guardar
        await buscarYRenderizarPlanilla(dniInput);

        formAltaManual.reset();


        } catch (err) {
            console.error("Fallo en guardado manual:", err);
            alert("Ocurrió un error al guardar en la base de datos.");
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

// 🔄 CARGA AUTOMÁTICA AL INICIAR EL MÓDULO (TRAE LOS ALUMNOS YA CARGADOS)
async function cargarPlanillaGeneralAlArrancar() {
    if (!db) {
        setTimeout(cargarPlanillaGeneralAlArrancar, 1000);
        return;
    }
    const tbody = document.getElementById('tbodyPreviasPlanilla');
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="11" style="padding: 30px; color: #1b4d82; font-weight: bold;">📦 Cargando historial de previas registradas...</td></tr>`;

        const { collection, getDocs } = await import(b + 'firebase-firestore.js');
        const alumnosSnapshot = await getDocs(collection(db, "alumnos"));
        tbody.innerHTML = "";

        for (const alumnoDoc of alumnosSnapshot.docs) {
            const dniAlumno = alumnoDoc.id;
            await buscarYRenderizarPlanilla(dniAlumno);
        }

        if (tbody.querySelectorAll('tr:not([colspan])').length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="padding: 30px; color: #666;">Ingrese un DNI o criterio de búsqueda para desplegar las materias pendientes.</td></tr>`;
        }

    } catch (error) {
        console.error("Error en la carga inicial de planilla:", error);
        tbody.innerHTML = `<tr><td colspan="11" style="padding: 30px; color: #dc2626;">No se pudo inicializar la lista de registros previos.</td></tr>`;
    }
}

// Activar el escaneo automático del historial al abrir el módulo
cargarPlanillaGeneralAlArrancar();

// Monitor pasivo de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user && !localStorage.getItem('usuarioActivo')) {
        window.location.href = "index.html";
    }
});

})();

