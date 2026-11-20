import { classifyPQRDeterministic, buildPQRSAnalysis, ETIQUETA_MENCIONA_ITAU } from '../src/services/classifierEngine';
import { buildExportRow } from '../src/services/excelService';

interface TestCase {
  id: number;
  nombre: string;
  expediente: string;
  descripcion: string;
  submotivo?: string;
  producto?: string;
  tipo_origen?: string;
  columnas_adicionales?: Record<string, any>;
  categoriaEsperada: string;
  subcategoriaEsperada: string;
  productoEsperado?: string;
  requiereRevisionEsperada: boolean;
  esperaEtiquetaItau?: boolean;
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
  // CASOS OBLIGATORIOS: PAGOS NO APLICADOS, DEMORADOS O DUPLICADOS (PAGOS / ABONOS)
  // =========================================================================
  {
    id: 19,
    nombre: 'Pago no reflejado en tarjeta con mención Itaú (Debe ser PAGOS / ABONOS + etiqueta informativa)',
    expediente: 'TEST-PAG-001',
    descripcion: 'Pagué mi tarjeta Itaú y no veo el pago.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 20,
    nombre: 'Pago de tarjeta en septiembre sin reflejo (Debe ser PAGOS / ABONOS + etiqueta informativa)',
    expediente: 'TEST-PAG-002',
    descripcion: 'Pagué mi tarjeta Itau en septiembre y no está reflejado.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 21,
    nombre: 'No veo mis pagos de septiembre y octubre',
    expediente: 'TEST-PAG-003',
    descripcion: 'No veo mis pagos de septiembre y octubre.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 22,
    nombre: '¿Dónde están los pagos que realicé?',
    expediente: 'TEST-PAG-004',
    descripcion: '¿Dónde están los pagos que realicé?',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 23,
    nombre: 'El pago de mi tarjeta no se ha aplicado',
    expediente: 'TEST-PAG-005',
    descripcion: 'El pago de mi tarjeta no se ha aplicado.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 24,
    nombre: 'Transferencia no abonada (Debe ser TRANSFERENCIAS)',
    expediente: 'TEST-PAG-006',
    descripcion: 'Realicé una transferencia y no aparece abonada.',
    categoriaEsperada: 'TRANSFERENCIAS',
    subcategoriaEsperada: 'TRANSFERENCIAS',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 25,
    nombre: 'Dinero descontado pero no reflejado en tarjeta',
    expediente: 'TEST-PAG-007',
    descripcion: 'Me descontaron el dinero, pero no se refleja en mi tarjeta.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false
  },
  {
    id: 26,
    nombre: 'Pago pendiente de aplicación',
    expediente: 'TEST-PAG-008',
    descripcion: 'Mi pago sigue pendiente de aplicación.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 27,
    nombre: 'Pago parcial / solo aparece uno de dos pagos',
    expediente: 'TEST-PAG-009',
    descripcion: 'Solo aparece uno de los dos pagos que realicé.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 28,
    nombre: 'Pago en septiembre que no aparece en octubre',
    expediente: 'TEST-PAG-010',
    descripcion: 'Pagué en septiembre y todavía no aparece en octubre.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 29,
    nombre: 'Pago debitado de cuenta pero no aplicado a la obligación',
    expediente: 'TEST-PAG-011',
    descripcion: 'El pago aparece debitado de mi cuenta, pero no aplicado a la obligación.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'CUENTA DE AHORROS',
    requiereRevisionEsperada: false
  },
  {
    id: 30,
    nombre: 'No encuentro el comprobante o registro del pago realizado',
    expediente: 'TEST-PAG-012',
    descripcion: 'No encuentro el comprobante o el registro del pago realizado.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  {
    id: 31,
    nombre: 'Pago rechazado, pendiente o con demora en aplicación',
    expediente: 'TEST-PAG-013',
    descripcion: 'El pago fue rechazado, quedó pendiente o presenta una demora en su aplicación.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false
  },
  // =========================================================================
  // VERIFICACIÓN DE ETIQUETA INFORMATIVA SIN ALTERAR OTRAS CATEGORÍAS
  // =========================================================================
  {
    id: 32,
    nombre: 'Compra no reconocida mencionando Itaú (Debe ser FRAUDES + etiqueta informativa)',
    expediente: 'TEST-TAG-001',
    descripcion: 'No reconozco una compra realizada con mi tarjeta de crédito Itaú en un comercio electrónico.',
    categoriaEsperada: 'FRAUDES',
    subcategoriaEsperada: 'OPERACIÓN NO RECONOCIDA',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 33,
    nombre: 'Cuota de manejo mencionando Itaú (Debe ser CUOTAS DE MANEJO + etiqueta informativa)',
    expediente: 'TEST-TAG-002',
    descripcion: 'Me están cobrando cuota de manejo en mi tarjeta de crédito Itaú y solicito exoneración acordada.',
    categoriaEsperada: 'CUOTA DE MANEJO',
    subcategoriaEsperada: 'COBRO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 34,
    nombre: 'Aumento de cupo mencionando Itaú (Debe ser TARJETAS + etiqueta informativa)',
    expediente: 'TEST-TAG-003',
    descripcion: 'Solicito aumento de cupo para mi tarjeta de crédito Visa Itaú.',
    categoriaEsperada: 'TARJETAS',
    subcategoriaEsperada: 'CUPO Y AVANCES',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 35,
    nombre: 'Paz y salvo mencionando Itaú (Debe ser INFORMACIÓN Y DOCUMENTOS + etiqueta informativa)',
    expediente: 'TEST-TAG-004',
    descripcion: 'Solicito certificado de paz y salvo de mi obligación Itaú que ya fue cancelada en su totalidad.',
    categoriaEsperada: 'INFORMACIÓN Y DOCUMENTOS',
    subcategoriaEsperada: 'CERTIFICADOS Y PAZ Y SALVO',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 36,
    nombre: 'Mención aislada de producto sin problema (Debe ser REVISIÓN HUMANA + etiqueta informativa)',
    expediente: 'TEST-TAG-005',
    descripcion: 'tarjeta de credito itau',
    categoriaEsperada: 'REVISIÓN HUMANA',
    subcategoriaEsperada: 'INFORMACIÓN INSUFICIENTE',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: true,
    esperaEtiquetaItau: true
  },
  // =========================================================================
  // CASOS OBLIGATORIOS DE VALIDACIÓN UNIFICACIÓN DE PRODUCTOS Y PAGOS / ABONOS
  // =========================================================================
  {
    id: 37,
    nombre: 'Pago de crédito no aplicado (con mención de cuota de crédito -> PAGOS / ABONOS)',
    expediente: 'TEST-UNI-001',
    descripcion: 'Realicé el pago de la cuota de mi crédito de libre inversión hace 5 días y todavía no aparece aplicado.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'CRÉDITO DE LIBRE INVERSIÓN',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 38,
    nombre: 'Pago duplicado con solicitud de devolución (CRÉDITOS / CARTERA > REVERSIÓN)',
    expediente: 'TEST-UNI-002',
    descripcion: 'Realicé un pago duplicado de mi crédito de consumo y solicito la devolución del dinero.',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REVERSIÓN',
    productoEsperado: 'CRÉDITO DE CONSUMO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 39,
    nombre: 'Abono aplicado incorrectamente a crédito (CRÉDITOS / CARTERA > REAPLICACIONES)',
    expediente: 'TEST-UNI-003',
    descripcion: 'Realicé un abono a capital en mi crédito de vivienda y fue aplicado incorrectamente a intereses.',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REAPLICACIONES',
    productoEsperado: 'CRÉDITO DE VIVIENDA',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 40,
    nombre: 'Abono aplicado incorrectamente en tarjeta (PAGOS / ABONOS > APLICACIÓN DE PAGO)',
    expediente: 'TEST-UNI-004',
    descripcion: 'Hice un abono a mi tarjeta de crédito y quedó aplicado incorrectamente en el saldo.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 41,
    nombre: 'Solicitud de devolución de un pago (CRÉDITOS / CARTERA > REVERSIÓN)',
    expediente: 'TEST-UNI-005',
    descripcion: 'Solicito la devolución de un pago que realicé por error a mi obligación.',
    categoriaEsperada: 'CRÉDITOS / CARTERA',
    subcategoriaEsperada: 'REVERSIÓN',
    productoEsperado: 'CRÉDITO / CARTERA',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 42,
    nombre: 'Antiguo cliente Itaú con pago de crédito no reflejado (clasificación normal + etiqueta informativa)',
    expediente: 'TEST-UNI-006',
    descripcion: 'Soy antiguo cliente de Itaú, realicé el pago de mi crédito de vehículo y no aparece reflejado.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'CRÉDITO DE VEHÍCULO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: true
  },
  {
    id: 43,
    nombre: 'TIPO ORIGEN = ITAÚ pero descripción NO menciona Itaú (no altera clasificación ni genera etiqueta)',
    expediente: 'TEST-UNI-007',
    descripcion: 'Realicé el pago de mi tarjeta de crédito y aún no se ve reflejado en el saldo.',
    tipo_origen: 'ITAU',
    columnas_adicionales: { NO_SS: 'TEST-UNI-007', 'TIPO ORIGEN': 'ITAU', DESC_DETALLADA: 'Realicé el pago de mi tarjeta de crédito y aún no se ve reflejado en el saldo.' },
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'APLICACIÓN DE PAGO',
    productoEsperado: 'TARJETA DE CRÉDITO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 44,
    nombre: 'Cancelación de débito automático (PAGOS / ABONOS > DÉBITOS AUTOMÁTICOS)',
    expediente: 'TEST-UNI-008',
    descripcion: 'Solicito cancelar el débito automático inscrito en mi cuenta de ahorros para el pago mensual.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'DÉBITOS AUTOMÁTICOS',
    productoEsperado: 'CUENTA DE AHORROS',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
  },
  {
    id: 45,
    nombre: 'Pago de servicio público / convenio no aplicado (PAGOS / ABONOS > PAGOS Y RECAUDOS)',
    expediente: 'TEST-UNI-009',
    descripcion: 'Realicé el pago de la factura del servicio público de energía por convenio y no se reflejó.',
    categoriaEsperada: 'PAGOS / ABONOS',
    subcategoriaEsperada: 'PAGOS Y RECAUDOS',
    productoEsperado: 'NO ESPECIFICADO',
    requiereRevisionEsperada: false,
    esperaEtiquetaItau: false
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
      columnas_adicionales: tc.columnas_adicionales
    };

