document.getElementById('rolUsuario').addEventListener('change', function() {
    const rolSeleccionado = this.value;
    const grupoPreceptor = document.getElementById('grupoCursosPreceptor');
    const grupoProfesor = document.getElementById('grupoAsignacionProfesor');

    // Desactivar campos obligatorios por defecto para evitar errores al enviar el formulario
    configurarCamposRequeridos(grupoPreceptor, false);
    configurarCamposRequeridos(grupoProfesor, false);

    // Ocultar paneles por defecto
    grupoPreceptor.style.display = 'none';
    grupoProfesor.style.display = 'none';

    // Mostrar y activar según corresponda según la matriz de roles
    if (rolSeleccionado === 'Preceptor') {
        grupoPreceptor.style.display = 'block';
        configurarCamposRequeridos(grupoPreceptor, true);
    } else if (rolSeleccionado === 'Profesor') {
        grupoProfesor.style.display = 'block';
        configurarCamposRequeridos(grupoProfesor, true);
    }
    // Para 'Coordinación', 'Directivo' y 'Administrador' los paneles permanecen ocultos y limpios
});

// Función auxiliar para activar/desactivar el atributo 'required' dinámicamente
function configurarCamposRequeridos(contenedor, activar) {
    if (!contenedor) return;
    const selectores = contenedor.querySelectorAll('select');
    selectores.forEach(select => {
        if (activar) {
            select.setAttribute('required', 'required');
        } else {
            select.removeAttribute('required');
            select.selectedIndex = 0; // Resetea la opción seleccionada al ocultar
        }
    });
}

// Array para almacenar en memoria temporal las cátedras agregadas antes de guardar el usuario completo
let catedrasTemporales = [];

document.getElementById('btnAgregarCatedra').addEventListener('click', function() {
    const anio = document.getElementById('anioProfesor').value;
    const division = document.getElementById('divProfesor').value;
    const materia = document.getElementById('materiaProfesor').value;
    const listaContenedor = document.getElementById('listaCatedrasProfesor');
    const mensajeVacio = document.getElementById('sinCatedrasMensaje');

    // Validar que se hayan seleccionado los 3 datos obligatorios
    if (!anio || !division || !materia) {
        alert('Por favor, complete Año, División y Materia antes de agregar.');
        return;
    }

    const catedraTexto = `${anio} "${division}" - ${materia}`;

    // Evitar que el administrador ingrese dos veces la misma cátedra idéntica para el mismo docente
    if (catedrasTemporales.includes(catedraTexto)) {
        alert('Esta cátedra ya fue agregada a la lista.');
        return;
    }

    // Ocultar mensaje por defecto si es la primera que agregamos
    if (mensajeVacio) mensajeVacio.style.display = 'none';

    // Registrar en nuestra lista en memoria
    catedrasTemporales.push(catedraTexto);

    // Crear el elemento visual en la pantalla con botón de remover integrado
    const tag = document.createElement('div');
    tag.className = 'catedra-tag';
    tag.style.cssText = "background: #e2e8f0; color: #334155; padding: 5px 10px; border-radius: 20px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; border: 1px solid #cbd5e1;";
    tag.innerHTML = `
        <span>${catedraTexto}</span>
        <strong style="color: #ef4444; cursor: pointer; font-size: 14px;" onclick="eliminarCatedraTag(this, '${catedraTexto}')">×</strong>
    `;

    listaContenedor.appendChild(tag);

    // Resetear los selectores para que queden listos para una nueva carga
    document.getElementById('anioProfesor').selectedIndex = 0;
    document.getElementById('divProfesor').selectedIndex = 0;
    document.getElementById('materiaProfesor').selectedIndex = 0;
});

// Función global auxiliar para eliminar etiquetas de cátedras al hacer clic en la '×'
function eliminarCatedraTag(elementoBoton, textoCatedra) {
    // Remover del array temporal
    catedrasTemporales = catedrasTemporales.filter(item => item !== textoCatedra);
    
    // Remover de la pantalla
    elementoBoton.parentElement.remove();

    // Si la lista quedó completamente vacía, volver a mostrar el mensaje por defecto
    const listaContenedor = document.getElementById('listaCatedrasProfesor');
    if (catedrasTemporales.length === 0) {
        listaContenedor.innerHTML = '<span style="color: #94a3b8; font-size: 13px;" id="sinCatedrasMensaje">No hay cátedras asignadas aún.</span>';
    }
}
