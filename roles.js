// Asegurar aislamiento del contexto global y evitar colisiones
(function() {
    'use strict';

    // Elementos del DOM del nuevo diseño widescreen
    const formRol = document.getElementById('formRol');
    const nombreRolInput = document.getElementById('nombreRol');
    const editRolIdInput = document.getElementById('editRolId');
    const tablaRolesBody = document.getElementById('tablaRolesBody');
    const bannerEdicion = document.getElementById('bannerEdicion');
    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
    const formTitulo = document.getElementById('formTitulo');
    const btnGuardar = document.getElementById('btnGuardar');

    // Checkboxes y Selects de la matriz de permisos
    const pUsuarios = document.getElementById('pUsuarios');
    const pPlanes = document.getElementById('pPlanes');
    const pCalificaciones = document.getElementById('pCalificaciones');
    const pAsistencia = document.getElementById('pAsistencia'); // Vinculado a Control de Previas
    const pReportes = document.getElementById('pReportes');
    const pLegajo = document.getElementById('pLegajo');

    // Inicialización asíncrona segura del módulo
    document.addEventListener('DOMContentLoaded', async () => {
        ocultarBannerEdicion();
        await verificarSessionAdministrador();
        await inicializarSemillaRoles();
        await cargarTablaRoles();
    });

    // Control estricto de acceso en cliente neutralizando mayúsculas/minúsculas
    async function verificarSessionAdministrador() {
        try {
            const sesionRaw = localStorage.getItem('usuarioActivo');
            if (!sesionRaw) throw new Error('Sin sesión activa en la plataforma.');
            
            const usuario = JSON.parse(sesionRaw);
            const rolNormalizado = usuario.rol.toLowerCase().trim();
            
            if (rolNormalizado !== 'administrador') {
                alert('Acceso denegado: Solo el Administrator general posee credenciales para gestionar perfiles.');
                window.location.href = 'panel.html';
                return;
            }
        } catch (error) {
            console.error("Fallo de autenticación en módulo:", error);
            window.location.href = 'index.html';
        }
    }

    // Inyección de Semilla Base de roles (CORREGIDO: Clave unificada a controlPrevias, cero asistencia)
    async function inicializarSemillaRoles() {
        try {
            if (!localStorage.getItem('rolesColegio')) {
                const rolesSemilla = [
                    {
                        id: "administrador",
                        nombre: "Administrador",
                        permisos: { configuracionUsuarios: "acceso", planesEstudio: "acceso", legajoDigital: "acceso", libroCalificaciones: "acceso", controlPrevias: "acceso", reportesEstadisticas: "acceso" }
                    },
                    {
                        id: "directivo",
                        nombre: "Directivo",
                        permisos: { configuracionUsuarios: "bloqueado", planesEstudio: "acceso", legajoDigital: "acceso", libroCalificaciones: "acceso", controlPrevias: "acceso", reportesEstadisticas: "acceso" }
                    },
                    {
                        id: "coordinacion",
                        nombre: "Coordinación",
                        permisos: { configuracionUsuarios: "bloqueado", planesEstudio: "acceso", legajoDigital: "acceso", libroCalificaciones: "acceso", controlPrevias: "acceso", reportesEstadisticas: "acceso" }
                    },
                    {
                        id: "preceptor",
                        nombre: "Preceptor",
                        permisos: { configuracionUsuarios: "bloqueado", planesEstudio: "bloqueado", legajoDigital: "solo-vista-filtrado", libroCalificaciones: "acceso", controlPrevias: "acceso", reportesEstadisticas: "bloqueado" }
                    },
                    {
                        id: "profesor",
                        nombre: "Profesor",
                        permisos: { configuracionUsuarios: "bloqueado", planesEstudio: "bloqueado", legajoDigital: "bloqueado", libroCalificaciones: "acceso", controlPrevias: "acceso", reportesEstadisticas: "bloqueado" }
                    }
                ];
                localStorage.setItem('rolesColegio', JSON.stringify(rolesSemilla));
            }
        } catch (error) {
            console.error("Error al inyectar semilla base de roles:", error);
        }
    }

    // Sanitización estricta para generar los identificadores únicos (IDs)
    function sanitizarIdRol(nombre) {
        return nombre.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remueve tildes de forma limpia
            .replace(/[^a-z0-9\s-]/g, "")    // Remueve caracteres especiales
            .trim()
            .replace(/\s+/g, "-");           // Transforma espacios en guiones comunes
    }

    // Operación de lectura asíncrona simulada
    async function obtenerRoles() {
        try {
            return JSON.parse(localStorage.getItem('rolesColegio')) || [];
        } catch (error) {
            console.error("Error al leer roles de la persistencia:", error);
            return [];
        }
    }

    // Operación de escritura asíncrona con control robusto contra fallos de almacenamiento
    async function guardarRoles(roles) {
        try {
            localStorage.setItem('rolesColegio', JSON.stringify(roles));
            return true;
        } catch (error) {
            console.error("Error al escribir roles en almacenamiento local:", error);
            alert("Error crítico: El almacenamiento local está lleno o deshabilitado.");
            return false;
        }
    }

    // Renderizado estructurado y atómico de las filas de la tabla masiva
    async function cargarTablaRoles() {
        const roles = await obtenerRoles();
        tablaRolesBody.textContent = ''; // Sanitización preventiva de nodos hijos previos
        
        roles.forEach(rol => {
            const tr = document.createElement('tr');
            tr.className = 'fila-rol';
            
            const tdNombre = document.createElement('td');
            tdNombre.textContent = rol.nombre;
            tdNombre.style.fontWeight = '600';
            
            const tdId = document.createElement('td');
            tdId.textContent = rol.id;
            tdId.style.color = '#64748b';
            
            const tdPermisos = document.createElement('td');
            const divContenedor = document.createElement('div');
            divContenedor.className = 'contenedor-badges-roles';
            
            // Mapeo e inyección de los bloques en formato horizontal compacto (Texto unificado a Previas)
            divContenedor.appendChild(crearBadgeVisual('Usuarios', rol.permisos.configuracionUsuarios));
            divContenedor.appendChild(crearBadgeVisual('Planes', rol.permisos.planesEstudio));
            divContenedor.appendChild(crearBadgeVisual('Notas', rol.permisos.libroCalificaciones));
            divContenedor.appendChild(crearBadgeVisual('Previas', rol.permisos.controlPrevias));
            divContenedor.appendChild(crearBadgeVisual('Informes', rol.permisos.reportesEstadisticas));
            divContenedor.appendChild(crearBadgeVisual('Legajos', rol.permisos.legajoDigital));
            tdPermisos.appendChild(divContenedor);
            
            const tdAcciones = document.createElement('td');
            tdAcciones.style.textAlign = 'center';
            
            // Bloqueo estricto de edición para salvaguardar el acceso del operador raíz
            if (rol.id === 'administrador') {
                tdAcciones.textContent = 'Inmutable';
                tdAcciones.style.color = '#dc2626';
                tdAcciones.style.fontWeight = 'bold';
                tdAcciones.style.fontSize = '13px';
            } else {
                const btnEditar = document.createElement('button');
                btnEditar.type = 'button';
                btnEditar.className = 'btn-accion-editar';
                btnEditar.textContent = 'Editar';
                btnEditar.addEventListener('click', () => prepararEdicionRol(rol));
                
                const btnEliminar = document.createElement('button');
                btnEliminar.type = 'button';
                btnEliminar.className = 'btn-accion-eliminar';
                btnEliminar.textContent = 'Eliminar';
                btnEliminar.addEventListener('click', () => eliminarRolSistema(rol.id));
                
                tdAcciones.appendChild(btnEditar);
                tdAcciones.appendChild(btnEliminar);
            }
            
            tr.appendChild(tdNombre);
            tr.appendChild(tdId);
            tr.appendChild(tdPermisos);
            tr.appendChild(tdAcciones);
            tablaRolesBody.appendChild(tr);
        });
    }

    // Creador dinámico de etiquetas de estado asociadas a los estilos nativos
    function crearBadgeVisual(nombreModulo, estadoPermiso) {
        const span = document.createElement('span');
        span.className = 'badge-permiso-sistema ';
        
        if (estadoPermiso === 'acceso') {
            span.className += 'badge-activo';
            span.textContent = `${nombreModulo}: Habilitado`;
        } else if (estadoPermiso === 'bloqueado') {
            span.className += 'badge-denegado';
            span.textContent = `${nombreModulo}: Bloqueado`;
        } else {
            span.className += 'badge-vista';
            span.textContent = `${nombreModulo}: Solo Vista`;
        }
        return span;
    }

    // Envío y procesamiento unificado del formulario (Alta / Modificación)
    formRol.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreTexto = nombreRolInput.value.trim();
        
        if (!nombreTexto) {
            alert('Por favor, asigne un nombre válido al perfil.');
            return;
        }
        
        const idDestino = editRolIdInput.value || sanitizarIdRol(nombreTexto);
        let listaRoles = await obtenerRoles();
        
        // Control de duplicados estricto en modo creación
        if (!editRolIdInput.value && listaRoles.some(r => r.id === idDestino)) {
            alert('Error operativo: Ya existe un perfil registrado con un identificador de control equivalente.');
            return;
        }
        
        const estructuraNuevoRol = {
            id: idDestino,
            nombre: nombreTexto,
            permisos: {
                configuracionUsuarios: pUsuarios.checked ? 'acceso' : 'bloqueado',
                planesEstudio: pPlanes.checked ? 'acceso' : 'bloqueado',
                libroCalificaciones: pCalificaciones.checked ? 'acceso' : 'bloqueado',
                controlPrevias: pAsistencia.checked ? 'acceso' : 'bloqueado',
                reportesEstadisticas: pReportes.checked ? 'acceso' : 'bloqueado',
                legajoDigital: pLegajo.value
            }
        };
        
        if (editRolIdInput.value) {
            // Reemplazo en caliente por coincidencia de ID en modo edición
            listaRoles = listaRoles.map(r => r.id === idDestino ? estructuraNuevoRol : r);
        } else {
            // Adición directa en altas
            listaRoles.push(estructuraNuevoRol);
        }
        
        if (await guardarRoles(listaRoles)) {
            restaurarEstadoFormulario();
            await cargarTablaRoles();
        }
    });

    // Carga de datos del rol en los campos superiores para modificación
    function prepararEdicionRol(rol) {
        formTitulo.textContent = `Modificar Permisos: ${rol.nombre}`;
        nombreRolInput.value = rol.nombre;
        nombreRolInput.disabled = true; // Inmutabilidad del ID clave para proteger relacionales
        editRolIdInput.value = rol.id;
        
        pUsuarios.checked = rol.permisos.configuracionUsuarios === 'acceso';
        pPlanes.checked = rol.permisos.planesEstudio === 'acceso';
        pCalificaciones.checked = rol.permisos.libroCalificaciones === 'acceso';
        pAsistencia.checked = rol.permisos.controlPrevias === 'acceso';
        pReportes.checked = rol.permisos.reportesEstadisticas === 'acceso';
        pLegajo.value = rol.permisos.legajoDigital;
        
        bannerEdicion.style.display = 'block';
        btnGuardar.textContent = 'Actualizar Rol';
    }

    // Remoción física del rol de la base de datos local
    async function eliminarRolSistema(id) {
        if (confirm('¿Está seguro de que desea eliminar este perfil? Los usuarios vinculados perderán sus configuraciones de acceso.')) {
            let listaRoles = await obtenerRoles();
            listaRoles = listaRoles.filter(r => r.id !== id);
            if (await guardarRoles(listaRoles)) {
                await cargarTablaRoles();
            }
        }
    }

    function restaurarEstadoFormulario() {
        formTitulo.textContent = "Crear Nuevo Perfil / Rol";
        formRol.reset();
        nombreRolInput.disabled = false;
        editRolIdInput.value = '';
        ocultarBannerEdicion();
        btnGuardar.textContent = 'Guardar Rol';
    }

    function ocultarBannerEdicion() {
        if (bannerEdicion) {
            bannerEdicion.style.display = 'none';
        }
    }

    btnCancelarEdicion.addEventListener('click', restaurarEstadoFormulario);
})();
