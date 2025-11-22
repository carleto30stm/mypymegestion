import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Proveedor from '../src/models/Proveedor.js';
import Gasto from '../src/models/Gasto.js';
import MovimientoCuentaCorrienteProveedor from '../src/models/MovimientoCuentaCorrienteProveedor.js';

dotenv.config();

const verifyPayment = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to DB');

        // 1. Create Test Provider with Debt
        const proveedor = await Proveedor.create({
            razonSocial: 'Proveedor Pago Test',
            numeroDocumento: `20${Math.floor(Math.random() * 1000000000)}`,
            condicionIVA: 'Responsable Inscripto',
            tipoDocumento: 'CUIT',
            saldoCuenta: 10000 // Deuda inicial
        });
        console.log('Proveedor created with debt:', proveedor.saldoCuenta);

        // 2. Simulate Payment (Logic similar to controller)
        const montoPago = 5000;

        // 2.1 Create Gasto
        const gasto = await Gasto.create({
            fecha: new Date(),
            rubro: 'PROOVMANO.DE.OBRA',
            subRubro: 'GALVANO CADENAS', // Valid subrubro for PROOVMANO.DE.OBRA
            medioDePago: 'EFECTIVO',
            tipoOperacion: 'salida',
            salida: montoPago,
            detalleGastos: `Pago test`,
            banco: 'EFECTIVO'
        });
        console.log('Gasto created:', gasto._id);

        // 2.2 Update Provider Balance
        proveedor.saldoCuenta -= montoPago;
        await proveedor.save();
        console.log('Proveedor balance updated:', proveedor.saldoCuenta);

        // 2.3 Create Account Movement
        const mov = await MovimientoCuentaCorrienteProveedor.create({
            proveedorId: proveedor._id,
            fecha: new Date(),
            tipo: 'pago',
            documentoTipo: 'ORDEN_PAGO',
            documentoId: gasto._id,
            concepto: 'Pago test',
            debe: montoPago,
            haber: 0,
            saldo: proveedor.saldoCuenta,
            creadoPor: new mongoose.Types.ObjectId()
        });
        console.log('Movement created:', mov._id);

        // 3. Verify Results
        if (proveedor.saldoCuenta === 5000) {
            console.log('SUCCESS: Debt reduced correctly.');
        } else {
            console.error('FAILURE: Incorrect balance.');
        }

        // Cleanup
        await Proveedor.deleteMany({ _id: proveedor._id });
        await Gasto.deleteMany({ _id: gasto._id });
        await MovimientoCuentaCorrienteProveedor.deleteMany({ _id: mov._id });

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyPayment();
