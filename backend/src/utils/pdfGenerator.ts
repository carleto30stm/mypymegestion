import PDFDocument from 'pdfkit';
import type { Response } from 'express';

interface DatosEmpresa {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  cuit?: string;
}

interface DatosCliente {
  razonSocial?: string | undefined;
  apellido?: string | undefined;
  nombre?: string | undefined;
  numeroDocumento: string;
  direccion?: string | undefined;
  telefono?: string | undefined;
  email?: string | undefined;
}

interface MovimientoCuentaCorriente {
  fecha: Date;
  tipo: string;
  documento: string;
  concepto: string;
  debe: number;
  haber: number;
  saldo: number;
  anulado?: boolean;
}

interface ResumenCuentaCorriente {
  saldoActual: number;
  limiteCredito: number;
  creditoDisponible: number;
  estado: string;
  porcentajeUso: number;
}

interface InteresPunitorio {
  documentoRelacionado: {
    tipo: string;
    numero: string;
    numeroDocumento: string;
  };
  capitalOriginal: number;
  tasaMensual: number;
  tasaDiaria: number;
  fechaInicio: Date;
  fechaUltimoCalculo: Date;
  diasTranscurridos: number;
  montoDevengado: number;
  montoCobrado: number;
  montoCondonado: number;
  montoPendiente: number;
  estado: string;
}

export class PDFGenerator {
  private doc: PDFKit.PDFDocument;
  private yPosition: number = 0;
  private readonly pageWidth: number = 595.28; // A4 width in points
  private readonly pageHeight: number = 841.89; // A4 height in points
  private readonly margin: number = 50;
  private readonly contentWidth: number;

  constructor() {
    this.doc = new PDFDocument({ size: 'A4', margin: this.margin });
    this.contentWidth = this.pageWidth - 2 * this.margin;
    this.yPosition = this.margin;
  }

  // Método para escribir el PDF a un Response de Express
  public pipe(res: Response): void {
    this.doc.pipe(res);
  }

  // Método para finalizar el documento
  public end(): void {
    this.doc.end();
  }

  // Verificar si necesitamos nueva página
  private checkPageBreak(requiredSpace: number = 100): void {
    if (this.yPosition + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }
  }

  // Encabezado con datos de la empresa
  private drawHeader(datosEmpresa: DatosEmpresa): void {
    // Logo o nombre de empresa (en negrita y grande)
    this.doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(datosEmpresa.nombre, this.margin, this.yPosition, { align: 'center' });
    
    this.yPosition += 25;

    // Datos de empresa
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .text(datosEmpresa.direccion, this.margin, this.yPosition, { align: 'center' });
    
    this.yPosition += 12;

    this.doc.text(
      `Tel: ${datosEmpresa.telefono} | Email: ${datosEmpresa.email}${datosEmpresa.cuit ? ` | CUIT: ${datosEmpresa.cuit}` : ''}`,
      this.margin,
      this.yPosition,
      { align: 'center' }
    );

    this.yPosition += 20;

    // Línea separadora
    this.doc
      .moveTo(this.margin, this.yPosition)
      .lineTo(this.pageWidth - this.margin, this.yPosition)
      .stroke();

    this.yPosition += 15;
  }

  // Título del documento
  private drawTitle(titulo: string): void {
    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(titulo, this.margin, this.yPosition, { align: 'center' });

    this.yPosition += 25;
  }

  // Información del cliente
  private drawClienteInfo(cliente: DatosCliente, fecha: Date): void {
    const nombreCompleto = cliente.razonSocial || `${cliente.apellido}, ${cliente.nombre}`;

    // Box con fondo gris claro
    this.doc
      .rect(this.margin, this.yPosition, this.contentWidth, 70)
      .fillAndStroke('#f5f5f5', '#cccccc');

    this.yPosition += 10;

    // Datos del cliente
    this.doc
      .fillColor('#000000')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('CLIENTE:', this.margin + 10, this.yPosition);

    this.doc
      .font('Helvetica')
      .text(nombreCompleto, this.margin + 80, this.yPosition);

    this.yPosition += 15;

    this.doc
      .font('Helvetica-Bold')
      .text('DOCUMENTO:', this.margin + 10, this.yPosition);

    this.doc
      .font('Helvetica')
      .text(cliente.numeroDocumento, this.margin + 80, this.yPosition);

    this.yPosition += 15;

    if (cliente.direccion) {
      this.doc
        .font('Helvetica-Bold')
        .text('DIRECCIÓN:', this.margin + 10, this.yPosition);

      this.doc
        .font('Helvetica')
        .text(cliente.direccion, this.margin + 80, this.yPosition);

      this.yPosition += 15;
    }

    // Fecha de emisión
    this.doc
      .font('Helvetica-Bold')
      .text('FECHA EMISIÓN:', this.margin + 10, this.yPosition);

    this.doc
      .font('Helvetica')
      .text(this.formatDate(fecha), this.margin + 110, this.yPosition);

    this.yPosition += 25;
  }

