/* Archivo: crono-pdf.js
Función: Generación de PDF formato Memorando con Logo (Times New Roman 12)
*/

(function(window) {
  "use strict";

  const CronoPDF = {
    
    // Función auxiliar para cargar la imagen local 'logo.png'
    loadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn("No se pudo cargar el logo:", url);
          resolve(null); // Resolvemos con null para no romper el PDF si falla la imagen
        };
      });
    },

    getLongDate(dateObj) {
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      const d = dateObj || new Date();
      return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
    },

    async generate(schedule, periodLabel) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4' // A4: 210 x 297 mm
      });

      // --- CONFIGURACIÓN DE FUENTE (APA 7: Times New Roman 12) ---
      doc.setFont("times", "normal");
      doc.setFontSize(12);

      // --- MÁRGENES ---
      const margin = 25.4; // 1 pulgada (APA 7 estándar)
      let y = 15; 

      // --- 1. LOGO INSTITUCIONAL ---
      // Cargamos la imagen desde el archivo local 'logo.png'
      const logoImg = await this.loadImage('logo.png');

      if (logoImg) {
        // Logo alineado a la izquierda, en su propia fila
        // Ajustamos ancho/alto manteniendo proporción aprox (ej: 50mm ancho)
        const logoWidth = 50; 
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        
        doc.addImage(logoImg, 'PNG', margin, y, logoWidth, logoHeight);
        
        // Bajamos el cursor para que el texto empiece DEBAJO del logo
        y += logoHeight + 10; 
      } else {
        // Fallback si no encuentra la imagen
        y += 10;
      }

      // --- 2. ENCABEZADO MEMORANDO ---
      const today = new Date();
      const memoNum = `MEM-ITSQMET-UTET-${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      
      doc.setFont("times", "bold");
      // Centrado debajo del logo
      doc.text(`Memorando No.: ${memoNum}`, 105, y, { align: "center" });
      
      y += 15;

      // --- 3. DATOS DEL MEMORANDO ---
      // Alineación de etiquetas y valores
      const leftColX = margin; 
      const rightColX = margin + 35; // Sangría para el contenido
      
      const headerData = [
        { label: "PARA:", val: "Estudiantes del proceso de titulación" },
        { label: "PERÍODO:", val: periodLabel }, 
        { label: "DE:", val: "Magíster Jefferson Villarreal" },
        { label: "CARGO:", val: "Coordinador de Titulación" },
        { label: "ASUNTO:", val: "Entrega de cronograma del proceso de titulación" },
        { label: "FECHA:", val: this.getLongDate(today).toUpperCase() }
      ];

      headerData.forEach(item => {
        doc.setFont("times", "bold");
        doc.text(item.label, leftColX, y);
        
        doc.setFont("times", "normal");
        const splitText = doc.splitTextToSize(item.val, 170 - rightColX + margin); 
        doc.text(splitText, rightColX, y);
        
        y += (6 * splitText.length) + 2; 
      });

      y += 5; 

      // --- 4. CUERPO DEL TEXTO ---
      const bodyText = [
        "A quien corresponda:",
        `Por medio del presente, se pone en conocimiento de los estudiantes del proceso de titulación correspondiente al período ${periodLabel} el cronograma oficial del proceso, elaborado conforme a la planificación institucional vigente y a los lineamientos académicos establecidos por el Instituto Tecnológico Superior Quito Metropolitano.`,
        "El cronograma tiene como finalidad orientar, organizar y regular el desarrollo de las actividades académicas y administrativas del proceso de titulación, estableciendo fechas, fases y responsables, cuyo cumplimiento es de carácter obligatorio para todos los estudiantes involucrados.",
        "A continuación, se presenta la tabla correspondiente al cronograma del proceso de titulación:"
      ];

      doc.setFont("times", "normal");
      
      bodyText.forEach((paragraph, idx) => {
        // Texto justificado
        const lines = doc.splitTextToSize(paragraph, 210 - (margin * 2)); 
        doc.text(lines, margin, y, { align: "justify", maxWidth: 210 - (margin * 2) });
        y += (lines.length * 5) + 5; 
      });

      // --- 5. TABLA DE CRONOGRAMA ---
      // Configuración limpia sin notas ni duración
      const tableBody = schedule.map(s => [
        s.orden,
        s.nombre,
        s.fechaInicio,
        s.fechaFin
      ]);

      doc.autoTable({
        head: [['#', 'ACTIVIDAD', 'FECHA INICIO', 'FECHA FIN']],
        body: tableBody,
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid', 
        headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [0, 0, 0], 
          font: 'times',
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [0,0,0],
          halign: 'center'
        },
        bodyStyles: { 
          font: 'times',
          textColor: [0, 0, 0],
          lineWidth: 0.1,
          lineColor: [0,0,0]
        },
        styles: {
          fontSize: 11, // Tamaño legible
          cellPadding: 3,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, // #
          1: { cellWidth: 'auto' }, // Actividad
          2: { cellWidth: 35, halign: 'center' }, // Inicio
          3: { cellWidth: 35, halign: 'center' }  // Fin
        }
      });

      y = doc.lastAutoTable.finalY + 10;

      // Control de salto de página para la firma
      if (y > 230) {
        doc.addPage();
        y = 30;
      }

      // --- 6. TEXTO DE CIERRE ---
      const closingText = [
        "Se exhorta a los estudiantes a revisar detenidamente el cronograma, cumplir estrictamente con los plazos establecidos y atender las disposiciones señaladas, considerando que el incumplimiento de las fechas o actividades programadas podrá afectar la continuidad normal del proceso de titulación.",
        "Para cualquier inquietud o aclaración, deberán canalizar sus consultas a través de los medios institucionales correspondientes.",
        "Sin otro particular, reitero mi consideración y estima institucional.",
        "Atentamente,"
      ];

      closingText.forEach(paragraph => {
        const lines = doc.splitTextToSize(paragraph, 210 - (margin * 2));
        doc.text(lines, margin, y, { align: "justify", maxWidth: 210 - (margin * 2) });
        y += (lines.length * 5) + 5;
      });

      y += 35; // Espacio para firma

      // --- 7. FIRMA ---
      doc.setFont("times", "bold");
      doc.text("Magíster Jefferson Villarreal", margin, y);
      doc.setFont("times", "normal");
      doc.text("Coordinador de Titulación", margin, y + 5);

      // Guardar PDF
      doc.save(`Cronograma_UTET_${periodLabel.replace(/ /g, "_")}.pdf`);
    }
  };

  window.CronoPDF = CronoPDF;
})(window);