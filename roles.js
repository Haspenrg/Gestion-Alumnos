(function() {
    'use strict';

    // Elementos de control de la interfaz de usuario
    const formRol = document.getElementById('formRol');
    const nombreRolInput = document.getElementById('nombreRol');
    const editRolId = document.getElementById('editRolId');
    const formTitulo = document.getElementById('formTitulo');
    const btnGuardar = document.getElementById('btnGuardar');
    const bannerEdicion = document.getElementById('bannerEdicion');
    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
    const tablaRolesBody = document.getElementById('tablaRolesBody');

    // Elementos de la matriz de selectores de tres niveles
    const pLegajo = document.getElementById('pLegajo');
    const pUsuarios = document.getElementById('pUsuarios');
    const pPlanes = document.getElementById('pPlanes');
    const pCalificaciones = document.getElementById('pCalificaciones');
    const pAsistencia = document.getElementById('pAsistencia'); // Vinculado a la celda de Control de Previas
    const pReportes = document.getElementById('pReportes');

    // Escuchador principal de arranque del módulo
    document.addEventListener('DOMContentLoaded', async () => {
        await verificarAutenticacionAdmin();
        await inicializarSemillaRoles();
        await cargarTablaRoles();

        if (btnCancelarEdicion) {
            btnCancelarEdicion.addEventListener('click', restaurarEstadoFormulario);
        }
    });

    // --- PROTECCIÓN COERCITIVA RBAC PARA LA VISTA DE ROLES ---
    async function verificarAutenticacionAdmin() {
        const datosSesion = localStorage.getItem('usuarioActivo');
        if (!datosSesion) {
            window.location.href = "index.html";
            return;
        }
        const usuario = JSON.parse(datosSesion);
        if (usuario.rol.toLowerCase().trim() !== "administrador") {
            alert("Acceso denegado: Este módulo de configuración crítica de seguridad es exclusivo del Administrador.");
            window.location.href = "panel.html";
        }
    }

    // --- SEMILLA DE INICIALIZACIÓN CON SOPORTE DE TRES NIVELES ---
    async function inicializarSemillaRoles() {
        if (!localStorage.getItem('rolesColegio')) {
            const rolesSemilla = [
                {
                    id: "administrador",
                    nombre: "Administrador General",
                    permisos: {
                        configuracionUsuarios: "escritura",
                        planesEstudio: "escritura",
                        legajoDigital: "escritura",
                        libroCalificaciones: "escritura",
                        controlPrevias: "escritura", // Unificado con la clave estructural
                        reportesEstadisticas: "escritura"
                    }
                },
                {
                    id: "preceptor",
                    nombre: "Preceptor Escolar",
                    permisos: {
                        configuracionUsuarios: "ninguno",
                        planesEstudio: "ninguno",
                        legajoDigital: "lectura", 
                        libroCalificaciones: "lectura", 
                        controlPrevias: "escritura", 
                        reportesEstadisticas: "ninguno"
                    }
                },
                {
                    id: "profesor",
                    nombre: "Profesor de Cátedra",
                    permisos: {
                        configuracionUsuarios: "ninguno",
                        planesEstudio: "ninguno",
                        legajoDigital: "ninguno",
                        libroCalificaciones: "escritura", 
                        controlPrevias: "ninguno",
                        reportesEstadisticas: "ninguno"
                    }
                },
                {
                    id: "directivo",
                    nombre: "Equipo Directivo",
                    permisos: {
                        configuracionUsuarios: "lectura",
                        planesEstudio: "lectura",
                        legajoDigital: "lectura",
                        libroCalificaciones: "lectura",
                        controlPrevias: "lectura",
                        reportesEstadisticas: "escritura"
                    }
                }
            ];
            localStorage.setItem('rolesColegio', JSON.stringify(rolesSemilla));
        }
    }

    // --- FUNCIONES AUXILIARES DE PERSISTENCIA LOCAL ---
    function sanitizarIdRol(nombre) {
        return nombre.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-z0-9]/g, "-")      
            .replace(/-+/g, "-")             
            .trim();
    }

    async function obtenerRolesDesdeStorage() {
        try {
            const data = localStorage.getItem('rolesColegio');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Error al leer roles de la base de datos local:", error);
            return [];
        }
    }

    async function guardarRolesEnStorage(arrayRoles) {
        try {
            localStorage.setItem('rolesColegio', JSON.stringify(arrayRoles));
            return true;
        } catch (error) {
            console.error("Error al persistir la matriz de roles:", error);
            return false;
        }
    }

    // --- CONSTRUCCIÓN REACTIVA DEL SPREADSHEET DE ROLES ---
    async function cargarTablaRoles() {
        if (!tablaRolesBody) return;
        tablaRolesBody.innerHTML = "";

        const listaRoles = await obtenerRolesDesdeStorage();

        listaRoles.forEach(rol => {
            const tr = document.createElement('tr');
            tr.className = "fila-rol";
            
            let contenedorBadgesHTML = '<div class="contenedor-badges-roles">';
            const p = rol.permisos || {};

            contenedorBadgesHTML += crearBadgeVisual("Usuarios", p.configuracionUsuarios);
            contenedorBadgesHTML += crearBadgeVisual("Planes", p.planesEstudio);
            contenedorBadgesHTML += crearBadgeVisual("Alumnos", p.legajoDigital);
            contenedorBadgesHTML += crearBadgeVisual("Notas", p.libroCalificaciones);
            contenedorBadgesHTML += crearBadgeVisual("Previas", p.controlPrevias); // Corregida vinculación de mapeo
            contenedorBadgesHTML += crearBadgeVisual("Estadísticas", p.reportesEstadisticas);
            contenedorBadgesHTML += '</div>';

            let botonesAccionesHTML = "";
            if (rol.id === "administrador") {
                botonesAccionesHTML = `<span style="color:#94a3b8; font-style:italic; font-size:13px;">Sistema Protegido</span>`;
            } else {
                botonesAccionesHTML = `
                    <button type="button" class="btn-accion-editar" data-id="${rol.id}">Editar</button>
                    <button type="button" class="btn-accion-eliminar" data-id="${rol.id}">Eliminar</button>
                `;
            }

            tr.innerHTML = `
                <td style="font-weight: 600; color: #1e293b;">${rol.nombre}</td>
                <td style="font-family: monospace; color: #64748b; font-size: 13px;">${rol.id}</td>
                <td>${contenedorBadgesHTML}</td>
                <td style="text-align: center;">${botonesAccionesHTML}</td>
            `;

            tablaRolesBody.appendChild(tr);
        });

        asociarEventosBotonesAccion();
    }

    function crearBadgeVisual(nombreModulo, nivelPermiso) {
        let claseBadge = "badge-ninguno";
        let textoNivel = "Ninguno";

        const estadoNormalizado = String(nivelPermiso).toLowerCase().trim();

        if (estadoNormalizado === "escritura" || estadoNormalizado === "acceso") {
            claseBadge = "badge-escritura";
            textoNivel = "Escritura";
        } else if (estadoNormalizado === "lectura" || estadoNormalizado === "solo-vista-filtrado") {
            claseBadge = "badge-lectura";
            textoNivel = "Lectura";
        } else {
            claseBadge = "badge-ninguno";
            textoNivel = "Ninguno";
        }

        return `<span class="badge-permiso-sistema ${claseBadge}"><strong>${nombreModulo}:</strong> ${textoNivel}</span>`;
    }

    function asociarEventosBotonesAccion() {
        const botonesEditar = document.querySelectorAll('.btn-accion-editar');
        botonesEditar.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idRol = e.target.getAttribute('data-id');
                const roles = await obtenerRolesDesdeStorage();
                const rolEncontrado = roles.find(r => r.id === idRol);
                if (rolEncontrado) {
                    prepararEdicionRol(rolEncontrado);
                }
            });
        });

        const botonesEliminar = document.querySelectorAll('.btn-accion-eliminar');
        botonesEliminar.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idRol = e.target.getAttribute('data-id');
                if (confirm(`¿Está completamente seguro de que desea eliminar el perfil [${idRol}]?\nEsta acción revocará el ingreso inmediato a todos los usuarios vinculados a este cargo.`)) {
                    await eliminarRolSistema(idRol);
                }
            });
        });
    }

    // --- PROCESAMIENTO GENERAL DEL FORMULARIO DE ALTA Y EDICIÓN ---
    formRol.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = nombreRolInput.value.trim();
        const idEditar = editRolId.value;
        let listaRoles = await obtenerRolesDesdeStorage();

        // Mapeo unificado usando la clave estandarizada controlPrevias
        const estructuraPermisosMapeada = {
            configuracionUsuarios: pUsuarios.value,
            planesEstudio: pPlanes.value,
            legajoDigital: pLegajo.value,
            libroCalificaciones: pCalificaciones.value,
            controlPrevias: pAsistencia.value, // Captura desde el select pAsistencia y guarda como controlPrevias
            reportesEstadisticas: pReportes.value
        };

        if (idEditar !== "") {
            listaRoles = listaRoles.map(rol => {
                if (rol.id === idEditar) {
                    return {
                        ...rol,
                        nombre: nombre,
                        permisos: estructuraPermisosMapeada
                    };
                }
                return rol;
            });
            alert("Perfil de seguridad actualizado y sincronizado en la matriz RBAC.");
        } else {
            const idNuevo = sanitizarIdRol(nombre);

            if (listaRoles.some(r => r.id === idNuevo)) {
                alert("Error de duplicación: Ya existe un perfil registrado con un nombre idéntico o identificador equivalente.");
                return;
            }

            const nuevoRolEstructura = {
                id: idNuevo,
                nombre: nombre,
                permisos: estructuraPermisosMapeada
            };

            listaRoles.push(nuevoRolEstructura);
            alert("Nuevo rol institucional incorporado con éxito a la base de datos local.");
        }

        const guardadoExitoso = await guardarRolesEnStorage(listaRoles);
        if (guardadoExitoso) {
            restaurarEstadoFormulario();
            await cargarTablaRoles();
        }
    });

    // --- ENTRADA AL MODO EDICIÓN EN CALIENTE ---
    function prepararEdicionRol(rol) {
        formTitulo.textContent = `Modificar Perfil: ${rol.nombre}`;
        btnGuardar.textContent = "Actualizar Permisos";
        editRolId.value = rol.id;
        nombreRolInput.value = rol.nombre;
        if (bannerEdicion) bannerEdicion.style.display = "block";

        const p = rol.permisos || {};
        
        // Conversor seguro adaptado a la clave de controlPrevias
        pLegajo.value = (p.legajoDigital === "acceso" ? "escritura" : (p.legajoDigital === "solo-vista-filtrado" ? "lectura" : p.legajoDigital)) || "ninguno";
        pUsuarios.value = (p.configuracionUsuarios === "acceso" ? "escritura" : p.configuracionUsuarios) || "ninguno";
        pPlanes.value = (p.planesEstudio === "acceso" ? "escritura" : p.planesEstudio) || "ninguno";
        pCalificaciones.value = (p.libroCalificaciones === "acceso" ? "escritura" : p.libroCalificaciones) || "ninguno";
        pAsistencia.value = (p.controlPrevias === "acceso" ? "escritura" : p.controlPrevias) || "ninguno"; // Mapeo correcto hacia el select pAsistencia
        pReportes.value = (p.reportesEstadisticas === "acceso" ? "escritura" : p.reportesEstadisticas) || "ninguno";

        formRol.scrollIntoView({ behavior: 'smooth' });
    }

    // --- CONTROL DE ELIMINACIÓN DE REGISTROS ---
    async function eliminarRolSistema(id) {
        let listaRoles = await obtenerRolesDesdeStorage();
        listaRoles = listaRoles.filter(rol => rol.id !== id);
        
        const guardadoExitoso = await guardarRolesEnStorage(listaRoles);
        if (guardadoExitoso) {
            alert("El perfil ha sido removido de la planta de seguridad con éxito.");
            restaurarEstadoFormulario();
            await cargarTablaRoles();
        }
    }

    // --- LIMPIEZA Y RESTAURACIÓN DE CONTEXTOS ---
    function restaurarEstadoFormulario() {
        formTitulo.textContent = "Crear Nuevo Perfil / Rol";
        btnGuardar.textContent = "Guardar Rol";
        editRolId.value = "";
        formRol.reset();
        
        if (bannerEdicion) bannerEdicion.style.display = "none";

        pLegajo.value = "ninguno";
        pUsuarios.value = "ninguno";
        pPlanes.value = "ninguno";
        pCalificaciones.value = "ninguno";
        pAsistencia.value = "ninguno";
        pReportes.value = "ninguno";
    }
})();