    const det = classifyPQRDeterministic(record);
    const analysis = buildPQRSAnalysis(record, det);

    const catOk =
      analysis.categoria_principal === tc.categoriaEsperada ||
      (tc.categoriaEsperada.startsWith('CUOTA') && (analysis.categoria_principal?.startsWith('CUOTA') ?? false));
    const subOk =
      analysis.subcategoria === tc.subcategoriaEsperada ||
      (tc.subcategoriaEsperada.includes('DEVOLUCIÓN') && analysis.subcategoria.includes('DEVOLUCIÓN'));
    const revOk = analysis.requiere_revision === tc.requiereRevisionEsperada;
    const prodOk = tc.productoEsperado ? analysis.producto_detectado === tc.productoEsperado : true;
    const hasTag = Boolean(analysis.etiquetas_informativas?.includes(ETIQUETA_MENCIONA_ITAU));
    const tagOk = tc.esperaEtiquetaItau === undefined ? true : hasTag === tc.esperaEtiquetaItau;

    // Verify Excel row never contains the informational tag or Itaú analysis columns,
    // while preserving original source columns such as TIPO ORIGEN if present in the upload.
    const exportRow = buildExportRow({
      id: tc.expediente,
      numero_expediente: tc.expediente,
      resumen_original: tc.submotivo || '',
      descripcion_original: tc.descripcion,
      columnas_adicionales: tc.columnas_adicionales,
      analisis: analysis
    });
    const exportValues = Object.values(exportRow).map(v => String(v || ''));
    const preservesOriginalTipoOrigen = tc.columnas_adicionales?.['TIPO ORIGEN']
      ? exportRow['TIPO ORIGEN'] === tc.columnas_adicionales['TIPO ORIGEN']
      : true;
    const exportCleanOk =
      !Object.keys(exportRow).some(k => k.toLowerCase().includes('itau') || k.toLowerCase().includes('etiqueta')) &&
      !exportValues.includes(ETIQUETA_MENCIONA_ITAU) &&
      preservesOriginalTipoOrigen;

