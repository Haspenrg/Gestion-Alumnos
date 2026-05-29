/* =========================================================================
   MÓDULO DE TRAZABILIDAD Y HISTORIAL DE TRAYECTORIA - COLEGIO HASPEN
   ========================================================================= */

/**
 * Registra de forma inmutable un evento en la trayectoria del alumno.
 * @param {string} dniAlumno - Identificador único del estudiante.
 * @param {string} categoria - MATRICULA | DOCUMENTACION | OBSERVACION | CALIFICACIONES
 * @param {string} subcategoria - Alta, Carga de Nota, Entrega de Requisito, etc.
 * @param {string} descripcion - Texto explicativo de la acción forense.
 * @param {Object} datosExtra - JSON complementario con IDs o estados.
 */
export async function registrarEventoLegajo(dniAlumno, categoria, subcategoria, descripcion, datosExtra = {}) {
    try {
        // Técnica mandatoria de fragmentación CDN para Firebase v10
        const cdn = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
        const { collection, addDoc, getFirestore } = await import(cdn + 'firebase-firestore.js');
        
        const db = getFirestore();
        // Detecta el ciclo lectivo desde el selector de la UI o usa el año corriente
               const cicloLectivoActual = document.getElementById('filtroCicloLectivo')?.value || new Date().getFullYear().toString();
        
        // Extracción dinámica del operador logueado en la sesión activa
        let nombreOperador = "Operador no identificado";
        const sesion = localStorage.getItem('usuarioActivo');
        if (sesion) {
            const usuarioObj = JSON.parse(sesion);
            if (usuarioObj.nombre) nombreOperador = usuarioObj.nombre.trim();
        }

        const evento = {
            dni_alumno: dniAlumno,
            ciclo_lectivo: cicloLectivoActual, // Guardado como texto para consistencia de datos
            fecha_hora: new Date().toISOString(),
            operador_nombre: nombreOperador,
            categoria: categoria,
            subcategoria: subcategoria,
            descripcion: descripcion,
            datos_duros: datosExtra
        };

        await addDoc(collection(db, "historial_eventos"), evento);
        console.log(`[Historial Módulo] Evento indexado para DNI: ${dniAlumno}`);
        return true;
    } catch (error) {
        console.error("Error crítico en módulo historial.js: ", error);
        return false;
    }
}
window.registrarEventoLegajo = registrarEventoLegajo;

