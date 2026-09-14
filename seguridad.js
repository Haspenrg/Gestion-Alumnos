// seguridad.js - Guardián de Inactividad del Colegio HASPEN (10 Minutos)
document.addEventListener("DOMContentLoaded", () => {
  // 10 minutos expresados en milisegundos
  const TIEMPO_INACTIVIDAD = 10 * 60 * 1000;
  let temporizador;

  // Función que estira el tiempo si el usuario está activo
  function reiniciarTemporizador() {
    clearTimeout(temporizador);
    temporizador = setTimeout(cerrarSesionPorInactividad, TIEMPO_INACTIVIDAD);
  }

  // Función que se ejecuta si pasan los 10 minutos sin tocar nada
  function cerrarSesionPorInactividad() {
    console.log("Sistema HASPEN: Sesión cerrada por inactividad del operador.");

    // Borramos los datos del usuario de la pestaña actual
    sessionStorage.removeItem("usuarioActivo");

    // Mandamos al usuario directo al login
    window.location.href = "index.html?motivo=inactividad";
  }

  // Lista de acciones que demuestran que el usuario sigue frente a la PC
  const eventos = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
  eventos.forEach((evento) => {
    document.addEventListener(evento, reiniciarTemporizador, true);
  });

  // El reloj empieza a contar apenas se carga la página
  reiniciarTemporizador();
});
