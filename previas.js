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

// 📊 3. HIDRATACIÓN EN CASCADA DE CURSOS Y MATERIAS (Sincronizado con tu clave real 'cursosColegio')
function cargarCursosEnModal() {
    if (!selectCursoModal) return;
    
    // Leer la variable real que inyecta tu sistema en usuarios.js
    const cursosRaw = localStorage.getItem('cursosColegio');
    const cursos = cursosRaw ? JSON.parse(cursosRaw) : [];
    
    selectCursoModal.innerHTML = '<option value="" disabled selected>Seleccione estructura origen...</option>';
    if (selectMateriaModal) selectMateriaModal.innerHTML = '<option value="" disabled selected>Seleccione primero un curso...</option>';
    
    if (cursos.length === 0) {
        selectCursoModal.innerHTML = '<option value="">No hay cursos cargados en el sistema</option>';
        return;
    }
    
    cursos.forEach(curso => {
        // En tu estructura de usuarios.js se usa: ciclo, division y turno
        const textoVisor = `${curso.ciclo || ''} - Div: ${curso.division || ''} (${curso.turno || ''})`;
        const opcion = document.createElement('option');
        opcion.value = curso.id; // Ejemplo: "1-A-M"
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
            formAltaManual.reset();

        } catch (err) {
            console.error("Fallo en guardado manual:", err);
            alert("Ocurrió un error al guardar en la base de datos.");
        }
    });
}

// Monitor pasivo corregido: rebota a index si no hay sesión firme, pero no interfiere con el ingreso síncrono
onAuthStateChanged(auth, (user) => {
    if (!user && !localStorage.getItem('usuarioActivo')) {
        window.location.href = "index.html";
    }
});

})();
