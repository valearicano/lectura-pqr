import { classifyPQRDeterministic, validateClassificationConsistency, buildPQRSAnalysis } from '../src/services/classifierEngine';

interface TestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  categoriaEsperada: string;
  subcategoriaEsperada: string;
  productoEsperado?: string;
  requiereRevisionEsperada: boolean;
}

export const MANDATORY_TEST_SUITE: TestCase[] = [
  {
    id: 1,
    nombre: 'Pago de tarjeta no aplicado',
    expediente: 'TEST-001',
    descripcion: 'Realicé el pago de mi tarjeta de crédito el día de ayer y aún no se ve reflejado en el saldo.',
    submotivo: 'Pago no aplicado tarjeta',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 2,
    nombre: 'Pago duplicado de tarjeta',
    expediente: 'TEST-002',
    descripcion: 'Me cobraron dos veces el pago de la tarjeta de crédito en mi cuenta corriente.',
    submotivo: 'Pago duplicado',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 3,
    nombre: 'Cobro de intereses de mora',
    expediente: 'TEST-003',
    descripcion: 'Me están cobrando intereses de mora en mi tarjeta de crédito a pesar de haber pagado oportunamente.',
    submotivo: 'Intereses de mora',
    categoriaEsperada: 'COMISIONES Y COBROS',
    subcategoriaEsperada: 'INTERESES',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 4,
    nombre: 'Solicitud de aumento de cupo',
    expediente: 'TEST-004',
    descripcion: 'Solicito aumento de cupo para mi tarjeta de crédito Visa.',
    submotivo: 'Aumento de cupo',
    categoriaEsperada: 'TARJETAS',
    subcategoriaEsperada: 'CUPO Y AVANCES',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 5,
    nombre: 'Compra no reconocida',
    expediente: 'TEST-005',
    descripcion: 'No reconozco una compra realizada con mi tarjeta de crédito en una tienda virtual.',
    submotivo: 'Compra no reconocida',
    categoriaEsperada: 'FRAUDES',
    subcategoriaEsperada: 'OPERACIÓN NO RECONOCIDA',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 6,
    nombre: 'Devolución de compra pendiente',
    expediente: 'TEST-006',
    descripcion: 'El establecimiento comercial hizo la devolución de una compra realizada con mi tarjeta de crédito, pero sigue pendiente de ingresar.',
    submotivo: 'Devolución pendiente',
    categoriaEsperada: 'TARJETAS',
    subcategoriaEsperada: 'COMPRAS Y DEVOLUCIONES',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 7,
    nombre: 'Diferencia en extracto',
    expediente: 'TEST-007',
    descripcion: 'Presento una diferencia en el extracto de mi tarjeta de crédito con relación al saldo facturado.',
    submotivo: 'Diferencia extracto',
    categoriaEsperada: 'INFORMACIÓN Y DOCUMENTOS',
    subcategoriaEsperada: 'EXTRACTOS Y DOCUMENTOS',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 8,
    nombre: 'Compra diferida a cuotas',
    expediente: 'TEST-008',
    descripcion: 'Deseo rediferir a 24 cuotas una compra diferida efectuada con mi tarjeta de crédito.',
    submotivo: 'Compra diferida',
    categoriaEsperada: 'TARJETAS',
    subcategoriaEsperada: 'DIFERIDOS Y FINANCIACIÓN',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 9,
    nombre: 'Cobro de cuota de manejo',
    expediente: 'TEST-009',
    descripcion: 'Me están cobrando cuota de manejo en mi tarjeta de crédito y solicito exoneración.',
    submotivo: 'Cobro cuota de manejo',
    categoriaEsperada: 'CUOTA DE MANEJO',
    subcategoriaEsperada: 'COBRO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 10,
    nombre: 'Devolución de cuota de manejo',
    expediente: 'TEST-010',
    descripcion: 'Solicito la devolución de la cuota de manejo debitada de mi tarjeta de crédito.',
    submotivo: 'Devolución cuota de manejo',
    categoriaEsperada: 'CUOTA DE MANEJO',
    subcategoriaEsperada: 'DEVOLUCIÓN / REVERSIÓN',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 11,
    nombre: 'Seguro asociado a tarjeta',
    expediente: 'TEST-011',
    descripcion: 'Tengo un seguro asociado a mi tarjeta de crédito que no autoricé y solicito cancelar.',
    submotivo: 'Seguro no deseado',
    categoriaEsperada: 'SEGUROS',
    subcategoriaEsperada: 'CANCELACIÓN Y DEVOLUCIÓN',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 12,
    nombre: 'Error en operación PSE',
    expediente: 'TEST-012',
    descripcion: 'Presento error al realizar el pago de mi tarjeta de crédito por medio de PSE, la pasarela rechazó la operación.',
    submotivo: 'Falla PSE',
    categoriaEsperada: 'PSE',
    subcategoriaEsperada: 'ERROR / FALLA PSE',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 13,
    nombre: 'Marcación y desmarcación GMF',
    expediente: 'TEST-013',
    descripcion: 'Quiero marcar mi cuenta de ahorros para que no cobre el 4x1000 GMF.',
    submotivo: 'Exención GMF',
    categoriaEsperada: 'GMF',
    subcategoriaEsperada: 'MARCACIÓN',
    productoEsperado: 'CUENTA DE AHORROS',
    requiereRevisionEsperada: false
  },
  {
    id: 14,
    nombre: 'Operación GT5',
    expediente: 'TEST-014',
    descripcion: 'Cliente presenta movimiento RECUP TRANX en su cuenta.',
    submotivo: 'Ajuste operativo',
    categoriaEsperada: 'GT5',
    subcategoriaEsperada: 'RECUP TRANX',
    productoEsperado: 'CUENTA DE AHORROS',
    requiereRevisionEsperada: false
  },
  {
    id: 15,
    nombre: 'Mención de tarjeta sin problema específico',
    expediente: 'TEST-015',
    descripcion: 'Tarjeta de crédito',
    submotivo: 'Tarjeta',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: true
  },
  {
    id: 16,
    nombre: 'Descripción insuficiente',
    expediente: 'TEST-016',
    descripcion: 'revisar mi caso',
    submotivo: 'Caso',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: true
  },
  {
    id: 17,
    nombre: 'Texto que contiene “sin embargo” sin referirse a embargos',
    expediente: 'TEST-017',
    descripcion: 'Realicé el pago de mi tarjeta de crédito, sin embargo no veo reflejado el saldo en mi cupo.',
    submotivo: 'Pago no reflejado',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 18,
    nombre: 'Solicitud real de levantamiento de embargo',
    expediente: 'TEST-018',
    descripcion: 'Radico oficio judicial emitido por el juzgado para el levantamiento de embargo y desembargo de mi cuenta.',
    submotivo: 'Desembargo',
    categoriaEsperada: 'EMBARGOS',
    subcategoriaEsperada: 'DESEMBARGO',
    productoEsperado: 'CUENTA DE AHORROS',
    requiereRevisionEsperada: false
  }
];