  // Resumen de cuenta corriente
  private drawResumenCuenta(resumen: ResumenCuentaCorriente): void {
    this.checkPageBreak(100);

    this.doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('RESUMEN DE CUENTA', this.margin, this.yPosition);

    this.yPosition += 20;

    // Tabla de resumen
    const data = [
      ['Límite de Crédito:', this.formatCurrency(resumen.limiteCredito)],
      ['Saldo Actual:', this.formatCurrency(resumen.saldoActual), resumen.saldoActual > 0 ? '(Debe)' : '(A Favor)'],
      ['Crédito Disponible:', this.formatCurrency(resumen.creditoDisponible)],
      ['% Utilizado:', `${resumen.porcentajeUso.toFixed(2)}%`],
      ['Estado:', resumen.estado.toUpperCase()]
    ];

    data.forEach(([label, valor, extra]) => {
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(label || '', this.margin + 10, this.yPosition, { width: 150 });

      const valorColor = label === 'Saldo Actual:' && resumen.saldoActual > 0 ? '#d32f2f' : '#000000';
      
      this.doc
        .fillColor(valorColor)
        .font('Helvetica')
        .text(valor || '', this.margin + 170, this.yPosition, { width: 150 });

      if (extra) {
        this.doc
          .fillColor('#666666')
          .fontSize(9)
          .text(extra, this.margin + 270, this.yPosition);
      }

      this.doc.fillColor('#000000');
      this.yPosition += 18;
    });

    this.yPosition += 10;
  }

  // Tabla de movimientos
  private drawMovimientos(movimientos: MovimientoCuentaCorriente[]): void {
    this.checkPageBreak(150);

    this.doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('DETALLE DE MOVIMIENTOS', this.margin, this.yPosition);

    this.yPosition += 20;

    // Encabezados de tabla
    const headers = ['Fecha', 'Tipo', 'Documento', 'Concepto', 'Debe', 'Haber', 'Saldo'];
    const columnWidths = [60, 60, 65, 130, 60, 60, 60];
    let xPos = this.margin;

    // Fondo de encabezado
    this.doc
      .rect(this.margin, this.yPosition, this.contentWidth, 20)
      .fillAndStroke('#4a4a4a', '#000000');

    this.yPosition += 5;

    // Texto de encabezados
    this.doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold');

    headers.forEach((header, i) => {
      const width = columnWidths[i] || 60;
      this.doc.text(header, xPos, this.yPosition, { width, align: 'center' });
      xPos += width;
    });

    this.doc.fillColor('#000000');
    this.yPosition += 20;

    // Filas de datos
    movimientos.forEach((mov, index) => {
      this.checkPageBreak(25);

      // Fondo alternado
      if (index % 2 === 0) {
        this.doc
          .rect(this.margin, this.yPosition, this.contentWidth, 20)
          .fill('#f9f9f9');
      }

      xPos = this.margin;
      this.doc
        .fillColor(mov.anulado ? '#999999' : '#000000')
        .fontSize(8)
        .font('Helvetica');

      const rowData = [
        this.formatDate(mov.fecha),
        this.getTipoLabel(mov.tipo),
        mov.documento,
        mov.concepto.substring(0, 30) + (mov.concepto.length > 30 ? '...' : ''),
        mov.debe > 0 ? this.formatCurrency(mov.debe) : '-',
        mov.haber > 0 ? this.formatCurrency(mov.haber) : '-',
        this.formatCurrency(mov.saldo)
      ];

      rowData.forEach((text, i) => {
        const align = i >= 4 ? 'right' : 'left';
        const width = columnWidths[i] || 60;
        this.doc.text(text, xPos + 2, this.yPosition + 5, { width: width - 4, align });
        xPos += width;
      });

      if (mov.anulado) {
        this.doc
          .fontSize(7)
          .fillColor('#d32f2f')
          .text('ANULADO', this.margin + this.contentWidth - 50, this.yPosition + 5);
      }

      this.yPosition += 20;
    });

    this.doc.fillColor('#000000');
    this.yPosition += 10;
  }

