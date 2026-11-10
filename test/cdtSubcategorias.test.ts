import { classifyPQRDeterministic, buildPQRSAnalysis, PQRInputRecord } from '../src/services/classifierEngine';

export interface CDTTestCase {
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

export const CDT_TEST_SUITE: CDTTestCase[] = [
  // ---------------------------------------------------------------------------
  // 1. RENDIMIENTOS / INTERESES
  // ---------------------------------------------------------------------------
  {
    id: 1,
    nombre: 'Inconformidad con intereses pactados vs liquidados en CDT',
    expediente: 'CDT-001',
    descripcion: 'Los intereses liquidados de mi CDT son inferiores a la tasa pactada al momento de la apertura y exijo reliquidación.',
    submotivo: 'Liquidación de intereses',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENDIMIENTOS / INTERESES',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'RENDIMIENTOS / INTERESES' && a.producto_detectado === 'CDT'
  },
  {
    id: 2,
    nombre: 'Intereses no pagados en CDT vigente',
    expediente: 'CDT-002',
    descripcion: 'No me han pagado los rendimientos mensuales correspondientes a mi CDT que continúa vigente y vence el próximo año.',
    submotivo: 'Rendimientos no abonados',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENDIMIENTOS / INTERESES',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'RENDIMIENTOS / INTERESES'
  },

  // ---------------------------------------------------------------------------
  // 2. RENOVACIÓN
  // ---------------------------------------------------------------------------
  {
    id: 3,
    nombre: 'Renovación automática no autorizada',
    expediente: 'CDT-003',
    descripcion: 'Mi CDT se renovó automáticamente por 180 días más sin mi consentimiento, yo no autoricé la renovación del título.',
    submotivo: 'Renovación no autorizada',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENOVACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'RENOVACIÓN'
  },
  {
    id: 4,
    nombre: 'Inconformidad con cambios de tasa al renovar',
    expediente: 'CDT-004',
    descripcion: 'Al renovar mi CDT me cambiaron la tasa acordada a una mucho menor sin avisarme, no acepto esas condiciones de renovación.',
    submotivo: 'Condiciones de renovación',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENOVACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'RENOVACIÓN'
  },

  // ---------------------------------------------------------------------------
  // 3. PAGO
  // ---------------------------------------------------------------------------
  {
    id: 5,
    nombre: 'CDT ya cancelado sin recibir el dinero',
    expediente: 'CDT-005',
    descripcion: 'Cancelé mi CDT hace cinco días y todavía no me han entregado el dinero ni veo el pago en mi cuenta.',
    submotivo: 'No entrega de dinero',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'PAGO',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'PAGO'
  },
  {
    id: 6,
    nombre: 'CDT vencido y cancelado sin entrega de capital',
    expediente: 'CDT-006',
    descripcion: 'El CDT venció, fue cancelado y no recibí el capital correspondiente en mi cuenta bancaria.',
    submotivo: 'Capital no entregado',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'PAGO',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'PAGO'
  },

  // ---------------------------------------------------------------------------
  // 4. CANCELACIÓN
  // ---------------------------------------------------------------------------
  {
    id: 7,
    nombre: 'Solicitud de cancelación anticipada antes del vencimiento',
    expediente: 'CDT-007',
    descripcion: 'Solicito la cancelación anticipada de mi CDT antes del vencimiento porque requiero los recursos para una urgencia médica.',
    submotivo: 'Cancelación anticipada',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CANCELACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CANCELACIÓN'
  },
  {
    id: 8,
    nombre: 'Deseo de retirar dinero antes de cumplir el plazo',
    expediente: 'CDT-008',
    descripcion: 'No quiero continuar con el CDT y deseo cancelarlo, necesito conocer las condiciones para retirar mi dinero antes del plazo.',
    submotivo: 'Retiro antes de fecha',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CANCELACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CANCELACIÓN'
  },

  // ---------------------------------------------------------------------------
  // 5. CERTIFICADO DE SALDO O DECEVAL
  // ---------------------------------------------------------------------------
  {
    id: 9,
    nombre: 'Certificado de saldo y constancia Deceval',
    expediente: 'CDT-009',
    descripcion: 'Solicito el certificado de saldo a la fecha y la constancia de Deceval de mi CDT para verificar los valores de constitución.',
    submotivo: 'Certificado Deceval',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADO DE SALDO O DECEVAL',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CERTIFICADO DE SALDO O DECEVAL'
  },
  {
    id: 10,
    nombre: 'Certificado con valores iniciales del CDT',
    expediente: 'CDT-010',
    descripcion: 'Requiero un certificado de saldo de mi CDT con los valores iniciales registrados y el histórico de capital constituido.',
    submotivo: 'Certificado de saldo',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADO DE SALDO O DECEVAL',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CERTIFICADO DE SALDO O DECEVAL'
  },

  // ---------------------------------------------------------------------------
  // 6. CERTIFICADOS TRIBUTARIOS
  // ---------------------------------------------------------------------------
  {
    id: 11,
    nombre: 'Certificado tributario para declaración de renta',
    expediente: 'CDT-011',
    descripcion: 'Solicito el certificado tributario y de retención en la fuente de mi CDT para presentar mi declaración de renta.',
    submotivo: 'Certificado tributario',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADOS TRIBUTARIOS',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CERTIFICADOS TRIBUTARIOS'
  },
  {
    id: 12,
    nombre: 'Soporte fiscal de retención en la fuente de CDT',
    expediente: 'CDT-012',
    descripcion: 'Necesito el soporte fiscal de retención en la fuente de mi CDT para trámites ante la DIAN por inconsistencias en la información exógena.',
    submotivo: 'Soporte fiscal DIAN',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADOS TRIBUTARIOS',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CERTIFICADOS TRIBUTARIOS'
  },

  // ---------------------------------------------------------------------------
  // 7. APERTURA
  // ---------------------------------------------------------------------------
  {
    id: 13,
    nombre: 'Problemas en la apertura y constitución de CDT',
    expediente: 'CDT-013',
    descripcion: 'Intenté realizar la apertura de un CDT desde la banca virtual, me debitaron el dinero pero no se constituyó el título.',
    submotivo: 'Apertura fallida',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'APERTURA',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'APERTURA'
  },
  {
    id: 14,
    nombre: 'Solicitud de formalización de constitución de CDT',
    expediente: 'CDT-014',
    descripcion: 'Solicito la formalización y apertura de mi CDT que quedó pendiente de firma en la sucursal.',
    submotivo: 'Constitución CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'APERTURA',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'APERTURA'
  },

  // ---------------------------------------------------------------------------
  // 8. VISUALIZACIÓN
  // ---------------------------------------------------------------------------
  {
    id: 15,
    nombre: 'CDT no aparece en la aplicación móvil',
    expediente: 'CDT-015',
    descripcion: 'No puedo ver mi CDT en la aplicación móvil del banco, desapareció de mis productos digitales.',
    submotivo: 'No visualiza producto',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 16,
    nombre: 'Inconvenientes para consultar información del CDT en canales digitales',
    expediente: 'CDT-016',
    descripcion: 'Presento inconvenientes para consultar la información de mi CDT en los canales digitales y portal web.',
    submotivo: 'Falla consulta portal',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'VISUALIZACIÓN'
  },

  // ---------------------------------------------------------------------------
  // 9. REGLAS OBLIGATORIAS DE DISAMBIGUACIÓN Y EXCLUSIONES
  // ---------------------------------------------------------------------------
  {
    id: 17,
    nombre: 'Cuenta de ahorros con rendimientos NO es CDT',
    expediente: 'CDT-017',
    descripcion: 'No estoy de acuerdo con los intereses que me generó mi cuenta de ahorros este mes.',
    submotivo: 'Intereses cuenta',
    // La palabra "cuenta" NUNCA es CDT. Debe ir a otra categoría, NO CDT.
    categoriaEsperada: ['PRODUCTOS', 'COMISIONES Y COBROS', 'INFORMACIÓN Y DOCUMENTOS', 'OTRAS'],
    subcategoriaEsperada: ['CONDICIONES DEL PRODUCTO', 'INTERESES', 'INFORMACIÓN GENERAL', 'SALDOS Y MOVIMIENTOS', 'CASOS ATÍPICOS'],
    requiereRevisionEsperada: false,
    verificar: (a) => a.categoria_principal !== 'CDT'
  },
  {
    id: 18,
    nombre: 'CDT cancelado y dinero no entregado es PAGO y no RENDIMIENTOS',
    expediente: 'CDT-018',
    descripcion: 'Cancelé mi CDT y no me han entregado el dinero ni los intereses generados.',
    submotivo: 'Dinero no entregado tras cancelación',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'PAGO',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'PAGO'
  },
  {
    id: 19,
    nombre: 'Certificado de saldo para fines tributarios es CERTIFICADOS TRIBUTARIOS',
    expediente: 'CDT-019',
    descripcion: 'Solicito certificado de saldo de mi CDT para la declaración de renta y fines tributarios ante la DIAN.',
    submotivo: 'Certificado renta',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADOS TRIBUTARIOS',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CERTIFICADOS TRIBUTARIOS'
  },
  {
    id: 20,
    nombre: 'Deseo de cancelar antes de fecha es CANCELACIÓN y no PAGO',
    expediente: 'CDT-020',
    descripcion: 'Quiero cancelar mi CDT antes de la fecha de vencimiento y necesito conocer la penalidad.',
    submotivo: 'Cancelación anticipada',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CANCELACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'CANCELACIÓN'
  },
  {
    id: 21,
    nombre: 'Renovación automática es RENOVACIÓN y no CANCELACIÓN',
    expediente: 'CDT-021',
    descripcion: 'Solicito aclaración sobre la renovación automática de mi CDT porque me cambiaron las condiciones de plazo.',
    submotivo: 'Aclaración renovación',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENOVACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.subcategoria === 'RENOVACIÓN'
  },
  {
    id: 22,
    nombre: 'CDT con descripción insuficiente es REVISIÓN HUMANA',
    expediente: 'CDT-022',
    descripcion: 'Tengo un CDT en el banco.',
    submotivo: 'CDT',
    categoriaEsperada: ['REVISIÓN HUMANA', 'CDT'],
    subcategoriaEsperada: ['INFORMACIÓN INSUFICIENTE', 'REVISIÓN HUMANA'],
    requiereRevisionEsperada: true,
    verificar: (a) => a.requiere_revision === true
  },
  {
    id: 23,
    nombre: 'CDT físico con solicitud de validación de valores',
    expediente: 'CDT-023',
    descripcion: 'Tengo un CDT físico guardado en mi casa y necesito validar los valores iniciales y el saldo a la fecha en el sistema.',
    submotivo: 'CDT físico',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADO DE SALDO O DECEVAL',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'CERTIFICADO DE SALDO O DECEVAL' && a.producto_detectado === 'CDT'
  },
  {
    id: 24,
    nombre: 'Inversión CDT y rendimientos generados',
    expediente: 'CDT-024',
    descripcion: 'Tengo una reclamación sobre los rendimientos de mi inversión CDT ya que la ganancia es menor a la pactada.',
    submotivo: 'Inversión CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENDIMIENTOS / INTERESES',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'RENDIMIENTOS / INTERESES' && a.producto_detectado === 'CDT'
  },
  {
    id: 25,
    nombre: 'Certificado a término con retiro anticipado',
    expediente: 'CDT-025',
    descripcion: 'Necesito conocer las condiciones para retirar antes de tiempo el dinero de mi certificado a término sin tantas trabas.',
    submotivo: 'Certificado a término',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CANCELACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'CANCELACIÓN' && a.producto_detectado === 'CDT'
  },
  {
    id: 26,
    nombre: 'Abreviatura c.d.t. vencido y recursos no entregados',
    expediente: 'CDT-026',
    descripcion: 'Mi c.d.t. venció el mes pasado, se liquidó pero no me han consignado los recursos en mi cuenta bancaria.',
    submotivo: 'c.d.t.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'PAGO',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'PAGO' && a.producto_detectado === 'CDT'
  },
  {
    id: 27,
    nombre: 'CDT renovado sin avisar',
    expediente: 'CDT-027',
    descripcion: 'El CDT renovado sin avisarme no tiene las condiciones que yo quería, exijo revisar esa prórroga.',
    submotivo: 'CDT renovado',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'RENOVACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'RENOVACIÓN' && a.producto_detectado === 'CDT'
  },
  {
    id: 28,
    nombre: 'CDT no carga en portal o canales digitales',
    expediente: 'CDT-028',
    descripcion: 'Mi CDT no carga en el portal web de la banca virtual y no puedo ver los detalles de mi título.',
    submotivo: 'Portal web',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN' && a.producto_detectado === 'CDT'
  },
  {
    id: 29,
    nombre: 'Consulta general de CDT sin palabra clave técnica asigna subcategoría contextual sin revisión humana',
    expediente: 'CDT-029',
    descripcion: 'Solicito información general sobre el estado actual y los soportes de mi CDT en la entidad.',
    submotivo: 'Consulta general',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADO DE SALDO O DECEVAL',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && !a.requiere_revision
  },

  // ---------------------------------------------------------------------------
  // CASOS OBLIGATORIOS REQUERIMIENTO VISUALIZACIÓN vs OTRAS SUBCATEGORÍAS
  // ---------------------------------------------------------------------------
  {
    id: 30,
    nombre: 'Ejemplo obligatorio 1: No puedo visualizar mi CDT',
    expediente: 'CDT-030',
    descripcion: 'No puedo visualizar mi CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 31,
    nombre: 'Ejemplo obligatorio 2: Mi CDT no aparece en la plataforma',
    expediente: 'CDT-031',
    descripcion: 'Mi CDT no aparece en la plataforma',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 32,
    nombre: 'Ejemplo obligatorio 3: No puedo ver el saldo de mi CDT en el aplicativo (Saldo no desplaza Visualización)',
    expediente: 'CDT-032',
    descripcion: 'No puedo ver el saldo de mi CDT en el aplicativo',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 33,
    nombre: 'Ejemplo obligatorio 4: Solicito certificado de saldo de mi CDT',
    expediente: 'CDT-033',
    descripcion: 'Solicito certificado de saldo de mi CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADO DE SALDO O DECEVAL',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'CERTIFICADO DE SALDO O DECEVAL'
  },
  {
    id: 34,
    nombre: 'Ejemplo obligatorio 5: Solicito certificado de constitución del CDT',
    expediente: 'CDT-034',
    descripcion: 'Solicito certificado de constitución del CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADO DE SALDO O DECEVAL',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'CERTIFICADO DE SALDO O DECEVAL'
  },
  {
    id: 35,
    nombre: 'Ejemplo obligatorio 6: Necesito certificado tributario de mi CDT',
    expediente: 'CDT-035',
    descripcion: 'Necesito certificado tributario de mi CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADOS TRIBUTARIOS',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'CERTIFICADOS TRIBUTARIOS'
  },
  {
    id: 36,
    nombre: 'Ejemplo obligatorio 7: La DIAN reporta información incorrecta de mi CDT',
    expediente: 'CDT-036',
    descripcion: 'La DIAN reporta información incorrecta de mi CDT',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'CERTIFICADOS TRIBUTARIOS',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'CERTIFICADOS TRIBUTARIOS'
  },
  {
    id: 37,
    nombre: 'Expresión equivalente: No puedo visualizar el CDT',
    expediente: 'CDT-037',
    descripcion: 'No puedo visualizar el CDT en el sistema.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 38,
    nombre: 'Expresión equivalente: No me aparece el CDT',
    expediente: 'CDT-038',
    descripcion: 'No me aparece el CDT al ingresar a la banca en línea.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 39,
    nombre: 'Expresión equivalente: No se visualiza el producto',
    expediente: 'CDT-039',
    descripcion: 'Tengo un CDT constituido y no se visualiza el producto en mi perfil.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 40,
    nombre: 'Expresión equivalente: Problemas para visualizar el CDT',
    expediente: 'CDT-040',
    descripcion: 'Presento problemas para visualizar el CDT en la sucursal virtual.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 41,
    nombre: 'Expresión equivalente: No aparece la información del CDT en los canales',
    expediente: 'CDT-041',
    descripcion: 'No aparece la información del CDT en los canales electrónicos de la entidad.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  },
  {
    id: 42,
    nombre: 'Expresión equivalente: No puedo consultar o ver mi CDT en la plataforma',
    expediente: 'CDT-042',
    descripcion: 'No puedo consultar o ver mi CDT en la plataforma digital del banco.',
    categoriaEsperada: 'CDT',
    subcategoriaEsperada: 'VISUALIZACIÓN',
    requiereRevisionEsperada: false,
    productoEsperado: 'CDT',
    verificar: (a) => a.categoria_principal === 'CDT' && a.subcategoria === 'VISUALIZACIÓN'
  }
];

export function runCDTTestSuite(): boolean {
  console.log('='.repeat(80));
  console.log('PRUEBAS AUTOMATIZADAS: CATEGORÍA CDT Y SUS 8 SUBCATEGORÍAS');
  console.log('='.repeat(80));

  let passed = 0;
  const failures: string[] = [];

  CDT_TEST_SUITE.forEach(tc => {
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
        Cat: "${analysis.categoria_principal}" (Esperada: "${JSON.stringify(tc.categoriaEsperada)}") -> ${catOk ? 'OK' : 'ERROR'}
        Sub: "${analysis.subcategoria}" (Esperada: "${JSON.stringify(tc.subcategoriaEsperada)}") -> ${subOk ? 'OK' : 'ERROR'}
        Rev: ${analysis.requiere_revision} (Esperada: ${tc.requiereRevisionEsperada}) -> ${revOk ? 'OK' : 'ERROR'}
        Prod: "${analysis.producto_detectado}" (Esperado: "${tc.productoEsperado || 'Cualquiera'}") -> ${prodOk ? 'OK' : 'ERROR'}
        Custom: ${customOk ? 'OK' : 'ERROR'} | Fields: ${fieldsOk ? 'OK' : 'ERROR'}`;
      console.error(msg);
      failures.push(msg);
    }
  });

  console.log('-'.repeat(80));
  console.log(`RESULTADO CDT: ${passed}/${CDT_TEST_SUITE.length} pruebas pasadas (${((passed / CDT_TEST_SUITE.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (failures.length > 0) {
    console.error(`${failures.length} pruebas fallaron.`);
    process.exit(1);
  }

  return true;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('cdtSubcategorias.test')) {
  runCDTTestSuite();
}
