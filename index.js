const { default: Axios } = require("axios");
const FormData = require("form-data");

function buscarCarrera(id) {
  return new Promise((resolve, reject) => {
    const ganchoInicio = '<h1 class="codigo_l1">';
    result = Axios.get(
      `http://elgrandatero.net.ve/retrospectos-hipicos-para-la-rinconada-y-valencia.php?recordID=${id}`
    ).then((result) => {
      /** @type {String} */
      const src = result.data;
      const a = src.indexOf(ganchoInicio);
      const b = src.indexOf("INFORMACION PARA HOY", a);
      let srcData = src.substring(a, b);

      const primeraFila = srcData.indexOf('<tr class="mensaje">');
      srcData = srcData.substr(primeraFila);

      const numCarreras = exe(/<tr class="mensaje">/g, srcData);
      let carreras = [];
      console.log("numCarreras :>> ", numCarreras.length);
      for (let i = 1; i < numCarreras.length; i++) {
        console.log(i - 1, i);
        const fila = numCarreras[i - 1];
        const a = fila.index;
        const b = numCarreras[i].index;
        const carreraSrc = srcData.substring(a, b);
        carreras.push(procesarCarrera(carreraSrc));
      }
      const index = numCarreras[numCarreras.length - 1].index;
      const carreraSrc = srcData.substring(index);
      carreras.push(procesarCarrera(carreraSrc));
      resolve(carreras);
    });
  });
}

function procesarCarrera(src = "") {
  let ejemplares = [];
  const tr = exe(/<tr>/g, src).map((e) => e.index);
  const trEnd = exe(/<\/tr>/g, src)
    .map((e) => e.index)
    .slice(1);
  for (let i = 0; i < tr.length; i++) {
    const a = tr[i];
    const b = trEnd[i];
    const text = src.substring(a, b);
    const reg = exe(
      /<th bgcolor="#5E0000" class="pp">(?<Numero>\d{1,2})<\/th>\s<th bgcolor="#CCCCCC" class="ganadores">(?<Nombre>[\wñÑ ]+)<\/th>/g,
      text
    );
    if (reg.length > 0) {
      ejemplares.push(reg[0].groups);
    }
  }
  return ejemplares;
}

/**
 * @param {*} regex
 * @param {*} str
 * @return {RegExpExecArray[]}
 */
function exe(regex, str, one = false) {
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

app.get("/", async function (req, res) {
  const id = req.query.id;
  const fecha = req.query.fecha;
  const hipodromo = req.query.hipodromo || "RINCONADA";
  buscarCarrera(id).then((result) => {
    res.json(result);
    guardar(result, fecha, hipodromo);
  });
});

function guardar(carreras, fecha, hipodromo) {
  const ejemplares = JSON.stringify(carreras);
  const formData = new FormData();
  formData.append("fecha", fecha);
  formData.append("hipodromo", hipodromo);
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
      console.log("Carreras cargadas exitosamente a la nube");
    })
    .catch((e) => {
      console.log(e.response);
      console.log("Ocurrio un error al cargar las carreras");
    });
}

app.listen(3000);
