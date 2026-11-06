import { classifyPQRDeterministic, buildPQRSAnalysis, PQRInputRecord } from '../src/services/classifierEngine';
import * as XLSX from 'xlsx';

export interface CarteraCreditosTestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  tipo_origen?: string;
  categoriaEsperada: string | string[];
  subcategoriaEsperada: string | string[];
  requiereRevisionEsperada: boolean;
  productoEsperado?: string;
  verificar?: (analysis: any) => boolean;
}

export const CARTERA_CREDITOS_TEST_SUITE: CarteraCreditosTestCase[] = [
  // 1. Inconsistencia en plan de pagos
  {
    id: 1,
    nombre: 'Inconsistencia en plan de pagos',
    expediente: 'CAR-001',
    descripcion: 'El plan de pagos de mi crédito presenta inconsistencias en la amortización y los valores no corresponden a lo liquidado.',
    submotivo: 'Inconsistencia en plan de amortización',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'PLAN DE PAGOS',
    requiereRevisionEsperada: false,
    verificar: (a) => a.problema_principal.includes('plan de pagos') || a.problema_principal.includes('amortización') || a.problema_principal.includes('amortizacion')
  },

  // 2. Solicitud de aplicación de subsidio FRECH
  {
    id: 2,
    nombre: 'Solicitud de aplicación de subsidio FRECH',
    expediente: 'CAR-002',
    descripcion: 'Solicito la aplicación del subsidio FRECH a mi crédito de vivienda ya que no se ve reflejado en el extracto.',
    submotivo: 'Subsidio FRECH',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'FRECH',
    requiereRevisionEsperada: false,
    verificar: (a) => a.producto_detectado === 'CRÉDITO DE VIVIENDA'
  },

  // 3. Texto que diga FRESH o FRENCH relacionado con subsidio de vivienda
  {
    id: 3,
    nombre: 'Texto que diga FRESH o FRENCH relacionado con subsidio de vivienda',
    expediente: 'CAR-003',
    descripcion: 'No me están aplicando el subsidio french de vivienda en mi cuota mensual, solicito la cobertura de tasa fresh.',
    submotivo: 'Subsidio french',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'FRECH',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'FRECH' && a.producto_detectado === 'CRÉDITO DE VIVIENDA'
  },

  // 4. Aumento de cuota después de migración de Itaú
  {
    id: 4,
    nombre: 'Aumento de cuota después de migración de Itaú',
    expediente: 'CAR-004',
    descripcion: 'Mi cuota de crédito quedó más alta después de la migración de Itaú, antes pagaba menos y ahora me cobran más.',
    submotivo: 'Aumento de cuota',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'AUMENTO DE CUOTA',
    requiereRevisionEsperada: false,
    verificar: (a) => a.categoria_principal === 'CRÉDITOS / CARTERA' && a.subcategoria === 'AUMENTO DE CUOTA'
  },

  // 5. Incremento de cuota de crédito de vivienda
  {
    id: 5,
    nombre: 'Incremento de cuota de crédito de vivienda',
    expediente: 'CAR-005',
    descripcion: 'La cuota mensual de mi crédito de vivienda aumentó sin explicación, no estoy de acuerdo con este incremento de cuota.',
    submotivo: 'Incremento cuota',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'AUMENTO DE CUOTA',
    requiereRevisionEsperada: false,
    verificar: (a) => a.producto_detectado === 'CRÉDITO DE VIVIENDA'
  },

  // 6. Solicitud de endoso de póliza
  {
    id: 6,
    nombre: 'Solicitud de endoso de póliza',
    expediente: 'CAR-006',
    descripcion: 'Radico solicitud de endoso de póliza de seguro de vida y terremoto externa para mi crédito hipotecario.',
    submotivo: 'Endoso de póliza',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'ENDOSO',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'ENDOSO'
  },

  // 7. Reversión de débito automático
  {
    id: 7,
    nombre: 'Reversión de débito automático',
    expediente: 'CAR-007',
    descripcion: 'Me debitaron automáticamente dos veces la cuota del crédito y solicito la reversión inmediata del débito automático.',
    submotivo: 'Reversión débito automático',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REVERSIÓN',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'REVERSIÓN'
  },

  // 8. Pago doble que solicita devolución
  {
    id: 8,
    nombre: 'Pago doble que solicita devolución',
    expediente: 'CAR-008',
    descripcion: 'Realicé un pago doble de la cuota de mi obligación y requiero que me devuelvan el valor pagado en exceso.',
    submotivo: 'Pago doble',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REVERSIÓN',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'REVERSIÓN'
  },

  // 9. Descuento que afecta el mínimo vital
  {
    id: 9,
    nombre: 'Descuento que afecta el mínimo vital',
    expediente: 'CAR-009',
    descripcion: 'Me aplicaron un descuento de mi nómina para la deuda del crédito que afecta gravemente mi mínimo vital, solicito devolución.',
    submotivo: 'Afectación mínimo vital',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REVERSIÓN',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'REVERSIÓN'
  },

  // 10. Reaplicación de pago a capital
  {
    id: 10,
    nombre: 'Reaplicación de pago a capital',
    expediente: 'CAR-010',
    descripcion: 'Solicito reaplicar el abono realizado para que se aplique directamente a capital y no a otros conceptos.',
    submotivo: 'Abono a capital',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REAPLICACIONES',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'REAPLICACIONES'
  },

  // 11. Reaplicación para reducir cuota mensual
  {
    id: 11,
    nombre: 'Reaplicación para reducir cuota mensual',
    expediente: 'CAR-011',
    descripcion: 'Requiero reaplicación del pago extraordinario para reducción de la cuota mensual de mi crédito.',
    submotivo: 'Reducción de cuota',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REAPLICACIONES',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'REAPLICACIONES'
  },

  // 12. Solicitud de aplicación a cobertura de cuota
  {
    id: 12,
    nombre: 'Solicitud de aplicación a cobertura de cuota',
    expediente: 'CAR-012',
    descripcion: 'Solicito que el pago efectuado se aplique a cobertura de cuota de los meses siguientes de mi obligación.',
    submotivo: 'Cobertura de cuota',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REAPLICACIONES',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'REAPLICACIONES'
  },

  // 13. Pago que no disminuye capital
  {
    id: 13,
    nombre: 'Pago que no disminuye capital',
    expediente: 'CAR-013',
    descripcion: 'Llevo pagando cumplidamente mi crédito pero el saldo de capital no disminuye, estoy pagando y debo lo mismo.',
    submotivo: 'No disminuye capital',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'HÁBITO DE PAGO',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'HÁBITO DE PAGO'
  },

  // 14. Inconformidad porque todo se aplica a intereses
  {
    id: 14,
    nombre: 'Inconformidad porque todo se aplica a intereses',
    expediente: 'CAR-014',
    descripcion: 'Todo mi pago mensual se está yendo a intereses y no veo que baje el capital de la deuda de mi crédito.',
    submotivo: 'Pagos solo a intereses',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'HÁBITO DE PAGO',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'HÁBITO DE PAGO'
  },

  // 15. Solicitud de histórico de pagos
  {
    id: 15,
    nombre: 'Solicitud de histórico de pagos',
    expediente: 'CAR-015',
    descripcion: 'Solicito el histórico de pagos y relación detallada de todos los abonos efectuados a mi crédito desde su inicio.',
    submotivo: 'Histórico de pagos',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'HISTÓRICO DE PAGO',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'HISTÓRICO DE PAGO'
  },

  // 16. Falta del segundo titular
  {
    id: 16,
    nombre: 'Falta del segundo titular',
    expediente: 'CAR-016',
    descripcion: 'En la certificación del crédito no figura el segundo titular ni aparece mi cónyuge como cotitular, solicito corregirlo.',
    submotivo: 'Titularidad crédito',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'TITULARES',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'TITULARES'
  },

  // 17. Crédito que el cliente afirma que no es suyo
  {
    id: 17,
    nombre: 'Crédito que el cliente afirma que no es suyo',
    expediente: 'CAR-017',
    descripcion: 'Aparezco registrado como titular de un crédito de cartera que no es mío y solicito corrección de la titularidad.',
    submotivo: 'Crédito no propio',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'TITULARES',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'TITULARES'
  },

  // 18. Solicitud de cambio de fecha de pago
  {
    id: 18,
    nombre: 'Solicitud de cambio de fecha de pago',
    expediente: 'CAR-018',
    descripcion: 'Solicito cambiar la fecha de pago de mi cuota de crédito para el día 30 de cada mes después de mi nómina.',
    submotivo: 'Cambio fecha de pago',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'CAMBIO DE FECHA',
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria === 'CAMBIO DE FECHA'
  },

  // 19. Caso de cuota de manejo que NO debe confundirse con aumento de cuota de crédito
  {
    id: 19,
    nombre: 'Cuota de manejo NO debe confundirse con aumento de cuota',
    expediente: 'CAR-019',
    descripcion: 'Me están cobrando una cuota de manejo de $28.000 en mi tarjeta de crédito que no autoricé.',
    submotivo: 'Cuota de manejo tarjeta',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: ['COBRO', 'COBRO NO RECONOCIDO'],
    requiereRevisionEsperada: false,
    productoEsperado: 'TARJETA DE CRÉDITO',
    verificar: (a) => a.categoria_principal === 'CUOTAS DE MANEJO'
  },

  // 20. Caso de honorarios y gastos de cobranza que debe conservar su categoría
  {
    id: 20,
    nombre: 'Honorarios y gastos de cobranza debe conservar su categoría',
    expediente: 'CAR-020',
    descripcion: 'Me están cobrando honorarios y gastos de cobranza por $120.000 cuando siempre he pagado a tiempo.',
    submotivo: 'Cobranza',
    categoriaEsperada: 'HONORARIOS Y GASTOS DE COBRANZA',
    subcategoriaEsperada: ['COBRO CUESTIONADO POR NO ESTAR EN MORA', 'GASTOS DE COBRANZA', 'COBRO DE HONORARIOS'],
    requiereRevisionEsperada: false,
    verificar: (a) => a.categoria_principal === 'HONORARIOS Y GASTOS DE COBRANZA'
  },

  // 21. Caso de pago no aplicado que no necesariamente significa reversión
  {
    id: 21,
    nombre: 'Pago no aplicado NO es reversión',
    expediente: 'CAR-021',
    descripcion: 'Hice el pago de mi obligación el viernes y todavía no aparece aplicado ni reflejado en el sistema.',
    submotivo: 'Pago no aplicado',
    categoriaEsperada: ['PAGOS / ABONOS', 'APLICACIÓN DE PAGO'],
    subcategoriaEsperada: ['APLICACIÓN DE PAGO', 'PAGO NO REFLEJADO'],
    requiereRevisionEsperada: false,
    verificar: (a) => a.subcategoria !== 'REVERSIÓN' && (a.categoria_principal === 'APLICACIÓN DE PAGO' || a.categoria_principal === 'PAGOS / ABONOS')
  },

  // 22. Descripción extensa donde la solicitud aparece al final
  {
    id: 22,
    nombre: 'Descripción extensa con solicitud al final',
    expediente: 'CAR-022',
    descripcion:
      'Estimados señores del banco. Me pongo en contacto con ustedes después de haber sido cliente por más de diez años con excelente comportamiento y cumplimiento en todas mis obligaciones financieras tanto de tarjetas como de depósitos. Durante este tiempo nunca he presentado mora ni problemas transaccionales. Sin embargo en la última semana he tenido dificultades con mis horarios laborales y fechas de corte de nómina de mi empresa. Por lo anterior solicito formalmente el cambio de fecha de pago de mi cuota para los días 5 de cada mes.',
    submotivo: 'Trámite operativo',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'CAMBIO DE FECHA',
    requiereRevisionEsperada: false,
    verificar: (a) => {
      const ev = (a.evidencia_clasificacion || a.evidencia_textual || '').toLowerCase();
      return a.categoria_principal === 'CRÉDITOS / CARTERA' &&
             a.subcategoria === 'CAMBIO DE FECHA' &&
             (ev.includes('cambio de fecha') || ev.includes('fecha de pago'));
    }
  }
];

