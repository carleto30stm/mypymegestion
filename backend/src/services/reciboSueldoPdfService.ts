import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import mongoose from 'mongoose';

// Interfaces
interface IConceptoRecibo {
  codigo: string;
  descripcion: string;
  cantidad?: number;
  unidad?: string;
  haberes: number;
  deducciones: number;
}

interface IDatosEmpleado {
  legajo: string;
  apellido: string;
  nombre: string;
  cuil: string;
  fechaIngreso: string;
  categoria: string;
  puesto: string;
  convenio?: string;
  obraSocial?: string;
  cbu?: string;
  direccion?: string;
}

interface IDatosEmpleador {
  razonSocial: string;
  cuit: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  telefono?: string;
  email?: string;
}

interface IDatosLiquidacion {
  periodo: string;
  fechaLiquidacion: Date;
  fechaPago: Date;
  tipo: 'mensual' | 'quincenal' | 'final';
  formaPago: string;
  lugarPago: string;
  diasTrabajados?: number;
}

interface IReciboSueldoData {
  empleado: IDatosEmpleado;
  empleador: IDatosEmpleador;
  liquidacion: IDatosLiquidacion;
  conceptos: IConceptoRecibo[];
  totales: {
    totalHaberes: number;
    totalDeducciones: number;
    neto: number;
  };
  contribucionesPatronales?: {
    jubilacion: number;
    obraSocial: number;
    pami: number;
    art: number;
    total: number;
  };
  numeroRecibo?: string;
  duplicado?: boolean;
}

// Constantes de diseño
const COLORS = {
  primary: '#1a365d',    // Azul oscuro
  secondary: '#2563eb',  // Azul
  border: '#cbd5e1',     // Gris claro
  text: '#1f2937',       // Gris oscuro
  lightBg: '#f8fafc',    // Fondo claro
  headerBg: '#e2e8f0',   // Fondo header
};

const MARGINS = {
  top: 40,
  bottom: 40,
  left: 40,
  right: 40,
};

/**
 * Servicio para generar Recibos de Sueldo en formato PDF
 * Cumple con los requisitos legales argentinos según:
 * - Ley 20.744 (Ley de Contrato de Trabajo)
 * - Art. 140 LCT: Contenido obligatorio del recibo
 * - Resolución (MTEySS) 1455/2011
 */
export class ReciboSueldoPdfService {
  
