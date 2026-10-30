import { classifyPQRDeterministic, buildPQRSAnalysis, PQRInputRecord } from '../src/services/classifierEngine';

export interface CondicionesTestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  categoriaEsperada: string;
  subcategoriaEsperada: string | string[];
  productoEsperado?: string;
  requiereRevisionEsperada: boolean;
  verificar?: (analysis: any) => boolean;
}

export const CONDICIONES_TEST_SUITE: CondicionesTestCase[] = [
  // 1. No estoy de acuerdo con las condiciones de mi crédito.
  {
    id: 1,
    nombre: 'Inconformidad con condiciones de crédito',
    expediente: 'CON-001',
    descripcion: 'No estoy de acuerdo con las condiciones de mi crédito.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'OTRAS CONDICIONES DEL CRÉDITO',
    productoEsperado: 'CRÉDITO / CARTERA',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.categoria_principal === 'CONDICIONES';
    }
  },

  // 2. No acepto la tasa que me colocaron.
  {
    id: 2,
    nombre: 'Rechazo de tasa de interés colocada',
    expediente: 'CON-002',
    descripcion: 'No acepto la tasa que me colocaron.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'TASA DE INTERÉS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.subcategoria === 'TASA DE INTERÉS';
    }
  },

  // 3. La tasa no es la que tenía anteriormente.
  {
    id: 3,
    nombre: 'Tasa no corresponde a la anterior',
    expediente: 'CON-003',
    descripcion: 'La tasa no es la que tenía anteriormente.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: ['CAMBIO DE TASA', 'TASA DE INTERÉS'],
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES';
    }
  },

  // 4. Me aumentaron la tasa de mi obligación.
  {
    id: 4,
    nombre: 'Aumento de tasa en obligación',
    expediente: 'CON-004',
    descripcion: 'Me aumentaron la tasa de mi obligación.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'CAMBIO DE TASA',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.subcategoria === 'CAMBIO DE TASA';
    }
  },

  // 5. Me ofrecieron una tasa fija y me aplicaron una variable.
  {
    id: 5,
    nombre: 'Conversión de tasa fija a variable',
    expediente: 'CON-005',
    descripcion: 'Me ofrecieron una tasa fija y me aplicaron una variable.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'CAMBIO DE TASA',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.subcategoria === 'CAMBIO DE TASA';
    }
  },

  // 6. Me modificaron el plazo del crédito.
  {
    id: 6,
    nombre: 'Modificación del plazo del crédito',
    expediente: 'CON-006',
    descripcion: 'Me modificaron el plazo del crédito.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'PLAZO DEL CRÉDITO',
    productoEsperado: 'CRÉDITO / CARTERA',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.subcategoria === 'PLAZO DEL CRÉDITO';
    }
  },

  // 7. Mi cuota quedó diferente a la pactada.
  {
    id: 7,
    nombre: 'Cuota mensual diferente a la pactada',
    expediente: 'CON-007',
    descripcion: 'Mi cuota quedó diferente a la pactada.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'VALOR DE CUOTA POR CONDICIONES',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.subcategoria === 'VALOR DE CUOTA POR CONDICIONES' &&
             analysis.categoria_principal !== 'CUOTAS DE MANEJO';
    }
  },

  // 8. No respetaron las condiciones comerciales.
  {
    id: 8,
    nombre: 'Condiciones comerciales no respetadas',
    expediente: 'CON-008',
    descripcion: 'No respetaron las condiciones comerciales.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: ['CONDICIONES COMERCIALES', 'CONDICIONES PACTADAS NO RESPETADAS'],
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES';
    }
  },

  // 9. Después de la migración cambiaron las condiciones.
  {
    id: 9,
    nombre: 'Cambio de condiciones después de migración',
    expediente: 'CON-009',
    descripcion: 'Después de la migración cambiaron las condiciones.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'CONDICIONES DESPUÉS DE MIGRACIÓN',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.subcategoria === 'CONDICIONES DESPUÉS DE MIGRACIÓN';
    }
  },

  // 10. No estoy de acuerdo con las condiciones del leasing.
  {
    id: 10,
    nombre: 'Inconformidad con condiciones de leasing',
    expediente: 'CON-010',
    descripcion: 'No estoy de acuerdo con las condiciones del leasing.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'OTRAS CONDICIONES DEL CRÉDITO',
    productoEsperado: 'LEASING',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_ia === 'CONDICIONES' &&
             analysis.producto_detectado === 'LEASING';
    }
  },

  // 11. Reclamo únicamente por intereses de mora. (Desambiguación)
  {
    id: 11,
    nombre: 'Reclamo por intereses de mora (Comisiones y cobros)',
    expediente: 'CON-011',
    descripcion: 'Reclamo únicamente por intereses de mora.',
    categoriaEsperada: 'COMISIONES Y COBROS',
    subcategoriaEsperada: 'INTERESES',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CONDICIONES' &&
             analysis.categoria_principal === 'COMISIONES Y COBROS';
    }
  },

  // 12. Reclamo por cuota de manejo de una tarjeta. (Desambiguación)
  {
    id: 12,
    nombre: 'Reclamo por cuota de manejo de tarjeta (Cuotas de manejo)',
    expediente: 'CON-012',
    descripcion: 'Reclamo por cuota de manejo de una tarjeta.',
    categoriaEsperada: 'CUOTAS DE MANEJO',
    subcategoriaEsperada: 'COBRO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CONDICIONES' &&
             analysis.categoria_principal === 'CUOTAS DE MANEJO';
    }
  },

  // 13. Solicito copia de mi contrato sin cuestionar sus condiciones. (Desambiguación)
  {
    id: 13,
    nombre: 'Solicitud de copia de contrato sin reclamo (Información y documentos)',
    expediente: 'CON-013',
    descripcion: 'Solicito copia de mi contrato sin cuestionar sus condiciones.',
    categoriaEsperada: 'INFORMACIÓN Y DOCUMENTOS',
    subcategoriaEsperada: 'EXTRACTOS Y DOCUMENTOS',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CONDICIONES' &&
             analysis.categoria_principal === 'INFORMACIÓN Y DOCUMENTOS';
    }
  },

  // 14. Solicito información sobre mi crédito sin manifestar inconformidad. (Desambiguación)
  {
    id: 14,
    nombre: 'Solicitud de información de crédito sin inconformidad (Información y documentos)',
    expediente: 'CON-014',
    descripcion: 'Solicito información sobre mi crédito sin manifestar inconformidad.',
    categoriaEsperada: 'INFORMACIÓN Y DOCUMENTOS',
    subcategoriaEsperada: ['CERTIFICADOS Y PAZ Y SALVO', 'EXTRACTOS Y DOCUMENTOS'],
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      return analysis.categoria_principal !== 'CONDICIONES' &&
             analysis.categoria_principal === 'INFORMACIÓN Y DOCUMENTOS';
    }
  },

  // 15. Descripción extensa donde la inconformidad aparece al final.
  {
    id: 15,
    nombre: 'Descripción extensa con inconformidad al final',
    expediente: 'CON-015',
    descripcion: 'Estimados señores, me dirijo a ustedes para exponer mi caso. He sido cliente de la entidad durante más de cinco años y siempre he cumplido puntualmente con mis obligaciones. Sin embargo, al revisar la liquidación de este mes noté inconsistencias graves, por lo cual manifiesto que no acepto la tasa de interés que le colocaron a mi crédito de libre inversión ya que es superior a la ofrecida.',
    categoriaEsperada: 'CONDICIONES',
    subcategoriaEsperada: 'TASA DE INTERÉS',
    productoEsperado: 'CRÉDITO DE LIBRE INVERSIÓN',
    requiereRevisionEsperada: false,
    verificar: (analysis) => {
      const hasEvidence =
        analysis.evidencia_clasificacion &&
        (analysis.evidencia_clasificacion.toLowerCase().includes('tasa') ||
         analysis.evidencia_clasificacion.toLowerCase().includes('no acepto'));
      return analysis.categoria_principal === 'CONDICIONES' &&
             analysis.subcategoria === 'TASA DE INTERÉS' &&
             analysis.producto_detectado === 'CRÉDITO DE LIBRE INVERSIÓN' &&
             hasEvidence;
    }
  }
];

