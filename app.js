const formulario = document.getElementById('loginForm');
const contenedorMensaje = document.getElementById('mensaje');

formulario.addEventListener('submit', function(evento) {
    evento.preventDefault();

    // Capturamos valores
    const usuario = document.getElementById('usuario').value.toLowerCase();
    const clave = document.getElementById('password').value;

    // Limpiamos mensajes anteriores
    contenedorMensaje.textContent = "";
    contenedorMensaje.style.color = "red";

    // Validación
    if (usuario === "admin" && clave === "1234") {
        // En lugar de cartel, mensaje de éxito rápido y redirección
        contenedorMensaje.style.color = "green";
        contenedorMensaje.textContent = "¡Acceso concedido! Entrando...";
        
        setTimeout(() => {
            window.location.href = "panel.html";
        }, 1000); // Espera 1 segundo para que el usuario vea el mensaje verde
        
    } else {
        // Si ingresa mal, solo mostramos el texto en rojo
        contenedorMensaje.textContent = "Usuario o contraseña incorrectos";
        
        // Limpiamos solo la contraseña para que intente de nuevo
        document.getElementById('password').value = "";
    }
});