  // Tabla de intereses punitorios
  private drawIntereses(intereses: InteresPunitorio[]): void {
    this.checkPageBreak(150);

    this.doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('INTERESES PUNITORIOS', this.margin, this.yPosition);

    this.yPosition += 20;

    if (intereses.length === 0) {
      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text('No hay intereses punitorios registrados.', this.margin + 10, this.yPosition);
      
      this.yPosition += 30;
      return;
    }

    intereses.forEach((interes, index) => {
      this.checkPageBreak(120);

      // Box para cada interés
      this.doc
        .rect(this.margin, this.yPosition, this.contentWidth, 110)
        .stroke('#cccccc');

      this.yPosition += 10;

      // Documento relacionado
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${interes.documentoRelacionado.tipo} Nº ${interes.documentoRelacionado.numero}`, this.margin + 10, this.yPosition);

      // Estado
      const estadoColor = interes.estado === 'devengando' ? '#ff9800' : interes.estado === 'cobrado_total' ? '#4caf50' : '#666666';
      this.doc
        .fillColor(estadoColor)
        .fontSize(9)
        .text(interes.estado.toUpperCase().replace('_', ' '), this.margin + this.contentWidth - 120, this.yPosition);

      this.doc.fillColor('#000000');
      this.yPosition += 18;

      // Información en dos columnas
      const leftX = this.margin + 10;
      const rightX = this.margin + this.contentWidth / 2 + 10;

      this.doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Capital Original: ${this.formatCurrency(interes.capitalOriginal)}`, leftX, this.yPosition);

      this.doc.text(`Tasa Mensual: ${interes.tasaMensual.toFixed(3)}%`, rightX, this.yPosition);
      this.yPosition += 14;

      this.doc.text(`Tasa Diaria: ${interes.tasaDiaria.toFixed(6)}%`, leftX, this.yPosition);
      this.doc.text(`Días: ${interes.diasTranscurridos}`, rightX, this.yPosition);
      this.yPosition += 14;

      this.doc.text(`Desde: ${this.formatDate(interes.fechaInicio)}`, leftX, this.yPosition);
      this.doc.text(`Hasta: ${this.formatDate(interes.fechaUltimoCalculo)}`, rightX, this.yPosition);
      this.yPosition += 18;

      // Montos (resaltados)
      this.doc
        .font('Helvetica-Bold')
        .text(`Devengado: ${this.formatCurrency(interes.montoDevengado)}`, leftX, this.yPosition);

      this.doc.text(`Cobrado: ${this.formatCurrency(interes.montoCobrado)}`, rightX, this.yPosition);
      this.yPosition += 14;

      this.doc
        .fillColor('#d32f2f')
        .text(`PENDIENTE: ${this.formatCurrency(interes.montoPendiente)}`, leftX, this.yPosition);

      this.doc
        .fillColor('#666666')
        .font('Helvetica')
        .text(`Condonado: ${this.formatCurrency(interes.montoCondonado)}`, rightX, this.yPosition);

      this.doc.fillColor('#000000');
      this.yPosition += 25;
    });

