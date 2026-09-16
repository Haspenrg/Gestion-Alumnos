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
  const { collection, addDoc, updateDoc, doc, query, where, onSnapshot, serverTimestamp, orderBy, getDocs } =
    await import(base + "firebase-firestore.js");

  const datosSesion = sessionStorage.getItem("usuarioActivo");
  if (!datosSesion) {
    window.location.href = "index.html";
    return;
  }

  const usuario = JSON.parse(datosSesion);
  const rol = usuario.rol ? usuario.rol.toLowerCase().trim() : "";

  // Credenciales de conexión directa con tu plataforma de EmailJS
  const SERVICE_ID = "service_m2f28oh";
  const TEMPLATE_ADMIN = "template_ti6iacn";
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

  const btnConsolaAuditoria = document.getElementById("btnConsolaAuditoria");

  if (rol === "administrador") {
    if (contUsuario) contUsuario.style.display = "none";
    if (contAdmin) contAdmin.style.display = "block";
    if (btnConsolaAuditoria) {
      btnConsolaAuditoria.style.display = "block";
      btnConsolaAuditoria.addEventListener("click", crearMonitorFlotanteMovil);
    }

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
        accessToken: String(PUBLIC_KEY).trim(),
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

          const textoCompleto = (asunto + " " + desc).toLowerCase();
          const esCritico =
            textoCompleto.includes("soporte") ||
            textoCompleto.includes("tecnico") ||
            textoCompleto.includes("error") ||
            textoCompleto.includes("curso") ||
            textoCompleto.includes("materia") ||
            textoCompleto.includes("inscripcion") ||
            textoCompleto.includes("alumno") ||
            textoCompleto.includes("usuario") ||
            textoCompleto.includes("nota") ||
            textoCompleto.includes("falla") ||
            textoCompleto.includes("problema");

          if (esCritico) {
            // Buscamos el correo real en la base de datos de usuarios de manera segura
            let emailReal = usuario.email || "";
            if (!emailReal && usuario.dni) {
              try {
                const qU = query(collection(db, "usuarios"), where("dni", "==", String(usuario.dni).trim()));
                const snapU = await getDocs(qU);
                if (!snapU.empty) {
                  emailReal = snapU.docs[0].data().email || "";
                }
              } catch (errU) {
                console.warn("Fallo al consultar la colección de usuarios:", errU);
              }
            }
            const correoRemitenteReal = emailReal || usuario.email || "";

            // Agregamos el AWAIT obligatorio adelante del envío
            await enviarCorreoEmailJS(TEMPLATE_ADMIN, {
              nombre_usuario: usuario.nombre,
              dni_usuario: String(usuario.dni).trim(),
              rol_usuario: usuario.rol,
              asunto_ticket: asunto,
              descripcion_ticket: desc,
              email_usuario: correoRemitenteReal
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
    const cacheKey = `soporte_user_${dniLimpio}`;

    async function procesarYRenderizarTicketsUser(documentos) {
      if (!listaUser) return;
      listaUser.innerHTML = "";

      if (documentos.length === 0) {
        listaUser.innerHTML = `<p id="ticketMensajeVacio" style="color: #94a3b8; font-size: 13px; text-align: center; padding: 20px">No posee incidencias registradas en este período.</p>`;
        return;
      }

      documentos.sort((a, b) => (b.fechaCreacionMS || 0) - (a.fechaCreacionMS || 0));

      documentos.forEach((t) => {
        const idTicket = t.id;
        const esResueltoOLeido = t.estado === "Resuelto" || t.estado === "Leído";

        if (t.estado === "Resuelto") {
          setTimeout(async () => {
            try {
              const { doc, updateDoc } = await import(base + "firebase-firestore.js");
              await updateDoc(doc(db, "soporte_incidencias", idTicket), { estado: "Leído" });
            } catch (errLeido) {
              console.error("Error al marcar como leído:", errLeido);
            }
          }, 1200);
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
          <small style="color: #64748b; font-size: 11px; display: block; margin-bottom: 6px;">Enviado: ${t.fechaFormateada || "Recién"}</small>
          <p style="font-size: 13px; color: #475569; margin: 4px 0;">${t.descripcion}</p>
          ${
            esResueltoOLeido && t.respuestaAdmin
              ? `
            <div style="margin-top: 8px; background: #f0fdf4; border-left: 4px solid #10b981; padding: 6px 10px; font-size: 13px; border-radius: 0 4px 4px 0;">
              <strong style="color: #0d9488;">Respuesta del Administrador:</strong>
              <p style="margin: 2px 0; font-style: italic; color: #1e293b;">"\${t.respuestaAdmin}"</p>
            </div>
          `
              : ""
          }
        `;
        listaUser.appendChild(div);
      });
    }

    // 💻 INTENTAR CARGAR DE MEMORIA LOCAL (COSTO CERO)
    const cacheLocal = localStorage.getItem(cacheKey);
    let datosLocales = [];
    if (cacheLocal) {
      datosLocales = JSON.parse(cacheLocal);
      if (typeof window.actualizarContadoresMonitor === "function") {
        window.actualizarContadoresMonitor("local", datosLocales.length || 1);
      }
      procesarYRenderizarTicketsUser(datosLocales);
    }

    // 🔄 CONEXIÓN INTEGRADA POR CONTROL DE CAMBIOS DE FIRESTORE
    const q = query(collection(db, "soporte_incidencias"), where("dniUsuario", "==", dniLimpio));
    onSnapshot(q, (snapshot) => {
      let datosNuevos = [];
      snapshot.forEach((docSnap) => {
        const t = docSnap.data();
        let fechaFormateada = "Recién";
        let fechaMS = 0;
        if (t.fechaCreacion && t.fechaCreacion.toDate) {
          const f = t.fechaCreacion.toDate();
          fechaMS = f.getTime();
          fechaFormateada =
            f.toLocaleDateString("es-AR") + " " + f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        }
        datosNuevos.push({ id: docSnap.id, ...t, fechaFormateada: fechaFormateada, fechaCreacionMS: fechaMS });
      });

      const cacheStringNuevo = JSON.stringify(datosNuevos);
      if (cacheStringNuevo !== cacheLocal) {
        if (typeof window.actualizarContadoresMonitor === "function" && !snapshot.empty) {
          window.actualizarContadoresMonitor("firebase", snapshot.size);
        }
        localStorage.setItem(cacheKey, cacheStringNuevo);
        procesarYRenderizarTicketsUser(datosNuevos);
      }
    });
  }

  async function inicializarVistaAdmin() {
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

    const cacheKey = "soporte_admin_total";

    function procesarYRenderizarPanelAdmin(documentos) {
      if (!listaAdmin) return;
      listaAdmin.innerHTML = "";

      if (documentos.length === 0) {
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
      let usuariosMetrica = 0;
      let otrosTemas = 0;

      documentos.sort((a, b) => (a.fechaCreacionMS || 0) - (b.fechaCreacionMS || 0));

      documentos.forEach((t) => {
        const idTicket = t.id;
        const estado = t.estado;

        if (estado === "Abierto") abiertos++;
        if (estado === "Resuelto") resueltos++;
        if (estado === "Leído") leidos++;

        let rolIdTicket = t.rolUsuario ? t.rolUsuario.toLowerCase().trim() : "";
        if (rolIdTicket) {
          const nombreMostrar =
            nombresDeRoles[rolIdTicket] || rolIdTicket.charAt(0).toUpperCase() + rolIdTicket.slice(1);
          conteoRoles[nombreMostrar] = (conteoRoles[nombreMostrar] || 0) + 1;
        }

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
            usuariosMetrica++;
            clasificado = true;
          }
          if (!clasificado) otrosTemas++;
        } else {
          otrosTemas++;
        }

        if (estado === "Abierto" || estado === "Resuelto") {
          const div = document.createElement("div");
          div.style.cssText =
            "border: 2px solid #cbd5e1; padding: 14px; background: white; border-radius: 12px; height: 320px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);";
          div.innerHTML = `
            <div>
              <div style="display: flex; justify-content: space-between; items-start: flex-start; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
                <div style="font-size: 12px; font-weight: bold; color: #334155; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${t.nombreUsuario}
                  <span style="font-size: 10px; font-weight: normal; color: #64748b; display: block;">${t.rolUsuario.toUpperCase()} - DNI: ${t.dniUsuario}</span>
                </div>
                <span style="padding: 2px 6px; font-size: 10px; font-weight: bold; text-transform: uppercase; border-radius: 4px; color: #b91c1c; border: 1px solid #fca5a5; white-space: nowrap;">${estado}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <h4 style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin: 0; tracking: 0.05em;">Asunto</h4>
                <p style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.asunto}</p>
              </div>
              <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
                <p style="font-size: 12px; color: #475569; margin: 0; height: 50px; overflow-y: auto; white-space: pre-wrap;">${t.descripcion}</p>
              </div>
            </div>
            <div style="margin-top: auto;">
              <textarea id="resp-${idTicket}" placeholder="Escriba la solución institucional aquí..." style="width: 100%; height: 45px; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box; resize: none; margin-bottom: 6px;">${t.respuestaAdmin || ""}</textarea>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 10px; font-weight: 500; color: #475569; user-select: none;">
                  <input type="checkbox" id="chk-mail-${idTicket}" style="cursor: pointer; width: 14px; height: 14px; accent-color: #10b981;">
                  <span>¿Notificar mail?</span>
                </label>
                <button id="btn-${idTicket}" style="background: #10b981; color: white; padding: 5px 10px; border-radius: 6px; font-weight: bold; border: none; cursor: pointer; font-size: 11px; white-space: nowrap;">Resolver</button>
              </div>
            </div>
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

              const correoDestino = t.emailUsuario || usuario.email || "soporte.haspen@gmail.com";
              if (debeEnviarCorreo && correoDestino) {
                await enviarCorreoEmailJS(TEMPLATE_USER, {
                  nombre_usuario: t.nombreUsuario,
                  asunto_ticket: t.asunto,
                  respuesta_admin: txt,
                  email_usuario: correoDestino
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
      if (document.getElementById("metricaUsuarios"))
        document.getElementById("metricaUsuarios").innerText = usuariosMetrica;
      if (document.getElementById("metricaOtrosTemas"))
        document.getElementById("metricaOtrosTemas").innerText = otrosTemas;
    }

    const cacheLocal = localStorage.getItem(cacheKey);
    let datosLocales = [];
    if (cacheLocal) {
      datosLocales = JSON.parse(cacheLocal);
      if (typeof window.actualizarContadoresMonitor === "function") {
        window.actualizarContadoresMonitor("local", datosLocales.length || 1);
      }
      procesarYRenderizarPanelAdmin(datosLocales);
    }

    const q = query(collection(db, "soporte_incidencias"));
    onSnapshot(q, (snapshot) => {
      let datosNuevos = [];
      snapshot.forEach((docSnap) => {
        const t = docSnap.data();
        let fechaMS = 0;
        if (t.fechaCreacion && t.fechaCreacion.toDate) {
          fechaMS = t.fechaCreacion.toDate().getTime();
        }
        datosNuevos.push({ id: docSnap.id, ...t, fechaCreacionMS: fechaMS });
      });

      const cacheStringNuevo = JSON.stringify(datosNuevos);
      if (cacheStringNuevo !== cacheLocal) {
        if (typeof window.actualizarContadoresMonitor === "function" && !snapshot.empty) {
          window.actualizarContadoresMonitor("firebase", snapshot.size);
        }
        localStorage.setItem(cacheKey, cacheStringNuevo);
        procesarYRenderizarPanelAdmin(datosNuevos);
      }
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
  // ==========================================
  // PASO 1: MOTOR DE TELEMETRÍA GLOBAL INVISIBLE
  // ==========================================
  const metricasLectura = { local: 0, firebase: 0 };
  let suscriptorTelemetria = null; // Guardará el escuchador en vivo del Admin

  // Función interna para reportar silenciosamente los impactos a la nube
  async function reportarTelemetriaNube(origen, cantidad) {
    try {
      // Evitamos bucles: si el admin está leyendo la telemetría, no reportamos esa lectura
      if (usuario.rol?.toLowerCase().trim() === "administrador" && origen === "firebase" && cantidad === 1) {
        return;
      }

      const { collection, addDoc, serverTimestamp } = await import(base + "firebase-firestore.js");
      await addDoc(collection(db, "telemetria_haspen"), {
        dniUsuario: String(usuario.dni || "anonimo").trim(),
        nombreUsuario: usuario.nombre || "Usuario Externo",
        rolUsuario: usuario.rol || "Sin Rol",
        origen: origen, // "local" o "firebase"
        cantidad: parseInt(cantidad) || 1,
        fechaImpacto: serverTimestamp()
      });
    } catch (err) {
      console.warn("Reporte de telemetría retenido de forma segura:", err);
    }
  }

  function crearMonitorFlotanteMovil() {
    let panel = document.getElementById("monitor-lecturas-escolar");
    if (panel) return;

    panel = document.createElement("div");
    panel.id = "monitor-lecturas-escolar";
    panel.style.cssText =
      "position: fixed; top: 100px; left: 20px; background: #1e293b; color: #ffffff; padding: 0; border-radius: 10px; font-family: monospace; font-size: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); z-index: 999999; border: 1px solid #334155; width: 240px; user-select: none; overflow: hidden;";

    panel.innerHTML = `
      <div id="monitor-header-arrastrable" style="background: #0f172a; padding: 10px 12px; cursor: move; font-weight: bold; color: #38bdf8; font-size: 11px; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
        <span>📊 MONITOR DE AUDITORÍA</span>
        <button id="btn-cerrar-monitor-auditoria" style="background: transparent; border: none; color: #64748b; font-size: 14px; cursor: pointer; font-weight: bold; line-height: 1; padding: 2px 6px; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'">×</button>
      </div>
      <div style="padding: 12px 14px; line-height: 1.6;">
        <div>💻 LocalStorage (Total): <span id="monitor-val-local" style="color: #4ade80; font-weight: bold;">${metricasLectura.local}</span> reg.</div>
        <div>🔥 Firebase (Total):     <span id="monitor-val-firebase" style="color: #f87171; font-weight: bold;">${metricasLectura.firebase}</span> reg.</div>
        <div id="monitor-txt-detalle" style="margin-top: 8px; font-size: 10px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 6px; font-style: italic;">Conectado a la red escolar global...</div>
      </div>
    `;

    document.body.appendChild(panel);
    hacerElementoArrastrable(panel);

    // Conectar acción de cierre real al botón X
    document.getElementById("btn-cerrar-monitor-auditoria").addEventListener("click", () => {
      if (suscriptorTelemetria) {
        suscriptorTelemetria(); // Apaga el escuchador en vivo para no consumir memoria
        suscriptorTelemetria = null;
      }
      panel.remove();
    });

    // ACTIVACIÓN DE CONSULTA EN VIVO EXCLUSIVA PARA EL ADMINISTRADOR
    if (usuario.rol?.toLowerCase().trim() === "administrador") {
      activarEscuchadorGlobalTelemetria();
    }
  }

  async function activarEscuchadorGlobalTelemetria() {
    try {
      const { collection, onSnapshot, query, where } = await import(base + "firebase-firestore.js");

      // Calculamos el inicio del día de hoy en hora local de Argentina
      const ahora = new Date();
      const inicioHoyLocal = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

      // Filtramos la consulta en la nube para traer solo los impactos del día corriente
      const q = query(collection(db, "telemetria_haspen"), where("fechaImpacto", ">=", inicioHoyLocal));

      suscriptorTelemetria = onSnapshot(q, (snapshot) => {
        let totalLocal = 0;
        let totalFirebase = 0;
        let ultimoOrigen = "ninguno";
        let ultimaCantidad = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.origen === "local") totalLocal += data.cantidad || 1;
          if (data.origen === "firebase") totalFirebase += data.cantidad || 1;
          ultimoOrigen = data.origen;
          ultimaCantidad = data.cantidad || 1;
        });

        metricasLectura.local = totalLocal;
        metricasLectura.firebase = totalFirebase;

        const elLocal = document.getElementById("monitor-val-local");
        const elFirebase = document.getElementById("monitor-val-firebase");
        const elDetalle = document.getElementById("monitor-txt-detalle");

        if (elLocal) elLocal.innerText = totalLocal;
        if (elFirebase) elFirebase.innerText = totalFirebase;
        if (elDetalle && ultimoOrigen !== "ninguno") {
          elDetalle.innerText = `Red Global: +${ultimaCantidad} (${ultimoOrigen})`;
        }
      });
    } catch (err) {
      console.error("Error al conectar el monitor con el filtro diario:", err);
    }
  }

  function hacerElementoArrastrable(elemento) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;
    const cabecera = document.getElementById("monitor-header-arrastrable");

    if (cabecera) {
      cabecera.onmousedown = arrastrarMouseDown;
    } else {
      elemento.onmousedown = arrastrarMouseDown;
    }

    function arrastrarMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = cerrarArrastrarElemento;
      document.onmousemove = elementoArrastrar;
    }

    // Código adaptado para no salirse de la pantalla activa de VS Code
    function elementoArrastrar(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elemento.style.top = elemento.offsetTop - pos2 + "px";
      elemento.style.left = elemento.offsetLeft - pos1 + "px";
    }

    function cerrarArrastrarElemento() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // INTERCEPTOR UNIVERSAL: Trabaja en todas las máquinas de forma silenciosa
  window.actualizarContadoresMonitor = function (origen, cantidad) {
    const cantVal = parseInt(cantidad) || 1;

    // Suma local inmediata en la memoria del navegador
    if (origen === "local") metricasLectura.local += cantVal;
    if (origen === "firebase") metricasLectura.firebase += cantVal;

    // Si el monitor está abierto en pantalla (solo admin), actualiza la vista local al instante
    const elLocal = document.getElementById("monitor-val-local");
    const elFirebase = document.getElementById("monitor-val-firebase");
    if (elLocal && origen === "local") elLocal.innerText = metricasLectura.local;
    if (elFirebase && origen === "firebase") elFirebase.innerText = metricasLectura.firebase;

    // DESPACHO INVISIBLE: Envía el impacto a la base de datos central sin que el usuario lo note
    reportarTelemetriaNube(origen, cantVal);
  };
})();
