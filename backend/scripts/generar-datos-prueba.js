#!/usr/bin/env node

/**
 * Generador de datos de prueba para testing
 * 
 * Crea múltiples clientes y productos de prueba en la base de datos
 * para facilitar el testing del sistema de facturación.
 * 
 * Uso: node scripts/generar-datos-prueba.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cliente from '../src/models/Cliente.js';
import Producto from '../src/models/Producto.js';

dotenv.config();

const CLIENTES = [
  // Responsables Inscriptos
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '30-71234567-8',
    razonSocial: 'Tech Solutions SA',
    nombre: 'Tech',
    apellido: 'Solutions',
    email: 'info@techsolutions.com',
    telefono: '011-4567-8901',
    direccion: 'Av. Corrientes 1234',
    ciudad: 'Buenos Aires',
    provincia: 'Buenos Aires',
    codigoPostal: '1043',
    condicionIVA: 'Responsable Inscripto',
    saldoCuenta: 0,
    limiteCredito: 500000,
    estado: 'activo',
    observaciones: 'Cliente corporativo - Responsable Inscripto'
  },
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '30-65432109-7',
    razonSocial: 'Industrias Metalúrgicas SRL',
    nombre: 'Industrias',
    apellido: 'Metalúrgicas',
    email: 'ventas@metalurgicas.com.ar',
    telefono: '011-5678-9012',
    direccion: 'Ruta 8 Km 45',
    ciudad: 'Pilar',
    provincia: 'Buenos Aires',
    codigoPostal: '1629',
    condicionIVA: 'Responsable Inscripto',
    saldoCuenta: 0,
    limiteCredito: 1000000,
    estado: 'activo',
    observaciones: 'Gran cliente industrial'
  },
  
  // Monotributistas
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '20-30123456-3',
    razonSocial: 'Juan Carlos Pérez',
    nombre: 'Juan Carlos',
    apellido: 'Pérez',
    email: 'jcperez@gmail.com',
    telefono: '011-6789-0123',
    direccion: 'Calle Falsa 123',
    ciudad: 'San Isidro',
    provincia: 'Buenos Aires',
    codigoPostal: '1642',
    condicionIVA: 'Monotributista',
    saldoCuenta: 0,
    limiteCredito: 50000,
    estado: 'activo',
    observaciones: 'Monotributista - Categoría C'
  },
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '27-25987654-8',
    razonSocial: 'María Fernanda González',
    nombre: 'María Fernanda',
    apellido: 'González',
    email: 'mfgonzalez@hotmail.com',
    telefono: '011-7890-1234',
    direccion: 'Av. Libertador 5678',
    ciudad: 'Vicente López',
    provincia: 'Buenos Aires',
    codigoPostal: '1638',
    condicionIVA: 'Monotributista',
    saldoCuenta: 0,
    limiteCredito: 30000,
    estado: 'activo',
    observaciones: 'Comerciante minorista'
  },
  
  // Consumidores Finales
  {
    tipoDocumento: 'DNI',
    numeroDocumento: '35678901',
    nombre: 'Roberto',
    apellido: 'Fernández',
    email: 'rfernandez@yahoo.com',
    telefono: '011-8901-2345',
    direccion: 'Calle 50 N° 234',
    ciudad: 'La Plata',
    provincia: 'Buenos Aires',
    codigoPostal: '1900',
    condicionIVA: 'Consumidor Final',
    saldoCuenta: 0,
    limiteCredito: 10000,
    estado: 'activo',
    observaciones: 'Cliente ocasional'
  },
  {
    tipoDocumento: 'DNI',
    numeroDocumento: '28543210',
    nombre: 'Ana',
    apellido: 'Martínez',
    email: 'anamartinez@gmail.com',
    telefono: '011-9012-3456',
    direccion: 'Belgrano 890',
    ciudad: 'Quilmes',
    provincia: 'Buenos Aires',
    codigoPostal: '1878',
    condicionIVA: 'Consumidor Final',
    saldoCuenta: 0,
    limiteCredito: 15000,
    estado: 'activo',
    observaciones: 'Cliente frecuente'
  },
  {
    tipoDocumento: 'DNI',
    numeroDocumento: '40123456',
    nombre: 'Diego',
    apellido: 'Rodríguez',
    email: 'drodriguez@outlook.com',
    telefono: '011-0123-4567',
    direccion: 'San Martín 456',
    ciudad: 'Avellaneda',
    provincia: 'Buenos Aires',
    codigoPostal: '1870',
    condicionIVA: 'Consumidor Final',
    saldoCuenta: 0,
    limiteCredito: 0,
    estado: 'activo',
    observaciones: 'Solo contado'
  },
  
  // Exentos
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '30-54321098-6',
    razonSocial: 'Fundación Educativa del Sur',
    nombre: 'Fundación',
    apellido: 'Educativa',
    email: 'info@fundacionsur.org',
    telefono: '011-1234-5678',
    direccion: 'Av. Rivadavia 12345',
    ciudad: 'Buenos Aires',
    provincia: 'Buenos Aires',
    codigoPostal: '1406',
    condicionIVA: 'Exento',
    saldoCuenta: 0,
    limiteCredito: 100000,
    estado: 'activo',
    observaciones: 'ONG - Exento de IVA'
  }
];

const PRODUCTOS = [
  // Tecnología
  {
    codigo: 'NOTE-001',
    nombre: 'Notebook Dell Inspiron 15',
    descripcion: 'Intel Core i5, 8GB RAM, 256GB SSD',
    categoria: 'Tecnología',
    precioCompra: 120000,
    precioVenta: 180000,
    stock: 15,
    stockMinimo: 5,
    unidadMedida: 'UNIDAD',
    proveedor: 'Dell Argentina',
    estado: 'activo'
  },
  {
    codigo: 'NOTE-002',
    nombre: 'Notebook HP Pavilion 14',
    descripcion: 'Intel Core i7, 16GB RAM, 512GB SSD',
    categoria: 'Tecnología',
    precioCompra: 200000,
    precioVenta: 300000,
    stock: 8,
    stockMinimo: 3,
    unidadMedida: 'UNIDAD',
    proveedor: 'HP Argentina',
    estado: 'activo'
  },
  {
    codigo: 'MOUSE-001',
    nombre: 'Mouse Logitech MX Master 3',
    descripcion: 'Wireless, ergonómico, 7 botones',
    categoria: 'Tecnología',
    precioCompra: 12000,
    precioVenta: 18000,
    stock: 30,
    stockMinimo: 10,
    unidadMedida: 'UNIDAD',
    proveedor: 'Logitech',
    estado: 'activo'
  },
  {
    codigo: 'TEC-001',
    nombre: 'Teclado Mecánico Redragon',
    descripcion: 'RGB, switches blue, español',
    categoria: 'Tecnología',
    precioCompra: 8000,
    precioVenta: 12000,
    stock: 25,
    stockMinimo: 8,
    unidadMedida: 'UNIDAD',
    proveedor: 'Redragon',
    estado: 'activo'
  },
  {
    codigo: 'MON-001',
    nombre: 'Monitor Samsung 24" Full HD',
    descripcion: '1920x1080, 75Hz, HDMI',
    categoria: 'Tecnología',
    precioCompra: 45000,
    precioVenta: 68000,
    stock: 12,
    stockMinimo: 4,
    unidadMedida: 'UNIDAD',
    proveedor: 'Samsung',
    estado: 'activo'
  },
  
  // Servicios
  {
    codigo: 'SERV-001',
    nombre: 'Instalación y configuración',
    descripcion: 'Servicio de instalación de equipos',
    categoria: 'Servicios',
    precioCompra: 0,
    precioVenta: 15000,
    stock: 999,
    stockMinimo: 0,
    unidadMedida: 'UNIDAD',
    estado: 'activo'
  },
  {
    codigo: 'SERV-002',
    nombre: 'Soporte técnico (hora)',
    descripcion: 'Hora de soporte técnico remoto o presencial',
    categoria: 'Servicios',
    precioCompra: 0,
    precioVenta: 8000,
    stock: 999,
    stockMinimo: 0,
    unidadMedida: 'UNIDAD',
    estado: 'activo'
  },
  {
    codigo: 'SERV-003',
    nombre: 'Mantenimiento preventivo',
    descripcion: 'Limpieza y optimización de equipos',
    categoria: 'Servicios',
    precioCompra: 0,
    precioVenta: 10000,
    stock: 999,
    stockMinimo: 0,
    unidadMedida: 'UNIDAD',
    estado: 'activo'
  },
  
  // Accesorios
  {
    codigo: 'ACC-001',
    nombre: 'Cable HDMI 2m',
    descripcion: 'Cable HDMI 2.0, 4K',
    categoria: 'Accesorios',
    precioCompra: 500,
    precioVenta: 1200,
    stock: 100,
    stockMinimo: 20,
    unidadMedida: 'UNIDAD',
    proveedor: 'Varios',
    estado: 'activo'
  },
  {
    codigo: 'ACC-002',
    nombre: 'Pendrive 32GB Kingston',
    descripcion: 'USB 3.0, alta velocidad',
    categoria: 'Accesorios',
    precioCompra: 1500,
    precioVenta: 3000,
    stock: 80,
    stockMinimo: 15,
    unidadMedida: 'UNIDAD',
    proveedor: 'Kingston',
    estado: 'activo'
  },
  {
    codigo: 'ACC-003',
    nombre: 'Webcam Logitech C920',
    descripcion: 'Full HD 1080p, micrófono integrado',
    categoria: 'Accesorios',
    precioCompra: 18000,
    precioVenta: 27000,
    stock: 20,
    stockMinimo: 5,
    unidadMedida: 'UNIDAD',
    proveedor: 'Logitech',
    estado: 'activo'
  },
  {
    codigo: 'ACC-004',
    nombre: 'Hub USB 4 puertos',
    descripcion: 'USB 3.0, 4 puertos',
    categoria: 'Accesorios',
    precioCompra: 2000,
    precioVenta: 4000,
    stock: 50,
    stockMinimo: 10,
    unidadMedida: 'UNIDAD',
    proveedor: 'Varios',
    estado: 'activo'
  },
  
  // Software
  {
    codigo: 'SOFT-001',
    nombre: 'Licencia Windows 11 Pro',
    descripcion: 'Licencia original OEM',
    categoria: 'Software',
    precioCompra: 25000,
    precioVenta: 40000,
    stock: 50,
    stockMinimo: 10,
    unidadMedida: 'UNIDAD',
    proveedor: 'Microsoft',
    estado: 'activo'
  },
  {
    codigo: 'SOFT-002',
    nombre: 'Licencia Office 2021 Home',
    descripcion: 'Word, Excel, PowerPoint',
    categoria: 'Software',
    precioCompra: 15000,
    precioVenta: 25000,
    stock: 30,
    stockMinimo: 5,
    unidadMedida: 'UNIDAD',
    proveedor: 'Microsoft',
    estado: 'activo'
  },
  {
    codigo: 'SOFT-003',
    nombre: 'Antivirus Norton 1 año',
    descripcion: 'Protección para 1 dispositivo',
    categoria: 'Software',
    precioCompra: 3000,
    precioVenta: 6000,
    stock: 100,
    stockMinimo: 20,
    unidadMedida: 'UNIDAD',
    proveedor: 'Norton',
    estado: 'activo'
  }
];

async function crearClientes() {
  console.log('\n👥 Creando clientes de prueba...\n');
  
  let creados = 0;
  let existentes = 0;
  
  for (const clienteData of CLIENTES) {
    const existe = await Cliente.findOne({ 
      numeroDocumento: clienteData.numeroDocumento 
    });
    
    if (existe) {
      console.log(`   ⏭️  ${clienteData.razonSocial || `${clienteData.nombre} ${clienteData.apellido}`} - Ya existe`);
      existentes++;
    } else {
      await Cliente.create(clienteData);
      console.log(`   ✅ ${clienteData.razonSocial || `${clienteData.nombre} ${clienteData.apellido}`} - ${clienteData.condicionIVA}`);
      creados++;
    }
  }
  
  console.log(`\n   Total: ${creados} creados, ${existentes} ya existían\n`);
}

async function crearProductos() {
  console.log('\n📦 Creando productos de prueba...\n');
  
  let creados = 0;
  let existentes = 0;
  
  for (const productoData of PRODUCTOS) {
    const existe = await Producto.findOne({ 
      codigo: productoData.codigo 
    });
    
    if (existe) {
      console.log(`   ⏭️  ${productoData.codigo} - ${productoData.nombre} - Ya existe`);
      existentes++;
    } else {
      await Producto.create(productoData);
      console.log(`   ✅ ${productoData.codigo} - ${productoData.nombre}`);
      creados++;
    }
  }
  
  console.log(`\n   Total: ${creados} creados, ${existentes} ya existían\n`);
}

async function mostrarResumen() {
  console.log('\n' + '═'.repeat(70));
  console.log('  RESUMEN DE DATOS DE PRUEBA');
  console.log('═'.repeat(70) + '\n');
  
  const totalClientes = await Cliente.countDocuments();
  const totalProductos = await Producto.countDocuments();
  
  const porCondicion = await Cliente.aggregate([
    { $group: { _id: '$condicionIVA', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  const porCategoria = await Producto.aggregate([
    { $group: { _id: '$categoria', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('👥 Clientes:');
  console.log(`   Total: ${totalClientes}`);
  console.log();
  porCondicion.forEach(item => {
    console.log(`   • ${item._id}: ${item.count}`);
  });
  
  console.log('\n📦 Productos:');
  console.log(`   Total: ${totalProductos}`);
  console.log();
  porCategoria.forEach(item => {
    console.log(`   • ${item._id}: ${item.count}`);
  });
  
  console.log('\n' + '═'.repeat(70));
  console.log('  ✅ Datos de prueba listos para usar');
  console.log('═'.repeat(70) + '\n');
}

async function main() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('  GENERADOR DE DATOS DE PRUEBA');
    console.log('═'.repeat(70));
    
    // Conectar a MongoDB
    console.log('\n📦 Conectando a MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no está configurado en .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado\n');
    
    // Crear clientes
    await crearClientes();
    
    // Crear productos
    await crearProductos();
    
    // Mostrar resumen
    await mostrarResumen();
    
    console.log('💡 Próximos pasos:');
    console.log('   1. Prueba la conexión AFIP: node scripts/test-afip-conexion.js');
    console.log('   2. Crea facturas de prueba: node scripts/test-afip-completo.js 4\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB\n');
  }
}

main();
