# Contexto Técnico del Proyecto: Gestión-Alumnos (Haspenrg)

Este documento es el mapa de situación y eje de sincronización para el **Ecosistema de Gestión Escolar del Colegio HASPEN**. Su función es identificar con precisión los módulos operativos y estructurar el orden de revisión técnica de los componentes pendientes para las próximas sesiones de desarrollo.

---

## 📑 PARTE 1: Descripción del Proyecto, Archivos e Infraestructura

### Contexto General
El propósito de este sistema es coordinar la administración académica, matriculación, calificaciones y reportes analíticos de los alumnos. El desarrollo se rige por un estricto control de estado para garantizar que toda modificación mantenga la coherencia lógica del sistema.

### Inventario Informativo de Archivos del Proyecto
El sistema se compone de los siguientes archivos validados físicamente en el disco local:

*   **Páginas Web (HTML5 & Tailwind CSS):** 
    * `index.html` — Portal de login y acceso inicial.
    * `panel.html` — Panel principal de navegación general.
    * `usuarios.html` — Interfaz para administración de cuentas de usuarios.
    * `inscripcion.html` — Interfaz de legajos digitales y matrículas.
    * `cursos-materias.html` — Configuración de oferta académica.
    * `roles.html` — Control de perfiles y accesos.
    * `calificaciones.html` — Carga de notas por materias.
    * `boletin.html` — Visualización de reportes analíticos.
    * `estadisticas.html` — Panel visual de rendimiento.
    * `historial.html` — Interfaz base de la grilla de auditoría y trazabilidad.
    * `previas.html` — Módulo visual de control de asignaturas pendientes.
    * `promencion.html` — Vista del estado de promoción académica.
    * `comunicacion.html` — Portal e interfaz para el envío de notificaciones institucionales.
    * `soporte.html` — Panel de asistencia técnica y ayuda al usuario.

*   **Lógica del Negocio (JavaScript - ES6 & Firebase v10):** 
    * `app.js` — Control base y enrutamiento inicial.
    * `firebase-config.js` — Inicialización centralizada de Firebase.
    * `usuarios.js` — Lógica de autenticación y CRUD de personal.
    * `inscripcion.js` — Manejo del ciclo de vida del alumno y vistas.
    * `carga-masiva.js` — Importación de datos por planillas CSV.
    * `roles.js` — Middleware y permisos en el cliente.
    * `calificaciones.js` — Procesamiento y guardado de notas.
    * `boletin.js` — Cálculos de promedios trimestrales.
    * `estadisticas.js` — Gráficos y métricas de deserción.
    * `historial.js` — Registro global automatizado de auditoría en legajos.
    * `historial-view.js` — Controlador asíncrono de lectura de eventos por DNI.
    * `previas.js` — Estructuración de datos y persistencia NoSQL de materias previas.
    * `promencion.js` — Control de persistencia lógica del estado analítico.
    * `soporte.js` — Lógica interna de procesamiento de tickets o guías de ayuda.

*   **Estilos, Configuración y Medios:** 
    * `estilos.css` — Estilos complementarios a Tailwind CSS.
    * `.prettierrc` — Archivo de configuración del entorno estético de desarrollo.
    * `eslint.config.js` — Configuración de calidad y análisis estático de código.
    * `logo.jpg`, `logo1.png`, `logo1a.png`, `IMG-20260519-WA0020.jpg` — Activos multimedia e identidad institucional.

### 🚨 Reglas Obligatorias de Trabajo (Mandatorias)
1.  **Diagnóstico Técnico Previo:** Desglosar componentes afectados y estrategia antes de codificar.
2.  **Razonamiento Lógico:** Prohibido suponer; programación guiada estrictamente por la lógica verificada del entorno.
3.  **Inyección por Parches:** Reemplazos de líneas exactas mediante referencias claras para no alterar el entorno operativo.
4.  **Preservación Estructural:** Prohibido alterar IDs, clases existentes o la estética responsiva de Tailwind CSS.
5.  **Evasión de Bloqueos CDN:** Uso obligatorio de fragmentación y concatenación dinámica para la URL de Firebase.