export function runTests(): { success: boolean; total: number; passed: number; failures: string[] } {
  const failures: string[] = [];
  let passed = 0;

  console.log('='.repeat(80));
  console.log('EJECUCIÓN DE PRUEBAS AUTOMATIZADAS OBLIGATORIAS (18 CASOS DE NEGOCIO)');
  console.log('='.repeat(80));

  MANDATORY_TEST_SUITE.forEach(tc => {
    const record = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      submotivo_original: tc.submotivo,
      producto_original: tc.producto
    };

    const det = classifyPQRDeterministic(record);
    const analysis = buildPQRSAnalysis(record, det);

    const catOk = analysis.categoria_principal === tc.categoriaEsperada;
    const subOk = analysis.subcategoria === tc.subcategoriaEsperada;
    const revOk = analysis.requiere_revision === tc.requiereRevisionEsperada;
    const prodOk = tc.productoEsperado ? analysis.producto_detectado === tc.productoEsperado : true;

    if (catOk && subOk && revOk && prodOk) {
      passed++;
      console.log(`✓ [PASÓ] Caso #${tc.id.toString().padStart(2, '0')} - ${tc.nombre}`);
      console.log(`   Cat: ${analysis.categoria_principal} | Sub: ${analysis.subcategoria} | Prod: ${analysis.producto_detectado} | RevHumana: ${analysis.requiere_revision ? 'SI' : 'NO'}`);
    } else {
      const msg = `✗ [FALLÓ] Caso #${tc.id} - ${tc.nombre}:
        Cat Obtenida: "${analysis.categoria_principal}" (Esperada: "${tc.categoriaEsperada}") -> ${catOk ? 'OK' : 'ERROR'}
        Sub Obtenida: "${analysis.subcategoria}" (Esperada: "${tc.subcategoriaEsperada}") -> ${subOk ? 'OK' : 'ERROR'}
        Rev Obtenida: ${analysis.requiere_revision} (Esperada: ${tc.requiereRevisionEsperada}) -> ${revOk ? 'OK' : 'ERROR'}
        Prod Obtenido: "${analysis.producto_detectado}" (Esperado: "${tc.productoEsperado}") -> ${prodOk ? 'OK' : 'ERROR'}`;
      failures.push(msg);
      console.error(msg);
    }
  });

  console.log('-'.repeat(80));
  console.log(`RESULTADO: ${passed}/${MANDATORY_TEST_SUITE.length} pruebas pasadas (${((passed / MANDATORY_TEST_SUITE.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    throw new Error(`${failures.length} pruebas obligatorias fallaron.`);
  }

  return {
    success: failures.length === 0,
    total: MANDATORY_TEST_SUITE.length,
    passed,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runTests();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
