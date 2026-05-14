document.getElementById('rolUsuario').addEventListener('change', function() {
    const rolSeleccionado = this.value;
    const grupoPreceptor = document.getElementById('grupoCursosPreceptor');
    const grupoProfesor = document.getElementById('grupoAsignacionProfesor');

    configurarCamposRequeridos(grupoPreceptor, false);
    configurarCamposRequeridos(grupoProfesor, false);

    grupoPreceptor.style.display = 'none';
    grupoProfesor.style.display = 'none';

    if (rolSeleccionado === 'Preceptor') {
        grupoPreceptor.style.display = 'block';
        configurarCamposRequeridos(grupoPreceptor, true);
    } else if (rolSeleccionado === 'Profesor') {
        grupoProfesor.style.display = 'block';
        configurarCamposRequeridos(grupoProfesor, true);
    }
});

function configurarCamposRequeridos(contenedor, activar) {
    if (!contenedor) return;
    const selectores = contenedor.querySelectorAll('select');
    selectores.forEach(select => {
        if (activar) {
            select.setAttribute('required', 'required');
        } else {
            select.removeAttribute('required');
        }
    });
}

let catedrasTemporales = [];

document.getElementById('btnAgregarCatedra').addEventListener('click', function() {
    const anio = document.getElementById('anioProfesor').value;
    const division = document.getElementById('divProfesor').value;
    const materia = document.getElementById('materiaProfesor').value;
    const listaContenedor = document.getElementById('listaCatedrasProfesor');
    const mensajeVacio = document.getElementById('sinCatedrasMensaje');

    if (!anio || !division || !materia) {
        alert('Por favor, complete Año, División y Materia antes de agregar.');
        return;
    }

    const catedraTexto = `${anio} "${division}" - ${materia}`;

    if (catedrasTemporales.includes(catedraTexto)) {
        alert('Esta cátedra ya fue agregada a la lista.');
        return;
    }

    if (mensajeVacio) mensajeVacio.style.display = 'none';
    catedrasTemporales.push(catedraTexto);

    inyectarCatedraVisual(catedraTexto, listaContenedor);

    document.getElementById('anioProfesor').selectedIndex = 0;
    document.getElementById('divProfesor').selectedIndex = 0;
    document.getElementById('materiaProfesor').selectedIndex = 0;
});

function inyectarCatedraVisual(textoCatedra, contenedor) {
    const tag = document.createElement('div');
    tag.className = 'catedra-tag';
    tag.style.cssText = "background: #e2e8f0; color: #334155; padding: 5px 10px; border-radius: 20px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; border: 1px solid #cbd5e1;";
    tag.innerHTML = `
        <span>${textoCatedra}</span>
        <strong style="color: #ef4444; cursor: pointer; font-size: 14px;" onclick="eliminarCatedraTag(this, '${textoCatedra}')">×</strong>
    `;
    contenedor.appendChild(tag);
}

function eliminarCatedraTag(elementoBoton, textoCatedra) {
    catedrasTemporales = catedrasTemporales.filter(item => item !== textoCatedra);
    elementoBoton.parentElement.remove();

    const listaContenedor = document.getElementById('listaCatedrasProfesor');
    if (catedrasTemporales.length === 0) {
        listaContenedor.innerHTML = '<span style="color: #94a3b8; font-size: 13px;" id="sinCatedrasMensaje">No hay cátedras asignadas aún.</span>';
    }
}

// --- PERSISTENCIA, SELECCIÓN, EDICIÓN EN CALIENTE Y ELIMINACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    inyectarCursosBasePreceptorSemilla();
    renderizarTablaUsuarios();
});

function inyectarCursosBasePreceptorSemilla() {
    let lista = obtenerUsuariosDeAlmacenamiento();
    const indexPrep = lista.findIndex(u => u.dni === "22222222" && !u.cursosAsignados);
    if (indexPrep !== -1) {
        lista[indexPrep].cursosAsignados = ['4º "C"', '1º "A"'];
        localStorage.setItem('usuariosColegio', JSON.stringify(lista));
    }
}

function obtenerUsuariosDeAlmacenamiento() {
    return JSON.parse(localStorage.getItem('usuariosColegio')) || [];
}

