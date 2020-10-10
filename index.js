const { default: Axios } = require("axios");
const FormData = require("form-data");

async function buscarCarrera(fecha = "2020-10-11", carrera = 1) {
  console.log(`Consultando carrera #${carrera}`);
  const result = await Axios.get(
    `https://info.jockeypronosticos.com/retrojp.php?fch=${fecha}&ord=${carrera}`
  );
  const PPreg = /PP (?<numero>\d{1,2})/g;
  const nombreReg = /(?<nombre>[\wáéíóúÁÉÍÓÚ ]+)<\/del>/gmu;
  const numeros = exe(PPreg, result.data).map((reg) => reg.groups.numero);
  const nombres = exe(nombreReg, result.data).map((reg) =>
    reg.groups.nombre.toUpperCase()
  );
  let carreraData = [];
  if (numeros.length > 0 && numeros.length != nombres.length) return [];
  for (let i = 0; i < numeros.length; i++) {
    const num = numeros[i];
    const nom = nombres[i];
    carreraData.push({
      Numero: num,
      Nombre: nom,
    });
  }
  return carreraData;
}

/**
 * @param {*} regex
 * @param {*} str
 * @return {RegExpExecArray[]}
 */
function exe(regex, str) {
  let m;
  let result = [];
  while ((m = regex.exec(str)) !== null) {
    if (m.index === regex.lastIndex) regex.lastIndex++;
    result.push(m);
  }
  return result;
}

const express = require("express");
const app = express();

var logData = [];
function log(...str) {
  logData.unshift(str.join(" "));
}
function printLogs() {
  let str = "<ul>";
  str += logData
    .map((item) => {
      return `<li>${item}</li>`;
    })
    .join("");
  str += "</ul>";
  return str;
}
var cargando = {};

app.get("/", async function (req, res) {
  const fecha = req.query.fecha;
  if (cargando[fecha]) return res.send(printLogs());
  else {
    cargando[fecha] = req.ip;
    log(
      `Enhorabuena ${req.ip}, eres el primero en solicitar carreras para el dia ${fecha}, espera unos minutos mientras procesamos la solicitud`
    );
    res.send(printLogs());
  }
  cargando[fecha] = req.ip;
  log(req.ip, "solicita cargar carreras para", fecha);
  let numCarrera = 1;
  let carrera = await buscarCarrera(fecha, numCarrera).catch((error) => {
    log(
      "Oops.. ocurrio un error mientras se obtenian las carreras de la pagina.."
    );
  });
  let carreras = [];
  while (carrera.length > 0) {
    log(`carrera #${numCarrera}: ${carrera.length} ejemplares`);
    carreras.push(carrera);
    carrera = await buscarCarrera(fecha, ++numCarrera);
  }
  log("Se ha finalizado de cargar las carreras para el ", fecha);
  const ejemplares = JSON.stringify(carreras);
  const formData = new FormData();
  formData.append("fecha", fecha);
  formData.append("hipodromo", "RINCONADA");
  formData.append("ejemplares", ejemplares);
  Axios.post(
    `http://sistemasrq.com/apps/hipico/carreras/guardar.php`,
    formData,
    {
      headers: formData.getHeaders(),
    }
  )
    .then((result) => {
      console.log(result.data);
      log("Carreras cargadas exitosamente a la nube");
    })
    .catch((e) => {
      delete cargando[fecha];
      console.log(e.response);
      log("Ocurrio un error al cargar las carreras");
    });
});

app.listen(3000);
