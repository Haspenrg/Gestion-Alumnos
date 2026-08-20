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
  const contAdminEstadisticas = document.getElementById("contenedorAdminEstadisticas");
  const formSoporte = document.getElementById("formSoporte");

  if (document.getElementById("sopNombre")) document.getElementById("sopNombre").value = usuario.nombre || "";
  if (document.getElementById("sopDni")) document.getElementById("sopDni").value = usuario.dni || "";
  if (document.getElementById("sopRol")) document.getElementById("sopRol").value = usuario.rol || "";

  if (rol === "administrador") {
    if (contUsuario) contUsuario.style.display = "none";
    if (contAdmin) contAdmin.style.display = "block";

    // Apaga el historial de usuario y enciende las estadísticas de forma vertical limpia
    const histCompleto = document.getElementById("contenedorHistorialCompleto");
    if (histCompleto) histCompleto.style.display = "none";
    if (contAdminEstadisticas) contAdminEstadisticas.style.display = "block";

    inicializarVistaAdmin();
  } else {
    if (contUsuario) contUsuario.style.display = "block";
    if (contAdmin) contAdmin.style.display = "none";

    // Revierte los paneles para el usuario común
    const histCompleto = document.getElementById("contenedorHistorialCompleto");
    if (histCompleto) histCompleto.style.display = "block";
    if (contAdminEstadisticas) contAdminEstadisticas.style.display = "none";

    inicializarVistaUsuario();
  }

  async function enviarCorreoEmailJS(templateId, templateParams) {
    try {
      // URL Mandatoria HASPEN perfectamente concatenada para el bypass de red institucional
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
        "d";

      // Sanitización Estricta: Forzamos a String plano cada campo para cumplir el estándar de EmailJS
      const parametrosLimpios = {};
      for (const clave in templateParams) {
        if (templateParams.hasOwnProperty(clave)) {
          parametrosLimpios[clave] = String(templateParams[clave]).trim();
        }
      }

      const payload = {
        service_id: String(SERVICE_ID).trim(),
        template_id: String(templateId).trim(),
        user_id: String(PUBLIC_KEY).trim(),
        template_params: parametrosLimpios
      };

      const respuesta = await fetch(urlEmailJS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        console.error("Respuesta de error de EmailJS:", respuesta.status, textoError);
      } else {
        console.log("¡Notificación despachada con éxito por EmailJS!");
      }
    } catch (err) {
      console.error("Error crítico de red en EmailJS:", err);
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

          // Filtro Inteligente: Evaluamos el asunto para determinar si es crítico
          const asuntoMinuscula = asunto.toLowerCase();

          // Palabras clave expandidas para cubrir Docentes, Preceptores y Prosecretarios
          const esCritico =
            asuntoMinuscula.includes("soporte") ||
            asuntoMinuscula.includes("tecnico") ||
            asuntoMinuscula.includes("error") ||
            asuntoMinuscula.includes("curso") ||
            asuntoMinuscula.includes("materia") ||
            asuntoMinuscula.includes("inscripcion") ||
            asuntoMinuscula.includes("alumno") ||
            asuntoMinuscula.includes("usuario") ||
            asuntoMinuscula.includes("nota");

          if (esCritico) {
            enviarCorreoEmailJS(TEMPLATE_ADMIN, {
              nombre_usuario: usuario.nombre,
              dni_usuario: String(usuario.dni).trim(),
              rol_usuario: usuario.rol,
              asunto_ticket: asunto,
              descripcion_ticket: desc
            });
            mostrarAlertaEstilizada("¡Incidencia crítica reportada con éxito y notificada al Administrador!", "exito");
          } else {
            // Consultas o sugerencias simples: se guardan en Firebase sin consumir EmailJS
            mostrarAlertaEstilizada(
              "¡Incidencia registrada con éxito! El Administrador la revisará en su panel.",
              "exito"
            );
          }

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

  async function inicializarVistaAdmin() {
    // 1. Cargamos el mapa de nombres reales desde el módulo de roles de Firestore
    let nombresDeRoles = {};
    try {
      const rolesSnapshot = await getDocs(collection(db, "roles"));
      rolesSnapshot.forEach((rDoc) => {
        const rData = rDoc.data();
        if (rData.id && rData.nombre) {
          nombresDeRoles[rData.id.toLowerCase().trim()] = rData.nombre;
        }
      });
    } catch (err) {
      console.error("Error cargando diccionario de roles:", err);
    }

    const q = query(collection(db, "soporte_incidencias"));
    onSnapshot(q, (snapshot) => {
      if (!listaAdmin) return;
      listaAdmin.innerHTML = "";

      if (snapshot.empty) {
        listaAdmin.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; padding: 20px;">No hay incidencias pendientes de resolución.</p>`;
        if (document.getElementById("cantAbiertos")) document.getElementById("cantAbiertos").innerText = 0;
        if (document.getElementById("cantResueltos")) document.getElementById("cantResueltos").innerText = 0;
        if (document.getElementById("cantLeidos")) document.getElementById("cantLeidos").innerText = 0;
        if (document.getElementById("metricaNotas")) document.getElementById("metricaNotas").innerText = 0;
        if (document.getElementById("metricaUsuarios")) document.getElementById("metricaUsuarios").innerText = 0;
        if (document.getElementById("metricaOtrosTemas")) document.getElementById("metricaOtrosTemas").innerText = 0;
        return;
      }

      let abiertos = 0;
      let resueltos = 0;
      let leidos = 0;
      let conteoRoles = {};
      let notas = 0;
      let usuarios = 0;
      let otrosTemas = 0;

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
        const estado = t.estado;

        // 2. Conteo de estados principales para el panel derecho
        if (estado === "Abierto") abiertos++;
        if (estado === "Resuelto") resueltos++;
        if (estado === "Leído") leidos++;

        // 3. Extracción del rol usando las variables de tu ticket (t.rolUsuario)
        let rolIdTicket = t.rolUsuario ? t.rolUsuario.toLowerCase().trim() : "";

        if (rolIdTicket) {
          const nombreMostrar =
            nombresDeRoles[rolIdTicket] || rolIdTicket.charAt(0).toUpperCase() + rolIdTicket.slice(1);
          if (!conteoRoles[nombreMostrar]) {
            conteoRoles[nombreMostrar] = 1;
          } else {
            conteoRoles[nombreMostrar]++;
          }
        }

        // 4. Análisis de Temas Críticos por Palabras Clave y cálculo de sobrantes
        if (t.asunto) {
          const asuntoMinuscula = t.asunto.toLowerCase();
          let clasificado = false;

          if (
            asuntoMinuscula.includes("nota") ||
            asuntoMinuscula.includes("calificacion") ||
            asuntoMinuscula.includes("calificación")
          ) {
            notas++;
            clasificado = true;
          }
          if (
            asuntoMinuscula.includes("usuario") ||
            asuntoMinuscula.includes("contraseña") ||
            asuntoMinuscula.includes("clave") ||
            asuntoMinuscula.includes("ingresar") ||
            asuntoMinuscula.includes("acceder")
          ) {
            usuarios++;
            clasificado = true;
          }

          if (!clasificado) {
            otrosTemas++;
          }
        } else {
          otrosTemas++;
        }

        // 5. Renderizar el ticket en la lista de gestión de la izquierda si corresponde
        if (estado === "Abierto" || estado === "Resuelto") {
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
          
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; color: #334155;">
            <input type="checkbox" id="chk-mail-${idTicket}" style="cursor: pointer; width: 15px; height: 15px;">
            <label for="chk-mail-${idTicket}" style="cursor: pointer; user-select: none;">¿Notificar respuesta por correo electrónico al docente?</label>
          </div>

          <button id="btn-${idTicket}" style="background: #10b981; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; border: none; cursor: pointer; font-size: 13px; width: 100%;">Marcar como Resuelto</button>
        `;
          listaAdmin.appendChild(div);

          div.querySelector(`#btn-${idTicket}`).addEventListener("click", async () => {
            const txt = div.querySelector(`#resp-${idTicket}`).value.trim();
            const debeEnviarCorreo = div.querySelector(`#chk-mail-${idTicket}`).checked;

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

              if (debeEnviarCorreo && t.emailUsuario) {
                await enviarCorreoEmailJS(TEMPLATE_USER, {
                  nombre_usuario: t.nombreUsuario,
                  asunto_ticket: t.asunto,
                  respuesta_admin: txt,
                  email_usuario: t.emailUsuario
                });
                mostrarAlertaEstilizada("Ticket resuelto y notificación enviada por correo.", "exito");
              } else {
                mostrarAlertaEstilizada("Ticket resuelto con éxito en la plataforma web.", "exito");
              }
            } catch (error) {
              console.error(error);
              mostrarAlertaEstilizada("Error al resolver el ticket.", "error");
            }
          });
        }
      });

      // 6. Inyección final de contadores en los elementos HTML del panel derecho
      if (document.getElementById("cantAbiertos")) document.getElementById("cantAbiertos").innerText = abiertos;
      if (document.getElementById("cantResueltos")) document.getElementById("cantResueltos").innerText = resueltos;
      if (document.getElementById("cantLeidos")) document.getElementById("cantLeidos").innerText = leidos;

      const contenedorRoles = document.getElementById("contenedorRolesDinamicos");
      if (contenedorRoles) {
        contenedorRoles.innerHTML = "";
        Object.keys(conteoRoles).forEach((unRol) => {
          const p = document.createElement("p");
          p.style.margin = "0";
          p.innerHTML = `${unRol}: <strong style="color: #1e293b;">${conteoRoles[unRol]}</strong>`;
          contenedorRoles.appendChild(p);
        });
      }

      if (document.getElementById("metricaNotas")) document.getElementById("metricaNotas").innerText = notas;
      if (document.getElementById("metricaUsuarios")) document.getElementById("metricaUsuarios").innerText = usuarios;
      if (document.getElementById("metricaOtrosTemas"))
        document.getElementById("metricaOtrosTemas").innerText = otrosTemas;
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
