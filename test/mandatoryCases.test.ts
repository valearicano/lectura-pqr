import { classifyPQRDeterministic, validateClassificationConsistency, buildPQRSAnalysis } from '../src/services/classifierEngine';

interface TestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  tipo_origen?: string;
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
  },
  // =========================================================================
  // CASOS OBLIGATORIOS: MEJORA PAGOS NO APLICADOS DE ITAÚ (POSITIVOS)
  // =========================================================================
  {
    id: 19,
    nombre: 'Itaú - Pagué mi tarjeta Itaú y no veo el pago',
    expediente: 'TEST-ITAU-001',
    tipo_origen: 'ITAU',
    descripcion: 'Pagué mi tarjeta Itaú y no veo el pago.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO NO REFLEJADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 20,
    nombre: 'Itaú - Pagué mi tarjeta Itaú en septiembre y no está reflejado',
    expediente: 'TEST-ITAU-002',
    tipo_origen: 'itau',
    descripcion: 'Pagué mi tarjeta Itaú en septiembre y no está reflejado.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO NO REFLEJADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 21,
    nombre: 'Itaú - No veo mis pagos de septiembre y octubre',
    expediente: 'TEST-ITAU-003',
    tipo_origen: 'ITAÚ',
    descripcion: 'No veo mis pagos de septiembre y octubre.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO NO REFLEJADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 22,
    nombre: 'Itaú - ¿Dónde están los pagos que realicé?',
    expediente: 'TEST-ITAU-004',
    tipo_origen: 'Itau',
    descripcion: '¿Dónde están los pagos que realicé?',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO NO REFLEJADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 23,
    nombre: 'Itaú - El pago de mi tarjeta no se ha aplicado',
    expediente: 'TEST-ITAU-005',
    tipo_origen: 'ITAU',
    descripcion: 'El pago de mi tarjeta no se ha aplicado.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 24,
    nombre: 'Itaú - Realicé una transferencia y no aparece abonada',
    expediente: 'TEST-ITAU-006',
    tipo_origen: 'ITAU',
    descripcion: 'Realicé una transferencia y no aparece abonada.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'TRANSFERENCIA NO ABONADA',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 25,
    nombre: 'Itaú - Me descontaron el dinero, pero no se refleja en mi tarjeta',
    expediente: 'TEST-ITAU-007',
    tipo_origen: 'ITAU',
    descripcion: 'Me descontaron el dinero, pero no se refleja en mi tarjeta.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO NO REFLEJADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 26,
    nombre: 'Itaú - Mi pago sigue pendiente de aplicación',
    expediente: 'TEST-ITAU-008',
    tipo_origen: 'ITAU',
    descripcion: 'Mi pago sigue pendiente de aplicación.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 27,
    nombre: 'Itaú - Solo aparece uno de los dos pagos que realicé',
    expediente: 'TEST-ITAU-009',
    tipo_origen: 'ITAU',
    descripcion: 'Solo aparece uno de los dos pagos que realicé.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO DUPLICADO / PARCIAL',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 28,
    nombre: 'Itaú - Pagué en septiembre y todavía no aparece en octubre',
    expediente: 'TEST-ITAU-010',
    tipo_origen: 'ITAU',
    descripcion: 'Pagué en septiembre y todavía no aparece en octubre.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO NO REFLEJADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 29,
    nombre: 'Itaú - El pago aparece debitado de mi cuenta, pero no aplicado a la obligación',
    expediente: 'TEST-ITAU-011',
    tipo_origen: 'ITAU',
    descripcion: 'El pago aparece debitado de mi cuenta, pero no aplicado a la obligación.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'CUENTA DE AHORROS',
    requiereRevisionEsperada: false
  },
  {
    id: 30,
    nombre: 'Itaú - No encuentro el comprobante o el registro del pago realizado',
    expediente: 'TEST-ITAU-012',
    tipo_origen: 'ITAU',
    descripcion: 'No encuentro el comprobante o el registro del pago realizado.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'COMPROBANTE NO ENCONTRADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 31,
    nombre: 'Itaú - El pago fue rechazado, quedó pendiente o presenta una demora en su aplicación',
    expediente: 'TEST-ITAU-013',
    tipo_origen: 'ITAU',
    descripcion: 'El pago fue rechazado, quedó pendiente o presenta una demora en su aplicación.',
    categoriaEsperada: 'PAGO A ITAU',
    subcategoriaEsperada: 'PAGO PENDIENTE / DEMORA',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  // =========================================================================
  // CASOS NEGATIVOS: ORIGEN DIFERENTE DE ITAU (NO DEBEN CLASIFICARSE COMO PAGO A ITAU)
  // =========================================================================
  {
    id: 32,
    nombre: 'Origen Bancolombia - Pago no reflejado (Debe ser PAGOS / ABONOS)',
    expediente: 'TEST-NEG-001',
    tipo_origen: 'BANCOLOMBIA',
    descripcion: 'Pagué mi tarjeta Itaú y no veo el pago.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 33,
    nombre: 'Origen Davivienda - Transferencia no abonada (Debe ser TRANSFERENCIAS)',
    expediente: 'TEST-NEG-002',
    tipo_origen: 'DAVIVIENDA',
    descripcion: 'Realicé una transferencia y no aparece abonada.',
    categoriaEsperada: 'TRANSFERENCIAS',
    subcategoriaEsperada: 'TRANSFERENCIAS',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 34,
    nombre: 'Sin origen especificado - ¿Dónde están los pagos? (Debe ser PAGOS / ABONOS)',
    expediente: 'TEST-NEG-003',
    tipo_origen: '',
    descripcion: '¿Dónde están los pagos que realicé?',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  // =========================================================================
  // CASOS NEGATIVOS: ORIGEN ITAU CON OTROS TEMAS (DEBEN CONSERVAR SU CATEGORÍA ESPECÍFICA)
  // =========================================================================
  {
    id: 35,
    nombre: 'Itaú - Compra no reconocida (Debe ser FRAUDES)',
    expediente: 'TEST-NEG-004',
    tipo_origen: 'ITAU',
    descripcion: 'No reconozco una compra realizada con mi tarjeta de crédito Itaú en un comercio electrónico.',
    categoriaEsperada: 'FRAUDES',
    subcategoriaEsperada: 'OPERACIÓN NO RECONOCIDA',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 36,
    nombre: 'Itaú - Cobro cuota de manejo (Debe ser CUOTA DE MANEJO)',
    expediente: 'TEST-NEG-005',
    tipo_origen: 'ITAU',
    descripcion: 'Me están cobrando cuota de manejo en mi tarjeta de crédito Itaú y solicito exoneración acordada.',
    categoriaEsperada: 'CUOTA DE MANEJO',
    subcategoriaEsperada: 'COBRO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 37,
    nombre: 'Itaú - Solicitud de aumento de cupo (Debe ser TARJETAS)',
    expediente: 'TEST-NEG-006',
    tipo_origen: 'ITAU',
    descripcion: 'Solicito aumento de cupo para mi tarjeta de crédito Visa Itaú.',
    categoriaEsperada: 'TARJETAS',
    subcategoriaEsperada: 'CUPO Y AVANCES',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 38,
    nombre: 'Itaú - Error en pasarela PSE (Debe ser PSE)',
    expediente: 'TEST-NEG-007',
    tipo_origen: 'ITAU',
    descripcion: 'Presento error al realizar el pago de mi tarjeta por medio de PSE, la pasarela rechazó la operación.',
    categoriaEsperada: 'PSE',
    subcategoriaEsperada: 'ERROR / FALLA PSE',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 39,
    nombre: 'Itaú - Paz y salvo (Debe ser INFORMACIÓN Y DOCUMENTOS)',
    expediente: 'TEST-NEG-008',
    tipo_origen: 'ITAU',
    descripcion: 'Solicito certificado de paz y salvo de mi obligación Itaú que ya fue cancelada en su totalidad.',
    categoriaEsperada: 'INFORMACIÓN Y DOCUMENTOS',
    subcategoriaEsperada: 'CERTIFICADOS Y PAZ Y SALVO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 40,
    nombre: 'Itaú - Descripción insuficiente (Debe ser REVISIÓN HUMANA)',
    expediente: 'TEST-NEG-009',
    tipo_origen: 'ITAU',
    descripcion: 'revisar mi caso',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: true
  },
  {
    id: 41,
    nombre: 'Itaú - Mención aislada de producto sin problema (Debe ser REVISIÓN HUMANA)',
    expediente: 'TEST-NEG-010',
    tipo_origen: 'ITAU',
    descripcion: 'tarjeta de credito itau',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: true
  }
];

export function runTests(): { success: boolean; total: number; passed: number; failures: string[] } {
  const failures: string[] = [];
  let passed = 0;

  console.log('='.repeat(80));
  console.log(`EJECUCIÓN DE PRUEBAS AUTOMATIZADAS OBLIGATORIAS (${MANDATORY_TEST_SUITE.length} CASOS DE NEGOCIO)`);
  console.log('='.repeat(80));

  MANDATORY_TEST_SUITE.forEach(tc => {
    const record = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      submotivo_original: tc.submotivo,
      producto_original: tc.producto,
      tipo_origen: tc.tipo_origen,
      columnas_adicionales: {
        'TIPO ORIGEN': tc.tipo_origen
      }
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
