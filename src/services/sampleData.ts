import { EnrichedPQRSRecord } from '../types';

export const SAMPLE_PQRS_DATA: {
  numero_expediente: string;
  resumen_original: string;
  descripcion_original: string;
  submotivo?: string;
  producto?: string;
}[] = [
  {
    numero_expediente: '2026-000101',
    resumen_original: 'Tarjeta de crédito',
    submotivo: 'Tarjeta de crédito',
    producto: 'Tarjeta de Crédito',
    descripcion_original: 'El cliente manifiesta que realizó un abono por PSE por valor de $450.000 el día 5 de este mes, pero el saldo continúa apareciendo pendiente en la tarjeta de crédito. Solicita validar la aplicación del pago.'
  },
  {
    numero_expediente: '2026-000102',
    resumen_original: 'Abono no registrado',
    submotivo: 'Pagos',
    producto: 'Crédito de Libre Inversión',
    descripcion_original: 'Se realizó pago de la cuota mensual mediante corresponsal bancario hace 4 días hábiles y aún no se ve reflejado en el sistema. Adjunto comprobante.'
  },
  {
    numero_expediente: '2026-000103',
    resumen_original: 'Transacción PSE',
    submotivo: 'Canal PSE',
    producto: 'Cuenta de Ahorros',
    descripcion_original: 'El usuario intentó pagar la factura del colegio a través de PSE, el sistema arrojó "Transacción Rechazada por timeout", sin embargo el valor de $680.000 fue debitado de la cuenta de ahorros. Solicita reversión inmediata.'
  },
  {
    numero_expediente: '2026-000104',
    resumen_original: 'Extracto mensual',
    submotivo: 'Extractos',
    producto: 'Tarjeta de Crédito',
    descripcion_original: 'El usuario manifiesta inconformidad porque en el extracto de este período le liquidaron intereses de mora por un valor que considera excesivo e injustificado, ya que canceló antes de la fecha límite.'
  },
  {
    numero_expediente: '2026-000105',
    resumen_original: 'Cobro no claro',
    submotivo: 'Cobros varios',
    producto: 'Cuenta de Ahorros',
    descripcion_original: 'El titular solicita la marcación formal de su cuenta de ahorros No. 450-89123 como exenta del 4x1000 (GMF), ya que es su única cuenta en el sistema financiero y le siguen cobrando dicho gravamen.'
  },
  {
    numero_expediente: '2026-000106',
    resumen_original: 'Respuesta radicado anterior',
    submotivo: 'Atención al cliente',
    producto: 'Cuenta Corriente',
    descripcion_original: 'Manifiesto total desacuerdo con la respuesta dada al radicado 2026-000045 sobre el cobro de comisión por cheque devuelto. Insisto en que el cheque fue consignado en horario hábil y el banco cometió error en el canje.'
  },
  {
    numero_expediente: '2026-000107',
    resumen_original: 'Seguro débito',
    submotivo: 'Seguros',
    producto: 'Cuenta de Ahorros',
    descripcion_original: 'El usuario reclama que en su cuenta de ahorros le están descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizó ni solicitó formalmente.'
  },
  {
    numero_expediente: '2026-000108',
    resumen_original: 'Tarjeta clásica',
    submotivo: 'Tarjeta de crédito',
    producto: 'Tarjeta de Crédito',
    descripcion_original: 'El cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de crédito, señalando que al momento de la apertura le prometieron exoneración durante el primer año.'
  },
  {
    numero_expediente: '2026-000109',
    resumen_original: 'Banca Móvil',
    submotivo: 'Canales digitales',
    producto: 'App Móvil',
    descripcion_original: 'El usuario informa que no puede ingresar a la aplicación móvil desde hace dos días; el sistema arroja error de autenticación y bloqueó la contraseña digital.'
  },
  {
    numero_expediente: '2026-000111',
    resumen_original: 'Alerta SMS',
    submotivo: 'Notificaciones',
    producto: 'Tarjeta Débito',
    descripcion_original: 'El titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta débito, teniendo el plástico en su poder.'
  },
  {
    numero_expediente: '2026-000113',
    resumen_original: 'Carta formal',
    submotivo: 'Solicitud documental',
    producto: 'Crédito Hipotecario',
    descripcion_original: 'Cliente presenta formalmente derecho de petición solicitando copia del contrato de apertura, pagaré en blanco con carta de instrucciones y extractos consolidados de los últimos 24 meses.'
  },
  {
    numero_expediente: '2026-000115',
    resumen_original: 'Revisión caso',
    submotivo: 'Reclamos varios',
    producto: 'NO IDENTIFICADO',
    descripcion_original: 'Solicito comedidamente que me colaboren revisando mi caso porque no estoy de acuerdo con lo que me dijeron por teléfono.'
  }
];