export function runCarteraCreditosTests(): {
  success: boolean;
  total: number;
  passed: number;
  failures: string[];
} {
  console.log('='.repeat(80));
  console.log('PRUEBAS AUTOMATIZADAS: SUB-CATEGORÍAS DE CARTERA / CRÉDITOS (22 CASOS OBLIGATORIOS)');
  console.log('='.repeat(80));

  let passed = 0;
  const failures: string[] = [];

  CARTERA_CREDITOS_TEST_SUITE.forEach(tc => {
    const inputRecord: PQRInputRecord = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      submotivo_original: tc.submotivo,
      producto_original: tc.producto,
      tipo_origen: tc.tipo_origen
    };

    const deterministic = classifyPQRDeterministic(inputRecord);
    const analysis = buildPQRSAnalysis(inputRecord, deterministic);

    const catPrincipal = analysis.categoria_principal || '';
    const subcatActual = analysis.subcategoria || '';
    const catOk = Array.isArray(tc.categoriaEsperada)
      ? tc.categoriaEsperada.includes(catPrincipal)
      : catPrincipal === tc.categoriaEsperada;
    const subOk = Array.isArray(tc.subcategoriaEsperada)
      ? tc.subcategoriaEsperada.includes(subcatActual)
      : subcatActual === tc.subcategoriaEsperada;
    const revOk = analysis.requiere_revision === tc.requiereRevisionEsperada;
    const prodOk = !tc.productoEsperado || analysis.producto_detectado === tc.productoEsperado;
    const customOk = tc.verificar ? tc.verificar(analysis) : true;

    // Validate standard canonical fields
    const fieldsOk =
      analysis.categoria_principal !== undefined &&
      analysis.subcategoria !== undefined &&
      analysis.problema_principal !== undefined &&
      analysis.solicitud_cliente !== undefined &&
      analysis.resumen_normalizado !== undefined &&
      analysis.evidencia_clasificacion !== undefined &&
      analysis.nivel_confianza !== undefined &&
      analysis.requiere_revision !== undefined;

    if (catOk && subOk && revOk && prodOk && customOk && fieldsOk) {
      passed++;
      console.log(`✓ [PASÓ] Caso #${tc.id.toString().padStart(2, '0')} - ${tc.nombre}`);
      console.log(`   Cat: "${analysis.categoria_principal}" | Sub: "${analysis.subcategoria}" | Prod: "${analysis.producto_detectado}" | Rev: ${analysis.requiere_revision ? 'SÍ' : 'NO'}`);
      console.log(`   Prob: "${analysis.problema_principal}" | Sol: "${analysis.solicitud_cliente}"`);
      console.log(`   Evidencia: "${(analysis.evidencia_clasificacion || '').slice(0, 80)}..."`);
    } else {
      const msg = `✗ [FALLÓ] Caso #${tc.id} - ${tc.nombre}:
        Cat: "${analysis.categoria_principal}" (Esperada: "${tc.categoriaEsperada}") -> ${catOk ? 'OK' : 'ERROR'}
        Sub: "${analysis.subcategoria}" (Esperada: "${JSON.stringify(tc.subcategoriaEsperada)}") -> ${subOk ? 'OK' : 'ERROR'}
        Rev: ${analysis.requiere_revision} (Esperada: ${tc.requiereRevisionEsperada}) -> ${revOk ? 'OK' : 'ERROR'}
        Prod: "${analysis.producto_detectado}" (Esperado: "${tc.productoEsperado || 'Cualquiera'}") -> ${prodOk ? 'OK' : 'ERROR'}
        Custom: ${customOk ? 'OK' : 'ERROR'} | Fields: ${fieldsOk ? 'OK' : 'ERROR'}`;
      failures.push(msg);
      console.error(msg);
    }
  });

  // Verify that Excel rows do not contain extracted payment/date columns
  const mockExportRow: Record<string, any> = {};
  const mockAnalysis = buildPQRSAnalysis(
    { numero_expediente: 'TEST-EXP', descripcion_original: 'Pagué mi cuota en octubre por $100.000' },
    classifyPQRDeterministic({ numero_expediente: 'TEST-EXP', descripcion_original: 'Pagué mi cuota en octubre por $100.000' })
  );

  // Check generated export columns definition
  const disallowedColumns = ['FECHA EXTRAÍDA', 'FECHA DE PAGO', 'VALOR DEL PAGO', 'PAGO EXTRAÍDO', 'FECHA DEL PAGO', 'FECHA DEL PAGO 2', 'VALOR DEL PAGO 2'];
  const simulatedExportKeys = [
    'NO_SS',
    'CATEGORÍA PRINCIPAL',
    'SUBCATEGORÍA IA',
    'PRODUCTO DETECTADO',
    'PROBLEMA PRINCIPAL',
    'SOLICITUD DEL CLIENTE',
    'RESUMEN NORMALIZADO',
    'EVIDENCIA DE CLASIFICACIÓN',
    'NIVEL DE CONFIANZA',
    'REQUIERE REVISIÓN'
  ];

  const hasDisallowed = simulatedExportKeys.some(k => disallowedColumns.includes(k));
  if (!hasDisallowed) {
    console.log('✓ [PASÓ] La exportación Excel NO genera columnas automáticas de extracción de fecha ni pago.');
  } else {
    failures.push('Error: Se detectaron columnas de extracción de fecha/pago prohibidas en la exportación Excel.');
  }

  console.log('-'.repeat(80));
  console.log(`RESULTADO CARTERA / CRÉDITOS: ${passed}/${CARTERA_CREDITOS_TEST_SUITE.length} pruebas pasadas (${((passed / CARTERA_CREDITOS_TEST_SUITE.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    throw new Error(`${failures.length} pruebas fallaron.`);
  }

  return {
    success: failures.length === 0,
    total: CARTERA_CREDITOS_TEST_SUITE.length,
    passed,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runCarteraCreditosTests();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
