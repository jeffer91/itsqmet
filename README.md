# ITSQMET - Validador CCC

Repositorio para construir la app **VCCC - Validador CCC**.

## Objetivo

Crear una aplicación web simple, ordenada y funcional para validar archivos CCC/PEA desde Excel.

## Validaciones principales

- Carga de Redes base.
- Carga de PEA unidades Logros.
- Carga de PEA actividades Logros.
- Validación de estructura completa del CCC.
- Validación de numeración de unidades y componentes.
- Detección de saltos, repeticiones e hijos sin padre.
- Validación de competencias.
- Validación de resultados de aprendizaje.
- Validación de actividades obligatorias para materia o eje.
- Generación de respaldo local en JSON y Excel.

## Estructura inicial

```txt
itsqmet/
├─ README.md
├─ vccc-index.html
├─ css/
│  └─ vccc-estilos-principales.css
└─ js/
   ├─ vccc-menu-superior.js
   ├─ vccc-utilidades.js
   ├─ vccc-configuracion.js
   └─ vccc-lector-excel.js
```

## Estado

Proyecto en construcción.
