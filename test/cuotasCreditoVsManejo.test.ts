import { classifyPQRDeterministic, buildPQRSAnalysis, PQRInputRecord } from '../src/services/classifierEngine';

export interface CuotasCreditoVsManejoTestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  categoriaEsperada: string;
  subcategoriaEsperada: string;
  requiereRevisionEsperada: boolean;
  verificar?: (analysis: any) => boolean;
}

export const CUOTAS_CREDITO_VS_MANEJO_SUITE: CuotasCreditoVsManejoTestCase[] = [
  // Caso 1: Crédito de vivienda
  {
    id: 1,
    nombre: 'Aumento cuota mensual crédito de vivienda',
    expediente: 'CCVM-001',
    descripcion: 'Me aumentaron la cuota mensual de mi crédito de vivienda',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'VALOR DE LA CUOTA Y PLAN DE PAGOS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CUOTAS DE MANEJO' &&
             (analysis.producto_detectado === 'CRÉDITO / CARTERA' || analysis.producto_detectado === 'CRÉDITOS / CARTERA');
    }
  },

  // Caso 2: Crédito de leasing
  {
    id: 2,
    nombre: 'Revisión cuotas crédito de leasing',
    expediente: 'CCVM-002',
    descripcion: 'Solicito revisar las cuotas de mi crédito de leasing',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'VALOR DE LA CUOTA Y PLAN DE PAGOS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CUOTAS DE MANEJO' &&
             (analysis.producto_detectado === 'CRÉDITO / CARTERA' || analysis.producto_detectado === 'CRÉDITOS / CARTERA');
    }
  },

  // Caso 3: Plan de pagos con valores incorrectos
  {
    id: 3,
    nombre: 'Plan de pagos de crédito con valores incorrectos',
    expediente: 'CCVM-003',
    descripcion: 'El plan de pagos de mi crédito presenta valores incorrectos',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'VALOR DE LA CUOTA Y PLAN DE PAGOS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CUOTAS DE MANEJO';
    }
  },

  // Caso 4: Desacuerdo con cuota mensual préstamo
  {
    id: 4,
    nombre: 'Desacuerdo con la cuota mensual de préstamo',
    expediente: 'CCVM-004',
    descripcion: 'No estoy de acuerdo con la cuota mensual de mi préstamo',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'VALOR DE LA CUOTA Y PLAN DE PAGOS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CUOTAS DE MANEJO';
    }
  },

  // Caso 5: Cobro cuota de manejo tarjeta de crédito
  {
    id: 5,
    nombre: 'Cobro cuota de manejo en tarjeta de crédito',
    expediente: 'CCVM-005',
    descripcion: 'Me cobraron cuota de manejo de mi tarjeta de crédito',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal === 'CUOTAS DE MANEJO' &&
             analysis.producto_detectado === 'TARJETA DE CRÉDITO';
    }
  },

  // Caso 6: Devolución cuotas de manejo
  {
    id: 6,
    nombre: 'Solicitud de devolución de cuotas de manejo cobradas',
    expediente: 'CCVM-006',
    descripcion: 'Solicito devolución de las cuotas de manejo cobradas',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'DEVOLUCIÓN O REVERSIÓN',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal === 'CUOTAS DE MANEJO';
    }
  },

  // Caso 7: Cobro cuota de manejo posterior a cancelación
  {
    id: 7,
    nombre: 'Cobro de cuota de manejo después de cancelar tarjeta',
    expediente: 'CCVM-007',
    descripcion: 'Me cobraron cuota de manejo después de cancelar la tarjeta',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO POSTERIOR A CANCELACIÓN',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal === 'CUOTAS DE MANEJO';
    }
  },

  // Caso 8: Concurrencia crédito + cuota de manejo
  {
    id: 8,
    nombre: 'Concurrencia: aumento de cuota de crédito y cuota de manejo',
    expediente: 'CCVM-008',
    descripcion: 'Me aumentaron la cuota del crédito y también me cobraron cuota de manejo',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'VALOR DE LA CUOTA Y PLAN DE PAGOS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      const mentionsSecondary =
        (analysis.problema_principal && analysis.problema_principal.toLowerCase().includes('manejo')) ||
        (analysis.solicitud_cliente && analysis.solicitud_cliente.toLowerCase().includes('manejo')) ||
        (analysis.resumen_requerimiento && analysis.resumen_requerimiento.toLowerCase().includes('manejo'));
      return analysis.categoria_principal === 'CRÉDITOS / CARTERA' && mentionsSecondary;
    }
  },

  // Caso 9: Caso ambiguo sin contexto
  {
    id: 9,
    nombre: 'Cuota mensual ambigua sin producto ni contexto',
    expediente: 'CCVM-009',
    descripcion: 'Mi cuota mensual aumentó y no entiendo por qué',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    requiereRevisionEsperada: true,
    verificar: (analysis) => {
      // Must NOT be CUOTAS DE MANEJO and must require human review
      return analysis.categoria_principal !== 'CUOTAS DE MANEJO' &&
             analysis.requiere_revision === true;
    }
  },

  // Caso 10: Cobro por administración de tarjeta
  {
    id: 10,
    nombre: 'Aclaración de valor cobrado por administración de tarjeta',
    expediente: 'CCVM-010',
    descripcion: 'Solicito aclaración del valor cobrado por administración de mi tarjeta',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'ACLARACIÓN DEL VALOR O LAS CONDICIONES',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal === 'CUOTAS DE MANEJO';
    }
  }
];

