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
    let total = 0;
    for (const a of alumnosEnMemoria) {
        await setDoc(doc(collection(db, 'alumnos'), a.dni), a, { merge: true });
        if (typeof window.registrarEventoLegajo === 'function') {
            await window.registrarEventoLegajo(a.dni, "MATRICULA", "ALTA_LOTE", `Alta digital por lote.`);
        }
        total++;
    }
    alert(`¡Carga masiva finalizada! Se procesaron ${total} legajos con éxito.`);
    cerrarModal();
    if (typeof window.procesarFiltrosYNomina === 'function') window.procesarFiltrosYNomina();
}

async function simularCargaCSV(e) {
    try {
        const inputNativo = document.getElementById('csvCargaMasiva');
        const f = inputNativo ? inputNativo.files : null;
        if (!f || f.length === 0) return;

        const archivoSeleccionado = f[0];
        
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
        const numCurso = matchNum ? matchNum[0] : "";
        
        const matchLetra = rawSelect.match(/["'“’]?([a-z])["'”’]?\s*$/i) || rawSelect.match(/\s+([a-z])$/i);
        let divCurso = "a";
        if (matchLetra && matchLetra[1]) {
            divCurso = matchLetra[1].toLowerCase();
        }

        const claveCursoBuscado = numCurso + divCurso;
        const reader = new FileReader();

        reader.onload = async (evt) => {
            const lineas = evt.target.result.split(/\r?\n/);
            alumnosEnMemoria = [];
            
            for (let i = 1; i < lineas.length; i++) {
                const fila = lineas[i].trim();
                if (!fila) continue;
                
                const campos = fila.split(/,|;/);
                if (campos.length < 3) continue;

                const dniLimpio = campos[0].replace(/\D/g, '').trim();
                if (!dniLimpio) continue;

                alumnosEnMemoria.push({
                    dni: dniLimpio,
                    apellido: campos[1].toUpperCase().trim(),
                    nombre: campos[2].toUpperCase().trim(),
                    idCursoActual: cursoid,
                    cursoClave: claveCursoBuscado,
                    cicloLectivo: cicloActivo,
                    estado: "REGULAR"
                });
            }

            const cuerpoTabla = document.getElementById('tablaSimulacionCuerpo');
            if (cuerpoTabla) {
                cuerpoTabla.innerHTML = alumnosEnMemoria.map(a => `
                    <tr>
                        <td style="padding:8px; border:1px solid #1b4d82; color:#333;">${a.dni}</td>
                        <td style="padding:8px; border:1px solid #1b4d82; color:#333;">${a.apellido}, ${a.nombre}</td>
                        <td style="padding:8px; border:1px solid #1b4d82; text-align:center;"><span class="badge state-regular" style="background-color:#28a745; color:white; padding:2px 6px; border-radius:4px; font-size:11px;">REGULAR</span></td>
                    </tr>
                `).join('');
            }

            const resumenText = document.getElementById('resumenSimulacion');
            if (resumenText) {
                resumenText.innerText = `Sección Destino: ${s.options[s.selectedIndex].text.toUpperCase()} | Registros detectados: ${alumnosEnMemoria.length}`;
            }

            const modal = document.getElementById('modalSimulacionCarga');
            if (modal) modal.style.setProperty('display', 'flex', 'important');
        };

        reader.readAsText(archivoSeleccionado, 'UTF-8');
    } catch (err) {
        console.error("Error crítico controlado en simularCargaCSV:", err);
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalSimulacionCarga');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    const inputCsv = document.getElementById('csvCargaMasiva');
    if (inputCsv) inputCsv.value = "";
}

window.poblarCursosCarga = function() {
    const target = document.getElementById('selectCursoCarga');
    if (!target) return;

    const fuenteCursos = window.cachedCursosColegio || [];
    if (fuenteCursos.length > 0) {
        target.innerHTML = '<option value="">-- Seleccionar Sección --</option>';
        
        fuenteCursos.forEach(c => {
            // CORRECCIÓN FORENSE: Mapeo exacto de las claves reales de tu Firestore
            const idCurso = c.id || "";
            
            // Armamos el nombre visual uniendo Ciclo + División (Ej: 1° Año - Ciclo Básico "A")
            let nombreVisual = "";
            if (c.ciclo && c.division) {
                nombreVisual = `${c.ciclo} "${c.division}"`;
            } else {
                nombreVisual = c.ciclo || c.orientacion || idCurso;
            }
            
            if (idCurso) {
                const nuevaOpt = document.createElement('option');
                nuevaOpt.value = idCurso;
                nuevaOpt.textContent = String(nombreVisual).toUpperCase().trim();
                target.appendChild(nuevaOpt);
            }
        });
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


document.addEventListener('click', function(e) {
    if (!e.target) return;
    if (e.target.id === 'btnCargaMasiva') {
        window.poblarCursosCarga();
        const inputCsv = document.getElementById('csvCargaMasiva');
        if (inputCsv) {
            inputCsv.value = "";
            inputCsv.click();
        }
    }
    if (e.target.id === 'btnCerrarSimulacion' || e.target.id === 'btnCerrarSimulacionX' || e.target.id === 'btnCancelarCarga') {
        cerrarModal();
    }
    if (e.target.id === 'btnConfirmarCarga') {
        ejecutarEscrituraFirestore();
    }
});

document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'csvCargaMasiva') {
        simularCargaCSV(e);
    }
});

// ====== CONTROLÁ QUE EL FINAL ABSOLUTO DE TU ARCHIVO QUEDE ASÍ ======
window.simularCargaCSV = simularCargaCSV;
window.ejecutarEscrituraFirestore = ejecutarEscrituraFirestore;

// Auto-inicialización forzada para despertar el módulo en caliente
window.inicializarCargaMasivaSegura();

})(); // Cierre definitivo
// ====================================================================

