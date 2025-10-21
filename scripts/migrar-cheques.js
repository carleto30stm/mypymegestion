// Script de migración para ajustar cheques
// Ejecutar en MongoDB o como script de Node.js

const mongoose = require('mongoose');

async function migrarCheques() {
  try {
    // Migrar CHEQUES 3ro a Cheque Tercero
    await db.gastos.updateMany(
      { banco: "CHEQUES 3ro" },
      { 
        $set: { 
          banco: "EFECTIVO",
          medioDePago: "Cheque Tercero"
        }
      }
    );

    // Migrar CHEQUE PRO. a Cheque Propio  
    await db.gastos.updateMany(
      { banco: "CHEQUE PRO." },
      { 
        $set: { 
          banco: "SANTANDER", // O el banco principal
          medioDePago: "Cheque Propio"
        }
      }
    );

    console.log('Migración completada');
  } catch (error) {
    console.error('Error en migración:', error);
  }
}

// migrarCheques();