export function runCuotasCreditoVsManejoTests() {
  console.log('='.repeat(80));
  console.log('TEST SUITE: CRÉDITOS / CARTERA VS CUOTAS DE MANEJO (10 CASOS OBLIGATORIOS)');
  console.log('='.repeat(80));

  let passed = 0;
  const failures: string[] = [];

  CUOTAS_CREDITO_VS_MANEJO_SUITE.forEach(tc => {
    const inputRecord: PQRInputRecord = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      submotivo_original: tc.submotivo,
      producto_original: tc.producto
    };

    const deterministic = classifyPQRDeterministic(inputRecord);
    const analysis = buildPQRSAnalysis(inputRecord, deterministic);

    const catOk = analysis.categoria_principal === tc.categoriaEsperada;
    const subOk = analysis.subcategoria === tc.subcategoriaEsperada;
    const revOk = analysis.requiere_revision === tc.requiereRevisionEsperada;
    const customOk = tc.verificar ? tc.verificar(analysis) : true;

    // Validate anti-bloat canonical fields
    const fieldsOk =
      analysis.problema_principal !== undefined &&
      analysis.problema_principal.length > 0 &&
      analysis.solicitud_cliente !== undefined &&
      analysis.solicitud_cliente.length > 0 &&
      analysis.resumen_requerimiento !== undefined &&
      analysis.nivel_confianza !== undefined;

    if (catOk && subOk && revOk && customOk && fieldsOk) {
      passed++;
      console.log(`✓ [PASÓ] Caso #${tc.id.toString().padStart(2, '0')} - ${tc.nombre}`);
      console.log(`   Cat: "${analysis.categoria_principal}" | Sub: "${analysis.subcategoria}" | Prod: "${analysis.producto_detectado}" | Rev: ${analysis.requiere_revision ? 'SÍ' : 'NO'}`);
      console.log(`   Prob: "${analysis.problema_principal}" | Sol: "${analysis.solicitud_cliente}"`);
    } else {
      const msg = `✗ [FALLÓ] Caso #${tc.id} - ${tc.nombre}:
        Cat: "${analysis.categoria_principal}" (Esperada: "${tc.categoriaEsperada}") -> ${catOk ? 'OK' : 'ERROR'}
        Sub: "${analysis.subcategoria}" (Esperada: "${tc.subcategoriaEsperada}") -> ${subOk ? 'OK' : 'ERROR'}
        Rev: ${analysis.requiere_revision} (Esperada: ${tc.requiereRevisionEsperada}) -> ${revOk ? 'OK' : 'ERROR'}
        Custom verification: ${customOk ? 'OK' : 'ERROR'} | Canonical fields: ${fieldsOk ? 'OK' : 'ERROR'}`;
      failures.push(msg);
      console.error(msg);
    }
  });

  console.log('-'.repeat(80));
  console.log(`RESULTADO SUITE: ${passed}/${CUOTAS_CREDITO_VS_MANEJO_SUITE.length} pruebas pasadas (${((passed / CUOTAS_CREDITO_VS_MANEJO_SUITE.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    throw new Error(`${failures.length} pruebas fallaron.`);
  }

  return {
    success: failures.length === 0,
    total: CUOTAS_CREDITO_VS_MANEJO_SUITE.length,
    passed,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runCuotasCreditoVsManejoTests();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
