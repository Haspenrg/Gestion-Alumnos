// 1. Inicializamos la base de datos local si no existe aún (Semillas con soporte Multirrol)
const usuariosSemilla = [
    { dni: "11111111", nombre: "Administrador General", clave: "1234", rol: "Administrador", esProfesor: false },
    { dni: "22222222", nombre: "Carlos Rodríguez (Preceptor)", clave: "22222222", rol: "Preceptor", esProfesor: false },
    { dni: "33333333", nombre: "Ana Martínez (Directivo)", clave: "33333333", rol: "Directivo", esProfesor: false },
    { dni: "44444444", nombre: "Juan Pérez (Profesor)", clave: "44444444", rol: "Profesor", esProfesor: true },
    { dni: "55555555", nombre: "Marta Gómez (Coordinación)", clave: "55555555", rol: "Coordinación", esProfesor: false },
    { dni: "66666666", nombre: "Luis Sosa (Prosecretario)", clave: "66666666", rol: "Prosecretario", esProfesor: false }
];

if (!localStorage.getItem('usuariosColegio')) {
    localStorage.setItem('usuariosColegio', JSON.stringify(usuariosSemilla));
}

// Obtener los usuarios actualizados de la memoria local simbiótica asíncrona
async function obtenerUsuarios() {
    const datos = localStorage.getItem('usuariosColegio');
    return datos ? JSON.parse(datos) : [];
}

const formulario = document.getElementById('loginForm');
const contenedorMensaje = document.getElementById('mensaje');

// Variables de la Ventana Modal
const modal = document.getElementById('modalRecuperar');
const btnOlvido = document.getElementById('olvido-pass');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnCambiarModal = document.getElementById('btn-cambiar-modal');
const modalMensaje = document.getElementById('modal-mensaje');

// ====== PARCHE: VALIDACIÓN DE ACCESO EN VIVO CONTRA FIRESTORE ======
if (formulario) {
    formulario.addEventListener('submit', async function(evento) {
        evento.preventDefault();
        const usuarioIngresado = document.getElementById('usuario').value.trim();
        const claveIngresada = document.getElementById('password').value;

        if (!contenedorMensaje) return;
        contenedorMensaje.textContent = "";
        contenedorMensaje.style.color = "red";

        try {
            // Importación bajo demanda de los módulos necesarios desde la configuración central
            const { db } = await import('./firebase-config.js');
            const { doc, getDoc } = await import('https://gstatic.com');

            // Consulta directa a la colección 'usuarios' usando el DNI ingresado como ID del documento
            const docRef = doc(db, "usuarios", usuarioIngresado);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const datosUsuario = docSnap.data();

                // Validación de la contraseña almacenada en la base de datos
                if (datosUsuario.clave === claveIngresada) {
                    
                    // Inyección y normalización dinámica de los permisos recuperados de la nube
                    const tokenSesion = {
                        nombre: datosUsuario.nombre,
                        rol: datosUsuario.rol,
                        dni: datosUsuario.dni,
                        esProfesor: datosUsuario.esProfesor || false,
                        permisoGestionPeriodos: datosUsuario.permisoGestionPeriodos === true || datosUsuario.permisoGestionPeriodos === "true"
                    };

                    localStorage.setItem('usuarioActivo', JSON.stringify(tokenSesion));
                    
                    contenedorMensaje.style.color = "green";
                    contenedorMensaje.textContent = `¡Acceso en vivo concedido! Bienvenido/a ${datosUsuario.nombre}...`;
                    
                    setTimeout(() => {
                        window.location.href = "panel.html";
                    }, 1000);
                    return;
                }
            }
            
            // Mensaje de error genérico unificado por seguridad
            contenedorMensaje.textContent = "DNI o contraseña incorrectos";
            const passInput = document.getElementById('password');
            if (passInput) passInput.value = "";

        } catch (error) {
            console.error("Error en la conexión viva de autenticación con Firestore:", error);
            contenedorMensaje.textContent = "Error de conexión: No se pudo verificar sus credenciales en la nube.";
        }
    });
}
// ==================================================================


// 3. Abrir y Cerrar la Ventana Modal Autónoma
if (btnOlvido) {
    btnOlvido.addEventListener('click', function(e) {
        e.preventDefault();
        if (modalMensaje) modalMensaje.textContent = "";
        
        const modalDni = document.getElementById('modal-dni');
        const modalClave = document.getElementById('modal-nueva-clave');
        
        if (modalDni) modalDni.value = "";
        if (modalClave) modalClave.value = "";
        if (modal) modal.classList.add('mostrar-modal');
    });
}

if (btnCancelarModal) {
    btnCancelarModal.addEventListener('click', function() {
        if (modal) modal.classList.remove('mostrar-modal');
    });
}

// 4. Lógica Asíncrona para procesar el Cambio de Contraseña en Caliente
if (btnCambiarModal) {
    btnCambiarModal.addEventListener('click', async function() {
        const dniInput = document.getElementById('modal-dni').value.trim();
        const nuevaClaveInput = document.getElementById('modal-nueva-clave').value;
        
        if (!modalMensaje) return;
        modalMensaje.textContent = "";
        modalMensaje.style.color = "red";

        if (dniInput === "" || nuevaClaveInput.length < 4) {
            modalMensaje.textContent = "Complete el DNI y use una clave de mínimo 4 caracteres.";
            return;
        }

        let listaUsuarios = await obtenerUsuarios();
        const indiceUsuario = listaUsuarios.findIndex(u => u.dni === dniInput);

        if (indiceUsuario !== -1) {
            // Actualizamos la clave del usuario en el array mutable
            listaUsuarios[indiceUsuario].clave = nuevaClaveInput;
            
            // Guardamos los datos actualizados de forma asíncrona simulada
            localStorage.setItem('usuariosColegio', JSON.stringify(listaUsuarios));
            
            modalMensaje.style.color = "green";
            modalMensaje.textContent = "¡Contraseña actualizada con éxito!";
            
            setTimeout(() => {
                if (modal) modal.classList.remove('mostrar-modal');
            }, 1500);
        } else {
            modalMensaje.textContent = "El DNI ingresado no corresponde a ningún personal registrado.";
        }
    });
}
