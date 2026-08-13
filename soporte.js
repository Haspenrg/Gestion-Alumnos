(async function () {
  "use strict";

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

  const SERVICE_ID = "service_m2f28oh";
  const TEMPLATE_ADMIN = "template_ti6iacn";
  const TEMPLATE_USER = "template_50da1y7";
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
    inicializarVistaAdmin();
  } else {
    if (contUsuario) contUsuario.style.display = "block";
    if (contAdmin) contAdmin.style.display = "none";
    inicializarVistaUsuario();
  }

  async function enviarCorreoEmailJS(templateId, templateParams) {
    try {
      await fetch("https://emailjs.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: SERVICE_ID,
          template_id: templateId,
          user_id: PUBLIC_KEY,
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
        if (!asunto || !desc) return;

        await addDoc(collection(db, "soporte_incidencias"), {
          dniUsuario: String(usuario.dni).trim(),
          nombreUsuario: usuario.nombre,
          rolUsuario: usuario.rol,
          emailUsuario: usuario.email || "",
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

        formSoporte.reset();
        if (document.getElementById("sopNombre")) document.getElementById("sopNombre").value = usuario.nombre || "";
        if (document.getElementById("sopDni")) document.getElementById("sopDni").value = usuario.dni || "";
        if (document.getElementById("sopRol")) document.getElementById("sopRol").value = usuario.rol || "";
      });
    }

    const q = query(
      collection(db, "soporte_incidencias"),
      where("dniUsuario", "==", String(usuario.dni).trim()),
      orderBy("fechaCreacion", "desc")
    );
    onSnapshot(q, (snapshot) => {
      if (!listaUser) return;
      listaUser.innerHTML = "";
      if (snapshot.empty) {
        listaUser.innerHTML = `<p id="ticketMensajeVacio" style="color: #94a3b8; font-size: 13px; text-align: center; padding: 20px">No posee incidencias registradas en este período.</p>`;
        return;
      }
      snapshot.forEach((docSnap) => {
        const t = docSnap.data();
        const esResuelto = t.estado === "Resuelto";
        const div = document.createElement("div");
        div.style.cssText = `border: 2px solid ${esResuelto ? "#10b981" : "#ef4444"}; padding: 12px; border-radius: 8px; margin-bottom: 10px; background: white;`;
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #1e293b; font-size: 14px;">${t.asunto}</strong>
            <span style="background: ${esResuelto ? "#10b981" : "#ef4444"}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${t.estado.toUpperCase()}</span>
          </div>
          <p style="font-size: 13px; color: #475569; margin: 4px 0;">${t.descripcion}</p>
          ${
            esResuelto && t.respuestaAdmin
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
    const q = query(
      collection(db, "soporte_incidencias"),
      where("estado", "==", "Abierto"),
      orderBy("fechaCreacion", "asc")
    );
    onSnapshot(q, (snapshot) => {
      if (!listaAdmin) return;
      listaAdmin.innerHTML = "";
      if (snapshot.empty) {
        listaAdmin.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; padding: 20px;">No hay incidencias pendientes de resolución.</p>`;
        return;
      }
      snapshot.forEach((docSnap) => {
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
          if (!txt) return;

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
        });
      });
    });
  }
})();
