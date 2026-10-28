import { classifyPQRDeterministic, buildPQRSAnalysis } from '../src/services/classifierEngine';
import { extractItauPaymentDetails } from '../src/services/paymentExtractor';
import * as XLSX from 'xlsx';

interface ExtractionTestCase {
  id: number;
  nombre: string;
  expediente: string;
  tipo_origen: string;
  descripcion: string;
  categoriaEsperada: string;
  fechaEsperada: string;
  valorEsperado: string;
  fecha2Esperada?: string;
  valor2Esperada?: string;
  tieneMultiplesEsperado?: boolean;
}

export const ITAU_EXTRACTION_TEST_SUITE: ExtractionTestCase[] = [
  {
    id: 1,
    nombre: 'Itaú - Pago en septiembre con valor en formato $450.000',
    expediente: 'ITAU-EXT-001',
    tipo_origen: 'ITAU',
    descripcion: 'Pagué mi tarjeta Itaú en septiembre por $450.000 y no está reflejado.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: 'septiembre',
    valorEsperado: '$450.000'
  },
  {
    id: 2,
    nombre: 'Itaú - Pago en septiembre y contraste en octubre (No debe extraer octubre como fecha de pago)',
    expediente: 'ITAU-EXT-002',
    tipo_origen: 'ITAU',
    descripcion: 'Pagué en septiembre $300.000 y todavía no aparece en octubre.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: 'septiembre',
    valorEsperado: '$300.000'
  },
  {
    id: 3,
    nombre: 'Itaú - Fecha textual con día y mes (5 de octubre) y sin valor (Valor ausente)',
    expediente: 'ITAU-EXT-003',
    tipo_origen: 'ITAU',
    descripcion: 'Pagué mi tarjeta Itaú el 5 de octubre y no veo el pago.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: '5 de octubre',
    valorEsperado: ''
  },
  {
    id: 4,
    nombre: 'Itaú - Valor monetario sin fecha (Fecha ausente)',
    expediente: 'ITAU-EXT-004',
    tipo_origen: 'ITAU',
    descripcion: 'Me descontaron $500.000 de la tarjeta Itaú pero el pago no se ha aplicado.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: '',
    valorEsperado: '$500.000'
  },
  {
    id: 5,
    nombre: 'Itaú - Múltiples pagos (septiembre y octubre) sin valor',
    expediente: 'ITAU-EXT-005',
    tipo_origen: 'ITAU',
    descripcion: 'No veo mis pagos de septiembre y octubre en mi tarjeta de crédito Itaú.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: 'septiembre',
    valorEsperado: '',
    fecha2Esperada: 'octubre',
    valor2Esperada: '',
    tieneMultiplesEsperado: true
  },
  {
    id: 6,
    nombre: 'Itaú - Múltiples pagos con fechas y valores separados',
    expediente: 'ITAU-EXT-006',
    tipo_origen: 'ITAU',
    descripcion: 'Realicé dos pagos a mi tarjeta Itaú: uno el 15 de septiembre por $200.000 y otro el 30 de septiembre por $150.000.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: '15 de septiembre',
    valorEsperado: '$200.000',
    fecha2Esperada: '30 de septiembre',
    valor2Esperada: '$150.000',
    tieneMultiplesEsperado: true
  },
  {
    id: 7,
    nombre: 'Itaú - Fecha numérica (DD/MM/YYYY) y valor con apóstrofe de millón',
    expediente: 'ITAU-EXT-007',
    tipo_origen: 'ITAU',
    descripcion: 'El 15/09/2026 realicé una transferencia de $1\'250.000 a mi obligación y no aparece abonada.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: '15/09/2026',
    valorEsperado: '$1\'250.000'
  },
  {
    id: 8,
    nombre: 'Itaú - Fecha relativa (ayer) y valor escrito como 450 mil pesos',
    expediente: 'ITAU-EXT-008',
    tipo_origen: 'ITAU',
    descripcion: 'El día de ayer pagué 450 mil pesos a mi tarjeta Itaú y no se refleja el saldo.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: 'ayer',
    valorEsperado: '$450.000'
  },
  {
    id: 9,
    nombre: 'Itaú - Distinguir fecha de radicado de fecha de pago real',
    expediente: 'ITAU-EXT-009',
    tipo_origen: 'ITAU',
    descripcion: 'Radicado del 05/10/2026 solicitando aplicar el pago que realicé el 28/09/2026 por $350.000.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: '28/09/2026',
    valorEsperado: '$350.000'
  },
  {
    id: 10,
    nombre: 'Itaú - Ignorar número de tarjeta o cuenta para valor monetario',
    expediente: 'ITAU-EXT-010',
    tipo_origen: 'ITAU',
    descripcion: 'Pagué $450.000 a mi tarjeta terminada en 4321 el día de ayer y el pago no se ha aplicado.',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: 'ayer',
    valorEsperado: '$450.000'
  },
  {
    id: 11,
    nombre: 'Itaú - Sin fechas ni valores en la descripción (Debe dejar celdas vacías)',
    expediente: 'ITAU-EXT-011',
    tipo_origen: 'ITAU',
    descripcion: '¿Dónde están los pagos que realicé a mi tarjeta Itaú?',
    categoriaEsperada: 'PAGO A ITAU',
    fechaEsperada: '',
    valorEsperado: ''
  },
  {
    id: 12,
    nombre: 'Origen BANCOLOMBIA - NO debe extraer pagos aunque mencione fecha y valor',
    expediente: 'BANCO-001',
    tipo_origen: 'BANCOLOMBIA',
    descripcion: 'Pagué mi tarjeta en septiembre por $450.000 y no está reflejado.',
    categoriaEsperada: 'PAGOS / ABONOS',
    fechaEsperada: '',
    valorEsperado: ''
  },
  {
    id: 13,
    nombre: 'Origen DAVIVIENDA - NO debe extraer pagos aunque mencione fecha y valor',
    expediente: 'DAVI-001',
    tipo_origen: 'DAVIVIENDA',
    descripcion: 'El 15 de septiembre transferí $300.000 y no aparece abonada.',
    categoriaEsperada: 'TRANSFERENCIAS',
    fechaEsperada: '',
    valorEsperado: ''
  },
  {
    id: 14,
    nombre: 'Itaú pero reclamo de FRAUDE - NO debe extraer datos de pago',
    expediente: 'ITAU-FRAUD-001',
    tipo_origen: 'ITAU',
    descripcion: 'No reconozco una compra por $250.000 efectuada el 12 de septiembre con mi tarjeta Itaú.',
    categoriaEsperada: 'FRAUDES',
    fechaEsperada: '',
    valorEsperado: ''
  },
  {
    id: 15,
    nombre: 'Itaú pero reclamo de CUOTA DE MANEJO - NO debe extraer datos de pago',
    expediente: 'ITAU-CUOTA-001',
    tipo_origen: 'ITAU',
    descripcion: 'Cobro no autorizado de cuota de manejo por $35.000 en el extracto de octubre de mi tarjeta Itaú.',
    categoriaEsperada: 'CUOTA DE MANEJO',
    fechaEsperada: '',
    valorEsperado: ''
  }
];