export function getInitialDemoState(): { records: EnrichedPQRSRecord[]; groups: import('../types').SemanticGroup[] } {
  const records: EnrichedPQRSRecord[] = [
    {
      id: 'demo-1',
      numero_expediente: '2026-000101',
      resumen_original: 'Tarjeta de crédito',
      descripcion_original: 'El cliente manifiesta que realizó un abono por PSE por valor de $450.000 el día 5 de este mes, pero el saldo continúa apareciendo pendiente en la tarjeta de crédito. Solicita validar la aplicación del pago.',
      descripcion_normalizada: 'el cliente manifiesta que realizo un abono por pse por valor de $450.000 el dia 5 de este mes pero el saldo continua apareciendo pendiente en la tarjeta de credito solicita validar la aplicacion del pago',
      hash_descripcion: 'hash_demo_1',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-001',
      similitud_grupo: 0.94,
      columnas_adicionales: {
        SUBMOTIVO: 'Tarjeta de crédito',
        NOMBRE_PRODUCTO: 'Tarjeta de Crédito'
      },
      analisis: {
        numero_expediente: '2026-000101',
        categoria: 'PSE',
        confianza: 95,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'SI',
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El registro original indicaba "Tarjeta de crédito" sin identificar la operación PSE.',
        producto: 'Tarjeta de Crédito',
        tipo_pqr: 'RECLAMO',
        motivo: 'PSE',
        submotivo: 'PSE',
        que_solicita_exactamente: 'Validar y aplicar el abono de $450.000 realizado vía PSE y actualizar el saldo de la tarjeta de crédito.',
        hechos_principales: 'Abono realizado vía pasarela PSE el día 5 por $450.000 que sigue pendiente y no impacta el saldo de la tarjeta.',
        sustento_clasificacion: 'Prioridad 2: Operación y abono realizado mediante pasarela PSE.',
        nivel_confianza: 'Alta',
        tema_principal: 'PSE',
        subtema: 'PSE',
        problema_principal: 'Abono realizado vía PSE no reflejado en el saldo de la tarjeta',
        solicitud_cliente: 'Aplicación inmediata del pago y actualización de saldos',
        subcategoria: 'PSE',
        resumen_normalizado: 'PSE: abono por PSE no acreditado en tarjeta de crédito.',
        justificacion: 'Clasificado como PSE según la regla de prioridad (Prioridad 2).',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-2',
      numero_expediente: '2026-000102',
      resumen_original: 'Abono no registrado',
      descripcion_original: 'Se realizó pago de la cuota mensual mediante corresponsal bancario hace 4 días hábiles y aún no se ve reflejado en el sistema. Adjunto comprobante.',
      descripcion_normalizada: 'se realizo pago de la cuota mensual mediante corresponsal bancario hace 4 dias habiles y aun no se ve reflejado en el sistema adjunto comprobante',
      hash_descripcion: 'hash_demo_2',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-002',
      similitud_grupo: 0.91,
      columnas_adicionales: {
        SUBMOTIVO: 'Pagos',
        NOMBRE_PRODUCTO: 'Crédito'
      },
      analisis: {
        numero_expediente: '2026-000102',
        categoria: 'PAGOS / ABONOS',
        confianza: 96,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'NO',
        posible_inconsistencia: false,
        producto: 'Crédito',
        tipo_pqr: 'RECLAMO',
        motivo: 'PAGOS / ABONOS',
        submotivo: 'PAGOS / ABONOS',
        que_solicita_exactamente: 'Acreditar el pago de la cuota con la fecha efectiva del pago realizado en corresponsal bancario.',
        hechos_principales: 'Pago de cuota mensual efectuado en corresponsal bancario hace 4 días hábiles que no aparece en el sistema.',
        sustento_clasificacion: 'Prioridad 6: Pago/abono no reflejado en el sistema.',
        nivel_confianza: 'Alta',
        tema_principal: 'PAGOS / ABONOS',
        subtema: 'PAGOS / ABONOS',
        problema_principal: 'Pago en corresponsal bancario sin reflejo en el sistema tras 4 días',
        solicitud_cliente: 'Acreditar pago con soporte y anular cobro de mora',
        subcategoria: 'PAGOS / ABONOS',
        resumen_normalizado: 'PAGOS / ABONOS: pago de cuota en corresponsal bancario no aplicado.',
        justificacion: 'Clasificado como PAGOS / ABONOS conforme a la regla 7.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-3',
      numero_expediente: '2026-000103',
      resumen_original: 'Transacción PSE',
      descripcion_original: 'El usuario intentó pagar la factura del colegio a través de PSE, el sistema arrojó "Transacción Rechazada por timeout", sin embargo el valor de $680.000 fue debitado de la cuenta de ahorros. Solicita reversión inmediata.',
      descripcion_normalizada: 'el usuario intento pagar la factura del colegio a traves de pse el sistema arrojo transaccion rechazada por timeout sin embargo el valor de $680.000 fue debitado de la cuenta de ahorros solicita reversion inmediata',
      hash_descripcion: 'hash_demo_pse_rechazo',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-001',
      similitud_grupo: 0.95,
      columnas_adicionales: {
        SUBMOTIVO: 'Transacción PSE',
        NOMBRE_PRODUCTO: 'Cuenta de Ahorros'
      },
      analisis: {
        numero_expediente: '2026-000103',
        categoria: 'PSE',
        confianza: 98,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'NO',
        posible_inconsistencia: false,
        producto: 'Cuenta de Ahorros',
        tipo_pqr: 'RECLAMO',
        motivo: 'PSE',
        submotivo: 'PSE',
        que_solicita_exactamente: 'Reversión y reintegro inmediato de los $680.000 debitados por transacción PSE rechazada.',
        hechos_principales: 'Transacción PSE rechazada con timeout y débito real en la cuenta bancaria.',
        sustento_clasificacion: 'Prioridad 2: Transacción y problema derivado de pasarela PSE.',
        nivel_confianza: 'Alta',
        tema_principal: 'PSE',
        subtema: 'PSE',
        problema_principal: 'Débito de $680.000 por pago PSE rechazado por error de timeout',
        solicitud_cliente: 'Reversión inmediata del importe debitado',
        subcategoria: 'PSE',
        resumen_normalizado: 'PSE: reversión de débito por pago PSE rechazado.',
        justificacion: 'Clasificado como PSE conforme a la regla 2.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-4',
      numero_expediente: '2026-000104',
      resumen_original: 'Extracto mensual',
      descripcion_original: 'El usuario manifiesta inconformidad porque en el extracto de este período le liquidaron intereses de mora por un valor que considera excesivo e injustificado, ya que canceló antes de la fecha límite.',
      descripcion_normalizada: 'el usuario manifiesta inconformidad porque en el extracto de este periodo le liquidaron intereses de mora por un valor que considera excesivo e injustificado ya que cancelo antes de la fecha limite',
      hash_descripcion: 'hash_demo_3',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-003',
      similitud_grupo: 0.92,
      columnas_adicionales: {
        SUBMOTIVO: 'Extracto mensual',
        NOMBRE_PRODUCTO: 'Tarjeta de Crédito'
      },
      analisis: {
        numero_expediente: '2026-000104',
        categoria: 'COBROS / CARGOS',
        confianza: 92,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'SI',
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El submotivo original "Extracto mensual" oculta un reclamo sustantivo de cobro de intereses injustificados.',
        producto: 'Tarjeta de Crédito',
        tipo_pqr: 'RECLAMO',
        motivo: 'COBROS / CARGOS',
        submotivo: 'COBROS / CARGOS',
        que_solicita_exactamente: 'Reliquidación de los intereses de mora facturados indebidamente y reintegro del cobro.',
        hechos_principales: 'Cobro de intereses de mora en extracto a pesar de haber realizado el pago antes de la fecha límite.',
        sustento_clasificacion: 'Prioridad 12: Inconformidad con cobro o cargo de intereses.',
        nivel_confianza: 'Alta',
        tema_principal: 'COBROS / CARGOS',
        subtema: 'COBROS / CARGOS',
        problema_principal: 'Intereses de mora liquidados a pesar de pago oportuno',
        solicitud_cliente: 'Reliquidación y reintegro de intereses',
        subcategoria: 'COBROS / CARGOS',
        resumen_normalizado: 'COBROS / CARGOS: cobro indebido de intereses de mora.',
        justificacion: 'Clasificado como COBROS / CARGOS conforme a la regla 12.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-5',
      numero_expediente: '2026-000105',
      resumen_original: 'Cobro no claro',
      descripcion_original: 'El titular solicita la marcación formal de su cuenta de ahorros No. 450-89123 como exenta del 4x1000 (GMF), ya que es su única cuenta en el sistema financiero y le siguen cobrando dicho gravamen.',
      descripcion_normalizada: 'el titular solicita la marcacion formal de su cuenta de ahorros no 450-89123 como exenta del 4x1000 gmf ya que es su unica cuenta en el sistema financiero y le siguen cobrando dicho gravamen',
      hash_descripcion: 'hash_demo_gmf',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-004',
      similitud_grupo: 0.97,
      columnas_adicionales: {
        SUBMOTIVO: 'Cobro no claro',
        NOMBRE_PRODUCTO: 'Cuenta de Ahorros'
      },
      analisis: {
        numero_expediente: '2026-000105',
        categoria: 'GMF / 4X1000',
        confianza: 98,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'SI',
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El submotivo original "Cobro no claro" no especifica la solicitud de marcación exenta de 4x1000 / GMF.',
        producto: 'Cuenta de Ahorros',
        tipo_pqr: 'SOLICITUD',
        motivo: 'GMF / 4X1000',
        submotivo: 'GMF / 4X1000',
        que_solicita_exactamente: 'Marcación de su cuenta de ahorros como exenta de 4x1000 y devolución de los cobros realizados.',
        hechos_principales: 'Cobros continuos de GMF en cuenta de ahorros única susceptible de exención de ley.',
        sustento_clasificacion: 'Prioridad 5: Solicitud de marcación y exención de GMF / 4x1000.',
        nivel_confianza: 'Alta',
        tema_principal: 'GMF / 4X1000',
        subtema: 'GMF / 4X1000',
        problema_principal: 'Cuenta única cobrando 4x1000 sin marcación exenta',
        solicitud_cliente: 'Marcación exenta legal y reintegro del 4x1000 cobrado',
        subcategoria: 'GMF / 4X1000',
        resumen_normalizado: 'GMF / 4X1000: marcación de cuenta exenta y devolución del gravamen.',
        justificacion: 'Clasificado como GMF / 4X1000 conforme a la regla 4.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-6',
      numero_expediente: '2026-000106',
      resumen_original: 'Respuesta radicado anterior',
      descripcion_original: 'Manifiesto total desacuerdo con la respuesta dada al radicado 2026-000045 sobre el cobro de comisión por cheque devuelto. Insisto en que el cheque fue consignado en horario hábil y el banco cometió error en el canje.',
      descripcion_normalizada: 'manifiesto total desacuerdo con la respuesta dada al radicado 2026-000045 sobre el cobro de comision por cheque devuelto insisto en que el cheque fue consignado en horario habil y el banco cometio error en el canje',
      hash_descripcion: 'hash_demo_reabrir',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-003',
      similitud_grupo: 0.90,
      columnas_adicionales: {
        SUBMOTIVO: 'Atención al cliente',
        NOMBRE_PRODUCTO: 'Cuenta Corriente'
      },
      analisis: {
        numero_expediente: '2026-000106',
        categoria: 'COBROS / CARGOS',
        confianza: 90,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'SI',
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El submotivo original indicaba "Atención al cliente", pero el fondo es el cobro de comisión por cheque devuelto.',
        producto: 'Cuenta Corriente',
        tipo_pqr: 'RECLAMO',
        motivo: 'COBROS / CARGOS',
        submotivo: 'COBROS / CARGOS',
        que_solicita_exactamente: 'Revisión y devolución de la comisión cobrada por concepto de cheque devuelto.',
        hechos_principales: 'Cobro de comisión por devolución de cheque que el cliente sostiene fue consignado en horario hábil.',
        sustento_clasificacion: 'Prioridad 12: Cobro de comisión objetado.',
        nivel_confianza: 'Alta',
        tema_principal: 'COBROS / CARGOS',
        subtema: 'COBROS / CARGOS',
        problema_principal: 'Inconformidad con cobro de comisión por cheque devuelto',
        solicitud_cliente: 'Reconsideración y reintegro de comisión',
        subcategoria: 'COBROS / CARGOS',
        resumen_normalizado: 'COBROS / CARGOS: cobro de comisión por cheque devuelto.',
        justificacion: 'Clasificado como COBROS / CARGOS conforme a la regla 12.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-7',
      numero_expediente: '2026-000107',
      resumen_original: 'Seguro débito',
      descripcion_original: 'El usuario reclama que en su cuenta de ahorros le están descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizó ni solicitó formalmente.',
      descripcion_normalizada: 'el usuario reclama que en su cuenta de ahorros le estan descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizo ni solicito formalmente',
      hash_descripcion: 'hash_demo_seguro',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-005',
      similitud_grupo: 0.96,
      columnas_adicionales: {
        SUBMOTIVO: 'Seguros',
        NOMBRE_PRODUCTO: 'Cuenta de Ahorros'
      },
      analisis: {
        numero_expediente: '2026-000107',
        categoria: 'SEGUROS',
        confianza: 97,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'NO',
        posible_inconsistencia: false,
        producto: 'Cuenta de Ahorros',
        tipo_pqr: 'RECLAMO',
        motivo: 'SEGUROS',
        submotivo: 'SEGUROS',
        que_solicita_exactamente: 'Cancelación definitiva del seguro de desempleo y reembolso total de los cobros efectuados.',
        hechos_principales: 'Descuentos mensuales recurrentes de $24.500 por seguro no consentido por el titular.',
        sustento_clasificacion: 'Prioridad 4: Todo lo relacionado con seguros (cobro y cancelación de seguro).',
        nivel_confianza: 'Alta',
        tema_principal: 'SEGUROS',
        subtema: 'SEGUROS',
        problema_principal: 'Cobro de prima de seguro de desempleo no autorizado',
        solicitud_cliente: 'Cancelación inmediata y devolución total de primas descontadas',
        subcategoria: 'SEGUROS',
        resumen_normalizado: 'SEGUROS: cancelación y reintegro de seguro no solicitado.',
        justificacion: 'Clasificado como SEGUROS conforme a la regla 3.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-8',
      numero_expediente: '2026-000108',
      resumen_original: 'Tarjeta clásica',
      descripcion_original: 'El cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de crédito, señalando que al momento de la apertura le prometieron exoneración durante el primer año.',
      descripcion_normalizada: 'el cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de credito senalando que al momento de la apertura le prometieron exoneracion durante el primer ano',
      hash_descripcion: 'hash_demo_cuota',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-006',
      similitud_grupo: 0.98,
      columnas_adicionales: {
        SUBMOTIVO: 'Tarjeta de crédito',
        NOMBRE_PRODUCTO: 'Tarjeta de Crédito'
      },
      analisis: {
        numero_expediente: '2026-000108',
        categoria: 'CUOTA DE MANEJO',
        confianza: 98,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'SI',
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El submotivo original era genérico ("Tarjeta de crédito"), ocultando el reclamo por cuota de manejo.',
        producto: 'Tarjeta de Crédito',
        tipo_pqr: 'RECLAMO',
        motivo: 'CUOTA DE MANEJO',
        submotivo: 'CUOTA DE MANEJO',
        que_solicita_exactamente: 'Exoneración prometida de la cuota de manejo y reversión del valor cobrado en extracto.',
        hechos_principales: 'Cobro de cuota de manejo a pesar de promesa comercial de exoneración durante el primer año.',
        sustento_clasificacion: 'Prioridad 3: Todo lo relacionado con cuota de manejo debe clasificarse como CUOTA DE MANEJO.',
        nivel_confianza: 'Alta',
        tema_principal: 'CUOTA DE MANEJO',
        subtema: 'CUOTA DE MANEJO',
        problema_principal: 'Cobro de cuota de manejo con condición de exoneración incumplida',
        solicitud_cliente: 'Reversión del cobro de cuota de manejo y activación de exoneración',
        subcategoria: 'CUOTA DE MANEJO',
        resumen_normalizado: 'CUOTA DE MANEJO: reclamo por cobro de cuota de manejo con exoneración acordada.',
        justificacion: 'Clasificado como CUOTA DE MANEJO conforme a la regla 1.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-9',
      numero_expediente: '2026-000109',
      resumen_original: 'Banca Móvil',
      descripcion_original: 'El usuario informa que no puede ingresar a la aplicación móvil desde hace dos días; el sistema arroja error de autenticación y bloqueó la contraseña digital.',
      descripcion_normalizada: 'el usuario informa que no puede ingresar a la aplicacion movil desde hace dos dias el sistema arroja error de autenticacion y bloqueo la contrasena digital',
      hash_descripcion: 'hash_demo_app',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-007',
      similitud_grupo: 0.92,
      columnas_adicionales: {
        SUBMOTIVO: 'Canales digitales',
        NOMBRE_PRODUCTO: 'App Móvil'
      },
      analisis: {
        numero_expediente: '2026-000109',
        categoria: 'SERVICIO / ATENCIÓN',
        confianza: 91,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'NO',
        posible_inconsistencia: false,
        producto: 'App Móvil',
        tipo_pqr: 'QUEJA',
        motivo: 'SERVICIO / ATENCIÓN',
        submotivo: 'SERVICIO / ATENCIÓN',
        que_solicita_exactamente: 'Desbloqueo de contraseña digital y solución al problema de acceso en la aplicación.',
        hechos_principales: 'Imposibilidad de ingresar a la banca móvil por bloqueo de clave digital durante 48 horas.',
        sustento_clasificacion: 'Prioridad 14: Problemas técnicos con canal y servicio de acceso.',
        nivel_confianza: 'Alta',
        tema_principal: 'SERVICIO / ATENCIÓN',
        subtema: 'SERVICIO / ATENCIÓN',
        problema_principal: 'Bloqueo de contraseña en app móvil',
        solicitud_cliente: 'Desbloqueo de acceso y solución técnica',
        subcategoria: 'SERVICIO / ATENCIÓN',
        resumen_normalizado: 'SERVICIO / ATENCIÓN: bloqueo de clave digital en app móvil.',
        justificacion: 'Clasificado como SERVICIO / ATENCIÓN conforme a la regla 14.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-10',
      numero_expediente: '2026-000111',
      resumen_original: 'Alerta SMS',
      descripcion_original: 'El titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta débito, teniendo el plástico en su poder.',
      descripcion_normalizada: 'el titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta debito teniendo el plastico en su poder',
      hash_descripcion: 'hash_demo_fraude',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-008',
      similitud_grupo: 0.98,
      columnas_adicionales: {
        SUBMOTIVO: 'Notificaciones',
        NOMBRE_PRODUCTO: 'Tarjeta Débito'
      },
      analisis: {
        numero_expediente: '2026-000111',
        categoria: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
        confianza: 98,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'SI',
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El submotivo original "Notificaciones" no alertaba de la compra no reconocida / presunto fraude.',
        producto: 'Tarjeta Débito',
        tipo_pqr: 'RECLAMO',
        motivo: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
        submotivo: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
        que_solicita_exactamente: 'Bloqueo preventivo de la tarjeta, apertura de investigación por fraude y restitución de los $1.200.000.',
        hechos_principales: 'Compra no reconocida por $1.200.000 efectuada en ciudad distinta con plástico en custodia.',
        sustento_clasificacion: 'Prioridad 1: Expresión "no reconoce una compra". Clasificación máxima prioritaria.',
        nivel_confianza: 'Alta',
        tema_principal: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
        subtema: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
        problema_principal: 'Compra no reconocida de $1.200.000 con tarjeta débito',
        solicitud_cliente: 'Investigación por fraude y devolución del dinero',
        subcategoria: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
        resumen_normalizado: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA: compra no reconocida de $1.200.000.',
        justificacion: 'Clasificado como FRAUDE / TRANSACCIÓN NO RECONOCIDA por regla de prioridad número 1.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-11',
      numero_expediente: '2026-000113',
      resumen_original: 'Carta formal',
      descripcion_original: 'Cliente presenta formalmente derecho de petición solicitando copia del contrato de apertura, pagaré en blanco con carta de instrucciones y extractos consolidados de los últimos 24 meses.',
      descripcion_normalizada: 'cliente presenta formalmente derecho de peticion solicitando copia del contrato de apertura pagare en blanco con carta de instrucciones y extractos consolidados de los ultimos 24 meses',
      hash_descripcion: 'hash_demo_doc',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-009',
      similitud_grupo: 0.94,
      columnas_adicionales: {
        SUBMOTIVO: 'Solicitud documental',
        NOMBRE_PRODUCTO: 'Crédito Hipotecario'
      },
      analisis: {
        numero_expediente: '2026-000113',
        categoria: 'DATOS / INFORMACIÓN',
        confianza: 96,
        requiere_revision_humana: 'NO',
        requiere_revision: false,
        existe_inconsistencia: 'NO',
        posible_inconsistencia: false,
        producto: 'Crédito Hipotecario',
        tipo_pqr: 'PETICIÓN',
        motivo: 'DATOS / INFORMACIÓN',
        submotivo: 'DATOS / INFORMACIÓN',
        que_solicita_exactamente: 'Expedición y entrega de copia del contrato de crédito, pagaré y extractos de los últimos 24 meses.',
        hechos_principales: 'Petición formal requiriendo copias de soportes contractuales y financieros de la obligación.',
        sustento_clasificacion: 'Prioridad 13: Solicitud de documentos, contratos y extractos históricos.',
        nivel_confianza: 'Alta',
        tema_principal: 'DATOS / INFORMACIÓN',
        subtema: 'DATOS / INFORMACIÓN',
        problema_principal: 'Solicitud de copia de contrato, pagaré y extractos',
        solicitud_cliente: 'Entrega de documentos contractuales de crédito',
        subcategoria: 'DATOS / INFORMACIÓN',
        resumen_normalizado: 'DATOS / INFORMACIÓN: solicitud de copias contractuales y extractos.',
        justificacion: 'Clasificado como DATOS / INFORMACIÓN conforme a la regla 13.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-12',
      numero_expediente: '2026-000115',
      resumen_original: 'Revisión caso',
      descripcion_original: 'Solicito comedidamente que me colaboren revisando mi caso porque no estoy de acuerdo con lo que me dijeron por teléfono.',
      descripcion_normalizada: 'solicito comedidamente que me colaboren revisando mi caso porque no estoy de acuerdo con lo que me dijeron por telefono',
      hash_descripcion: 'hash_demo_vacio',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-010',
      similitud_grupo: 0.70,
      columnas_adicionales: {
        SUBMOTIVO: 'Reclamos varios',
        NOMBRE_PRODUCTO: 'NO IDENTIFICADO'
      },
      analisis: {
        numero_expediente: '2026-000115',
        categoria: 'REVISIÓN HUMANA',
        confianza: 35,
        requiere_revision_humana: 'SI',
        requiere_revision: true,
        motivo_de_revision: 'No existe información suficiente para determinar la categoría: no indica producto, hecho ni pretensión.',
        existe_inconsistencia: 'NO',
        posible_inconsistencia: false,
        producto: 'NO IDENTIFICADO',
        tipo_pqr: 'RECLAMO',
        motivo: 'REVISIÓN HUMANA',
        submotivo: 'REVISIÓN HUMANA',
        que_solicita_exactamente: 'Revisión general no especificada.',
        hechos_principales: 'Texto ambiguo sin datos concretos ni hechos identificables.',
        sustento_clasificacion: 'Regla 16: Información insuficiente para determinar la categoría.',
        nivel_confianza: 'Baja',
        tema_principal: 'REVISIÓN HUMANA',
        subtema: 'REVISIÓN HUMANA',
        problema_principal: 'Información insuficiente para clasificar',
        solicitud_cliente: 'Requiere contacto con el cliente',
        subcategoria: 'REVISIÓN HUMANA',
        resumen_normalizado: 'REVISIÓN HUMANA: texto insuficiente para categorizar.',
        justificacion: 'Enviado a REVISIÓN HUMANA según la regla 16.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    }
  ];

  const groups: import('../types').SemanticGroup[] = [
    {
      id: 'GRP-001',
      nombre: 'Operaciones y Pagos por PSE',
      categoria_sugerida: 'PSE',
      cantidad_expedientes: 2,
      similitud_promedio: 0.94,
      similitud_minima: 0.93,
      similitud_maxima: 0.95,
      ejemplos_descripciones: [
        'Abono por PSE no acreditado en la tarjeta de crédito.',
        'Pago por PSE rechazado con descuento efectivo en cuenta de ahorros.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000101', '2026-000103']
    },
    {
      id: 'GRP-002',
      nombre: 'Pagos y Abonos de Obligaciones',
      categoria_sugerida: 'PAGOS / ABONOS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.91,
      similitud_minima: 0.91,
      similitud_maxima: 0.91,
      ejemplos_descripciones: [
        'Pago de cuota en corresponsal bancario hace 4 días sin reflejo en el sistema.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000102']
    },
    {
      id: 'GRP-003',
      nombre: 'Cobros, Cargos e Intereses',
      categoria_sugerida: 'COBROS / CARGOS',
      cantidad_expedientes: 2,
      similitud_promedio: 0.91,
      similitud_minima: 0.90,
      similitud_maxima: 0.92,
      ejemplos_descripciones: [
        'Intereses de mora liquidados a pesar de pago oportuno.',
        'Comisión por cheque devuelto objetada.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000104', '2026-000106']
    },
    {
      id: 'GRP-004',
      nombre: 'Exención y Marcación GMF 4x1000',
      categoria_sugerida: 'GMF / 4X1000',
      cantidad_expedientes: 1,
      similitud_promedio: 0.97,
      similitud_minima: 0.97,
      similitud_maxima: 0.97,
      ejemplos_descripciones: [
        'Marcación formal de cuenta de ahorros exenta del 4x1000.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000105']
    },
    {
      id: 'GRP-005',
      nombre: 'Pólizas y Seguros Asociados',
      categoria_sugerida: 'SEGUROS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.96,
      similitud_minima: 0.96,
      similitud_maxima: 0.96,
      ejemplos_descripciones: [
        'Descuento mensual de seguro de desempleo no autorizado.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000107']
    },
    {
      id: 'GRP-006',
      nombre: 'Cobro de Cuota de Manejo',
      categoria_sugerida: 'CUOTA DE MANEJO',
      cantidad_expedientes: 1,
      similitud_promedio: 0.98,
      similitud_minima: 0.98,
      similitud_maxima: 0.98,
      ejemplos_descripciones: [
        'Reclamo por cuota de manejo con promesa de exoneración.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000108']
    },
    {
      id: 'GRP-007',
      nombre: 'Canales y Servicio de Atención',
      categoria_sugerida: 'SERVICIO / ATENCIÓN',
      cantidad_expedientes: 1,
      similitud_promedio: 0.92,
      similitud_minima: 0.92,
      similitud_maxima: 0.92,
      ejemplos_descripciones: [
        'Bloqueo de contraseña en app móvil.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000109']
    },
    {
      id: 'GRP-008',
      nombre: 'Fraude y Transacciones No Reconocidas',
      categoria_sugerida: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
      cantidad_expedientes: 1,
      similitud_promedio: 0.98,
      similitud_minima: 0.98,
      similitud_maxima: 0.98,
      ejemplos_descripciones: [
        'Compra no reconocida por $1.200.000 con tarjeta débito.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000111']
    },
    {
      id: 'GRP-009',
      nombre: 'Solicitudes de Información y Documentos',
      categoria_sugerida: 'DATOS / INFORMACIÓN',
      cantidad_expedientes: 1,
      similitud_promedio: 0.94,
      similitud_minima: 0.94,
      similitud_maxima: 0.94,
      ejemplos_descripciones: [
        'Copia de contrato de apertura, pagaré y extractos.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000113']
    },
    {
      id: 'GRP-010',
      nombre: 'Casos para Revisión Humana',
      categoria_sugerida: 'REVISIÓN HUMANA',
      cantidad_expedientes: 1,
      similitud_promedio: 0.70,
      similitud_minima: 0.70,
      similitud_maxima: 0.70,
      ejemplos_descripciones: [
        'Información insuficiente que amerita triaje manual.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000115']
    }
  ];

  return { records, groups };
}
