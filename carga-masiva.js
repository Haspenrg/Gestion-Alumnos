// Motor de Carga Masiva Seguro - Versión Estable Multicurso
(async function() {
    'use strict';

    const cdn = 'h' + 't' + 't' + 'p' + 's' + ':' + '/' + '/' + 'w' + 'w' + 'w' + '.' + 'g' + 's' + 't' + 'a' + 't' + 'i' + 'c' + '.' + 'c' + 'o' + 'm' + '/f' + 'i' + 'r' + 'e' + 'b' + 'a' + 's' + 'e' + 'j' + 's' + '/10.12.0/';
    const { doc, setDoc, getFirestore, collection, getDocs } = await import(cdn + 'firebase-firestore.js');
    let alumnosEnMemoria = [];

    window.inicializarCargaMasivaSegura = function() {
        const sesion = localStorage.getItem('usuarioActivo');
        if (!sesion) return;
        
        const r = JSON.parse(sesion).rol?.toLowerCase().trim() || "";
        if (r.includes("admin") || r.includes("direct") || r.includes("dir")) {
            const contenedor = document.getElementById('contenedorCargaMasiva');
            if (contenedor) contenedor.style.setProperty('display', 'inline-flex', 'important');
        }

        let intentos = 0;
        const relojCursos = setInterval(() => {
            if (window.cachedCursosColegio && window.cachedCursosColegio.length > 0) {
                poblarCursosCarga();
                clearInterval(relojCursos);
            }
            intentos++;
            if (intentos > 30) clearInterval(relojCursos);
        }, 500);

        /* ==========================================================================
   ANCLA_RESET_EVENTO: Forzar disparo del change anulando el cache del archivo
   ========================================================================== */
        document.getElementById('btnCargaMasiva')?.addEventListener('click', () => {
            const inputCsv = document.getElementById('csvCargaMasiva');
            if (inputCsv) inputCsv.value = ""; 
            inputCsv?.click();
        });

        document.getElementById('csvCargaMasiva')?.addEventListener('change', simularCargaCSV);
        document.getElementById('btnCerrarSimulacionX')?.addEventListener('click', cerrarModal);
        document.getElementById('btnCancelarCarga')?.addEventListener('click', cerrarModal);
        document.getElementById('btnConfirmarCarga')?.addEventListener('click', ejecutarEscrituraFirestore);
    };

    function poblarCursosCarga() {
        const s = document.getElementById('selectCursoCarga');
        if (!s || !window.cachedCursosColegio) return;
        s.innerHTML = "";
        window.cachedCursosColegio.forEach(c => {
            const o = new Option(`${c.ciclo} "${c.division}"`, c.id);
            s.add(o);
        });
    }

    function cerrarModal() {
        document.getElementById('modalSimulacionCarga').style.display = 'none';
        const input = document.getElementById('csvCargaMasiva');
        if (input) input.value = ""; 
        alumnosEnMemoria = [];
    }

    function calcularGeneroyCuil(nombre, cuilRaw, dni) {
    let cuil = cuilRaw.replace(/[^0-9]/g, '').trim();
    let gen = "Masculino";
    if (cuil.length === 11) {
        if (cuil.startsWith("27")) gen = "Femenino";
        return { cuil, gen };
    }
    const nombreLimpio = nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim().toLowerCase();
    const palabras = nombreLimpio.split(/\s+/);
    
    // Matriz extendida de nombres femeninos invariantes (que no finalizan con la letra A)
    const excepcionesFem = ["gladys", "helen", "ines", "zoe", "uma", "umma", "mia", "maia", "ernestina", "ayelen", "nair", "abigail", "belen", "carola", "carmen", "iris", "isabel", "lujan", "miriam", "noe", "noemi", "pilar", "rocio", "ruth", "sol", "solange", "yamil"];
    
    // Analiza cada palabra del campo. Si al menos una es femenina, se determina el género Femenino
    for (let i = 0; i < palabras.length; i++) {
        const p = palabras[i];
        if (p.length > 1 && (p.endsWith('a') || excepcionesFem.includes(p))) {
            gen = "Femenino";
            break;
        }
    }
    
    if (typeof window.calcularCuilAutomatico === 'function') {
        cuil = window.calcularCuilAutomatico(dni, gen);
    } else {
        cuil = (gen === "Femenino" ? "27" : "20") + dni.padStart(8, '0') + "0";
    }
    return { cuil, gen };
}


    function fmtF(val) {
        if (!val) return "";
        const r = val.replace(/["]/g, '').trim();
        if (!r.includes('/')) return r;
        const p = r.split('/');
        if (p.length !== 3) return r;
        const dia = p[0].trim().padStart(2, '0');
        const mes = p[1].trim().padStart(2, '0');
        const anio = p[2].trim();
        return `${anio}-${mes}-${dia}`;
    }
    async function simularCargaCSV(e) {
        const inputNativo = document.getElementById('csvCargaMasiva');
        const f = inputNativo ? inputNativo.files : null;
        if (!f || f.length === 0) return;

        const archivoSeleccionado = f[0];
        const s = document.getElementById('selectCursoCarga');
        if (!s || s.selectedIndex === -1 || !s.options[s.selectedIndex]) {
            alert("Por favor, seleccione primero el curso de destino en el panel de carga masiva.");
            if (inputNativo) inputNativo.value = "";
            return;
        }

        const cursoId = s.value;
        const cicloActivo = document.getElementById('filtroCicloLectivo')?.value || "2026";
        
                const rawSelect = s.options[s.selectedIndex].text.toLowerCase();
        // Extraemos solo el número (ej: 2)
        const numCurso = rawSelect.match(/\d/)?.[0] || "";
        // Extraemos solo la letra que está adentro de las comillas de la división (ej: "a")
        const matchLetra = rawSelect.match(/"([a-z])"/i);
        const divCurso = matchLetra ? matchLetra[1].toLowerCase() : "a";
        
        // Juntamos ambos para armar la clave única del curso elegido (ej: "2" + "a" = "2a")
        const claveCursoBuscado = numCurso + divCurso;


        const reader = new FileReader();

        reader.onload = async (evt) => {
                    /* ==========================================================================
           ANCLA_BLINDAJE_SIMULACION: Reset absoluto antes de procesar el archivo
           ========================================================================== */
        alumnosEnMemoria = [];
        const tablaBody = document.getElementById('tablaSimulacionBody');
        if (tablaBody) tablaBody.innerHTML = '';
        
        const lineas = evt.target.result.split(/\r?\n/);
        const db = getFirestore();

            let cNuevos = 0, cModif = 0;

            let idxDni = -1, idxNombre = -1, idxCuil = -1, idxF_Nac = -1, idxDomicilio = -1, idxTel = -1, idxTutor = -1, idxDniTutor = -1, idxCuilTutor = -1, idxEmail = -1;
            let dentroDelCursoCorrecto = false;

                    for (let i = 0; i < lineas.length; i++) {
                   /* ==========================================================================
           ANCLA_PARSER_CURSOS: Extracción Exacta Multicurso anti Falsos Positivos
           ========================================================================== */
        if (!lineas[i] || lineas[i].trim() === "") continue;

                /* ==========================================================================
           ANCLA_PARSER_INDERRUPTIBLE: Validacion de Curso en Bloque Limpio
           ========================================================================== */
        if (lineas[i].toUpperCase().includes("CURSO:")) {
            const textoLimpio = lineas[i].toUpperCase().replace(/"/g, ' ');
            
            // Verificamos si la linea contiene exactamente el numero y la letra del curso seleccionado
            const tieneNumero = textoLimpio.includes(numCurso);
            const tieneDivision = textoLimpio.includes(divCurso.toUpperCase());
            
            if (tieneNumero && tieneDivision) {
                // Es el curso que buscamos: encendemos la lectura y limpiamos indices
                dentroDelCursoCorrecto = true;
                idxDni = -1; idxNombre = -1; idxCuil = -1; idxF_Nac = -1; idxDomicilio = -1; 
                idxTel = -1; idxTutor = -1; idxDniTutor = -1; idxCuilTutor = -1; idxEmail = -1;
                continue;
            } else {
                // Es otra cabecera de otro curso: APAGAMOS la lectura obligatoriamente
                dentroDelCursoCorrecto = false;
                continue;
            }
        }

            if (!dentroDelCursoCorrecto) continue;


                const fila = lineas[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (!fila || fila.length < 2) continue;

                // 2. DETECCIÓN DINÁMICA DE ENCABEZADOS EN LA SECCIÓN ENCONTRADA
                const unificado = fila.map(t => t.trim().toLowerCase().replace(/"/g, '')).join('|');
                if (unificado.includes("apellido y nombre") || unificado.includes("dni. n")) {
                    fila.forEach((h, idx) => {
                        const cab = h.trim().toLowerCase();
                        if (cab.includes("dni. n")) idxDni = idx;
                        if (cab.includes("apellido")) idxNombre = idx;
                        if (cab.includes("cuil") && idxCuil === -1) idxCuil = idx;
                        if ((cab.includes("fecha") && cab.includes("nac")) || cab === "fecha nac" || cab === "f.nac") idxF_Nac = idx;
                        if (cab.includes("domicilio")) idxDomicilio = idx;
                        if (cab.includes("tel")) idxTel = idx;
                        if (cab.includes("tutor")) idxTutor = idx;
                        if (cab.includes("email")) idxEmail = idx;
                    });
                    if (idxTutor > -1) {
                        idxDniTutor = -1; idxCuilTutor = -1;
                        for (let k = idxTutor + 1; k < fila.length; k++) {
                            const cabT = fila[k].trim().toLowerCase();
                            if (cabT.includes("dni") && idxDniTutor === -1) idxDniTutor = k;
                            if (cabT.includes("cuil") && idxCuilTutor === -1) idxCuilTutor = k;
                        }
                    }
                    continue;
                }

                // 3. PROCESAMIENTO DE REGISTROS DE ESTUDIANTES
                const c0 = fila[0] ? fila[0].trim().toLowerCase() : "";
                if (c0.includes("baja") || c0.includes("preceptor") || c0.includes("orden") || !fila[idxNombre] || fila[idxNombre].trim() === "") {
                    continue;
                }

                const dniRaw = fila[idxDni] ? fila[idxDni].replace(/[^0-9]/g, '').trim() : "";
                if (dniRaw.length < 6) continue;

                const nombreCompleto = fila[idxNombre].replace(/"/g, '').trim();
                if (nombreCompleto.toLowerCase().includes("apellido") || nombreCompleto === "") continue;

                const cuilRaw = idxCuil > -1 ? fila[idxCuil] : "";
                const { cuil, gen } = calcularGeneroyCuil(nombreCompleto, cuilRaw, dniRaw);

                const partes = nombreCompleto.split(',');
                const ap = partes[0] ? partes[0].trim() : "";
                const nom = partes[1] ? partes[1].trim() : nombreCompleto;

                const email = (idxEmail > -1 && fila[idxEmail]) ? fila[idxEmail].trim() : "sin_correo@colegio.edu.ar";
                const telephone = (idxTel > -1 && fila[idxTel]) ? fila[idxTel].replace(/[^0-9]/g, '').trim() : "2964000000";
                const tutor = (idxTutor > -1 && fila[idxTutor]) ? fila[idxTutor].replace(/"/g, '').trim() : "No registrado";
                const dniT = (idxDniTutor > -1 && fila[idxDniTutor]) ? fila[idxDniTutor].replace(/[^0-9]/g, '').trim() : "";
                const cuilTutorRaw = (idxCuilTutor > -1 && fila[idxCuilTutor]) ? fila[idxCuilTutor].replace(/[^0-9]/g, '').trim() : "";
                
                // Deducción inteligente de género y CUIL para el Adulto Responsable
                const { cuil: cuilT, gen: genT } = calcularGeneroyCuil(tutor, cuilTutorRaw, dniT);

                alumnosEnMemoria.push({
                    dni: dniRaw, nombre: `${nom} ${ap}`.trim(), cuil, genero: gen, estado: "Regular", cursoId, cicloLectivo: cicloActivo,
                    email, telefono1: telephone, nombretutor: tutor, dniTutor: dniT, cuilTutor: cuilT, generoTutor: genT,
                    fechaNacimiento: fmtF(fila[idxF_Nac]),
                    lugarNacimiento: "Río Grande", nacionalidad: "Argentina",
                    direccion: (idxDomicilio > -1 && fila[idxDomicilio]) ? fila[idxDomicilio].trim() : "No especificada",
                    documentosDigitales: { dni_alumno: null, partida_nac: null, cert_primaria: null, buena_salud: null, carnet_vacunacion: null, debye: null }
                });


            // 4. PRECARGA CRUZADA PARA LA INTERFAZ FLOTANTE
            document.getElementById('tablaSimulacionBody').innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Validando base de datos en tiempo real...</td></tr>';
            document.getElementById('modalSimulacionCarga').style.display = 'flex';

            const dnisExistentes = new Set();
            try {
                const snapAlumnos = await getDocs(collection(db, 'alumnos'));
                snapAlumnos.forEach(docSnap => dnisExistentes.add(docSnap.id));
            } catch (err) { console.error(err); }

                       // BUSCAR CON CTRL+F: alumnosEnMemoria.forEach(a => {
            let htmlFinal = "";
            alumnosEnMemoria.forEach(a => {
                const existe = dnisExistentes.has(a.dni);
                let badge = '<span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:12px; font-weight:bold;">🟢 Nuevo</span>';
                if (existe) { 
                    badge = '<span style="background:#fef9c3; color:#ca8a04; padding:2px 8px; border-radius:12px; font-weight:bold;">🟡 Modificar</span>'; 
                    cModif++; 
                } else { 
                    cNuevos++; 
                }

                // Parche Estético: Limpieza automática de nombres duplicados para el administrativo
                let nombreLimpioModal = a.nombre || "";
                const palM = nombreLimpioModal.trim().split(/\s+/);
                if (palM.length >= 4) {
                    const mitM = Math.floor(palM.length / 2);
                    if (palM.slice(0, mitM).join(" ").toLowerCase() === palM.slice(mitM).join(" ").toLowerCase()) {
                        nombreLimpioModal = palM.slice(0, mitM).join(" ");
                    }
                }

                htmlFinal += `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: 500;">${a.dni}</td><td style="padding: 10px; font-weight: bold; color:#1e293b;">${nombreLimpioModal}</td><td style="padding: 10px; font-family: monospace; color:#475569;">${a.cuil}</td><td style="padding: 10px; color: #64748b; font-size: 11px;"><b>Tutor:</b> ${a.nombreTutor}<br><b>Mail:</b> ${a.email}</td><td style="padding: 10px; text-align: center;">${badge}</td></tr>`;
     });

    document.getElementById('tablaSimulacionBody').innerHTML = htmlFinal || '<tr><td colspan="5" style="text-align:center; padding:20px;">Sin registros</td></tr>';
    document.getElementById('resumenSimulacion').innerText = `Sección Destino: ${s.options[s.selectedIndex].text} | Detectados: ${alumnosEnMemoria.length} alumnos ready.`;
    reader.readAsText(archivoSeleccionado, 'UTF-8');
};

}

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
        
        // Registro automático en el historial por lote de carga masiva
        if (typeof window.registrarEventoLegajo === 'function') {
            await window.registrarEventoLegajo(a.dni, "MATRICULA", "ALTA_LOTE", `Alta y matriculación digital automatizada mediante procesamiento por lote de archivo Excel.`);
        }
        
        total++;
    }
    alert(`¡Carga masiva finalizada! Se procesaron ${total} legajos digitales con éxito.`);
    cerrarModal();
    if (typeof window.procesarFiltrosYNomina === 'function') window.procesarFiltrosYNomina();
}

window.simularCargaCSV = simularCargaCSV;
window.ejecutarEscrituraFirestore = ejecutarEscrituraFirestore;
}
})();
