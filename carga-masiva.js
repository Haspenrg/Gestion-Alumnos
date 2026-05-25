// Motor de Carga Masiva Seguro - Versión Estable
(async function(){
'use strict';
const cdn='h'+'t'+'t'+'p'+'s'+':'+'/'+'/'+'w'+'w'+'w'+'.'+'g'+'s'+'t'+'a'+'t'+'i'+'c'+'.'+'c'+'o'+'m'+'/f'+'i'+'r'+'e'+'b'+'a'+'s'+'e'+'j'+'s'+'/10.12.0/';
const{doc,setDoc,getFirestore,collection,getDoc}=await import(cdn+'firebase-firestore.js');
let alumnosEnMemoria=[];
window.inicializarCargaMasivaSegura=function(){
const sesion=localStorage.getItem('usuarioActivo');
if(!sesion)return;
const r=JSON.parse(sesion).rol?.toLowerCase().trim()||"";
if(r.includes("admin")||r.includes("direct")||r.includes("dir")){
const contenedor=document.getElementById('contenedorCargaMasiva');
if(contenedor)contenedor.style.setProperty('display','inline-flex','important');
}
let intentos=0;
const relojCursos=setInterval(()=>{
if(window.cachedCursosColegio&&window.cachedCursosColegio.length>0){
poblarCursosCarga();
clearInterval(relojCursos);
}
intentos++;
if(intentos>30)clearInterval(relojCursos);
},500);
document.getElementById('btnCargaMasiva')?.addEventListener('click',()=>document.getElementById('csvCargaMasiva').click());
document.getElementById('csvCargaMasiva')?.addEventListener('change',simularCargaCSV);
document.getElementById('btnCerrarSimulacionX')?.addEventListener('click',cerrarModal);
document.getElementById('btnCancelarCarga')?.addEventListener('click',cerrarModal);
document.getElementById('btnConfirmarCarga')?.addEventListener('click',ejecutarEscrituraFirestore);
};
function poblarCursosCarga(){
const s=document.getElementById('selectCursoCarga');
if(!s||!window.cachedCursosColegio)return;
s.innerHTML="";
window.cachedCursosColegio.forEach(c=>{
const o=new Option(`${c.ciclo} "${c.division}"`,c.id);
o.dataset.tag=`curso: ${c.ciclo} año "${c.division}"`.toLowerCase().replace(/\s+/g,' ');
s.add(o);
});
}
function cerrarModal(){
document.getElementById('modalSimulacionCarga').style.display='none';
document.getElementById('csvCargaMasiva').value="";
alumnosEnMemoria=[];
}
function calcularGeneroYCuil(nombre,cuilRaw,dni){
let cuil=cuilRaw.replace(/[^0-9]/g,'').trim();
let gen="Masculino";
if(cuil.length===11){
if(cuil.startsWith("27"))gen="Femenino";
return{cuil,gen};
}
const partes=nombre.split(',');
const n=partes?partes[partes.length-1].trim().toLowerCase().split(' '):"";
if(n.endsWith('a')||["gladys","belen","ines","zoe","uma","umma","mia","maia","ernestina","ayelen"].includes(n))gen="Femenino";
if(typeof window.calcularCuilAutomatico==='function'){
cuil=window.calcularCuilAutomatico(dni,gen);
}else{
cuil=(gen==="Femenino"?"27":"20")+dni.padStart(8,'0')+"0";
}
return{cuil,gen};
}
async function simularCargaCSV(e){
const inputNativo=document.getElementById('csvCargaMasiva');
const f=inputNativo?inputNativo.files:null;
if(!f||f.length===0)return;
const archivoSeleccionado=f[0];
const s=document.getElementById('selectCursoCarga');
if(!s||s.selectedIndex===-1||!s.options[s.selectedIndex]){
alert("Por favor, seleccione primero el curso de destino en el panel de carga masiva.");
if(inputNativo)inputNativo.value="";
return;
}
const cursoId=s.value;
const tagBusqueda=s.options[s.selectedIndex].dataset.tag||"";
const cicloActivo=document.getElementById('filtroCicloLectivo')?.value||"2026";
const reader=new FileReader();
reader.onload=async(evt)=>{
const lineas=evt.target.result.split('\n');
const db=getFirestore();
alumnosEnMemoria=[];
let cNuevos=0,cModif=0,dentroCurso=false,html="";
let cabecera=[];
let filaCabeceraIndex=-1;
for(let i=0;i<Math.min(10,lineas.length);i++){
const c=lineas[i].split(/[;,]/).map(t=>t.trim().toLowerCase());
if(c.includes("apellido y nombre")||c.indexOf("apellido y nombre")>-1){
cabecera=c;
filaCabeceraIndex=i;
break;
}
}
const idxDni=cabecera.indexOf("dni. n°");
const idxNombre=cabecera.indexOf("apellido y nombre");
const idxCuil=cabecera.indexOf("cuil");
const idxF_Nac=cabecera.indexOf("fecha nac");
const idxDomicilio=cabecera.indexOf("domicilio");
const idxTel=cabecera.indexOf("tel");
const idxTutor=cabecera.indexOf("tutor");
const idxDniTutor=cabecera.indexOf("dni",idxTutor>-1?idxTutor:0);
const idxEmail=cabecera.indexOf("email");
if(idxDni===-1||idxNombre===-1){
if(inputNativo)inputNativo.value="";
return alert("Error estructural: El CSV no contiene los encabezados mandatorios ('DNI. N°' o 'Apellido y Nombre').");
}
document.getElementById('tablaSimulacionBody').innerHTML='<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Mapeando archivo en memoria...</td></tr>';
document.getElementById('modalSimulacionCarga').style.display='flex';
const inicioDatos=filaCabeceraIndex>-1?filaCabeceraIndex+1:4;
for(let i=inicioDatos;i<lineas.length;i++){
const fila=lineas[i].split(/[;,]/);
if(!fila||fila.length<2)continue;
const c0=fila[0]?fila[0].trim().toLowerCase().replace(/\s+/g,' '):"";
if(c0.includes("curso:")){
const partesTag=tagBusqueda.split('"');
const cicloTarget=partesTag[0]?partesTag[0].replace("curso:","").trim():"";
const divisionTarget=partesTag[1]?partesTag[1].trim():"";
dentroCurso=c0.includes(cicloTarget)&&c0.includes(divisionTarget);
continue;
}
if(!dentroCurso)continue;
if(c0.includes("baja")||c0.includes("preceptor")||!fila[idxNombre]){
if(alumnosEnMemoria.length>0&&c0.includes("baja"))break;
continue;
}
const dni=fila[idxDni]?fila[idxDni].replace(/[^0-9]/g,'').trim():"";
if(dni.length<7)continue;
const nombreCompleto=fila[idxNombre].trim();
const{cuil,gen}=calcularGeneroYCuil(nombreCompleto,fila[idxCuil]||"",dni);
const partes=nombreCompleto.split(',');
const ap=partes[0]?partes[0].trim():"";
const nom=partes[1]?partes[1].trim():nombreCompleto;
const snap=await getDoc(doc(db,'alumnos',dni));
const existe=snap.exists();
let badge='<span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:12px; font-weight:bold;">🟢 Nuevo</span>';
if(existe){badge='<span style="background:#fef9c3; color:#ca8a04; padding:2px 8px; border-radius:12px; font-weight:bold;">🟡 Modificar</span>';cModif++;}else{cNuevos++;}
const email=fila[idxEmail]?fila[idxEmail].trim():"sin_correo@colegio.edu.ar";
const telephone=fila[idxTel]?fila[idxTel].replace(/[^0-9]/g,'').trim():"2964000000";
const tutor=fila[idxTutor]?fila[idxTutor].trim():"No registrado";
const dniT=fila[idxDniTutor]?fila[idxDniTutor].replace(/[^0-9]/g,'').trim():"";
html+=`<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px; font-weight: 500;">${dni}</td><td style="padding: 10px; font-weight: bold; color:#1e293b;">${ap.toUpperCase()}, ${nom}</td><td style="padding: 10px; font-family: monospace; color:#475569;">${cuil}</td><td style="padding: 10px; color: #64748b; font-size: 11px;"><b>Tutor:</b> ${tutor} (${dniT||'S/D'})<br><b>Mail:</b> ${email}</td><td style="padding: 10px; text-align: center;">${badge}</td></tr>`;
alumnosEnMemoria.push({
dni,nombre:`${nom} ${ap}`.trim(),cuil,genero:gen,estado:"Regular",cursoId,cicloLectivo:cicloActivo,
email,telefono1:telephone,nombreTutor:tutor,dniTutor:dniT,fechaNacimiento:fila[idxF_Nac]?.trim()||"",
lugarNacimiento:"Río Grande",nacionalidad:"Argentina",direccion:fila[idxDomicilio]?.trim()||"No especificada",
documentosDigitales:{dni_alumno:null,partida_nac:null,cert_primaria:null,buena_salud:null,carnet_vacunas:null,dni_tutor:null,acta_ppi:null}
});
}
document.getElementById('tablaSimulacionBody').innerHTML=html||'<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">❌ No se encontraron alumnos en la sección de este archivo.</td></tr>';
document.getElementById('resumenSimulacion').innerText=`Sección Destino: ${s.options[s.selectedIndex].text} | Ciclo: ${cicloActivo} | Detectados: ${alumnosEnMemoria.length} (🟢 Nuevos: ${cNuevos} | 🟡 Modificaciones: ${cModif})`;
};
reader.readAsText(archivoSeleccionado,'UTF-8');
}
async function ejecutarEscrituraFirestore(){
if(alumnosEnMemoria.length===0)return;
const b=document.getElementById('btnConfirmarCarga');
b.disabled=true;b.innerText="⏳ Guardando...";
const db=getFirestore();
let total=0;
for(const a of alumnosEnMemoria){
await setDoc(doc(collection(db,'alumnos'),a.dni),a,{merge:true});
total++;
}
alert(`¡Carga masiva finalizada! Se procesaron ${total} legajos digitales con éxito.`);
cerrarModal();
if(typeof window.procesarFiltrosYNomina==='function')window.procesarFiltrosYNomina();
}
})();
