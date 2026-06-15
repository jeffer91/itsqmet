/*
=========================================================
Nombre completo: vccc-interfaz.js
Ruta o ubicación: /js/vccc-interfaz.js

Función o funciones:
1. Mostrar alertas generales de la app.
2. Pintar resumen, puntajes y detalle de observaciones.
3. Mostrar historial local de validaciones aprobadas.
4. Actualizar estado global visible en el inicio.
5. Limpiar la interfaz cuando se reinicia el formulario.

Con qué se comunica:
- vccc-index.html
- vccc-estilos-principales.css
- vccc-utilidades.js
- vccc-validador-ccc.js
- vccc-almacen-exportador.js
- vccc-aplicacion.js

Qué aporta:
- Convierte los resultados técnicos en una vista clara y fácil de revisar.
- Separa la pintura de pantalla de la lógica de validación.
=========================================================
*/

(function (window, document) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var U = VCCC.Utilidades;

  function obtener(id) {
    return document.getElementById(id);
  }

  function mostrarAlerta(tipo, mensaje) {
    var caja = obtener("vccc-alerta");
    if (!caja) return;

    caja.hidden = false;
    caja.className = "vccc-alerta " + (tipo || "info");
    caja.textContent = mensaje || "";
  }

  function limpiarAlerta() {
    var caja = obtener("vccc-alerta");
    if (!caja) return;

    caja.hidden = true;
    caja.textContent = "";
    caja.className = "vccc-alerta";
  }

  function actualizarEstadoGlobal(estado, detalle) {
    var estadoGlobal = obtener("vccc-estado-global");
    var estadoDetalle = obtener("vccc-estado-detalle");

    if (estadoGlobal) estadoGlobal.textContent = estado || "Sin validar";
    if (estadoDetalle) estadoDetalle.textContent = detalle || "Carga los archivos para iniciar.";
  }

  function tarjeta(titulo, valor, nota) {
    return [
      '<div class="vccc-card-resumen">',
      '<span>', U.escapeHTML(titulo), '</span>',
      '<strong>', U.escapeHTML(valor), '</strong>',
      '<small>', U.escapeHTML(nota), '</small>',
      '</div>'
    ].join("");
  }

  function metrica(titulo, valor) {
    return [
      '<div class="vccc-metrica">',
      '<span>', U.escapeHTML(titulo), '</span>',
      '<strong>', U.escapeHTML(valor), '%</strong>',
      '</div>'
    ].join("");
  }

  function pintarResumen(resultado) {
    var contenedor = obtener("vccc-resumen");
    if (!contenedor || !resultado) return;

    var resumen = resultado.resumen || {};
    var puntajes = resultado.puntajes || {};

    contenedor.className = "";
    contenedor.innerHTML = [
      '<div class="vccc-resumen-grid">',
      tarjeta("Estado", resultado.estado || "Sin estado", "Resultado general"),
      tarjeta("Puntaje", (puntajes.general || 0) + "%", "Promedio de validación"),
      tarjeta("Errores críticos", resumen.criticos || 0, "Deben corregirse para aprobar"),
      tarjeta("Advertencias", resumen.advertencias || 0, "Recomendaciones importantes"),
      '</div>',
      '<div class="vccc-metricas">',
      metrica("Estructura", puntajes.Estructura || 0),
      metrica("Numeración", puntajes.Numeración || 0),
      metrica("Competencias", puntajes.Competencias || 0),
      metrica("Resultados", puntajes.Resultados || 0),
      metrica("Actividades", puntajes.Actividades || 0),
      metrica("Alineación", puntajes.Alineación || 0),
      '</div>'
    ].join("");

    actualizarEstadoGlobal(resultado.estado, "Último puntaje: " + (puntajes.general || 0) + "%");
  }

  function agruparObservaciones(observaciones) {
    var grupos = {};

    (observaciones || []).forEach(function (obs) {
      var clave = obs.seccion || "General";
      if (!grupos[clave]) grupos[clave] = [];
      grupos[clave].push(obs);
    });

    return grupos;
  }

  function pintarDetalle(resultado) {
    var contenedor = obtener("vccc-detalle");
    if (!contenedor || !resultado) return;

    var observaciones = resultado.observaciones || [];

    if (!observaciones.length) {
      contenedor.className = "vccc-vacio";
      contenedor.textContent = "No se detectaron observaciones. El CCC está listo para aprobación.";
      return;
    }

    var grupos = agruparObservaciones(observaciones);
    var html = "";

    Object.keys(grupos).forEach(function (seccion) {
      html += '<div class="vccc-grupo">';
      html += '<h3>' + U.escapeHTML(seccion) + '</h3>';
      html += '<table class="vccc-tabla">';
      html += '<thead><tr><th>Tipo</th><th>Observación</th><th>Detalle</th><th>Referencia</th></tr></thead>';
      html += '<tbody>';

      grupos[seccion].forEach(function (obs) {
        html += '<tr>';
        html += '<td><span class="vccc-badge ' + U.escapeHTML(obs.severidad) + '">' + U.escapeHTML(obs.severidad) + '</span></td>';
        html += '<td><strong>' + U.escapeHTML(obs.titulo) + '</strong><br>' + U.escapeHTML(obs.mensaje) + '</td>';
        html += '<td>' + U.escapeHTML(obs.detalle || '-') + '</td>';
        html += '<td>' + U.escapeHTML(obs.referencia || '-') + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div>';
    });

    contenedor.className = "";
    contenedor.innerHTML = html;
  }

  function pintarResultado(resultado) {
    pintarResumen(resultado);
    pintarDetalle(resultado);
  }

  function pintarHistorial(registros) {
    var contenedor = obtener("vccc-historial");
    if (!contenedor) return;

    if (!registros || !registros.length) {
      contenedor.className = "vccc-vacio";
      contenedor.textContent = "No hay respaldos locales todavía.";
      return;
    }

    contenedor.className = "vccc-historial-lista";
    contenedor.innerHTML = registros.slice().reverse().slice(0, 20).map(function (r) {
      return [
        '<div class="vccc-historial-item">',
        '<strong>', U.escapeHTML(r.asignatura), '</strong>',
        '<span>', U.escapeHTML(r.carrera), ' | ', U.escapeHTML(r.nivel), ' | ', U.escapeHTML(r.tipo), '</span>',
        '<span>Fecha: ', U.escapeHTML(r.fecha), ' ', U.escapeHTML(r.hora), ' | Estado: ', U.escapeHTML(r.estado), ' | Puntaje: ', U.escapeHTML(r.puntajeGeneral), '%</span>',
        '</div>'
      ].join("");
    }).join("");
  }

  function limpiarResultado() {
    var resumen = obtener("vccc-resumen");
    var detalle = obtener("vccc-detalle");

    if (resumen) {
      resumen.className = "vccc-vacio";
      resumen.textContent = "Aún no se ha ejecutado una validación.";
    }

    if (detalle) {
      detalle.className = "vccc-vacio";
      detalle.textContent = "No hay observaciones para mostrar.";
    }

    actualizarEstadoGlobal("Sin validar", "Carga los archivos para iniciar.");
    limpiarAlerta();
  }

  VCCC.Interfaz = {
    mostrarAlerta: mostrarAlerta,
    limpiarAlerta: limpiarAlerta,
    actualizarEstadoGlobal: actualizarEstadoGlobal,
    pintarResultado: pintarResultado,
    pintarHistorial: pintarHistorial,
    limpiarResultado: limpiarResultado
  };
})(window, document);