  /**
   * Genera el PDF del recibo de sueldo y lo envía como respuesta
   */
  public async generarPDF(data: IReciboSueldoData, res: Response): Promise<void> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: MARGINS,
      info: {
        Title: `Recibo de Sueldo - ${data.empleado.apellido}, ${data.empleado.nombre}`,
        Author: data.empleador.razonSocial,
        Subject: `Período ${data.liquidacion.periodo}`,
        Creator: 'MyPymeGestion',
      }
    });

    // Configurar headers para descarga
    const nombreArchivo = this.generarNombreArchivo(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    
    doc.pipe(res);

    // Generar contenido del recibo (duplicado: original y copia)
    await this.generarContenidoRecibo(doc, data, false); // Original
    
    // Agregar segunda página con copia (para el empleador)
    doc.addPage();
    await this.generarContenidoRecibo(doc, { ...data, duplicado: true }, true);

    doc.end();
  }

  /**
   * Genera el buffer del PDF para almacenamiento
   */
  public async generarBuffer(data: IReciboSueldoData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: MARGINS,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.generarContenidoRecibo(doc, data, false)
        .then(() => {
          doc.addPage();
          return this.generarContenidoRecibo(doc, { ...data, duplicado: true }, true);
        })
        .then(() => doc.end())
        .catch(reject);
    });
  }

  /**
   * Genera el contenido completo del recibo
   */
  private async generarContenidoRecibo(
    doc: PDFKit.PDFDocument, 
    data: IReciboSueldoData,
    esCopia: boolean
  ): Promise<void> {
    let y = MARGINS.top;

    // 1. Encabezado con datos del empleador
    y = this.dibujarEncabezado(doc, data, y, esCopia);

    // 2. Datos del empleado
    y = this.dibujarDatosEmpleado(doc, data, y);

    // 3. Datos de la liquidación
    y = this.dibujarDatosLiquidacion(doc, data, y);

    // 4. Tabla de conceptos
    y = this.dibujarTablaConceptos(doc, data, y);

    // 5. Totales
    y = this.dibujarTotales(doc, data, y);

    // 6. Contribuciones patronales (si aplica)
    if (data.contribucionesPatronales) {
      y = this.dibujarContribucionesPatronales(doc, data, y);
    }

    // 7. Firma y leyenda legal
    this.dibujarFirmaYLeyenda(doc, data, y);
  }

  /**
   * Dibuja el encabezado con datos del empleador
   */
  private dibujarEncabezado(
    doc: PDFKit.PDFDocument, 
    data: IReciboSueldoData, 
    startY: number,
    esCopia: boolean
  ): number {
    const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
    let y = startY;

    // Marca de agua para copia
    if (esCopia) {
      doc.save();
      doc.fillColor('#e2e8f0');
      doc.fontSize(60);
      doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.text('DUPLICADO', 100, doc.page.height / 2 - 100, {
        width: doc.page.width,
        align: 'center'
      });
      doc.restore();
    }

    // Título principal
    doc.fillColor(COLORS.primary);
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('RECIBO DE HABERES', MARGINS.left, y, { 
      width: pageWidth, 
      align: 'center' 
    });
    y += 25;

    // Subtítulo según Ley 20.744
    doc.fontSize(8).font('Helvetica');
    doc.fillColor(COLORS.text);
    doc.text('(Art. 140 - Ley 20.744 de Contrato de Trabajo)', MARGINS.left, y, {
      width: pageWidth,
      align: 'center'
    });
    y += 20;

    // Recuadro del empleador
    const boxHeight = 70;
    doc.rect(MARGINS.left, y, pageWidth, boxHeight).stroke(COLORS.border);
    
    // Logo placeholder y datos empleador
    doc.fontSize(12).font('Helvetica-Bold');
    doc.fillColor(COLORS.primary);
    doc.text(data.empleador.razonSocial, MARGINS.left + 10, y + 10);
    
    doc.fontSize(9).font('Helvetica');
    doc.fillColor(COLORS.text);
    doc.text(`CUIT: ${data.empleador.cuit}`, MARGINS.left + 10, y + 28);
    doc.text(`${data.empleador.direccion}`, MARGINS.left + 10, y + 40);
    doc.text(
      `${data.empleador.localidad}, ${data.empleador.provincia} (${data.empleador.codigoPostal})`,
      MARGINS.left + 10,
      y + 52
    );

    // Número de recibo (derecha)
    if (data.numeroRecibo) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.fillColor(COLORS.secondary);
      doc.text(`Recibo Nº: ${data.numeroRecibo}`, pageWidth - 80, y + 15, {
        width: 120,
        align: 'right'
      });
    }

    // Tipo de copia
    doc.fontSize(8).font('Helvetica');
    doc.fillColor(COLORS.text);
    doc.text(
      esCopia ? 'DUPLICADO - EMPLEADOR' : 'ORIGINAL - EMPLEADO',
      pageWidth - 80,
      y + 55,
      { width: 120, align: 'right' }
    );

    return y + boxHeight + 15;
  }

  /**
   * Dibuja los datos del empleado
   */
  private dibujarDatosEmpleado(
    doc: PDFKit.PDFDocument,
    data: IReciboSueldoData,
    startY: number
  ): number {
    const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
    const colWidth = pageWidth / 2;
    let y = startY;

    // Título sección
    doc.fillColor(COLORS.primary);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('DATOS DEL TRABAJADOR', MARGINS.left, y);
    y += 15;

    // Recuadro
    const boxHeight = 65;
    doc.rect(MARGINS.left, y, pageWidth, boxHeight).stroke(COLORS.border);
    doc.rect(MARGINS.left, y, pageWidth, 15).fill(COLORS.headerBg);

    // Header
    doc.fillColor(COLORS.text);
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Legajo', MARGINS.left + 5, y + 3);
    doc.text('Apellido y Nombre', MARGINS.left + 60, y + 3);
    doc.text('CUIL', MARGINS.left + 250, y + 3);
    doc.text('Fecha Ingreso', MARGINS.left + 350, y + 3);
    doc.text('Antigüedad', MARGINS.left + 440, y + 3);
    y += 15;

    // Datos
    doc.fontSize(9).font('Helvetica');
    const antiguedad = this.calcularAntiguedad(data.empleado.fechaIngreso);
    doc.text(data.empleado.legajo || '-', MARGINS.left + 5, y + 3);
    doc.text(`${data.empleado.apellido}, ${data.empleado.nombre}`, MARGINS.left + 60, y + 3);
    doc.text(data.empleado.cuil || '-', MARGINS.left + 250, y + 3);
    doc.text(this.formatearFecha(data.empleado.fechaIngreso), MARGINS.left + 350, y + 3);
    doc.text(antiguedad, MARGINS.left + 440, y + 3);
    y += 18;

    // Segunda fila
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Categoría', MARGINS.left + 5, y + 3);
    doc.text('Puesto', MARGINS.left + 150, y + 3);
    doc.text('Convenio', MARGINS.left + 300, y + 3);
    doc.text('Obra Social', MARGINS.left + 420, y + 3);
    y += 12;

    doc.fontSize(9).font('Helvetica');
    doc.text(data.empleado.categoria || '-', MARGINS.left + 5, y + 3);
    doc.text(data.empleado.puesto || '-', MARGINS.left + 150, y + 3);
    doc.text(data.empleado.convenio || '-', MARGINS.left + 300, y + 3);
    doc.text(data.empleado.obraSocial || '-', MARGINS.left + 420, y + 3);

    return startY + boxHeight + 25;
  }

  /**
   * Dibuja los datos de la liquidación
   */
  private dibujarDatosLiquidacion(
    doc: PDFKit.PDFDocument,
    data: IReciboSueldoData,
    startY: number
  ): number {
    const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
    let y = startY;

    // Título sección
    doc.fillColor(COLORS.primary);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('DATOS DE LA LIQUIDACIÓN', MARGINS.left, y);
    y += 15;

    // Recuadro
    const boxHeight = 30;
    doc.rect(MARGINS.left, y, pageWidth, boxHeight).stroke(COLORS.border);

    doc.fontSize(9).font('Helvetica');
    doc.fillColor(COLORS.text);
    
    const tipoLiq = {
      'mensual': 'MENSUAL',
      'quincenal': 'QUINCENAL',
      'final': 'LIQUIDACIÓN FINAL'
    }[data.liquidacion.tipo] || 'MENSUAL';

    doc.text(`Período: ${data.liquidacion.periodo}`, MARGINS.left + 10, y + 10);
    doc.text(`Tipo: ${tipoLiq}`, MARGINS.left + 150, y + 10);
    doc.text(`Fecha Liquidación: ${this.formatearFecha(data.liquidacion.fechaLiquidacion)}`, MARGINS.left + 280, y + 10);
    doc.text(`Forma de Pago: ${data.liquidacion.formaPago}`, MARGINS.left + 420, y + 10);

    return y + boxHeight + 15;
  }

  /**
   * Dibuja la tabla de conceptos (haberes y deducciones)
   */
  private dibujarTablaConceptos(
    doc: PDFKit.PDFDocument,
    data: IReciboSueldoData,
    startY: number
  ): number {
    const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
    let y = startY;

    // Título
    doc.fillColor(COLORS.primary);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('CONCEPTOS', MARGINS.left, y);
    y += 15;

    // Columnas: Código | Descripción | Cantidad | Unidad | Haberes | Deducciones
    const cols = [
      { name: 'Código', width: 50 },
      { name: 'Descripción', width: 200 },
      { name: 'Cantidad', width: 60 },
      { name: 'Unidad', width: 50 },
      { name: 'Haberes', width: 80 },
      { name: 'Deducciones', width: 80 }
    ];

    // Header
    doc.rect(MARGINS.left, y, pageWidth, 18).fill(COLORS.headerBg);
    doc.fillColor(COLORS.text);
    doc.fontSize(8).font('Helvetica-Bold');

    let x = MARGINS.left + 5;
    for (const col of cols) {
      doc.text(col.name, x, y + 5, { width: col.width - 5, align: col.name === 'Haberes' || col.name === 'Deducciones' ? 'right' : 'left' });
      x += col.width;
    }
    y += 18;

    // Líneas de datos
    doc.font('Helvetica').fontSize(8);
    const lineHeight = 14;

    for (const concepto of data.conceptos) {
      // Alternar color de fondo
      if (data.conceptos.indexOf(concepto) % 2 === 0) {
        doc.rect(MARGINS.left, y, pageWidth, lineHeight).fill('#f9fafb');
      }

      doc.fillColor(COLORS.text);
      x = MARGINS.left + 5;
      
      doc.text(concepto.codigo || '', x, y + 3, { width: 45 });
      x += 50;
      doc.text(concepto.descripcion, x, y + 3, { width: 195 });
      x += 200;
      doc.text(concepto.cantidad?.toString() || '', x, y + 3, { width: 55, align: 'right' });
      x += 60;
      doc.text(concepto.unidad || '', x, y + 3, { width: 45 });
      x += 50;
      
      if (concepto.haberes > 0) {
        doc.text(this.formatearMonto(concepto.haberes), x, y + 3, { width: 75, align: 'right' });
      }
      x += 80;
      
      if (concepto.deducciones > 0) {
        doc.text(this.formatearMonto(concepto.deducciones), x, y + 3, { width: 75, align: 'right' });
      }

      y += lineHeight;
    }

    // Borde de la tabla
    const tableHeight = (data.conceptos.length * lineHeight) + 18;
    doc.rect(MARGINS.left, startY + 15, pageWidth, tableHeight).stroke(COLORS.border);

    return y + 10;
  }

  /**
   * Dibuja los totales
   */
  private dibujarTotales(
    doc: PDFKit.PDFDocument,
    data: IReciboSueldoData,
    startY: number
  ): number {
    const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
    let y = startY;

    // Recuadro de totales
    const boxWidth = 250;
    const boxX = doc.page.width - MARGINS.right - boxWidth;
    
    // Total Haberes
    doc.rect(boxX, y, boxWidth, 20).fill(COLORS.lightBg);
    doc.fillColor(COLORS.text);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('TOTAL HABERES:', boxX + 10, y + 5);
    doc.text(this.formatearMonto(data.totales.totalHaberes), boxX + 130, y + 5, { 
      width: 110, 
      align: 'right' 
    });
    y += 20;

    // Total Deducciones
    doc.rect(boxX, y, boxWidth, 20).fill(COLORS.lightBg);
    doc.text('TOTAL DEDUCCIONES:', boxX + 10, y + 5);
    doc.text(this.formatearMonto(data.totales.totalDeducciones), boxX + 130, y + 5, { 
      width: 110, 
      align: 'right' 
    });
    y += 20;

    // Neto a pagar (destacado)
    doc.rect(boxX, y, boxWidth, 25).fill(COLORS.primary);
    doc.fillColor('#ffffff');
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('NETO A COBRAR:', boxX + 10, y + 7);
    doc.text(this.formatearMonto(data.totales.neto), boxX + 130, y + 7, { 
      width: 110, 
      align: 'right' 
    });

    // Borde
    doc.rect(boxX, startY, boxWidth, 65).stroke(COLORS.border);

    return y + 35;
  }

  /**
   * Dibuja las contribuciones patronales (informativo)
   */
  private dibujarContribucionesPatronales(
    doc: PDFKit.PDFDocument,
    data: IReciboSueldoData,
    startY: number
  ): number {
    if (!data.contribucionesPatronales) return startY;

    let y = startY;
    
    doc.fillColor(COLORS.text);
    doc.fontSize(8).font('Helvetica');
    doc.text('CONTRIBUCIONES PATRONALES (Informativo - Art. 12 inc. h Ley 24.241):', MARGINS.left, y);
    y += 12;

    const contrib = data.contribucionesPatronales;
    doc.fontSize(7);
    doc.text(
      `Jubilación: ${this.formatearMonto(contrib.jubilacion)} | ` +
      `Obra Social: ${this.formatearMonto(contrib.obraSocial)} | ` +
      `PAMI: ${this.formatearMonto(contrib.pami)} | ` +
      `ART: ${this.formatearMonto(contrib.art)} | ` +
      `TOTAL: ${this.formatearMonto(contrib.total)}`,
      MARGINS.left,
      y
    );

    return y + 20;
  }

  /**
   * Dibuja la sección de firma y leyenda legal
   */
  private dibujarFirmaYLeyenda(
    doc: PDFKit.PDFDocument,
    data: IReciboSueldoData,
    startY: number
  ): void {
    const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
    const y = Math.max(startY + 30, doc.page.height - MARGINS.bottom - 120);

    // Lugar y fecha
    doc.fillColor(COLORS.text);
    doc.fontSize(9).font('Helvetica');
    doc.text(
      `${data.liquidacion.lugarPago}, ${this.formatearFecha(data.liquidacion.fechaPago)}`,
      MARGINS.left,
      y
    );

    // Líneas de firma
    const firmaY = y + 40;
    const firmaWidth = 180;
    
    // Firma empleado
    doc.moveTo(MARGINS.left, firmaY).lineTo(MARGINS.left + firmaWidth, firmaY).stroke(COLORS.border);
    doc.fontSize(8);
    doc.text('Firma del Trabajador', MARGINS.left, firmaY + 5, { width: firmaWidth, align: 'center' });
    doc.text('Aclaración:', MARGINS.left, firmaY + 15, { width: firmaWidth, align: 'center' });

    // Firma empleador
    const firmaEmpX = doc.page.width - MARGINS.right - firmaWidth;
    doc.moveTo(firmaEmpX, firmaY).lineTo(firmaEmpX + firmaWidth, firmaY).stroke(COLORS.border);
    doc.text('Firma y Sello del Empleador', firmaEmpX, firmaY + 5, { width: firmaWidth, align: 'center' });

    // Leyenda legal (Art. 140 LCT)
    const leyendaY = firmaY + 50;
    doc.fontSize(6).font('Helvetica');
    doc.fillColor('#6b7280');
    const leyenda = 
      'El presente recibo cumple con los requisitos del Art. 140 de la Ley de Contrato de Trabajo N° 20.744. ' +
      'Este documento tiene carácter de recibo de pago en los términos del Art. 138 LCT. ' +
      'El trabajador deberá firmar el duplicado y conservar el original. ' +
      'La firma del trabajador importa la recepción conforme de las sumas consignadas. ' +
      'Cualquier reclamo deberá efectuarse dentro del plazo establecido por la legislación vigente.';
    
    doc.text(leyenda, MARGINS.left, leyendaY, {
      width: pageWidth,
      align: 'justify'
    });
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  private formatearMonto(monto: number): string {
    return `$ ${monto.toLocaleString('es-AR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  private formatearFecha(fecha: Date | string): string {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private calcularAntiguedad(fechaIngreso: string): string {
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    const diffTime = hoy.getTime() - ingreso.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years === 0) {
      return `${months} mes(es)`;
    }
    return `${years} año(s) ${months} mes(es)`;
  }

  private generarNombreArchivo(data: IReciboSueldoData): string {
    const apellido = data.empleado.apellido.replace(/\s/g, '_');
    const periodo = data.liquidacion.periodo.replace(/\s/g, '_');
    return `Recibo_${apellido}_${periodo}.pdf`;
  }
}

// Instancia singleton
export const reciboSueldoPdfService = new ReciboSueldoPdfService();

// Tipo exportado para usar en el controller
export type { IReciboSueldoData, IConceptoRecibo, IDatosEmpleado, IDatosEmpleador, IDatosLiquidacion };
