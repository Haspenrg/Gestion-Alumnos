// 1. Inicializamos la base de datos local en LocalStorage si no existe aún
const usuariosSemilla = [
    { dni: "11111111", usuario: "11111111", nombreCompleto: "Administrador General", clave: "1234", rol: "Administrador" },
    { dni: "22222222", usuario: "22222222", nombreCompleto: "Carlos Rodríguez (Preceptor)", clave: "22222222", rol: "Preceptor" },
    { dni: "33333333", usuario: "33333333", nombreCompleto: "Ana Martínez (Directivo)", clave: "33333333", rol: "Directivo" },
    { dni: "44444444", usuario: "44444444", nombreCompleto: "Juan Pérez (Profesor)", clave: "44444444", rol: "Profesor" },
    { dni: "55555555", usuario: "55555555", nombreCompleto: "Marta Gómez (Coordinación)", clave: "55555555", rol: "Coordinación" },
    { dni: "66666666", usuario: "66666666", nombreCompleto: "Luis Sosa (Prosecretario)", clave: "66666666", rol: "Prosecretario" }
];

if (!localStorage.getItem('usuariosColegio')) {
    localStorage.setItem('usuariosColegio', JSON.stringify(usuariosSemilla));
}

// Obtener los usuarios actualizados de la memoria local
function obtenerUsuarios() {
    return JSON.parse(localStorage.getItem('usuariosColegio'));
}

const formulario = document.getElementById('loginForm');
const contenedorMensaje = document.getElementById('mensaje');

// Variables de la Ventana Modal
const modal = document.getElementById('modalRecuperar');
const btnOlvido = document.getElementById('olvido-pass');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnCambiarModal = document.getElementById('btn-cambiar-modal');
const modalMensaje = document.getElementById('modal-mensaje');

// 2. Control del Login tradicional
formulario.addEventListener('submit', function(evento) {
    evento.preventDefault();
    const usuarioIngresado = document.getElementById('usuario').value.trim();
    const claveIngresada = document.getElementById('password').value;

    contenedorMensaje.textContent = "";
    contenedorMensaje.style.color = "red";

    const listaUsuarios = obtenerUsuarios();
    const usuarioEncontrado = listaUsuarios.find(u => u.usuario === usuarioIngresado);

    if (usuarioEncontrado && usuarioEncontrado.clave === claveIngresada) {
        localStorage.setItem('usuarioActivo', JSON.stringify({
            nombre: usuarioEncontrado.nombreCompleto,
            rol: usuarioEncontrado.rol
        }));

        contenedorMensaje.style.color = "green";
        contenedorMensaje.textContent = `¡Acceso concedido! Bienvenido/a ${usuarioEncontrado.nombreCompleto}...`;
        
        setTimeout(() => { window.location.href = "panel.html"; }, 1000);
    } else {
        contenedorMensaje.textContent = "DNI o contraseña incorrectos";
        document.getElementById('password').value = "";
    }
});

// 3. Abrir y Cerrar la Ventana Modal
btnOlvido.addEventListener('click', function(e) {
    e.preventDefault();
    modalMensaje.textContent = ""; 
    document.getElementById('modal-dni').value = "";
    document.getElementById('modal-nueva-clave').value = "";
    modal.classList.add('mostrar-modal');
});

btnCancelarModal.addEventListener('click', function() {
    modal.classList.remove('mostrar-modal');
});

// 4. Lógica para procesar el cambio de contraseña autónomo
btnCambiarModal.addEventListener('click', function() {
    const dniInput = document.getElementById('modal-dni').value.trim();
    const nuevaClaveInput = document.getElementById('modal-nueva-clave').value;

    modalMensaje.textContent = "";
    modalMensaje.style.color = "red";

    if (dniInput === "" || nuevaClaveInput.length < 4) {
        modalMensaje.textContent = "Complete el DNI y use una clave de mínimo 4 caracteres.";
        return;
    }

    let listaUsuarios = obtenerUsuarios();
    const indiceUsuario = listaUsuarios.findIndex(u => u.dni === dniInput);

    if (indiceUsuario !== -1) {
        // Actualizamos la clave del usuario en el array
        listaUsuarios[indiceUsuario].clave = nuevaClaveInput;
        
        // Guardamos los datos actualizados en el LocalStorage
        localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));

        modalMensaje.style.color = "green";
        modalMensaje.textContent = "¡Contraseña actualizada con éxito!";

        // Cerramos el modal automáticamente tras 1.5 segundos
        setTimeout(() => {
            modal.classList.remove('mostrar-modal');
        }, 1500);
    } else {
        modalMensaje.textContent = "El DNI ingresado no corresponde a ningún personal registrado.";
    }
});
