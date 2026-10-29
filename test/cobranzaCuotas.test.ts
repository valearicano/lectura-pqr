import { classifyPQRDeterministic, buildPQRSAnalysis, PQRInputRecord } from '../src/services/classifierEngine';

interface CuotaCobranzaTestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  peticionCliente?: string;
  inconvenienteCliente?: string;
  categoriaEsperada: string;
  subcategoriaEsperada: string;
  productoEsperado?: string;
  requiereRevisionEsperada: boolean;
  verificarCamposAdicionales?: (analysis: any) => boolean;
}

export const COBRANZA_CUOTAS_TEST_SUITE: CuotaCobranzaTestCase[] = [
  // 1. Inconformidad por cobro de cuota de manejo en tarjeta de crédito
  {
    id: 1,
    nombre: 'Inconformidad por cobro de cuota de manejo en tarjeta de crédito',
    expediente: 'CC-001',
    descripcion: 'Presento inconformidad con el cobro de la cuota de manejo en mi tarjeta de crédito este mes.',
    submotivo: 'Inconformidad con cobro',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },

  // 2. Solicitando devolución o reverso de cuota de manejo ya debitada
  {
    id: 2,
    nombre: 'Solicitud de devolución o reverso de cuota de manejo ya debitada',
    expediente: 'CC-002',
    descripcion: 'Solicito la devolución y el reverso del valor de la cuota de manejo debitada en el último extracto.',
    submotivo: 'Devolución de cobro',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'DEVOLUCIÓN O REVERSIÓN',
    requiereRevisionEsperada: false
  },

  // 3. Ofrecieron tarjeta sin cuota de manejo de por vida y la están cobrando
  {
    id: 3,
    nombre: 'Ofrecieron tarjeta sin cuota de manejo de por vida y la están cobrando',
    expediente: 'CC-003',
    descripcion: 'Al adquirir el producto me ofrecieron la tarjeta sin cuota de manejo de por vida y ahora me la están cobrando.',
    submotivo: 'Promesa comercial',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'EXONERACIÓN O BENEFICIO NO APLICADO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },

  // 4. Cuota facturada después de haber cancelado la tarjeta
  {
    id: 4,
    nombre: 'Cuota facturada después de haber cancelado la tarjeta',
    expediente: 'CC-004',
    descripcion: 'Me están facturando cuota de manejo en mi tarjeta de crédito a pesar de que ya fue cancelada el mes pasado.',
    submotivo: 'Tarjeta cancelada',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO POSTERIOR A CANCELACIÓN',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },

  // 5. Cobro duplicado de cuota de manejo en el mismo mes
  {
    id: 5,
    nombre: 'Cobro duplicado de cuota de manejo en el mismo mes',
    expediente: 'CC-005',
    descripcion: 'En el extracto de este mes aparece un cobro duplicado de cuota de manejo, me cobraron dos veces la cuota.',
    submotivo: 'Cobro duplicado',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO DUPLICADO',
    requiereRevisionEsperada: false
  },

  // 6. Inconformidad con el cobro de honorarios de cobranza en un crédito
  {
    id: 6,
    nombre: 'Inconformidad con el cobro de honorarios de cobranza en crédito',
    expediente: 'CC-006',
    descripcion: 'Manifiesto mi inconformidad con el cobro de honorarios de cobranza aplicados en la liquidación de mi crédito.',
    submotivo: 'Cobro de honorarios',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: 'COBRO DE HONORARIOS',
    productoEsperado: 'CRÉDITO / CARTERA',
    requiereRevisionEsperada: false
  },

  // 7. Cobro de gastos de cobranza cuando el cliente afirma que pagó antes de la fecha límite y no estaba en mora
  {
    id: 7,
    nombre: 'Gastos de cobranza cuando cliente pagó oportunamente y no estaba en mora',
    expediente: 'CC-007',
    descripcion: 'Me facturaron gastos de cobranza a pesar de que pagué antes de la fecha límite y no estaba en mora, me encontraba al día.',
    submotivo: 'Cobro indebido cobranza',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: 'COBRO CUESTIONADO POR NO ESTAR EN MORA',
    requiereRevisionEsperada: false
  },

  // 8. Cobro de honorarios de abogado después de haber cancelado la totalidad de la deuda
  {
    id: 8,
    nombre: 'Honorarios de abogado después de haber cancelado la totalidad de la deuda',
    expediente: 'CC-008',
    descripcion: 'Me están cobrando honorarios de abogado después de haber pagado y cancelado la totalidad de la deuda de mi obligación.',
    submotivo: 'Deuda ya cancelada',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: 'COBRO DESPUÉS DEL PAGO',
    requiereRevisionEsperada: false
  },

  // 9. Reclamación por el porcentaje o valor excesivo de los gastos de cobro
  {
    id: 9,
    nombre: 'Reclamación por porcentaje o valor excesivo de gastos de cobro',
    expediente: 'CC-009',
    descripcion: 'El porcentaje y valor liquidado por gastos de cobro es excesivo y desproporcionado respecto a la deuda pendiente.',
    submotivo: 'Cálculo de cobro',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: 'VALOR O CÁLCULO NO CONFORME',
    requiereRevisionEsperada: false
  },

  // 10. Solicitud de devolución de gastos de cobranza
  {
    id: 10,
    nombre: 'Solicitud de devolución de gastos de cobranza',
    expediente: 'CC-010',
    descripcion: 'Solicito la devolución y reintegro de los gastos de cobranza debitados injustificadamente de mi cuenta.',
    submotivo: 'Devolución de gastos de cobranza',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: 'DEVOLUCIÓN O REVERSIÓN',
    requiereRevisionEsperada: false
  },

  // 11. Cobro de cuota de manejo y honorarios de cobranza en el mismo expediente
  {
    id: 11,
    nombre: 'Cobro concurrente de cuota de manejo y honorarios de cobranza',
    expediente: 'CC-011',
    descripcion: 'Reclamo por cobro de cuota de manejo no informada en mi tarjeta de crédito y adicionalmente por gastos de cobranza facturados.',
    submotivo: 'Cobros no acordados',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO NO RECONOCIDO',
    requiereRevisionEsperada: false,
    verificarCamposAdicionales: (a) => {
      const prob = (a.problema_principal || '').toLowerCase();
      const sol = (a.solicitud_cliente || '').toLowerCase();
      return prob.includes('cobranza') || sol.includes('cobranza');
    }
  },

  // 12. Reclamo por intereses de mora sin mencionar honorarios ni gastos de cobro (Desambiguación)
  {
    id: 12,
    nombre: 'Reclamo por intereses de mora sin mencionar honorarios (Desambiguación)',
    expediente: 'CC-012',
    descripcion: 'No estoy de acuerdo con la liquidación de intereses de mora que me aplicaron en el pago de mi tarjeta de crédito.',
    submotivo: 'Intereses de mora',
    categoriaEsperada: 'COMISIONES Y COBROS',
    subcategoriaEsperada: 'INTERESES',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },

  // 13. Consulta de saldo o extracto sin reclamo de cuota de manejo (Desambiguación)
  {
    id: 13,
    nombre: 'Consulta de extracto de tarjeta sin reclamo de cuota (Desambiguación)',
    expediente: 'CC-013',
    descripcion: 'Solicito copia del extracto de mi tarjeta de crédito correspondiente a los últimos tres periodos.',
    submotivo: 'Solicitud extractos',
    categoriaEsperada: 'INFORMACIÓN Y DOCUMENTOS',
    subcategoriaEsperada: 'EXTRACTOS Y DOCUMENTOS',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },

  // 14. Reclamo con lenguaje coloquial ("me están cobrando por tener la tarjeta")
  {
    id: 14,
    nombre: 'Coloquial: "me están cobrando por tener la tarjeta"',
    expediente: 'CC-014',
    descripcion: 'Me están cobrando por tener la tarjeta una plata mensual que yo nunca acepté.',
    submotivo: 'Cobro mensual',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO NO RECONOCIDO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },

  // 15. Reclamo con lenguaje coloquial ("me metieron un cobro de una casa de cobro")
  {
    id: 15,
    nombre: 'Coloquial: "me metieron un cobro de una casa de cobro"',
    expediente: 'CC-015',
    descripcion: 'Me metieron un cobro de una casa de cobro cuando yo ya había pagado mi cuota a tiempo.',
    submotivo: 'Casa de cobro',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: 'COBRO CUESTIONADO POR NO ESTAR EN MORA',
    requiereRevisionEsperada: false
  },

  // 16. Expediente con texto "cobro" sin mayor contexto (Información insuficiente)
  {
    id: 16,
    nombre: 'Texto "cobro" sin contexto (Información insuficiente -> Revisión humana)',
    expediente: 'CC-016',
    descripcion: 'cobro',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    requiereRevisionEsperada: true,
    verificarCamposAdicionales: (a) => {
      return a.requiere_revision === true && typeof a.motivo_de_revision === 'string' && a.motivo_de_revision.length > 5;
    }
  }
];

export function runCobranzaCuotasTests() {
  console.log('='.repeat(80));
  console.log(`PRUEBAS AUTOMATIZADAS: REFORZAR CUOTAS DE MANEJO Y HONORARIOS/GASTOS DE COBRANZA (${COBRANZA_CUOTAS_TEST_SUITE.length} CASOS)`);
  console.log('='.repeat(80));

  let passed = 0;
  const failures: string[] = [];

  COBRANZA_CUOTAS_TEST_SUITE.forEach(tc => {
    const record: PQRInputRecord = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      submotivo_original: tc.submotivo,
      producto_original: tc.producto,
      columnas_adicionales: {
        'PETICION DEL CLIENTE': tc.peticionCliente || '',
        'INCONVENIENTE DEL CLIENTE': tc.inconvenienteCliente || ''
      }
    };

    const det = classifyPQRDeterministic(record);
    const analysis = buildPQRSAnalysis(record, det);

    const catOk = analysis.categoria_principal === tc.categoriaEsperada;
    const subOk =
      analysis.subcategoria === tc.subcategoriaEsperada ||
      (tc.subcategoriaEsperada.includes('DEVOLUCIÓN') && analysis.subcategoria.includes('DEVOLUCIÓN'));
    const revOk = analysis.requiere_revision === tc.requiereRevisionEsperada;
    const prodOk = tc.productoEsperado ? analysis.producto_detectado === tc.productoEsperado : true;
    const extraOk = tc.verificarCamposAdicionales ? tc.verificarCamposAdicionales(analysis) : true;

    // Check mandatory AI fields existence
    const fieldsOk =
      analysis.categoria_ia !== undefined &&
      analysis.subcategoria_ia !== undefined &&
      analysis.evidencia_clasificacion !== undefined &&
      analysis.problema_principal !== undefined &&
      analysis.solicitud_cliente !== undefined &&
      analysis.resumen_normalizado !== undefined &&
      analysis.nivel_confianza !== undefined;

    if (catOk && subOk && revOk && prodOk && extraOk && fieldsOk) {
      passed++;
      console.log(`✓ [PASÓ] Caso #${tc.id.toString().padStart(2, '0')} - ${tc.nombre}`);
      console.log(`   Cat: "${analysis.categoria_principal}" | Sub: "${analysis.subcategoria}" | Prod: "${analysis.producto_detectado}" | Rev: ${analysis.requiere_revision ? 'SÍ' : 'NO'}`);
      console.log(`   Prob: "${analysis.problema_principal}" | Sol: "${analysis.solicitud_cliente}"`);
    } else {
      const msg = `✗ [FALLÓ] Caso #${tc.id} - ${tc.nombre}:
        Cat: "${analysis.categoria_principal}" (Esperada: "${tc.categoriaEsperada}") -> ${catOk ? 'OK' : 'ERROR'}
        Sub: "${analysis.subcategoria}" (Esperada: "${tc.subcategoriaEsperada}") -> ${subOk ? 'OK' : 'ERROR'}
        Rev: ${analysis.requiere_revision} (Esperada: ${tc.requiereRevisionEsperada}) -> ${revOk ? 'OK' : 'ERROR'}
        Prod: "${analysis.producto_detectado}" (Esperado: "${tc.productoEsperado || 'Cualquiera'}") -> ${prodOk ? 'OK' : 'ERROR'}
        Extra: ${extraOk ? 'OK' : 'ERROR'} | Fields: ${fieldsOk ? 'OK' : 'ERROR'}`;
      failures.push(msg);
      console.error(msg);
    }
  });

  console.log('-'.repeat(80));
  console.log(`RESULTADO CUOTAS Y COBRANZA: ${passed}/${COBRANZA_CUOTAS_TEST_SUITE.length} pruebas pasadas (${((passed / COBRANZA_CUOTAS_TEST_SUITE.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    throw new Error(`${failures.length} pruebas de cuotas y cobranza fallaron.`);
  }

  return {
    success: failures.length === 0,
    total: COBRANZA_CUOTAS_TEST_SUITE.length,
    passed,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runCobranzaCuotasTests();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