    if (catOk && subOk && revOk && prodOk && tagOk && exportCleanOk) {
      passed++;
      console.log(`✓ [PASÓ] Caso #${tc.id.toString().padStart(2, '0')} - ${tc.nombre}`);
      console.log(`   Cat: ${analysis.categoria_principal} | Sub: ${analysis.subcategoria} | Prod: ${analysis.producto_detectado} | RevHumana: ${analysis.requiere_revision ? 'SI' : 'NO'}${hasTag ? ` | Etiqueta: ${ETIQUETA_MENCIONA_ITAU}` : ''}`);
    } else {
      const msg = `✗ [FALLÓ] Caso #${tc.id} - ${tc.nombre}:
        Cat Obtenida: "${analysis.categoria_principal}" (Esperada: "${tc.categoriaEsperada}") -> ${catOk ? 'OK' : 'ERROR'}
        Sub Obtenida: "${analysis.subcategoria}" (Esperada: "${tc.subcategoriaEsperada}") -> ${subOk ? 'OK' : 'ERROR'}
        Rev Obtenida: ${analysis.requiere_revision} (Esperada: ${tc.requiereRevisionEsperada}) -> ${revOk ? 'OK' : 'ERROR'}
        Prod Obtenido: "${analysis.producto_detectado}" (Esperado: "${tc.productoEsperado}") -> ${prodOk ? 'OK' : 'ERROR'}
        Tag Itaú: ${hasTag} (Esperada: ${tc.esperaEtiquetaItau}) -> ${tagOk ? 'OK' : 'ERROR'}
        Excel limpio: ${exportCleanOk ? 'OK' : 'ERROR'}`;
      failures.push(msg);
      console.error(msg);
    }
  });

  // Explicit A/B invariance test: mentioning "Itaú" must NEVER alter classification, product, confidence, review, problem or summary
  const baseRec = {
    numero_expediente: 'INV-A',
    descripcion_original: 'Realicé el pago de mi tarjeta de crédito ayer y aún no se ve reflejado en el saldo.'
  };
  const itauRec = {
    numero_expediente: 'INV-B',
    descripcion_original: 'Realicé el pago de mi tarjeta de crédito Itaú ayer y aún no se ve reflejado en el saldo.'
  };
  const baseAnalysis = buildPQRSAnalysis(baseRec, classifyPQRDeterministic(baseRec));
  const itauAnalysis = buildPQRSAnalysis(itauRec, classifyPQRDeterministic(itauRec));
  const invarianceOk =
    baseAnalysis.categoria_principal === itauAnalysis.categoria_principal &&
    baseAnalysis.subcategoria === itauAnalysis.subcategoria &&
    baseAnalysis.producto_detectado === itauAnalysis.producto_detectado &&
    baseAnalysis.confianza === itauAnalysis.confianza &&
    baseAnalysis.requiere_revision === itauAnalysis.requiere_revision &&
    baseAnalysis.problema_principal === itauAnalysis.problema_principal &&
    !(baseAnalysis.etiquetas_informativas || []).includes(ETIQUETA_MENCIONA_ITAU) &&
    Boolean(itauAnalysis.etiquetas_informativas?.includes(ETIQUETA_MENCIONA_ITAU));

  if (!invarianceOk) {
    failures.push('✗ [FALLÓ] Invarianza etiqueta Menciona Itaú: la mención a Itaú alteró algún campo de clasificación.');
  } else {
    console.log('✓ [PASÓ] Prueba de invarianza A/B: mencionar Itaú SOLO agrega la etiqueta informativa sin alterar categoría, subcategoría, producto, confianza, revisión ni problema.');
  }

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
