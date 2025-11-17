import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReciboPago, Remito } from '../types';
import { formatCurrency, formatDate } from './formatters';

// Configuración de la empresa
const EMPRESA = {
  nombre: 'KURT argentina',
  direccion: 'San Blas 1837',
  telefono: '+5491160996332',
  email: 'kurtargentina@gmail.com',
  cuit: 'CUIT 30-71483603-8'
};

/**
 * Genera PDF de un recibo de pago
 */
export const generarPDFRecibo = (recibo: ReciboPago): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header - Título y número de recibo
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGO', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(14);
  doc.text(recibo.numeroRecibo || 'PENDIENTE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;

  // Datos de la empresa (izquierda)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text(EMPRESA.nombre, 14, yPos);
  yPos += 5;
  doc.text(EMPRESA.direccion, 14, yPos);
  yPos += 5;
  doc.text(`CUIT: ${EMPRESA.cuit}`, 14, yPos);
  yPos += 5;
  doc.text(`Tel: ${EMPRESA.telefono}`, 14, yPos);

  // Fecha (derecha)
  const fechaY = 35;
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', pageWidth - 70, fechaY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(recibo.fecha), pageWidth - 14, fechaY, { align: 'right' });

  yPos += 10;

  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  // Datos del cliente
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${recibo.nombreCliente}`, 14, yPos);
  yPos += 5;
  doc.text(`Documento: ${recibo.documentoCliente}`, 14, yPos);
  yPos += 5;
  doc.text(`Momento de Cobro: ${recibo.momentoCobro.toUpperCase()}`, 14, yPos);
  yPos += 10;

  // Tabla de ventas relacionadas
  doc.setFont('helvetica', 'bold');
  doc.text('VENTAS INCLUIDAS EN ESTE RECIBO', 14, yPos);
  yPos += 5;

  const ventasData = recibo.ventasRelacionadas.map((venta) => [
    venta.numeroVenta,
    formatCurrency(venta.montoOriginal),
    formatCurrency(venta.saldoAnterior),
    formatCurrency(venta.montoCobrado),
    formatCurrency(venta.saldoRestante)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['N° Venta', 'Monto Original', 'Saldo Anterior', 'Monto Cobrado', 'Saldo Restante']],
    body: ventasData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Tabla de formas de pago
  doc.setFont('helvetica', 'bold');
  doc.text('FORMAS DE PAGO', 14, yPos);
  yPos += 5;

  const formasPagoData = recibo.formasPago.map((fp) => {
    let detalles = fp.medioPago;
    if (fp.banco) detalles += ` - ${fp.banco}`;
    if (fp.observaciones) detalles += ` (${fp.observaciones})`;
    return [detalles, formatCurrency(fp.monto)];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Forma de Pago', 'Monto']],
    body: formasPagoData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 40, halign: 'right' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Totales
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const totalesX = pageWidth - 80;
  
  doc.text('Total a Cobrar:', totalesX, yPos);
  doc.text(formatCurrency(recibo.totales.totalACobrar), pageWidth - 14, yPos, { align: 'right' });
  yPos += 7;
  
  doc.text('Total Cobrado:', totalesX, yPos);
  doc.text(formatCurrency(recibo.totales.totalCobrado), pageWidth - 14, yPos, { align: 'right' });
  yPos += 7;

  if (recibo.totales.vuelto > 0) {
    doc.text('Vuelto:', totalesX, yPos);
    doc.text(formatCurrency(recibo.totales.vuelto), pageWidth - 14, yPos, { align: 'right' });
    yPos += 7;
  }

  if (recibo.totales.saldoPendiente > 0) {
    doc.setTextColor(255, 0, 0);
    doc.text('Saldo Pendiente:', totalesX, yPos);
    doc.text(formatCurrency(recibo.totales.saldoPendiente), pageWidth - 14, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 7;
  }

  // Observaciones
  if (recibo.observaciones) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const observacionesLines = doc.splitTextToSize(recibo.observaciones, pageWidth - 28);
    doc.text(observacionesLines, 14, yPos);
    yPos += observacionesLines.length * 5;
  }

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 30;
  doc.setLineWidth(0.3);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Este documento certifica el pago recibido según los detalles arriba mencionados.',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  
  yPos += 5;
  doc.text(
    `Documento generado el ${formatDate(new Date())}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // Guardar PDF
  doc.save(`Recibo_${recibo.numeroRecibo || 'PENDIENTE'}.pdf`);
};

/**
 * Genera PDF de un remito
 */