---

## 🟢 PARTE 2: Módulos Realizados y 100% Operativos

### 1. Acceso e Inicio de Sesión (`index.html` / `app.js` / `firebase-config.js`)
*   **Portal de Login:** Interfaz de acceso inicial completamente terminada, vinculada de forma asíncrona a Firebase Auth y validada estéticamente sin errores.

### 2. Configuración de Oferta Académica (`cursos-materias.html`)
*   **Scroll de Contención Vertical:** Alto máximo rígido de 500px (`max-height: 500px; overflow-y: auto`) implementado con éxito para evitar el estiramiento indefinido del layout.
*   **Caché en Memoria:** Migración del renderizado directo de Firestore a una persistencia indexada local (`let cacheCursos = []`) para mitigar el consumo de cuotas de lectura de base de datos.
*   **Filtros Multidimensionales:** Barra superior con selectores reactivos cruzados plenamente funcional para la segmentación por Año/Ciclo y Orientación Académica.

---

## 🟡 PARTE 3: Módulos Pendientes a Verificar (Próxima Sesión)

Los siguientes componentes físicos existen en el disco pero **deben ser auditados de manera forense** en la próxima sesión para confirmar su lógica, flujos, credenciales o corregir errores visuales:

1.  **Panel Principal (`panel.html` / `estilos.css`):** Verificar la alineación del Grid de tres columnas, las jerarquías de texto de los títulos, el renderizado de la imagen `logo1.png` y la inyección de los IDs asíncronos de saludo y rol.
2.  **Gestión de Usuarios (`usuarios.html` / `usuarios.js`):** Revisar la desestructuración de los selectores de año, la persistencia si falla el `localStorage` y corregir el error de strings/IDs en la función `gestionarPanelesFormulario`.
3.  **Legajo Digital e Inscripción (`inscripcion.html` / `inscripcion.js` / `carga-masiva.js`):** Auditar la fórmula del CUIL, el renderizado condicional de solo lectura, la delegación de eventos en modales, el botón de datos y la compactación de UI/UX.
4.  **Control de Permisos (`roles.html` / `roles.js`):** Verificar el middleware de permisos del cliente y la matriz de capacidades de consulta para los perfiles de Preceptor, Auditor y Tutor.
5.  **Módulo de Calificaciones (`calificaciones.html` / `calificaciones.js` / `boletin.html` / `boletin.js`):** Controlar los flujos de carga trimestral, el cálculo de promedios y el funcionamiento de las firmas forenses (`CARGA_NOTA` / `RECTIFICACION`).
6.  **Trazabilidad e Historial (`historial.html` / `historial.js` / `historial-view.js`):** Validar la función global `window.registrarEventoLegajo` y el paso de parámetros DNI por la URL.
7.  **Materias Pendientes y Promoción (`previas.html` / `previas.js` / `promencion.html` / `promencion.js`):** Revisar las colecciones NoSQL bases y coordinar las reglas de negocio para el cierre de actas.
8.  **Soporte y Comunicación (`comunicacion.html` / `soporte.html` / `soporte.js`):** Verificar el funcionamiento base del portal de notificaciones y la interfaz de asistencia técnica.

---

## 🔒 PARTE 4: Especificaciones de Seguridad a Validar (Solo Lectura)

Estas directivas de desarrollo ya se encuentran diseñadas y redactadas en la documentación, pero **deben auditarse físicamente en el código** para garantizar su blindaje coercitivo:
*   **UI/UX:** Verificar la simetría en `.workspace-layout` y la neutralización del texto en `#bannerPreceptor`.
*   **Filtros Superiores:** Confirmar que `#filtroEstadoMatricula` y `#filtroCicloLectivo` se congelen y deshabiliten correctamente si `window.esSoloLectura === true`.
*   **Estrategia On-Demand:** Corroborar que la tabla inicie en cero, que el menú despliegue solo los `cursosAsignados` y que las consultas a Firestore se realicen estrictamente con filtros `where()` para proteger las lecturas del Spark Plan de Firebase.
