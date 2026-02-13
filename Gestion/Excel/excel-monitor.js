// excel-monitor.js
// Log de debugging para saber qué está pasando

(function (window) {
  "use strict";

  const logs = [];
  const enabled = true;

  function log(origen, msg, data) {
    if (!enabled) return;
    const item = { time: new Date().toLocaleString(), origen, msg, data };
    logs.push(item);
    console.log("📘 Monitor:", item);
  }

  function getLogs() { return logs.slice(); }

  window.ExcelMonitor = {
    log,
    getLogs
  };

})(window);
