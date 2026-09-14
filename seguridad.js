// seguridad.js - Guardián de Inactividad del Colegio HASPEN (10 Minutos)
document.addEventListener("DOMContentLoaded", () => {
  // 1. Leer el usuario activo desde el almacenamiento de sesión
  const datosSesionRaw = sessionStorage.getItem("usuarioActivo");
  let tiempoInactividad = 30 * 60 * 1000; // 30 minutos por defecto (Lectura / Preceptores)

  if (datosSesionRaw) {
    const usuario = JSON.parse(datosSesionRaw);
    // Buscamos si es administrador o si tiene permisos de escritura explícitos
    const esEscritura =
      usuario.role === "admin" || usuario.role === "administrador" || usuario.permisoLegajoReal === "escritura";

    if (esEscritura) {
      tiempoInactividad = 60 * 60 * 1000; // 1 hora para usuarios de Escritura
      console.log("Guardián HASPEN: Modo Escritura detectado. Tiempo fijado en 60 minutos.");
    } else {
      console.log("Guardián HASPEN: Modo Lectura detectado. Tiempo fijado en 30 minutos.");
    }
  } else {
    console.log("Guardián HASPEN: No hay sesión activa. Tiempo preventivo de 30 minutos.");
  }

  let temporizador;

  function reiniciarTemporizador() {
    clearTimeout(temporizador);
    temporizador = setTimeout(cerrarSesionPorInactividad, tiempoInactividad); // 👈 Cambiado a minúsculas
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