    this.yPosition += 10;
  }

  // Resumen de intereses
  private drawResumenIntereses(intereses: InteresPunitorio[]): void {
    this.checkPageBreak(80);

    const totalDevengado = intereses.reduce((sum, i) => sum + i.montoDevengado, 0);
    const totalCobrado = intereses.reduce((sum, i) => sum + i.montoCobrado, 0);
    const totalCondonado = intereses.reduce((sum, i) => sum + i.montoCondonado, 0);
    const totalPendiente = intereses.reduce((sum, i) => sum + i.montoPendiente, 0);

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('RESUMEN DE INTERESES', this.margin, this.yPosition);

    this.yPosition += 20;

    // Box resumen
    this.doc
      .rect(this.margin, this.yPosition, this.contentWidth, 60)
      .fillAndStroke('#fff3e0', '#ff9800');

    this.yPosition += 10;

    const summaryData = [
      ['Total Devengado:', this.formatCurrency(totalDevengado)],
      ['Total Cobrado:', this.formatCurrency(totalCobrado)],
      ['Total Condonado:', this.formatCurrency(totalCondonado)],
      ['TOTAL PENDIENTE:', this.formatCurrency(totalPendiente)]
    ];

    summaryData.forEach(([label, valor], index) => {
      const isFinal = index === summaryData.length - 1;
      
      this.doc
        .fontSize(isFinal ? 11 : 9)
        .font(isFinal ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(isFinal ? '#d32f2f' : '#000000')
        .text(label || '', this.margin + 10, this.yPosition, { width: 200 });

      this.doc.text(valor || '', this.margin + 220, this.yPosition, { width: 150, align: 'right' });

      this.yPosition += isFinal ? 15 : 12;
    });

    this.doc.fillColor('#000000');
    this.yPosition += 10;
  }

  // Footer
  private drawFooter(): void {
    const footerY = this.pageHeight - this.margin + 20;

    this.doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        'Este documento es informativo y no representa un documento fiscal.',
        this.margin,
        footerY,
        { align: 'center', width: this.contentWidth }
      );

    this.doc.text(
      `Generado el ${this.formatDateTime(new Date())}`,
      this.margin,
      footerY + 12,
      { align: 'center', width: this.contentWidth }
    );

    this.doc.fillColor('#000000');
  }

  // Utilidades de formato
  private formatCurrency(amount: number): string {
    return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getTipoLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'venta': 'Venta',
      'recibo': 'Cobro',
      'nota_credito': 'N. Créd.',
      'nota_debito': 'N. Déb.',
      'ajuste_cargo': 'Ajuste +',
      'ajuste_descuento': 'Ajuste -'
    };
    return tipos[tipo] || tipo;
  }

  // ========== MÉTODOS PÚBLICOS PARA GENERAR CADA TIPO DE PDF ==========

  /**
   * Genera PDF completo de estado de cuenta con movimientos e intereses
   */
  public generarEstadoCuentaCompleto(
    datosEmpresa: DatosEmpresa,
    cliente: DatosCliente,
    resumen: ResumenCuentaCorriente,
    movimientos: MovimientoCuentaCorriente[],
    intereses: InteresPunitorio[]
  ): void {
    this.drawHeader(datosEmpresa);
    this.drawTitle('ESTADO DE CUENTA');
    // Subtitulo indicando inclusión de intereses
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Incluye Intereses: Sí', this.margin, this.yPosition, { align: 'center' });
    this.yPosition += 18;
    this.drawClienteInfo(cliente, new Date());
    this.drawResumenCuenta(resumen);
    this.drawMovimientos(movimientos);
    
    if (intereses.length > 0) {
      this.drawIntereses(intereses);
      this.drawResumenIntereses(intereses);
    }

    this.drawFooter();
  }

  /**
   * Genera PDF solo de movimientos de cuenta corriente
   */
  public generarResumenMovimientos(
    datosEmpresa: DatosEmpresa,
    cliente: DatosCliente,
    resumen: ResumenCuentaCorriente,
    movimientos: MovimientoCuentaCorriente[]
  ): void {
    this.drawHeader(datosEmpresa);
    this.drawTitle('RESUMEN DE MOVIMIENTOS');
    // Subtitulo indicando exclusión de intereses
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Incluye Intereses: No', this.margin, this.yPosition, { align: 'center' });
    this.yPosition += 18;
    this.drawClienteInfo(cliente, new Date());
    this.drawResumenCuenta(resumen);
    this.drawMovimientos(movimientos);
    this.drawFooter();
  }

  /**
   * Genera PDF solo de intereses punitorios
   */
  public generarReporteIntereses(
    datosEmpresa: DatosEmpresa,
    cliente: DatosCliente,
    intereses: InteresPunitorio[]
  ): void {
    this.drawHeader(datosEmpresa);
    this.drawTitle('INTERESES PUNITORIOS');
    this.drawClienteInfo(cliente, new Date());
    this.drawIntereses(intereses);
    this.drawResumenIntereses(intereses);
    this.drawFooter();
  }
}
