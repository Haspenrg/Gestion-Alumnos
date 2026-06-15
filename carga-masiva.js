// Motor de Carga Masiva Seguro - Versión Estable Multicurso
(async function() {
'use strict';

const cdn = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
const { doc, setDoc, getFirestore, collection } = await import( cdn + 'firebase-firestore.js');

let alumnosEnMemoria = [];

async function ejecutarEscrituraFirestore() {
    if (alumnosEnMemoria.length === 0) return;

    const b = document.getElementById('btnConfirmarCarga');
    if (b) {
        b.disabled = true;
        b.innerHTML = "⏳ Guardando...";
    }

    const db = getFirestore();
    const alumnosBaseLocal = window.cachedAlumnosGlobal || [];
    let total = 0;

    for (const a of alumnosEnMemoria) {
        const registroPrevio = alumnosBaseLocal.find(al => String(al.dni).replace(/\D/g, '').trim() === a.dni);
        
        let subcatForense = "ALTA_LOTE";
        let descripcionForense = `Alta digital por lote en la sección ${a.cursoClave.toUpperCase()}.`;
        let omitirHistorial = false;

        if (registroPrevio) {
            const cursoViejo = registroPrevio.cursoClave ? registroPrevio.cursoClave.toUpperCase() : "Desconocido/Mesa Entrada";
            const cursoNuevo = a.cursoClave ? a.cursoClave.toUpperCase() : "Desconocido";
            
            if (cursoViejo !== cursoNuevo) {
                subcatForense = "MODIFICACION_LEGAJO";
                descripcionForense = `Cambio de sección por lote: El alumno fue promovido/trasladado desde ${cursoViejo} hacia ${cursoNuevo}.`;
            } else {
                const nombreIgual = (registroPrevio.nombre || "").trim().toUpperCase() === (a.nombre || "").trim().toUpperCase();
                const telIgual = (registroPrevio.telefono1 || "") === (a.telefono1 || "");
                const dirIgual = (registroPrevio.direccion || "").trim().toUpperCase() === (a.direccion || "").trim().toUpperCase();
                const mailIgual = (registroPrevio.emailTutor || "").trim().toLowerCase() === (a.emailTutor || "").trim().toLowerCase();

                if (nombreIgual && telIgual && dirIgual && mailIgual) {
                    omitirHistorial = true;
                } else {
                    subcatForense = "MODIFICACION_LEGAJO";
                    descripcionForense = `Actualización masiva de datos de contacto y legajo familiar en la sección ${cursoNuevo}.`;
                }
            }
        }

        await setDoc(doc(collection(db, 'alumnos'), a.dni), a, { merge: true });

        if (!omitirHistorial && typeof window.registrarEventoLegajo === 'function') {
            await window.registrarEventoLegajo(a.dni, "MATRICULA", subcatForense, descripcionForense, {
                cursoOrigen: registroPrevio ? (registroPrevio.cursoClave || "") : "",
                cursoDestino: a.cursoClave || ""
            });
        }
        total++;
    }

    alumnosEnMemoria = [];

    setTimeout(() => {
        alert(`¡Carga masiva finalizada con éxito!\nSe procesaron y auditaron ${total} registros en el sistema.`);
        
        if (b) {
            b.disabled = false;
            b.innerHTML = "🚀 Confirmar e Impactar Base de Datos";
        }
        
        cerrarModal();

        if (typeof window.procesarFiltrosYNomina === 'function') {
            window.procesarFiltrosYNomina();
        } else {
            console.warn("[Carga Masiva] No se detectó la función global 'procesarFiltrosYNomina' para refrescar la grilla.");
        }
    }, 350); 
}


async function simularCargaCSV(e) {
    try {
        const inputNativo = document.getElementById('csvCargaMasiva');
        const files = inputNativo ? inputNativo.files : null;
        if (!files || files.length === 0) return;

        const archivoSeleccionado = files;
        const s = document.getElementById('selectCursoCarga');
        if (!s || !s.value) {
            alert("Por favor, seleccione la sección de destino en el importador.");
            if (inputNativo) inputNativo.value = "";
            return;
        }

        const cursoid = s.value;
        const cicloActivo = document.getElementById('filtroCicloLectivo')?.value || "2026";
        const rawSelect = s.options[s.selectedIndex].text.toLowerCase();
        const matchNum = rawSelect.match(/\d/);
        const numCurso = matchNum ? matchNum : "";
        const matchLetra = rawSelect.match(/(?:"|')?([a-z])(?:"|')?\s*$/i) || rawSelect.match(/\s+([a-z])\s*$/i);
        let divCurso = "a";
        if (matchLetra) {
            divCurso = matchLetra[1].toLowerCase();
        }

        const claveCursoBuscado = numCurso + divCurso;
        const alumnosEnBaseLocal = window.cachedAlumnosGlobal || [];
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                // Rompemos las líneas limpiando espacios vacíos terminales
                const lineas = evt.target.result.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                
                alumnosEnMemoria = [];
                const claveFiltroLimpia = claveCursoBuscado.toLowerCase().replace(/[^a-z0-9]/g, '');

                // 🎯 LECTURA DIRECTA DE CELDA A1: Extraemos el curso sin requerir la palabra "CURSO:"
                let cursoRastreadoEnCsv = "";
                if (lineas.length > 0) {
                    const celdasFilaUno = lineas[0].split(',');
                    cursoRastreadoEnCsv = celdasFilaUno[0].replace(/"/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                }

                // Si la celda A1 no coincide con la sección del selector, frena y advierte
                if (cursoRastreadoEnCsv !== claveFiltroLimpia) {
                    alert(`⚠️ Conflicto de Sección:\nEl archivo indica el curso '${lineas[0].split(',')[0]}' pero en la pantalla seleccionó '${s.options[s.selectedIndex].text}'.`);
                    return;
                }

                // El bucle for salta el curso (0) y las cabeceras (1) iniciando estrictamente en i = 2
                for (let i = 2; i < lineas.length; i++) {
                    const filaFisicaExcel = i + 1;
                    const fila = lineas[i];
                    if (!fila) continue;

                    // Separador avanzado original
                    const campos = fila.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    
                    if (fila.toUpperCase().includes("APELLIDO Y NOMBRE") || campos.length < 3) {
                        continue;
                    }

                    const primercelda = campos[0] ? campos[0].trim().toUpperCase() : "";
                    if (primercelda.includes("CURSO") || primercelda.includes("PRECEPTOR") || primercelda === "BAJA") {
                        continue;
                    }

                    if (typeof window.filasOmitidas === 'undefined') window.filasOmitidas = [];
                    
                    const rawDni = campos[2] ? campos[2].replace(/"/g, '').trim() : "";
                    const dniLimpio = rawDni.replace(/\D/g, '');

                    // 🚨 LEY OBLIGATORIA: REGLA DE PARADA DE EMERGENCIA CRÍTICA
                    const rawNombre = campos[1] ? campos[1].replace(/"/g, '').trim() : "";
                    const nombreFilaLimpio = rawNombre.replace(/\./g, '').trim();

                    if (!nombreFilaLimpio || nombreFilaLimpio.length < 3) {
                        alert(`❌ Error Crítico de Carga:\nEn la Fila ${filaFisicaExcel} el campo 'Apellido y Nombre' está vacío.\n\nLa transacción fue cancelada.`);
                        return;
                    }

                    if (!dniLimpio) {
                        alert(`❌ Error Crítico de Carga:\nEn la Fila ${filaFisicaExcel} el campo 'DNI. N°' está vacío.\n\nLa transacción fue cancelada.`);
                        return;
                    }

                    if (dniLimpio.length < 7 || dniLimpio.length > 9) {
                        alert(`❌ Error Crítico de Carga:\nEn la Fila ${filaFisicaExcel} el DNI '${rawDni}' es inválido (7 a 9 números).\n\nLa transacción fue cancelada.`);
                        return;
                    }

                    // 📝 NORMALIZACIÓN DE GÉNERO PARA SELECTORES (Mapeo de la columna F-M en índice 13)
                    const generoCrudo = campos[13] ? campos[13].replace(/"/g, '').trim().toUpperCase() : "";
                    let generoNormalizado = "";
                    if (generoCrudo === "M" || generoCrudo === "MASCULINO") {
                        generoNormalizado = "MASCULINO";
                    } else if (generoCrudo === "F" || generoCrudo === "FEMENINO") {
                        generoNormalizado = "FEMENINO";
                    }

                    // Mapeo adaptado que preserva todas tus variables institucionales originales
                    const cuilExtraido = campos[3] ? campos[3].replace(/"/g, '').trim() : "";
                    const fechaNacExtraida = campos[4] ? campos[4].replace(/"/g, '').trim() : "";
                    const edadExtraida = campos[5] ? campos[5].replace(/"/g, '').trim() : "";
                    const lugarNacExtraido = campos[6] ? campos[6].replace(/"/g, '').trim() : "";
                    const nacionalidadExtraida = campos[7] ? campos[7].replace(/"/g, '').trim() : "Argentina";
                    const domicilioExtraido = campos[8] ? campos[8].replace(/"/g, '').trim() : "";
                    const telefonoExtraido = campos[9] ? campos[9].replace(/"/g, '').trim() : "";
                    const tutorNombreExtraido = campos[10] ? campos[10].replace(/"/g, '').trim() : "";
                    const tutorDniExtraido = campos[11] ? campos[11].replace(/\D/g, '') : "";
                    const tutorCuilExtraido = campos[12] ? campos[12].replace(/\D/g, '') : "";
                    const emailDetectado = campos[14] ? campos[14].replace(/"/g, '').trim() : "";

                    const yaExisteEnBaseColegio = alumnosEnBaseLocal.some(al => al.dni === dniLimpio);
                    const estadoAuditoria = yaExisteEnBaseColegio ? "MODIFICADO" : "NUEVO";

                    alumnosEnMemoria.push({
                        dni: dniLimpio,
                        nombre: nombreFilaLimpio.toUpperCase(),
                        cuil: cuilExtraido,
                        fechanacimiento: fechaNacExtraida,
                        edad: edadExtraida,
                        lugarnacimiento: lugarNacExtraido,
                        nacionalidad: nacionalidadExtraida,
                        direccion: domicilioExtraido,
                        telefono1: telefonoExtraido,
                        emailTutor: emailDetectado,
                        idCursoActual: cursoid,
                        cursoClave: claveCursoBuscado,
                        cicloLectivo: cicloActivo,
                        auditoria: estadoAuditoria,
                        estado: "Regular",
                        tutorNombre: tutorNombreExtraido,
                        tutorDni: tutorDniExtraido,
                        tutorCuil: tutorCuilExtraido,
                        genero: generoNormalizado
                    });
                }

                // Renderizado reactivo en la tabla simulada manteniendo tus estilos originales
                const cuerpoTabla = document.getElementById('tablaSimulacionBody');
                if (cuerpoTabla) {
                    cuerpoTabla.innerHTML = alumnosEnMemoria.map(a => {
                        const badgestyle = a.auditoria === "MODIFICADO"
                            ? "background-color: #D97706; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;"
                            : "background-color: #16A34A; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;";

                        return `
                            <tr style="border-bottom: 1px solid #cbd5e1; font-size: 13px;">
                                <td style="padding: 10px 8px; font-family: monospace; color: #333;">${a.dni}</td>
                                <td style="padding: 10px 8px; font-weight: 500; color: #1e293b;">${a.nombre}</td>
                                <td style="padding: 10px 8px; text-align: center; color: #475569;">${a.cuil || '-'}</td>
                                <td style="padding: 10px 8px; text-align: center; color: #475569;">${a.telefono1 || '-'}</td>
                                <td style="padding: 10px 8px; text-align: center;">
                                    <span style="${badgestyle}">${a.auditoria}</span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }

                if (window.filasOmitidas && window.filasOmitidas.length > 0) {
                    alert(`⚠️ Se omitieron ${window.filasOmitidas.length} filas corruptas.`);
                    window.filasOmitidas = [];
                }

                const resumenText = document.getElementById('resumenSimulacion');
                if (resumenText) {
                    const totalModificados = alumnosEnMemoria.filter(al => al.auditoria === "MODIFICADO").length;
                    const totalNuevos = alumnosEnMemoria.length - totalModificados;
                    resumenText.innerText = `Sección: ${s.options[s.selectedIndex].text.toUpperCase()} | Total: ${alumnosEnMemoria.length} (Nuevos: ${totalNuevos}, Modificados: ${totalModificados})`;
                }

                const modal = document.getElementById('modalSimulacionCarga');
                if (modal) {
                    modal.style.setProperty('display', 'flex', 'important');
                }

            } catch (errInterno) {
                console.error("Error en procesamiento analítico del CSV:", errInterno);
            }
        };

        reader.readAsText(archivoSeleccionado, 'UTF-8');

    } catch (error) {
        console.error("Error en simularCargaCSV:", error);
    }
}




function cerrarModal() {
    const modal = document.getElementById('modalSimulacionCarga');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    const inputCsv = document.getElementById('csvCargaMasiva');
    if (inputCsv) inputCsv.value = "";
}

/* ==========================================================================
   PARCHE: Preservación de Selección Activa - Gestion-Alumnos
   ========================================================================== */
window.poblarCursosCarga = function() {
    const target = document.getElementById('selectCursoCarga');
    if (!target) return;
    
    // 1. Guardar la selección actual
    const seleccionActual = target.value; 
    
    const fuenteCursos = window.cachedCursosColegio || [];
    if (fuenteCursos.length > 0) {
        // 2. Reconstruir opciones
        target.innerHTML = '<option value="">-- Seleccionar Sección --</option>';
        fuenteCursos.forEach(c => {
            if (c.id) {
                const nuevaOpt = document.createElement('option');
                nuevaOpt.value = c.id;
                nuevaOpt.textContent = (c.ciclo && c.division) ? `${c.ciclo} "${c.division}"` : (c.ciclo || c.id);
                target.appendChild(nuevaOpt);
            }
        });

        // 3. Restaurar la selección previa
        if (seleccionActual) {
            target.value = seleccionActual;
        }
    }
};



window.inicializarCargaMasivaSegura = function() {
    // Forzamos la visibilidad del contenedor de importación en la interfaz
    const contenedor = document.getElementById('contenedorCargaMasiva');
    if (contenedor) contenedor.style.setProperty('display', 'inline-flex', 'important');

    // Inicialización inmediata y directa al interactuar con el componente
    const forzarCarga = () => {
        window.poblarCursosCarga();
    };

    document.getElementById('selectCursoCarga')?.addEventListener('focus', forzarCarga);
    document.getElementById('selectCursoCarga')?.addEventListener('mousedown', forzarCarga);
    document.getElementById('contenedorCargaMasiva')?.addEventListener('mouseenter', forzarCarga);

    // Barrido preventivo asíncrono para poblar el combo al instante
    let pasos = 0;
    const bucleCursos = setInterval(() => {
        window.poblarCursosCarga();
        pasos++;
        if (pasos > 30) clearInterval(bucleCursos);
    }, 300);
};


/* ==========================================================================
   PARCHE FORENSE: CORRECCIÓN DE DELEGACIÓN CON CLOSEST PARA CLICS INTERNOS
   ========================================================================== */
document.addEventListener('click', function(e) {
    if (!e.target) return;

    // Buscamos si el clic ocurrió dentro del botón de carga masiva
    const botonCarga = e.target.closest('#btnCargaMasiva');
    if (botonCarga) {
        e.preventDefault();
        window.poblarCursosCarga();
        const inputCsv = document.getElementById('csvCargaMasiva');
        if (inputCsv) {
            inputCsv.value = "";
            inputCsv.click(); // Ahora sí va a levantar la ventana de Windows siempre
        }
        return; // Cortamos la ejecución para este caso
    }

    // Botones de cierre usando closest por seguridad de maquetación
    if (e.target.closest('#btnCerrarSimulacion') || e.target.closest('#btnCerrarSimulacionX') || e.target.closest('#btnCancelarCarga')) {
        cerrarModal();
    }

    // Botón de confirmación
    if (e.target.id === 'btnConfirmarCarga') {
        ejecutarEscrituraFirestore();
    }
});


// ====== CONTROLÁ QUE EL FINAL ABSOLUTO DE TU ARCHIVO QUEDE ASÍ ======
window.simularCargaCSV = simularCargaCSV;
window.ejecutarEscrituraFirestore = ejecutarEscrituraFirestore;

// Auto-inicialización forzada para despertar el módulo en caliente
window.inicializarCargaMasivaSegura();

})(); // Cierre definitivo
// ====================================================================