export function runExtractionTests(): {
  totalProcessed: number;
  datesIdentified: number;
  valuesIdentified: number;
  failures: string[];
} {
  const failures: string[] = [];
  let datesCount = 0;
  let valuesCount = 0;

  console.log('='.repeat(80));
  console.log(`PRUEBAS DE EXTRACCIÓN DE FECHA Y VALOR DE PAGOS ITAÚ (${ITAU_EXTRACTION_TEST_SUITE.length} CASOS)`);
  console.log('='.repeat(80));

  ITAU_EXTRACTION_TEST_SUITE.forEach(tc => {
    const record = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      tipo_origen: tc.tipo_origen,
      columnas_adicionales: {
        'TIPO ORIGEN': tc.tipo_origen
      }
    };

    const det = classifyPQRDeterministic(record);
    const analysis = buildPQRSAnalysis(record, det);

    const catOk = analysis.categoria_principal === tc.categoriaEsperada;
    const fechaOk = analysis.fecha_pago === tc.fechaEsperada;
    const valorOk = analysis.valor_pago === tc.valorEsperado;

    let fecha2Ok = true;
    let valor2Ok = true;
    if (tc.fecha2Esperada !== undefined) {
      fecha2Ok = analysis.pagos_detectados?.[1]?.fecha === tc.fecha2Esperada;
    }
    if (tc.valor2Esperada !== undefined) {
      valor2Ok = analysis.pagos_detectados?.[1]?.valor === tc.valor2Esperada;
    }

    if (analysis.fecha_pago) datesCount++;
    if (analysis.valor_pago) valuesCount++;
    if (analysis.pagos_detectados && analysis.pagos_detectados.length > 1) {
      if (analysis.pagos_detectados[1]?.fecha) datesCount++;
      if (analysis.pagos_detectados[1]?.valor) valuesCount++;
    }

    if (catOk && fechaOk && valorOk && fecha2Ok && valor2Ok) {
      console.log(`✓ [PASÓ] Caso #${tc.id.toString().padStart(2, '0')} - ${tc.nombre}`);
      console.log(`   Cat: "${analysis.categoria_principal}" | Fecha: "${analysis.fecha_pago}" | Valor: "${analysis.valor_pago}"${analysis.pagos_detectados && analysis.pagos_detectados.length > 1 ? ` | Pago 2: [Fecha: ${analysis.pagos_detectados[1]?.fecha}, Valor: ${analysis.pagos_detectados[1]?.valor}]` : ''}`);
    } else {
      const msg = `✗ [FALLÓ] Caso #${tc.id} - ${tc.nombre}:
        Cat: "${analysis.categoria_principal}" (Esperada: "${tc.categoriaEsperada}") -> ${catOk ? 'OK' : 'ERROR'}
        Fecha 1: "${analysis.fecha_pago}" (Esperada: "${tc.fechaEsperada}") -> ${fechaOk ? 'OK' : 'ERROR'}
        Valor 1: "${analysis.valor_pago}" (Esperada: "${tc.valorEsperado}") -> ${valorOk ? 'OK' : 'ERROR'}
        Fecha 2: "${analysis.pagos_detectados?.[1]?.fecha || ''}" (Esperada: "${tc.fecha2Esperada || ''}") -> ${fecha2Ok ? 'OK' : 'ERROR'}
        Valor 2: "${analysis.pagos_detectados?.[1]?.valor || ''}" (Esperada: "${tc.valor2Esperada || ''}") -> ${valor2Ok ? 'OK' : 'ERROR'}`;
      failures.push(msg);
      console.error(msg);
    }
  });

  // Verify Excel Sheet Generation
  console.log('-'.repeat(80));
  console.log('VALIDACIÓN DE GENERACIÓN DE EXCEL CON NUEVAS COLUMNAS...');

  const sampleRows = ITAU_EXTRACTION_TEST_SUITE.map(tc => {
    const record = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      tipo_origen: tc.tipo_origen,
      columnas_adicionales: {
        'NO_SS': tc.expediente,
        'TIPO ORIGEN': tc.tipo_origen,
        'DESC_DETALLADA': tc.descripcion
      }
    };
    const det = classifyPQRDeterministic(record);
    const analysis = buildPQRSAnalysis(record, det);

    return {
      'NO_SS': tc.expediente,
      'TIPO ORIGEN': tc.tipo_origen,
      'DESC_DETALLADA': tc.descripcion,
      'CATEGORIA': analysis.categoria_principal,
      'FECHA DEL PAGO': analysis.fecha_pago || '',
      'VALOR DEL PAGO': analysis.valor_pago || '',
      'FECHA DEL PAGO 2': analysis.pagos_detectados?.[1]?.fecha || '',
      'VALOR DEL PAGO 2': analysis.pagos_detectados?.[1]?.valor || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Base Original + Pagos Itaú');

  const headers = Object.keys(sampleRows[0]);
  const hasCat = headers.includes('CATEGORIA');
  const hasFecha = headers.includes('FECHA DEL PAGO');
  const hasValor = headers.includes('VALOR DEL PAGO');

  if (hasCat && hasFecha && hasValor) {
    console.log('✓ [PASÓ] El archivo Excel contiene correctamente las columnas obligatorias: CATEGORIA, FECHA DEL PAGO, VALOR DEL PAGO');
  } else {
    failures.push('Error: El archivo Excel generado no contiene todas las columnas requeridas.');
  }

  console.log('='.repeat(80));
  console.log(`RESUMEN DE PRUEBAS DE EXTRACCIÓN:`);
  console.log(`- Total expedientes procesados: ${ITAU_EXTRACTION_TEST_SUITE.length}`);
  console.log(`- Fechas de pago identificadas: ${datesCount}`);
  console.log(`- Valores de pago identificados: ${valuesCount}`);
  console.log(`- Errores encontrados: ${failures.length}`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    throw new Error(`${failures.length} pruebas de extracción fallaron.`);
  }

  return {
    totalProcessed: ITAU_EXTRACTION_TEST_SUITE.length,
    datesIdentified: datesCount,
    valuesIdentified: valuesCount,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runExtractionTests();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
