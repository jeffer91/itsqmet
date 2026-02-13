@echo off
rem ============================================
rem Convierte .html, .js y .css a .txt
rem Sin modificar los archivos originales
rem Crea copias en la carpeta "txt_convertidos"
rem ============================================

rem Ir a la carpeta donde está este .bat
cd /d "%~dp0"

rem Nombre de la carpeta de salida
set "DEST=txt_convertidos"

rem Crear la carpeta si no existe
if not exist "%DEST%" (
    mkdir "%DEST%"
)

echo Convirtiendo archivos a .txt...
echo.

rem Recorrer todos los .html, .js y .css
for %%F in (*.html *.js *.css) do (
    if exist "%%F" (
        echo Copiando: %%F  ^>  %DEST%\%%~nxF.txt
        copy "%%F" "%DEST%\%%~nxF.txt" >nul
    )
)

echo.
echo Proceso terminado.
echo Los archivos convertidos están en: %DEST%
pause