function renderizarTablaUsuarios() {
    const listaUsuarios = obtenerUsuariosDeAlmacenamiento();
    const tbody = document.getElementById('tablaUsuariosBody');
    tbody.innerHTML = '';

    listaUsuarios.forEach(usuario => {
        const fila = document.createElement('tr');
        fila.className = 'fila-usuario';
        fila.style.borderBottom = '1px solid #e2e8f0';

        fila.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                cargarUsuarioParaEdicion(usuario.dni);
            }
        });

        let detallesAsignacion = '';
        if (usuario.rol === 'Preceptor') {
            const cursos = usuario.cursosAsignados || ['No asignados', 'No asignados'];
            detallesAsignacion = `<br><small style="color:#1a73e8; font-weight:500;">Cursos a cargo: ${cursos.join(' y ')}</small>`;
        } else if (usuario.rol === 'Profesor' && usuario.catedrasAsignadas) {
            detallesAsignacion = `<br><small style="color:#1a73e8; font-weight:500;">Bolsa de Horas: ${usuario.catedrasAsignadas.length} cátedras asignadas.</small>`;
        }

        fila.innerHTML = `
            <td><strong>${usuario.nombreCompleto}</strong></td>
            <td>${usuario.dni}</td>
            <td>${usuario.email || 'N/C'}</td>
            <td>
                <span class="badge-rol">${usuario.rol}</span>
                ${detallesAsignacion}
            </td>
            <td style="text-align: center;">
                <button onclick="restablecerClaveAlDNI('${usuario.dni}')" class="btn-accion">Restablecer Clave</button>
                <button onclick="eliminarUsuario('${usuario.dni}')" class="btn-accion btn-eliminar">Eliminar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

function cargarUsuarioParaEdicion(dni) {
    const lista = obtenerUsuariosDeAlmacenamiento();
    const usuario = lista.find(u => u.dni === String(dni));

    if (!usuario) return;

    document.getElementById('dniOriginalEdicion').value = usuario.dni;
    document.getElementById('formTitulo').textContent = `Modificar Datos de: ${usuario.nombreCompleto}`;
    document.getElementById('btnGuardarUsuario').textContent = "Actualizar Usuario";
    document.getElementById('btnGuardarUsuario').style.backgroundColor = "#e28743";
    document.getElementById('bannerEdicion').style.display = "block";

    document.getElementById('nombreApellido').value = usuario.nombreCompleto;
    document.getElementById('dniUsuario').value = usuario.dni;
    document.getElementById('emailUsuario').value = usuario.email || '';
    
    const selectRol = document.getElementById('rolUsuario');
    selectRol.value = usuario.rol;
    selectRol.dispatchEvent(new Event('change'));

    if (usuario.rol === 'Preceptor' && usuario.cursosAsignados && usuario.cursosAsignados.length === 2) {
        const partes1 = usuario.cursosAsignados[0].split(' ');
        const partes2 = usuario.cursosAsignados[1].split(' ');

        document.getElementById('altaAnio1').value = partes1[0];
        document.getElementById('altaDiv1').value = partes1[1].replace(/"/g, '');
        document.getElementById('altaAnio2').value = partes2[0];
        document.getElementById('altaDiv2').value = partes2[1].replace(/"/g, '');
    } 
    else if (usuario.rol === 'Profesor' && usuario.catedrasAsignadas) {
        catedrasTemporales = [...usuario.catedrasAsignadas];
        const contenedor = document.getElementById('listaCatedrasProfesor');
        contenedor.innerHTML = '';
        catedrasTemporales.forEach(c => inyectarCatedraVisual(c, contenedor));
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('btnCancelarEdicion').addEventListener('click', resetearFormularioAlEstadoInicial);

function resetearFormularioAlEstadoInicial() {
    document.getElementById('formUsuario').reset();
    document.getElementById('dniOriginalEdicion').value = "";
    document.getElementById('formTitulo').textContent = "Registrar Nuevo Usuario";
    document.getElementById('btnGuardarUsuario').textContent = "Guardar Usuario";
    document.getElementById('btnGuardarUsuario').style.backgroundColor = "#1a73e8";
    document.getElementById('bannerEdicion').style.display = "none";

    catedrasTemporales = [];
    const listaContenedor = document.getElementById('listaCatedrasProfesor');
    if (listaContenedor) {
        listaContenedor.innerHTML = '<span style="color: #94a3b8; font-size: 13px;" id="sinCatedrasMensaje">No hay cátedras asignadas aún.</span>';
    }

    document.getElementById('grupoCursosPreceptor').style.display = 'none';
    document.getElementById('grupoAsignacionProfesor').style.display = 'none';
}

document.getElementById('formUsuario').addEventListener('submit', function(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombreApellido').value.trim();
    const dni = document.getElementById('dniUsuario').value.trim();
    const email = document.getElementById('emailUsuario').value.trim();
    const rol = document.getElementById('rolUsuario').value;
    const dniOriginal = document.getElementById('dniOriginalEdicion').value;

    let listaUsuarios = obtenerUsuariosDeAlmacenamiento();

    if (!dniOriginal && listaUsuarios.some(u => u.dni === dni)) {
        alert('Error: Ya existe un personal registrado con el número de DNI ingresado.');
        return;
    }
    if (dniOriginal && dniOriginal !== dni && listaUsuarios.some(u => u.dni === dni)) {
        alert('Error: El nuevo DNI ya le pertenece a otro usuario registrado.');
        return;
    }

    let datosEspecíficos = {};
    if (rol === 'Preceptor') {
        const ani01 = document.getElementById('altaAnio1').value;
        const div01 = document.getElementById('altaDiv1').value;
        const ani02 = document.getElementById('altaAnio2').value;
        const div02 = document.getElementById('altaDiv2').value;

        if (!ani01 || !div01 || !ani02 || !div02) {
            alert('Por favor, asigne obligatoriamente los 2 cursos requeridos para el rol Preceptor.');
            return;
        }
        datosEspecíficos.cursosAsignados = [`${ani01} "${div01}"`, `${ani02} "${div02}"`];
    } else if (rol === 'Profesor') {
        if (catedrasTemporales.length === 0) {
            alert('Por favor, asigne al menos 1 cátedra en la bolsa de horas para el rol Profesor.');
            return;
        }
        datosEspecíficos.catedrasAsignadas = [...catedrasTemporales];
    }

    if (dniOriginal) {
        const index = listaUsuarios.findIndex(u => u.dni === String(dniOriginal));
        if (index !== -1) {
            listaUsuarios[index].nombreCompleto = nombre;
            listaUsuarios[index].dni = dni;
            listaUsuarios[index].usuario = dni;
            listaUsuarios[index].email = email;
            listaUsuarios[index].rol = rol;
            
            delete listaUsuarios[index].cursosAsignados;
            delete listaUsuarios[index].catedrasAsignadas;

            Object.assign(listaUsuarios[index], datosEspecíficos);
            alert('¡Datos y asignaciones de rol actualizados con éxito!');
        }
    } else {
        let nuevoUsuario = {
            dni: dni,
            usuario: dni,
            nombreCompleto: nombre,
            email: email,
            clave: dni,
            rol: rol,
            ...datosEspecíficos
        };
        listaUsuarios.push(nuevoUsuario);
        alert('¡Usuario guardado con éxito! Su contraseña inicial es su número de DNI.');
    }

    localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));
    resetearFormularioAlEstadoInicial();
    renderizarTablaUsuarios();
});

// FUNCIÓN PARA ELIMINAR REGISTROS CON ADVERTENCIA INSTITUCIONAL
function eliminarUsuario(dniUsuario) {
    // Control de seguridad: Impedir la auto-eliminación del Administrador activo
    const sesionActiva = JSON.parse(localStorage.getItem('usuarioActivo'));
    let listaUsuarios = obtenerUsuariosDeAlmacenamiento();
    const usuarioAEliminar = listaUsuarios.find(u => u.dni === String(dniUsuario));

    if (!usuarioAEliminar) {
        alert('Error: No se pudo localizar el registro del usuario.');
        return;
    }

    if (sesionActiva && usuarioAEliminar.rol === 'Administrador' && usuarioAEliminar.nombreCompleto === sesionActiva.nombre) {
        alert('Acceso Denegado: No puede eliminar su propia cuenta de Administrador General mientras se encuentra en sesión.');
        return;
    }

    const confirmacion = confirm(`⚠️ ADVERTENCIA INSTITUCIONAL:\n¿Está completamente seguro de que desea eliminar permanentemente a "${usuarioAEliminar.nombreCompleto}" (${usuarioAEliminar.rol}) del sistema?\nEsta acción revocaría sus accesos de forma inmediata.`);
    
    if (confirmacion) {
        listaUsuarios = listaUsuarios.filter(u => u.dni !== String(dniUsuario));
        localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));
        
        // Si el usuario eliminado estaba cargado en el formulario superior, limpiamos la pantalla
        const dniOriginalEdicion = document.getElementById('dniOriginalEdicion').value;
        if (dniOriginalEdicion === String(dniUsuario)) {
            resetearFormularioAlEstadoInicial();
        }

        alert('El usuario ha sido eliminado de la base de datos con éxito.');
        renderizarTablaUsuarios();
    }
}

function restablecerClaveAlDNI(dniUsuario) {
    let listaUsuarios = obtenerUsuariosDeAlmacenamiento();
    const indice = listaUsuarios.findIndex(u => u.dni === String(dniUsuario));

    if (indice !== -1) {
        listaUsuarios[indice].clave = listaUsuarios[indice].dni;
        localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));
        alert(`La contraseña de ${listaUsuarios[indice].nombreCompleto} fue restablecida con éxito a su número de DNI (${listaUsuarios[indice].dni}).`);
    }
}
