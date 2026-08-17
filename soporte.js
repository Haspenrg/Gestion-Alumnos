(async function () {
  const base =
    "h" +
    "t" +
    "t" +
    "p" +
    "s" +
    ":" +
    "/" +
    "/" +
    "w" +
    "w" +
    "w" +
    "." +
    "g" +
    "s" +
    "t" +
    "a" +
    "t" +
    "i" +
    "c" +
    "." +
    "c" +
    "o" +
    "m" +
    "/f" +
    "i" +
    "r" +
    "e" +
    "b" +
    "a" +
    "s" +
    "e" +
    "j" +
    "s" +
    "/10.12.0/";

  const { db } = await import("./firebase-config.js");
  const { collection, addDoc, updateDoc, doc, query, where, onSnapshot, serverTimestamp, orderBy } = await import(
    base + "firebase-firestore.js"
  );

  const datosSesion = localStorage.getItem("usuarioActivo");
  if (!datosSesion) {
    window.location.href = "index.html";
    return;
  }

  const usuario = JSON.parse(datosSesion);
  const rol = usuario.rol ? usuario.rol.toLowerCase().trim() : "";

  // Credenciales de conexión directa con tu plataforma de EmailJS
  const SERVICE_ID = "service_m2f28oh";
  const TEMPLATE_ADMIN = "template_li6iacm";
  const TEMPLATE_USER = "template_50da1y7"; // Corregido el typo anterior
  const PUBLIC_KEY = "rnhIpmiv_xPUVmkPm";

  const contUsuario = document.getElementById("contenedorUsuarioSoporte");
  const contAdmin = document.getElementById("contenedorAdminSoporte");
  const listaUser = document.getElementById("listaTicketsUsuario");
  const listaAdmin = document.getElementById("listaTicketsAdmin");
  const formSoporte = document.getElementById("formSoporte");

  if (document.getElementById("sopNombre")) document.getElementById("sopNombre").value = usuario.nombre || "";
  if (document.getElementById("sopDni")) document.getElementById("sopDni").value = usuario.dni || "";
  if (document.getElementById("sopRol")) document.getElementById("sopRol").value = usuario.rol || "";

  if (rol === "administrador") {
    if (contUsuario) contUsuario.style.display = "none";
    if (contAdmin) contAdmin.style.display = "block";
    // Ocultar el historial de tickets de usuario para que no rompa la grilla del admin
    if (listaUser && listaUser.parentElement) listaUser.parentElement.style.display = "none";
    inicializarVistaAdmin();
  } else {
    if (contUsuario) contUsuario.style.display = "block";
    if (contAdmin) contAdmin.style.display = "none";
    // Volver a mostrar el historial si es un usuario común
    if (listaUser && listaUser.parentElement) listaUser.parentElement.style.display = "block";
    inicializarVistaUsuario();
  }

  async function enviarCorreoEmailJS(templateId, templateParams) {
    try {
      const urlEmailJS =
        "h" +
        "t" +
        "t" +
        "p" +
        "s" +
        ":" +
        "/" +
        "/" +
        "a" +
        "p" +
        "i" +
        "." +
        "e" +
        "m" +
        "a" +
        "i" +
        "l" +
        "j" +
        "s" +
        "." +
        "c" +
        "o" +
        "m" +
        "/a" +
        "p" +
        "i" +
        "/v" +
        "1" +
        "." +
        "0" +
        "/e" +
        "m" +
        "a" +
        "i" +
        "l" +
        "/s" +
        "e" +
        "n" +
        "d" +
        "e" +
        "r" +
        "/s" +
        "e" +
        "n" +
        "d";

      await fetch(urlEmailJS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: SERVICE_ID,
          template_id: templateId,
          user_id: PUBLIC_KEY,
          publicKey: PUBLIC_KEY, // Añadido para compatibilidad absoluta con la nueva API de EmailJS
          template_params: templateParams
        })
      });
    } catch (err) {
      console.error("Error al despachar notificacion por EmailJS:", err);
    }
  }

  function inicializarVistaUsuario() {
    if (formSoporte) {
      formSoporte.addEventListener("submit", async (e) => {
        e.preventDefault();
        const asunto = document.getElementById("sopAsunto").value.trim();
        const desc = document.getElementById("sopDescripcion").value.trim();

        if (!asunto || !desc) {
          mostrarAlertaEstilizada("Por favor, complete todos los campos obligatorios.", "error");
          return;
        }

        try {
          // Buscamos el correo electrónico real del usuario directamente desde Firestore para asegurar el envío
          let correoReal = usuario.email || "";

          if (!correoReal) {
            try {
              const { getDoc } = await import(base + "firebase-firestore.js");
              const userSnap = await getDoc(doc(db, "usuarios", String(usuario.dni).trim()));
              if (userSnap.exists()) {
                correoReal = userSnap.data().email || "";
              }
            } catch (errMail) {
              console.error("No se pudo rescatar el mail desde Firestore:", errMail);
            }
          }

          await addDoc(collection(db, "soporte_incidencias"), {
            dniUsuario: String(usuario.dni).trim(),
            nombreUsuario: usuario.nombre,
            rolUsuario: usuario.rol,
            emailUsuario: correoReal, // Guardamos el correo real recuperado
            asunto: asunto,
            descripcion: desc,
            fechaCreacion: serverTimestamp(),
            estado: "Abierto"
          });

          await enviarCorreoEmailJS(TEMPLATE_ADMIN, {
            nombre_usuario: usuario.nombre,
            dni_usuario: String(usuario.dni).trim(),
            rol_usuario: usuario.rol,
            asunto_ticket: asunto,
            descripcion_ticket: desc
          });

          mostrarAlertaEstilizada("¡Incidencia enviada con éxito!", "exito");

          formSoporte.reset();
          if (document.getElementById("sopNombre")) document.getElementById("sopNombre").value = usuario.nombre || "";
          if (document.getElementById("sopDni")) document.getElementById("sopDni").value = usuario.dni || "";
          if (document.getElementById("sopRol")) document.getElementById("sopRol").value = usuario.rol || "";
        } catch (error) {
          console.error("Error al procesar el ticket:", error);
          mostrarAlertaEstilizada("Error de conexión al enviar el ticket.", "error");
        }
      });
    }

    const dniLimpio = usuario.dni ? String(usuario.dni).replace(/\s+/g, "") : "";

    const q = query(collection(db, "soporte_incidencias"), where("dniUsuario", "==", dniLimpio));

    onSnapshot(q, (snapshot) => {
      if (!listaUser) return;
      listaUser.innerHTML = "";
      if (snapshot.empty) {
        listaUser.innerHTML = `<p id="ticketMensajeVacio" style="color: #94a3b8; font-size: 13px; text-align: center; padding: 20px">No posee incidencias registradas en este período.</p>`;
        return;
      }

      // Ordenamiento manual en la computadora para evitar tildes en Firebase
      const documentosOrdenados = [];
      snapshot.forEach((docSnap) => {
        documentosOrdenados.push(docSnap);
      });
      documentosOrdenados.sort((a, b) => {
        const fechaA = a.data().fechaCreacion ? a.data().fechaCreacion.toMillis() : 0;
        const fechaB = b.data().fechaCreacion ? b.data().fechaCreacion.toMillis() : 0;
        return fechaB - fechaA;
      });

      documentosOrdenados.forEach((docSnap) => {
        const idTicket = docSnap.id;
        const t = docSnap.data();

        // El ticket es considerado exitoso si está Resuelto o ya fue Leído
        const esResueltoOLeido = t.estado === "Resuelto" || t.estado === "Leído";

        // ACCIÓN SEGURA: Cambia a "Leído" de forma diferida (1.2s) para no generar bucles en onSnapshot
        if (t.estado === "Resuelto") {
          setTimeout(async () => {
            try {
              const { doc, updateDoc } = await import(base + "firebase-firestore.js");
              await updateDoc(doc(db, "soporte_incidencias", idTicket), {
                estado: "Leído"
              });
            } catch (errLeido) {
              console.error("Error al marcar como leído:", errLeido);
            }
          }, 1200);
        }

        let fechaFormateada = "Recién";
        if (t.fechaCreacion && t.fechaCreacion.toDate) {
          const f = t.fechaCreacion.toDate();
          fechaFormateada =
            f.toLocaleDateString("es-AR") + " " + f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        }

        const div = document.createElement("div");
        div.style.cssText = `border: 2px solid ${esResueltoOLeido ? "#10b981" : "#ef4444"}; padding: 12px; border-radius: 8px; margin-bottom: 10px; background: white;`;
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #1e293b; font-size: 14px;">${t.asunto}</strong>
            <span style="background: ${esResueltoOLeido ? "#10b981" : "#ef4444"}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">
              ${t.estado === "Abierto" ? "ABIERTO" : "RESUELTO"}
            </span>
          </div>
          <small style="color: #64748b; font-size: 11px; display: block; margin-bottom: 6px;">Enviado: ${fechaFormateada}</small>
          <p style="font-size: 13px; color: #475569; margin: 4px 0;">${t.descripcion}</p>
          ${
            esResueltoOLeido && t.respuestaAdmin
              ? `
            <div style="margin-top: 8px; background: #f0fdf4; border-left: 4px solid #10b981; padding: 6px 10px; font-size: 13px; border-radius: 0 4px 4px 0;">
              <strong style="color: #0d9488;">Respuesta del Administrador:</strong>
              <p style="margin: 2px 0; font-style: italic; color: #1e293b;">"${t.respuestaAdmin}"</p>
            </div>
          `
              : ""
          }
        `;
        listaUser.appendChild(div);
      });
    });
  }

  function inicializarVistaAdmin() {
    const q = query(collection(db, "soporte_incidencias"), where("estado", "==", "Abierto"));
    onSnapshot(q, (snapshot) => {
      if (!listaAdmin) return;
      listaAdmin.innerHTML = "";
      if (snapshot.empty) {
        listaAdmin.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; padding: 20px;">No hay incidencias pendientes de resolución.</p>`;
        return;
      }

      // Truco de ordenamiento manual en la computadora para el Administrador
      const documentosOrdenados = [];
      snapshot.forEach((docSnap) => {
        documentosOrdenados.push(docSnap);
      });
      documentosOrdenados.sort((a, b) => {
        const fechaA = a.data().fechaCreacion ? a.data().fechaCreacion.toMillis() : 0;
        const fechaB = b.data().fechaCreacion ? b.data().fechaCreacion.toMillis() : 0;
        return fechaA - fechaB; // Orden ascendente (los más viejos y urgentes primero)
      });

      documentosOrdenados.forEach((docSnap) => {
        const idTicket = docSnap.id;
        const t = docSnap.data();
        const div = document.createElement("div");
        div.style.cssText =
          "border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 12px; background: #f8fafc; border-radius: 6px;";
        div.innerHTML = `
          <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
            <strong style="color: #1e293b;">${t.nombreUsuario}</strong> (${t.rolUsuario.toUpperCase()} - DNI: ${t.dniUsuario})
          </div>
          <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">Asunto: ${t.asunto}</div>
          <p style="font-size: 13px; color: #334155; margin: 4px 0 10px 0; background: white; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${t.descripcion}</p>
          <textarea id="resp-${idTicket}" placeholder="Escriba la solución institucional aquí..." style="width: 100%; height: 60px; padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 13px; box-sizing: border-box; resize: none; margin-bottom: 8px;"></textarea>
          <button id="btn-${idTicket}" style="background: #10b981; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; border: none; cursor: pointer; font-size: 13px; width: 100%;">Marcar como Resuelto</button>
        `;
        listaAdmin.appendChild(div);

        div.querySelector(`#btn-${idTicket}`).addEventListener("click", async () => {
          const txt = div.querySelector(`#resp-${idTicket}`).value.trim();
          if (!txt) {
            mostrarAlertaEstilizada("Por favor, escriba una respuesta antes de resolver.", "error");
            return;
          }

          try {
            await updateDoc(doc(db, "soporte_incidencias", idTicket), {
              estado: "Resuelto",
              respuestaAdmin: txt,
              fechaResolucion: serverTimestamp()
            });

            if (t.emailUsuario) {
              await enviarCorreoEmailJS(TEMPLATE_USER, {
                nombre_usuario: t.nombreUsuario,
                asunto_ticket: t.asunto,
                respuesta_admin: txt,
                email_usuario: t.emailUsuario
              });
            }
            mostrarAlertaEstilizada("Ticket resuelto y usuario notificado.", "exito");
          } catch (error) {
            console.error(error);
            mostrarAlertaEstilizada("Error al resolver el ticket.", "error");
          }
        });
      });
    });
  }

  function mostrarAlertaEstilizada(mensaje, tipo) {
    const contenedor = document.getElementById("contenedor-notificaciones");
    if (!contenedor) return;

    const alerta = document.createElement("div");
    alerta.innerText = mensaje;

    const colorFondo = tipo === "exito" ? "#10b981" : "#ef4444";

    alerta.style.cssText = `
      background-color: ${colorFondo};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    contenedor.appendChild(alerta);

    setTimeout(() => {
      alerta.style.opacity = "1";
    }, 50);

    setTimeout(() => {
      alerta.style.opacity = "0";
      setTimeout(() => {
        alerta.remove();
      }, 300);
    }, 4000);
  }
})();