export const generarPDFRemito = (remito: Remito): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header - Título y número de remito
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('REMITO', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(14);
  doc.text(remito.numeroRemito, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;

  // Datos de la empresa (izquierda)
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text(EMPRESA.nombre, 14, yPos);
  yPos += 5;
  doc.text(EMPRESA.direccion, 14, yPos);
  yPos += 5;
  doc.text(`CUIT: ${EMPRESA.cuit}`, 14, yPos);

  // Fecha y estado (derecha)
  const fechaY = 35;
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', pageWidth - 70, fechaY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(remito.fecha), pageWidth - 14, fechaY, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO:', pageWidth - 70, fechaY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(remito.estado.toUpperCase(), pageWidth - 14, fechaY + 5, { align: 'right' });

  yPos += 10;

  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  // Datos del cliente
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATARIO', 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${remito.nombreCliente}`, 14, yPos);
  yPos += 5;
  doc.text(`Dirección de Entrega: ${remito.direccionEntrega}`, 14, yPos);
  yPos += 10;

  // Datos de transporte
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE TRANSPORTE', 14, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'normal');
  if (remito.repartidor) {
    doc.text(`Repartidor: ${remito.repartidor}`, 14, yPos);
    yPos += 5;
  }
  if (remito.vehiculo) {
    doc.text(`Vehículo: ${remito.vehiculo}`, 14, yPos);
    yPos += 5;
  }
  if (remito.horaDespacho) {
    doc.text(`Hora Despacho: ${formatDate(remito.horaDespacho)}`, 14, yPos);
    yPos += 5;
  }
  if (remito.horaEntrega) {
    doc.text(`Hora Entrega: ${formatDate(remito.horaEntrega)}`, 14, yPos);
    yPos += 5;
  }
  yPos += 5;

  // Tabla de productos
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTOS', 14, yPos);
  yPos += 5;

  const productosData = remito.items.map((prod) => [
    prod.codigoProducto,
    prod.nombreProducto,
    prod.cantidadSolicitada.toString(),
    prod.cantidadEntregada.toString(),
    prod.observacion || '-'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Código', 'Producto', 'Cant. Solicitada', 'Cant. Entregada', 'Observaciones']],
    body: productosData,
    theme: 'striped',
    headStyles: { fillColor: [76, 175, 80], fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 70 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 35 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Observaciones
  if (remito.observaciones) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const observacionesLines = doc.splitTextToSize(remito.observaciones, pageWidth - 28);
    doc.text(observacionesLines, 14, yPos);
    yPos += observacionesLines.length * 5 + 5;
  }

  // Receptor (si existe)
  if (remito.nombreReceptor) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBIDO POR:', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${remito.nombreReceptor}`, 14, yPos);
    yPos += 5;
    if (remito.dniReceptor) {
      doc.text(`Documento: ${remito.dniReceptor}`, 14, yPos);
      yPos += 5;
    }
  }

  // Firma
  yPos = Math.max(yPos + 20, doc.internal.pageSize.getHeight() - 50);
  doc.setLineWidth(0.3);
  doc.line(14, yPos, 80, yPos);
  doc.line(pageWidth - 80, yPos, pageWidth - 14, yPos);
  yPos += 5;
  
  doc.setFontSize(9);
  doc.text('Firma del Remitente', 47, yPos, { align: 'center' });
  doc.text('Firma del Receptor', pageWidth - 47, yPos, { align: 'center' });

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setLineWidth(0.3);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Documento generado el ${formatDate(new Date())}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // Guardar PDF
  doc.save(`Remito_${remito.numeroRemito}.pdf`);
};
// crear caratula para envio en correo el cual debe poder impimirse las veces que indique numeroBultos ejemplo 1/3, 2/3, 3/3 datos de la empresa, del remito, del cliente(provincia, localidad, direccion) y un espacio grande para pegar la etiqueta de envio
export const generarPDFCaratulaEnvio = (remito: Remito, numeroBulto: number, totalBultos: number): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`BULTO ${numeroBulto}/${totalBultos}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

doc.setFontSize(10);
doc.setFont('helvetica', 'normal');

// Calcular el ancho de cada línea
const nombreWidth = doc.getTextWidth(EMPRESA.nombre);
const direccionWidth = doc.getTextWidth(EMPRESA.direccion);
const telefonoWidth = doc.getTextWidth(`Tel: ${EMPRESA.telefono}`);
const cuitWidth = doc.getTextWidth(`CUIT: ${EMPRESA.cuit}`);

// Función helper para centrar texto
const centerText = (text: string, y: number) => {
  const textWidth = doc.getTextWidth(text);
  const startX = (pageWidth - textWidth) / 2;
  doc.text(text, startX, y);
};

// Imprimir líneas centradas
centerText(EMPRESA.nombre, yPos);
yPos += 5;
centerText(EMPRESA.direccion, yPos);
yPos += 5;
centerText(`Tel: ${EMPRESA.telefono}`, yPos);
yPos += 5;
centerText(`CUIT: ${EMPRESA.cuit}`, yPos);
yPos += 7; // Reducido de 10 a 5 para menos espacio

doc.setFont('helvetica', 'normal');

const x = 14;          // margen izquierdo
const padding = 3;     // espacio interno superior e inferior
const lineHeight = 5;  // espacio entre líneas
const boxWidth = 80;   // ancho del rectángulo (ajustalo según necesites)
const boxHeight = lineHeight * 2 + padding * 2; // alto total del bloque

// 🔹 Dibujar el rectángulo antes del texto
doc.rect(x - 2, yPos - (padding + 2), pageWidth - 26, boxHeight); // (x, y, width, height)

// 🔹 Escribir el contenido dentro del rectángulo
let textY = yPos;
doc.text(`Número de Remito: ${remito.numeroRemito}`, x, textY);
textY += lineHeight;
doc.text(`Fecha: ${formatDate(remito.fecha)}`, x, textY);

// 🔹 Actualizar yPos para continuar debajo del bloque
yPos = yPos + boxHeight + 3; // Reducido de 5 a 3 para menos espacio

// 🔹 Datos del cliente - extraer del objeto cliente populado
const cliente = typeof remito.clienteId === 'string' ? null : remito.clienteId;

// Calcular el alto necesario para el bloque de datos del cliente
let clienteLines = 2; // Nombre y Dirección siempre están
if (cliente && typeof cliente === 'object') {
  if (cliente.ciudad) clienteLines++;
  if (cliente.provincia) clienteLines++;
}
const clienteBoxHeight = lineHeight * clienteLines + padding * 2;

// 🔹 Dibujar el rectángulo para datos del cliente
doc.rect(x - 2, yPos - (padding + 2), pageWidth - 26, clienteBoxHeight);

// 🔹 Escribir el contenido dentro del rectángulo distribuyendo horizontalmente
let clienteY = yPos;
const clienteContent = [];

// Agregar líneas de contenido
clienteContent.push(`Nombre: ${remito.nombreCliente}`);
clienteContent.push(`Dirección: ${remito.direccionEntrega}`);

// Extraer localidad y provincia del cliente si está populado
if (cliente && typeof cliente === 'object') {
  if (cliente.ciudad) {
    clienteContent.push(`Localidad: ${cliente.ciudad}`);
  }
  if (cliente.provincia) {
    clienteContent.push(`Provincia: ${cliente.provincia}`);
  }
}

// Agregar envío por si hay vehículo
if (remito.vehiculo) {
  clienteContent.push(`Envío por: ${remito.vehiculo}`);
}

// Distribuir contenido horizontalmente aprovechando el ancho disponible
const availableWidth = pageWidth - 26 - (x * 2); // Ancho disponible dentro del rectángulo
const maxLineWidth = availableWidth / 2 - 10; // Mitad del ancho para 2 columnas, con margen

let currentRow: string[] = [];
let rowY = clienteY;

clienteContent.forEach((line, index) => {
  currentRow.push(line);

  // Si tenemos 2 elementos o es el último elemento, renderizar la fila
  if (currentRow.length === 2 || index === clienteContent.length - 1) {
    // Calcular posiciones X para las columnas
    const col1X = x;
    const col2X = x + availableWidth / 2 + 10;

    // Renderizar primera columna
    if (currentRow[0]) {
      doc.text(currentRow[0], col1X, rowY);
    }

    // Renderizar segunda columna si existe
    if (currentRow[1]) {
      doc.text(currentRow[1], col2X, rowY);
    }

    // Preparar siguiente fila
    currentRow = [];
    rowY += lineHeight;
  }
});

// 🔹 Actualizar yPos para continuar debajo del bloque del cliente
yPos = yPos + clienteBoxHeight + 3; // Reducido de 5 a 3 para menos espacio

  // Espacio para la etiqueta de envío
  doc.setFont('helvetica', 'bold');
  doc.text('ETIQUETA DE ENVÍO', 14, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.rect(14, yPos, pageWidth - 28, 50);
  yPos += 55;

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 20;
  doc.setLineWidth(0.3);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Documento generado el ${formatDate(new Date())}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // Guardar PDF
  doc.save(`Caratula_Envio_${remito.numeroRemito}_Bulto_${numeroBulto}_de_${totalBultos}.pdf`);
};