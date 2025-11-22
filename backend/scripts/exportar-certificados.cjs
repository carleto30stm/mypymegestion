/**
 * Script para exportar certificados AFIP para deployment (Vercel/Railway)
 * 
 * Este script lee los certificados locales y los prepara para ser
 * copiados como variables de entorno en plataformas de deployment.
 * 
 * USO:
 *   node scripts/exportar-certificados.js
 * 
 * RESULTADO:
 *   - Muestra en consola el contenido de AFIP_CERT y AFIP_KEY
 *   - Formato listo para copiar/pegar en variables de entorno
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exportarCertificados() {
  log('\n🔐 EXPORTADOR DE CERTIFICADOS AFIP', 'bright');
  log('━'.repeat(60), 'cyan');

  const certPath = path.join(__dirname, '..', 'certs', 'cert.crt');
  const keyPath = path.join(__dirname, '..', 'certs', 'private.key');

  // Verificar existencia de archivos
  if (!fs.existsSync(certPath)) {
    log(`\n❌ ERROR: Certificado no encontrado en ${certPath}`, 'red');
    log('\n💡 Solución:', 'yellow');
    log('   1. Genera un nuevo certificado de prueba con: npm run afip:generar-cert', 'yellow');
    log('   2. O copia tu certificado AFIP a backend/certs/cert.crt', 'yellow');
    process.exit(1);
  }

  if (!fs.existsSync(keyPath)) {
    log(`\n❌ ERROR: Clave privada no encontrada en ${keyPath}`, 'red');
    log('\n💡 Solución:', 'yellow');
    log('   1. Genera un nuevo certificado de prueba con: npm run afip:generar-cert', 'yellow');
    log('   2. O copia tu clave privada AFIP a backend/certs/private.key', 'yellow');
    process.exit(1);
  }

  // Leer archivos
  let cert, key;
  try {
    cert = fs.readFileSync(certPath, 'utf8');
    key = fs.readFileSync(keyPath, 'utf8');
  } catch (error) {
    log(`\n❌ ERROR al leer certificados: ${error.message}`, 'red');
    process.exit(1);
  }

  // Validar contenido
  const certValido = cert.includes('BEGIN CERTIFICATE') && cert.includes('END CERTIFICATE');
  const keyValida = 
    (key.includes('BEGIN RSA PRIVATE KEY') && key.includes('END RSA PRIVATE KEY')) ||
    (key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY'));

  if (!certValido) {
    log('\n⚠️  ADVERTENCIA: El certificado no parece tener formato PEM válido', 'yellow');
  }

  if (!keyValida) {
    log('\n⚠️  ADVERTENCIA: La clave privada no parece tener formato PEM válido', 'yellow');
  }

  // Mostrar resultado
  log('\n✅ Certificados encontrados y leídos correctamente', 'green');
  log('\n📋 VARIABLES DE ENTORNO PARA DEPLOYMENT', 'bright');
  log('━'.repeat(60), 'cyan');

  // AFIP_CERT
  log('\n1️⃣  AFIP_CERT', 'blue');
  log('━'.repeat(60), 'cyan');
  log('Copia el siguiente contenido (incluyendo las comillas):\n', 'yellow');
  
  // Escapar saltos de línea para variables de entorno
  const certEscapado = cert.replace(/\n/g, '\\n');
  console.log(`"${certEscapado}"`);

  // AFIP_KEY
  log('\n\n2️⃣  AFIP_KEY', 'blue');
  log('━'.repeat(60), 'cyan');
  log('Copia el siguiente contenido (incluyendo las comillas):\n', 'yellow');
  
  const keyEscapada = key.replace(/\n/g, '\\n');
  console.log(`"${keyEscapada}"`);

  // Instrucciones para Vercel
  log('\n\n📦 CONFIGURACIÓN EN VERCEL', 'bright');
  log('━'.repeat(60), 'cyan');
  log('\n1. Ve a tu proyecto en Vercel Dashboard', 'yellow');
  log('2. Settings → Environment Variables', 'yellow');
  log('3. Agrega las siguientes variables:', 'yellow');
  log('', 'yellow');
  log('   Variable Name: AFIP_CERT', 'cyan');
  log('   Value: [Pega el contenido de AFIP_CERT arriba, SIN las comillas externas]', 'yellow');
  log('', 'yellow');
  log('   Variable Name: AFIP_KEY', 'cyan');
  log('   Value: [Pega el contenido de AFIP_KEY arriba, SIN las comillas externas]', 'yellow');
  log('', 'yellow');
  log('4. Aplica a: Production, Preview, Development (según necesites)', 'yellow');
  log('5. Haz redeploy del proyecto', 'yellow');

  // Instrucciones para Railway
  log('\n\n🚂 CONFIGURACIÓN EN RAILWAY', 'bright');
  log('━'.repeat(60), 'cyan');
  log('\n1. Ve a tu proyecto en Railway Dashboard', 'yellow');
  log('2. Selecciona tu servicio → Variables', 'yellow');
  log('3. Click en "New Variable"', 'yellow');
  log('4. Agrega las siguientes variables:', 'yellow');
  log('', 'yellow');
  log('   Variable: AFIP_CERT', 'cyan');
  log('   Value: [Pega el contenido de AFIP_CERT arriba, SIN las comillas externas]', 'yellow');
  log('', 'yellow');
  log('   Variable: AFIP_KEY', 'cyan');
  log('   Value: [Pega el contenido de AFIP_KEY arriba, SIN las comillas externas]', 'yellow');
  log('', 'yellow');
  log('5. Railway hará redeploy automáticamente', 'yellow');

  // Información adicional
  log('\n\n💡 NOTAS IMPORTANTES', 'bright');
  log('━'.repeat(60), 'cyan');
  log('• NO incluyas las comillas externas al pegar en el panel de variables', 'yellow');
  log('• Los \\n son normales, representan saltos de línea', 'yellow');
  log('• Asegúrate de copiar TODO el contenido (incluyendo BEGIN/END)', 'yellow');
  log('• Estos certificados son SENSIBLES - nunca los subas a GitHub', 'yellow');
  log('• Para homologación AFIP, usa certificados de prueba', 'yellow');
  log('• Para producción, usa certificados oficiales de AFIP', 'yellow');

  // Estadísticas
  log('\n\n📊 ESTADÍSTICAS', 'bright');
  log('━'.repeat(60), 'cyan');
  log(`Certificado: ${cert.length} caracteres (${certEscapado.length} escapado)`, 'cyan');
  log(`Clave privada: ${key.length} caracteres (${keyEscapada.length} escapado)`, 'cyan');
  log('\n✅ Exportación completada exitosamente\n', 'green');
}

// Ejecutar
exportarCertificados();
