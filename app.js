// 1. Inicializamos la base de datos local si no existe aún (Semillas con soporte Multirrol)
// 1. Inicializamos la base de datos local si no existe aún (Solo Administrador de Resguardo)
const usuariosSemilla = [
  { dni: "11111111", nombre: "Administrador General", clave: "1234", rol: "Administrador", esProfesor: false }
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

// ====== PARCHE: CONTROL UNIFICADO EN INDEX.HTML ======
if (formulario) {
    console.log("Módulo de autenticación unificado activo en la interfaz index.html");
}



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
