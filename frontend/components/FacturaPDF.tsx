import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { Factura } from '../redux/slices/facturasSlice';

interface FacturaPDFProps {
  open: boolean;
  onClose: () => void;
  factura: Factura;
}

const FacturaPDF: React.FC<FacturaPDFProps> = ({ open, onClose, factura }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Generar QR code cuando se abre el diálogo
  useEffect(() => {
    if (open && factura.datosAFIP.CAE) {
      generateQRCode();
    }
  }, [open, factura]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      // Importar QRCode dinámicamente (solo en cliente)
      const QRCode = (await import('qrcode')).default;
      
      // Datos para el QR según especificaciones AFIP
      // Formato: {URL}?p={datos}
      // datos = base64(Json({ver,fecha,cuit,ptoVta,tipoCmp,nroCmp,importe,moneda,ctz,tipoDocRec,nroDocRec,tipoCodAut,codAut}))
      
      const qrData = {
        ver: 1,
        fecha: factura.fecha.split('T')[0].replace(/-/g, ''),
        cuit: parseInt(factura.emisorCUIT.replace(/-/g, '')),
        ptoVta: factura.puntoVenta,
        tipoCmp: getTipoComprobanteCode(factura.tipoComprobante),
        nroCmp: factura.numeroSecuencial,
        importe: factura.importeTotal,
        moneda: factura.monedaId,
        ctz: factura.cotizacionMoneda,
        tipoDocRec: getDocumentType(factura.clienteId.numeroDocumento),
        nroDocRec: parseInt(factura.clienteId.numeroDocumento.replace(/\D/g, '')),
        tipoCodAut: 'E',
        codAut: parseInt(factura.datosAFIP.CAE || '0'),
      };

      // Convertir a base64
      const jsonString = JSON.stringify(qrData);
      const base64Data = btoa(jsonString);
      
      // URL completa del QR
      const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;

      // Generar QR code
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generando QR:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mapeo de tipos de comprobante a códigos AFIP
  const getTipoComprobanteCode = (tipo: string): number => {
    const mapping: Record<string, number> = {
      'FACTURA_A': 1,
      'FACTURA_B': 6,
      'FACTURA_C': 11,
      'NOTA_CREDITO_A': 3,
      'NOTA_CREDITO_B': 8,
      'NOTA_CREDITO_C': 13,
      'NOTA_DEBITO_A': 2,
      'NOTA_DEBITO_B': 7,
      'NOTA_DEBITO_C': 12,
    };
    return mapping[tipo] || 6;
  };

  // Determinar tipo de documento
  const getDocumentType = (doc: string): number => {
    // Si tiene guiones es CUIT/CUIL (80), si no es DNI (96)
    return doc.includes('-') ? 80 : 96;
  };

  // Obtener letra del comprobante
  const getLetraComprobante = (tipo: string): string => {
    if (tipo.includes('_A')) return 'A';
    if (tipo.includes('_B')) return 'B';
    if (tipo.includes('_C')) return 'C';
    return 'X';
  };

  // Formatear fecha
  const formatFecha = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR');
  };

  // Formatear moneda
  const formatMoney = (amount: number): string => {
    return amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Imprimir factura
  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Factura ${factura.datosAFIP.numeroComprobante}</title>
            <style>${getStyles()}</style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  // Descargar como HTML
  const handleDownload = () => {
    if (printRef.current) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Factura ${factura.datosAFIP.numeroComprobante}</title>
          <style>${getStyles()}</style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_${factura.datosAFIP.numeroComprobante}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Estilos CSS
  const getStyles = (): string => {
    return `
      * {
        box-sizing: border-box;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      .bill-container {
        width: 750px;
        position: relative;
        margin: 20px auto;
        border-collapse: collapse;
        font-family: sans-serif;
        font-size: 13px;
      }
      .bill-emitter-row td {
        width: 50%;
        border-bottom: 1px solid;
        padding-top: 10px;
        padding-left: 10px;
        vertical-align: top;
      }
      .bill-emitter-row {
        position: relative;
      }
      .bill-emitter-row td:nth-child(2) {
        padding-left: 60px;
      }
      .bill-emitter-row td:nth-child(1) {
        padding-right: 60px;
      }
      .bill-type {
        border: 1px solid;
        border-top: 1px solid;
        border-bottom: 1px solid;
        background: white;
        width: 60px;
        height: 50px;
        position: absolute;
        left: 0;
        right: 0;
        top: -1px;
        margin: auto;
        text-align: center;
        font-size: 40px;
        font-weight: 600;
      }
      .text-lg {
        font-size: 30px;
      }
      .text-center {
        text-align: center;
      }
      .col-2 { width: 16.66666667%; float: left; }
      .col-3 { width: 25%; float: left; }
      .col-4 { width: 33.3333333%; float: left; }
      .col-5 { width: 41.66666667%; float: left; }
      .col-6 { width: 50%; float: left; }
      .col-8 { width: 66.66666667%; float: left; }
      .col-10 { width: 83.33333333%; float: left; }
      .row {
        overflow: hidden;
      }
      .margin-b-0 {
        margin-bottom: 0px;
      }
      .margin-b-10 {
        margin-bottom: 10px;
      }
      .bill-row td {
        padding-top: 5px;
      }
      .bill-row td > div {
        border-top: 1px solid;
        border-bottom: 1px solid;
        margin: 0 -1px 0 -2px;
        padding: 0 10px 13px 10px;
      }
      .row-details table {
        border-collapse: collapse;
        width: 100%;
      }
      .row-details td > div,
      .row-qrcode td > div {
        border: 0;
        margin: 0 -1px 0 -2px;
        padding: 0;
      }
      .row-details table td {
        padding: 5px;
      }
      .row-details table tr:nth-child(1) {
        border-top: 1px solid;
        border-bottom: 1px solid;
        background: #c0c0c0;
        font-weight: bold;
        text-align: center;
      }
      .row-details table tr + tr {
        border-top: 1px solid #c0c0c0;
      }
      .text-right {
        text-align: right;
      }
      .total-row td > div {
        border-width: 2px;
      }
      .row-qrcode td {
        padding: 10px;
      }
      #qrcode {
        width: 50%;
      }
    `;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Factura {factura.datosAFIP.numeroComprobante}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <div ref={printRef}>
            <table className="bill-container">
              {/* Fila de emisor */}
              <tbody>
              <tr className="bill-emitter-row">
                <td>
                  <div className="bill-type">
                    {getLetraComprobante(factura.tipoComprobante)}
                  </div>
                  <div className="text-lg text-center">
                    {factura.emisorRazonSocial}
                  </div>
                  <p><strong>Razón social:</strong> {factura.emisorRazonSocial}</p>
                  <p><strong>Domicilio Comercial:</strong> {factura.emisorDomicilio}</p>
                  <p><strong>Condición Frente al IVA:</strong> {factura.emisorCondicionIVA}</p>
                </td>
                <td>
                  <div>
                    <div className="text-lg">
                      {factura.tipoComprobante.replace(/_/g, ' ')}
                    </div>
                    <div className="row">
                      <p className="col-6 margin-b-0">
                        <strong>Punto de Venta: {String(factura.puntoVenta).padStart(4, '0')}</strong>
                      </p>
                      <p className="col-6 margin-b-0">
                        <strong>Comp. Nro: {String(factura.numeroSecuencial).padStart(8, '0')}</strong>
                      </p>
                    </div>
                    <p><strong>Fecha de Emisión:</strong> {formatFecha(factura.fecha)}</p>
                    <p><strong>CUIT:</strong> {factura.emisorCUIT}</p>
                    <p><strong>Ingresos Brutos:</strong> Exento</p>
                    <p><strong>Fecha de Inicio de Actividades:</strong> 01/01/2020</p>
                  </div>
                </td>
              </tr>

              {/* Fila de período (opcional - puede omitirse si no aplica) */}
              <tr className="bill-row">
                <td colSpan={2}>
                  <div className="row">
                    <p className="col-4 margin-b-0">
                      <strong>Período Facturado Desde: </strong>{formatFecha(factura.fecha)}
                    </p>
                    <p className="col-3 margin-b-0">
                      <strong>Hasta: </strong>{formatFecha(factura.fecha)}
                    </p>
                    <p className="col-5 margin-b-0">
                      <strong>Fecha de Vto. para el pago: </strong>{formatFecha(factura.fecha)}
                    </p>
                  </div>
                </td>
              </tr>

              {/* Fila de receptor */}
              <tr className="bill-row">
                <td colSpan={2}>
                  <div>
                    <div className="row">
                      <p className="col-4 margin-b-0">
                        <strong>CUIL/CUIT: </strong>{factura.receptorNumeroDocumento}
                      </p>
                      <p className="col-8 margin-b-0">
                        <strong>Apellido y Nombre / Razón social: </strong>
                        {factura.receptorRazonSocial}
                      </p>
                    </div>
                    <div className="row">
                      <p className="col-6 margin-b-0">
                        <strong>Condición Frente al IVA: </strong>{factura.receptorCondicionIVA}
                      </p>
                      <p className="col-6 margin-b-0">
                        <strong>Domicilio: </strong>-
                      </p>
                    </div>
                    <p>
                      <strong>Condición de venta: </strong>Contado
                    </p>
                  </div>
                </td>
              </tr>

              {/* Tabla de items */}
              <tr className="bill-row row-details">
                <td colSpan={2}>
                  <div>
                    <table>
                      <thead>
                        <tr>
                          <td>Código</td>
                          <td>Producto / Servicio</td>
                          <td>Cantidad</td>
                          <td>U. Medida</td>
                          <td>Precio Unit.</td>
                          <td>% Bonif.</td>
                          <td>Imp. Bonif.</td>
                          <td>Subtotal</td>
                        </tr>
                      </thead>
                      <tbody>
                        {factura.items.map((item, index) => (
                          <tr key={index}>
                            <td>{item.codigo}</td>
                            <td>{item.descripcion}</td>
                            <td>{formatMoney(item.cantidad)}</td>
                            <td>{item.unidadMedida}</td>
                            <td>{formatMoney(item.precioUnitario)}</td>
                            <td>{formatMoney((item.importeDescuento / item.importeBruto) * 100)}</td>
                            <td>{formatMoney(item.importeDescuento)}</td>
                            <td>{formatMoney(item.importeTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>

              {/* Totales */}
              <tr className="bill-row total-row">
                <td colSpan={2}>
                  <div>
                    <div className="row text-right">
                      <p className="col-10 margin-b-0">
                        <strong>Subtotal: $</strong>
                      </p>
                      <p className="col-2 margin-b-0">
                        <strong>{formatMoney(factura.subtotal)}</strong>
                      </p>
                    </div>
                    {factura.importeIVA > 0 && (
                      <div className="row text-right">
                        <p className="col-10 margin-b-0">
                          <strong>IVA: $</strong>
                        </p>
                        <p className="col-2 margin-b-0">
                          <strong>{formatMoney(factura.importeIVA)}</strong>
                        </p>
                      </div>
                    )}
                    <div className="row text-right">
                      <p className="col-10 margin-b-0">
                        <strong>Importe Otros Tributos: $</strong>
                      </p>
                      <p className="col-2 margin-b-0">
                        <strong>{formatMoney(factura.importeOtrosTributos)}</strong>
                      </p>
                    </div>
                    <div className="row text-right">
                      <p className="col-10 margin-b-0">
                        <strong>Importe total: $</strong>
                      </p>
                      <p className="col-2 margin-b-0">
                        <strong>{formatMoney(factura.importeTotal)}</strong>
                      </p>
                    </div>
                  </div>
                </td>
              </tr>

              {/* QR y CAE */}
              {factura.datosAFIP.CAE && (
                <tr className="bill-row row-qrcode">
                  <td>
                    <div>
                      <div className="row">
                        {qrCodeDataUrl && (
                          <img 
                            id="qrcode" 
                            src={qrCodeDataUrl} 
                            alt="QR Code AFIP"
                            style={{ width: '50%' }}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="row text-right margin-b-10">
                        <strong>CAE Nº:&nbsp;</strong> {factura.datosAFIP.CAE}
                      </div>
                      <div className="row text-right">
                        <strong>Fecha de Vto. de CAE:&nbsp;</strong> 
                        {factura.datosAFIP.CAEVencimiento && formatFecha(factura.datosAFIP.CAEVencimiento)}
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {/* Footer */}
              <tr className="bill-row row-details">
                <td colSpan={2}>
                  <div>
                    <div className="row text-center margin-b-10">
                      <span style={{ verticalAlign: 'bottom' }}>Generado con myGestor</span>
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDownload} startIcon={<DownloadIcon />}>
          Descargar HTML
        </Button>
        <Button onClick={handlePrint} startIcon={<PrintIcon />} variant="contained">
          Imprimir
        </Button>
      </DialogActions>

      {/* Inyectar estilos en el componente */}
      <style>{getStyles()}</style>
    </Dialog>
  );
};

export default FacturaPDF;