export function runCondicionesTests() {
  console.log('='.repeat(80));
  console.log('PRUEBAS AUTOMATIZADAS: NUEVA CATEGORÍA CONDICIONES (15 CASOS OBLIGATORIOS)');
  console.log('='.repeat(80));

  let passed = 0;
  const failures: string[] = [];

  CONDICIONES_TEST_SUITE.forEach(tc => {
    const inputRecord: PQRInputRecord = {
      numero_expediente: tc.expediente,
      descripcion_original: tc.descripcion,
      submotivo_original: tc.submotivo,
      producto_original: tc.producto
    };

    const deterministic = classifyPQRDeterministic(inputRecord);
    const analysis = buildPQRSAnalysis(inputRecord, deterministic);

    const catOk = analysis.categoria_principal === tc.categoriaEsperada;
    const subOk = Array.isArray(tc.subcategoriaEsperada)
      ? tc.subcategoriaEsperada.includes(analysis.subcategoria)
      : analysis.subcategoria === tc.subcategoriaEsperada;
    const revOk = analysis.requiere_revision === tc.requiereRevisionEsperada;
    const prodOk = tc.productoEsperado ? analysis.producto_detectado === tc.productoEsperado : true;
    const customOk = tc.verificar ? tc.verificar(analysis) : true;

    // Validate mandatory fields from section 7
    const fieldsOk =
      analysis.categoria_ia === analysis.categoria_principal &&
      analysis.subcategoria_ia === analysis.subcategoria &&
      analysis.producto_detectado !== undefined &&
      analysis.problema_principal !== undefined &&
      analysis.problema_principal.length > 0 &&
      analysis.solicitud_cliente !== undefined &&
      analysis.solicitud_cliente.length > 0 &&
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

  console.log('-'.repeat(80));
  console.log(`RESULTADO CONDICIONES: ${passed}/${CONDICIONES_TEST_SUITE.length} pruebas pasadas (${((passed / CONDICIONES_TEST_SUITE.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    throw new Error(`${failures.length} pruebas de CONDICIONES fallaron.`);
  }

  return {
    success: failures.length === 0,
    total: CONDICIONES_TEST_SUITE.length,
    passed,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runCondicionesTests();
    process.exit(0);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}
