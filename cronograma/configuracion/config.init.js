import { ConfigApp } from "./config.ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  try{
    await ConfigApp.boot();
  }catch(err){
    console.error(err);
    alert("No se pudo iniciar el módulo.");
  }
});
