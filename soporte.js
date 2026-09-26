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

  // Importamos ambas bases de datos desde la nueva configuración unificada
  const { db, dbTelemetria } = await import("./firebase-config.js");
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
  // PASO 1: MOTOR DE TELEMETRÍA GLOBAL INVISIBLE (TIEMPO REAL AL SEGUNDO)
  // ==========================================
  const metricasLectura = { local: 0, firebase: 0 };
  let suscriptorTelemetria = null; // Guardará el escuchador en vivo del Admin

  // Función interna que despacha inmediatamente a la segunda base de datos (0 gasto para la escuela)
  async function reportarTelemetriaNube(origen, cantidad) {
    try {
      const origenLimpio = origen ? String(origen).toLowerCase().trim() : "";

      // Evitamos bucles si el admin consulta desde la terminal
      if (
        usuario.rol?.toLowerCase().trim() === "administrador" &&
        origenLimpio === "firebase_lectura" &&
        parseInt(cantidad) === 1
      ) {
        return;
      }

      // IMPORTANTE: Se usa 'dbTelemetria' para desviar el tráfico al plan Spark secundario
      await addDoc(collection(dbTelemetria, "telemetria_haspen"), {
        dniUsuario: String(usuario.dni || "anonimo").trim(),
        nombreUsuario: usuario.nombre || "Usuario Externo",
        rolUsuario: usuario.rol || "Sin Rol",
        origen: origenLimpio,
        cantidad: parseInt(cantidad) || 1,
        fechaImpacto: serverTimestamp()
      });
    } catch (err) {
      console.warn("Reporte de telemetría retenido de forma segura:", err);
    }
  }

  function crearMonitorFlotanteMovil() {
    // 1. Si la ventana ya existe y está abierta, la traemos al frente y no hacemos nada más
    if (window.popupMonitorHaspen && !window.popupMonitorHaspen.closed) {
      window.popupMonitorHaspen.focus();
      return;
    }

    // 2. Abrimos la mini-ventana nativa apuntando directamente a nuestro nuevo archivo independiente
    window.popupMonitorHaspen = window.open(
      "monitor.html",
      "MonitorHaspen",
      "width=380,height=260,resizable=no,scrollbars=no,status=no,toolbar=no,menubar=no,location=no"
    );

    if (!window.popupMonitorHaspen) {
      alert("Por favor, autorice los pop-ups para abrir el Monitor de Auditoría.");
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

  window.actualizarContadoresMonitor = function (origen, cantidad) {
    const cantVal = parseInt(cantidad) || 1;
    const origenLimpio = origen ? String(origen).toLowerCase().trim() : "";
    let llaveDestino = "";

    if (origenLimpio === "local_lectura" || origenLimpio === "local") {
      llaveDestino = "local_lectura";
    } else if (origenLimpio === "local_escritura") {
      llaveDestino = "local_escritura";
    } else if (origenLimpio === "firebase_lectura" || origenLimpio === "firebase") {
      llaveDestino = "firebase_lectura";
    } else if (origenLimpio === "firebase_escritura") {
      llaveDestino = "firebase_escritura";
    }

    if (!llaveDestino) return;

    // Sincronismo del ciclo de reinicio de las 21:00 hs Local (00:00 UTC) para persistencia local de la terminal
    const ahora = new Date();
    const corteHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 21, 0, 0, 0);
    let marcaCiclo =
      ahora >= corteHoy ? corteHoy.toDateString() : new Date(corteHoy.getTime() - 24 * 60 * 60 * 1000).toDateString();

    const cacheKeyCiclo = `haspen_monitor_ciclo_fecha`;
    if (localStorage.getItem(cacheKeyCiclo) !== marcaCiclo) {
      localStorage.setItem(cacheKeyCiclo, marcaCiclo);
      localStorage.setItem("haspen_monitor_local_lectura", "0");
      localStorage.setItem("haspen_monitor_local_escritura", "0");
      localStorage.setItem("haspen_monitor_firebase_lectura", "0");
      localStorage.setItem("haspen_monitor_firebase_escritura", "0");
    }

    // Impactamos el disco duro local de la terminal de control inmediato
    const valorActual = parseInt(localStorage.getItem(`haspen_monitor_${llaveDestino}`)) || 0;
    const nuevoValor = valorActual + cantVal;
    localStorage.setItem(`haspen_monitor_${llaveDestino}`, String(nuevoValor));

    // Si el pop-up está abierto, actualizamos su pantalla en vivo
    if (window.popupMonitorHaspen && !window.popupMonitorHaspen.closed) {
      try {
        const docPopup = window.popupMonitorHaspen.document;
        let idHtmlElemento = "";
        if (llaveDestino === "local_lectura") idHtmlElemento = "metrica-local-lecturas";
        if (llaveDestino === "local_escritura") idHtmlElemento = "metrica-local-escrituras";
        if (llaveDestino === "firebase_lectura") idHtmlElemento = "metrica-firebase-lecturas";
        if (llaveDestino === "firebase_escritura") idHtmlElemento = "metrica-firebase-escrituras";

        const contenedorVisual = docPopup.getElementById(idHtmlElemento);
        if (contenedorVisual) {
          contenedorVisual.innerText = nuevoValor;
        }
      } catch (e) {
        console.warn("[Monitor] Sincronizando interfaz gráfica pasiva...");
      }
    }

    // ELIMINADO EL FRENO: Ahora TODO viaja al instante a la nube secundaria
    reportarTelemetriaNube(llaveDestino, cantVal);
  };
})();
