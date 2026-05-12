// 1. Seleccionamos el formulario del HTML
const formulario = document.getElementById('loginForm');

// 2. Escuchamos cuando el usuario haga clic en el botón de ingresar
formulario.addEventListener('submit', function(evento) {
    
    // Evitamos que la página se refresque (comportamiento por defecto)
    evento.preventDefault();

    // 3. Capturamos los datos que escribió el usuario
    const usuario = document.getElementById('usuario').value;
    const clave = document.getElementById('password').value;

    // 4. Lógica de prueba (Simulación)
    // Por ahora, vamos a validar con un usuario de prueba
    if (usuario === "admin" && clave === "1234") {
        alert("¡Bienvenido al Sistema del Colegio HASPEN, Administrador!");
        
        // Aquí es donde luego lo mandaremos al panel principal
        // window.location.href = "panel.html"; 
        
    } else {
        alert("Usuario o contraseña incorrectos. Intentá de nuevo.");
    }
});
