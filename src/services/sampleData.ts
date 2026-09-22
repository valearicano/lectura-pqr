import { EnrichedPQRSRecord } from '../types';

export const SAMPLE_PQRS_DATA: { numero_expediente: string; resumen_original: string; descripcion_original: string }[] = [
  {
    numero_expediente: '2026-000101',
    resumen_original: 'Tarjeta de crédito',
    descripcion_original: 'El cliente manifiesta que realizó un abono por PSE por valor de $450.000 el día 5 de este mes, pero el saldo continúa apareciendo pendiente en la tarjeta de crédito. Solicita validar la aplicación del pago.'
  },
  {
    numero_expediente: '2026-000102',
    resumen_original: 'Abono no registrado',
    descripcion_original: 'Se realizó pago de la cuota mensual mediante corresponsal bancario hace 4 días hábiles y aún no se ve reflejado en el sistema. Adjunto comprobante.'
  },
  {
    numero_expediente: '2026-000103',
    resumen_original: 'Saldo inconsistente',
    descripcion_original: 'El cliente pagó la totalidad de la obligación el 28 del mes anterior, sin embargo sigue figurando un saldo en mora y le están generando cobros indebidos.'
  },
  {
    numero_expediente: '2026-000104',
    resumen_original: 'Extracto mensual',
    descripcion_original: 'El usuario manifiesta inconformidad porque en el extracto de este período le liquidaron intereses de mora por un valor que considera excesivo e injustificado, ya que canceló antes de la fecha límite.'
  },
  {
    numero_expediente: '2026-000105',
    resumen_original: 'Cobro no claro',
    descripcion_original: 'Cliente solicita revisión y reversión de cobros adicionales por concepto de intereses corrientes que difieren de la tasa pactada en el pagaré de su crédito de libre inversión.'
  },
  {
    numero_expediente: '2026-000106',
    resumen_original: 'Póliza vida',
    descripcion_original: 'El cliente solicita información detallada sobre las condiciones y cobertura de la póliza de seguro de vida asociada a su crédito hipotecario, y los requisitos para su cancelación voluntaria.'
  },
  {
    numero_expediente: '2026-000107',
    resumen_original: 'Seguro débito',
    descripcion_original: 'El usuario reclama que en su cuenta de ahorros le están descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizó ni solicitó formalmente.'
  },
  {
    numero_expediente: '2026-000108',
    resumen_original: 'Tarjeta clásica',
    descripcion_original: 'El cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de crédito, señalando que al momento de la apertura le prometieron exoneración durante el primer año.'
  },
  {
    numero_expediente: '2026-000109',
    resumen_original: 'Banca Móvil',
    descripcion_original: 'El usuario informa que no puede ingresar a la aplicación móvil desde hace dos días; el sistema arroja error de autenticación y bloqueó la contraseña digital.'
  },
  {
    numero_expediente: '2026-000110',
    resumen_original: 'Portal transaccional',
    descripcion_original: 'Cada vez que intento realizar una transferencia interbancaria desde la página web, la pantalla se congela y sale error transaccional código ERR-502.'
  },
  {
    numero_expediente: '2026-000111',
    resumen_original: 'Alerta SMS',
    descripcion_original: 'El titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta débito, teniendo el plástico en su poder.'
  },
  {
    numero_expediente: '2026-000112',
    resumen_original: 'Transacción extraña',
    descripcion_original: 'Cliente reporta una transferencia no autorizada desde su cuenta de ahorros hacia una cuenta desconocida por $3.500.000 durante la madrugada. Solicita bloqueo y radicación de fraude.'
  },
  {
    numero_expediente: '2026-000113',
    resumen_original: 'Carta formal',
    descripcion_original: 'Cliente presenta formalmente derecho de petición solicitando copia del contrato de apertura, pagaré en blanco con carta de instrucciones y extractos consolidados de los últimos 24 meses.'
  },
  {
    numero_expediente: '2026-000114',
    resumen_original: 'Solicitud paz y salvo',
    descripcion_original: 'El solicitante invoca derecho de petición requiriendo expedición inmediata del certificado de paz y salvo y cancelación de la hipoteca sobre el inmueble tras pagar la totalidad del crédito.'
  },
  {
    numero_expediente: '2026-000115',
    resumen_original: 'Revisión caso',
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
      analisis: {
        numero_expediente: '2026-000101',
        tema_principal: 'PAGOS',
        subtema: 'Pagos no aplicados',
        producto: 'Tarjeta de Crédito',
        problema_principal: 'Abono realizado vía PSE no reflejado en el saldo de la tarjeta',
        solicitud_cliente: 'Aplicación inmediata del pago y actualización de saldos',
        categoria: 'PAGOS',
        subcategoria: 'Pagos no aplicados',
        resumen_normalizado: 'Cliente solicita aplicación de abono realizado mediante PSE no acreditado en tarjeta de crédito.',
        justificacion: 'El reclamo gira en torno a un pago efectivo que no se refleja en los saldos del producto.',
        confianza: 94,
        nivel_confianza: 'Alta',
        requiere_revision: false,
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El resumen original "Tarjeta de crédito" no refleja el reclamo de pago no aplicado.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
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
      grupo_id: 'GRP-001',
      similitud_grupo: 0.91,
      analisis: {
        numero_expediente: '2026-000102',
        tema_principal: 'PAGOS',
        subtema: 'Pagos no aplicados',
        producto: 'Crédito',
        problema_principal: 'Pago en corresponsal bancario sin reflejo en el sistema tras 4 días',
        solicitud_cliente: 'Acreditar pago con soporte y anular cobro de mora',
        categoria: 'PAGOS',
        subcategoria: 'Pagos no aplicados',
        resumen_normalizado: 'Cliente solicita imputación contable de cuota cancelada en corresponsal bancario.',
        justificacion: 'Reclamo por aplicación rezagada de pago efectuado en canal físico externo.',
        confianza: 95,
        nivel_confianza: 'Alta',
        requiere_revision: false,
        posible_inconsistencia: false,
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-3',
      numero_expediente: '2026-000104',
      resumen_original: 'Extracto mensual',
      descripcion_original: 'El usuario manifiesta inconformidad porque en el extracto de este período le liquidaron intereses de mora por un valor que considera excesivo e injustificado, ya que canceló antes de la fecha límite.',
      descripcion_normalizada: 'el usuario manifiesta inconformidad porque en el extracto de este periodo le liquidaron intereses de mora por un valor que considera excesivo e injustificado ya que cancelo antes de la fecha limite',
      hash_descripcion: 'hash_demo_3',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-002',
      similitud_grupo: 0.92,
      analisis: {
        numero_expediente: '2026-000104',
        tema_principal: 'COBROS',
        subtema: 'Cobro de intereses',
        producto: 'Crédito',
        problema_principal: 'Liquidación errada de intereses de mora a pesar de pago oportuno',
        solicitud_cliente: 'Reliquidación y devolución de intereses cobrados',
        categoria: 'COBROS',
        subcategoria: 'Cobro de intereses',
        resumen_normalizado: 'Cliente solicita reversión de intereses de mora liquidados a pesar de pago antes de fecha límite.',
        justificacion: 'El motivo es desacuerdo con el cobro de intereses, contradiciendo el resumen simple "Extracto mensual".',
        confianza: 93,
        nivel_confianza: 'Alta',
        requiere_revision: false,
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El resumen "Extracto mensual" encubre una queja de cobro de intereses injustificado.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-4',
      numero_expediente: '2026-000107',
      resumen_original: 'Seguro débito',
      descripcion_original: 'El usuario reclama que en su cuenta de ahorros le están descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizó ni solicitó formalmente.',
      descripcion_normalizada: 'el usuario reclama que en su cuenta de ahorros le estan descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizo ni solicito formalmente',
      hash_descripcion: 'hash_demo_4',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-003',
      similitud_grupo: 0.89,
      analisis: {
        numero_expediente: '2026-000107',
        tema_principal: 'SEGUROS',
        subtema: 'Tema de seguros',
        producto: 'Cuenta de Ahorros',
        problema_principal: 'Débito recurrente por seguro de desempleo no consentido por el titular',
        solicitud_cliente: 'Cancelación inmediata de la póliza y reembolso total de cobros descontados',
        categoria: 'SEGUROS',
        subcategoria: 'Tema de seguros',
        resumen_normalizado: 'Cliente solicita cancelación y devolución de cobros por seguro no autorizado.',
        justificacion: 'Queja sobre adquisición involuntaria de seguro vinculada a cuenta bancaria.',
        confianza: 96,
        nivel_confianza: 'Alta',
        requiere_revision: true,
        posible_inconsistencia: false,
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-5',
      numero_expediente: '2026-000108',
      resumen_original: 'Tarjeta clásica',
      descripcion_original: 'El cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de crédito, señalando que al momento de la apertura le prometieron exoneración durante el primer año.',
      descripcion_normalizada: 'el cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de credito senalando que al momento de la apertura le prometieron exoneracion durante el primer ano',
      hash_descripcion: 'hash_demo_5',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-004',
      similitud_grupo: 0.95,
      analisis: {
        numero_expediente: '2026-000108',
        tema_principal: 'COBROS',
        subtema: 'Cuotas de manejo',
        producto: 'Tarjeta de Crédito',
        problema_principal: 'Cobro de cuota de manejo a pesar de acuerdo de exoneración del primer año',
        solicitud_cliente: 'Cumplimiento del beneficio acordado y devolución del importe facturado',
        categoria: 'COBROS',
        subcategoria: 'Cuotas de manejo',
        resumen_normalizado: 'Cliente solicita exoneración y reintegro del cobro de cuota de manejo en tarjeta de crédito.',
        justificacion: 'Inconformidad explícita con el cargo de cuota de manejo en producto crediticio.',
        confianza: 95,
        nivel_confianza: 'Alta',
        requiere_revision: false,
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El resumen "Tarjeta clásica" no describe el reclamo por cuota de manejo.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-6',
      numero_expediente: '2026-000109',
      resumen_original: 'Banca Móvil',
      descripcion_original: 'El usuario informa que no puede ingresar a la aplicación móvil desde hace dos días; el sistema arroja error de autenticación y bloqueó la contraseña digital.',
      descripcion_normalizada: 'el usuario informa que no puede ingresar a la aplicacion movil desde hace dos dias el sistema arroja error de autenticacion y bloqueo la contrasena digital',
      hash_descripcion: 'hash_demo_6',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-005',
      similitud_grupo: 0.91,
      analisis: {
        numero_expediente: '2026-000109',
        tema_principal: 'APLICATIVOS Y CANALES',
        subtema: 'Problemas de acceso',
        producto: 'App Móvil',
        problema_principal: 'Bloqueo de contraseña digital y falla de autenticación en aplicación móvil',
        solicitud_cliente: 'Desbloqueo de usuario y restablecimiento de credenciales digitales',
        categoria: 'APLICATIVOS Y CANALES',
        subcategoria: 'Problemas de acceso',
        resumen_normalizado: 'Cliente reporta bloqueo de acceso y error en la aplicación móvil bancaria.',
        justificacion: 'Incidencia de acceso técnico en el canal de banca móvil digital.',
        confianza: 94,
        nivel_confianza: 'Alta',
        requiere_revision: false,
        posible_inconsistencia: false,
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-7',
      numero_expediente: '2026-000111',
      resumen_original: 'Alerta SMS',
      descripcion_original: 'El titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta débito, teniendo el plástico en su poder.',
      descripcion_normalizada: 'el titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta debito teniendo el plastico en su poder',
      hash_descripcion: 'hash_demo_7',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-006',
      similitud_grupo: 0.96,
      analisis: {
        numero_expediente: '2026-000111',
        tema_principal: 'FRAUDE Y SEGURIDAD',
        subtema: 'Compra no reconocida',
        producto: 'Tarjeta Débito',
        problema_principal: 'Transacción presencial desconocida en otra ciudad con plástico en posesión',
        solicitud_cliente: 'Bloqueo de tarjeta por posible clonación, investigación y reintegro del dinero',
        categoria: 'FRAUDE Y SEGURIDAD',
        subcategoria: 'Compra no reconocida',
        resumen_normalizado: 'Cliente desconoce compra por $1.200.000 y solicita investigación por presunto fraude.',
        justificacion: 'Reporte directo de compra no reconocida y vulneración de seguridad.',
        confianza: 97,
        nivel_confianza: 'Alta',
        requiere_revision: true,
        posible_inconsistencia: true,
        motivo_inconsistencia: 'El resumen "Alerta SMS" omite que se trata de una compra fraudulenta no reconocida.',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-8',
      numero_expediente: '2026-000113',
      resumen_original: 'Carta formal',
      descripcion_original: 'Cliente presenta formalmente derecho de petición solicitando copia del contrato de apertura, pagaré en blanco con carta de instrucciones y extractos consolidados de los últimos 24 meses.',
      descripcion_normalizada: 'cliente presenta formalmente derecho de peticion solicitando copia del contrato de apertura pagare en blanco con carta de instrucciones y extractos consolidados de los ultimos 24 meses',
      hash_descripcion: 'hash_demo_8',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-007',
      similitud_grupo: 0.95,
      analisis: {
        numero_expediente: '2026-000113',
        tema_principal: 'DERECHOS Y PQRS',
        subtema: 'Derecho de petición',
        producto: 'Documental',
        problema_principal: 'Requerimiento formal de documentos contractuales amparado en derecho de petición',
        solicitud_cliente: 'Entrega de copia de contrato, pagaré y extractos de 24 meses en plazo legal',
        categoria: 'DERECHOS Y PQRS',
        subcategoria: 'Derecho de petición',
        resumen_normalizado: 'Cliente ejerce derecho de petición solicitando copias de contrato, pagaré y extractos.',
        justificacion: 'Invocación expresa y formal del derecho constitucional de petición.',
        confianza: 96,
        nivel_confianza: 'Alta',
        requiere_revision: false,
        posible_inconsistencia: false,
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    },
    {
      id: 'demo-9',
      numero_expediente: '2026-000115',
      resumen_original: 'Revisión caso',
      descripcion_original: 'Solicito comedidamente que me colaboren revisando mi caso porque no estoy de acuerdo con lo que me dijeron por teléfono.',
      descripcion_normalizada: 'solicito comedidamente que me colaboren revisando mi caso porque no estoy de acuerdo con lo que me dijeron por telefono',
      hash_descripcion: 'hash_demo_9',
      estado_procesamiento: 'COMPLETADO',
      grupo_id: 'GRP-008',
      similitud_grupo: 0.72,
      analisis: {
        numero_expediente: '2026-000115',
        tema_principal: 'OTROS',
        subtema: 'Información insuficiente',
        producto: 'NO IDENTIFICADO',
        problema_principal: 'Inconformidad verbal no especificada sin hechos detallados',
        solicitud_cliente: 'Revisión indeterminada de llamada telefónica previa',
        categoria: 'OTROS',
        subcategoria: 'Información insuficiente',
        resumen_normalizado: 'Cliente solicita revisión general de atención telefónica sin suministrar hechos concretos.',
        justificacion: 'La descripción no contiene información suficiente para tipificar el reclamo.',
        confianza: 65,
        nivel_confianza: 'Baja',
        requiere_revision: true,
        posible_inconsistencia: false,
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      }
    }
  ];

  const groups: import('../types').SemanticGroup[] = [
    {
      id: 'GRP-001',
      nombre: 'Pagos no acreditados / rezago PSE',
      categoria_sugerida: 'PAGOS',
      cantidad_expedientes: 2,
      similitud_promedio: 0.925,
      similitud_minima: 0.91,
      similitud_maxima: 0.94,
      ejemplos_descripciones: [
        'El cliente manifiesta que realizó un abono por PSE por valor de $450.000 el día 5 de este mes, pero el saldo continúa apareciendo pendiente en la tarjeta de crédito. Solicita validar la aplicación del pago.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000101', '2026-000102']
    },
    {
      id: 'GRP-002',
      nombre: 'Inconformidad liquidación de intereses',
      categoria_sugerida: 'COBROS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.92,
      similitud_minima: 0.92,
      similitud_maxima: 0.92,
      ejemplos_descripciones: [
        'El usuario manifiesta inconformidad porque en el extracto de este período le liquidaron intereses de mora por un valor que considera excesivo e injustificado.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000104']
    },
    {
      id: 'GRP-003',
      nombre: 'Seguros voluntarios no autorizados',
      categoria_sugerida: 'SEGUROS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.89,
      similitud_minima: 0.89,
      similitud_maxima: 0.89,
      ejemplos_descripciones: [
        'El usuario reclama que en su cuenta de ahorros le están descontando mensualmente $24.500 por concepto de un seguro de desempleo que nunca autorizó.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000107']
    },
    {
      id: 'GRP-004',
      nombre: 'Exoneración cuota de manejo incumplida',
      categoria_sugerida: 'COBROS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.95,
      similitud_minima: 0.95,
      similitud_maxima: 0.95,
      ejemplos_descripciones: [
        'El cliente presenta reclamo por el cobro de la cuota de manejo en su tarjeta de crédito, señalando que le prometieron exoneración durante el primer año.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000108']
    },
    {
      id: 'GRP-005',
      nombre: 'Fallas de ingreso y bloqueo app móvil',
      categoria_sugerida: 'APLICATIVOS Y CANALES',
      cantidad_expedientes: 1,
      similitud_promedio: 0.91,
      similitud_minima: 0.91,
      similitud_maxima: 0.91,
      ejemplos_descripciones: [
        'El usuario informa que no puede ingresar a la aplicación móvil desde hace dos días; el sistema arroja error de autenticación y bloqueó la contraseña digital.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000109']
    },
    {
      id: 'GRP-006',
      nombre: 'Compras presenciales no reconocidas',
      categoria_sugerida: 'FRAUDE Y SEGURIDAD',
      cantidad_expedientes: 1,
      similitud_promedio: 0.96,
      similitud_minima: 0.96,
      similitud_maxima: 0.96,
      ejemplos_descripciones: [
        'El titular no reconoce una compra por valor de $1.200.000 realizada en establecimiento comercial en otra ciudad con su tarjeta débito.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000111']
    },
    {
      id: 'GRP-007',
      nombre: 'Solicitud formal copias contractuales',
      categoria_sugerida: 'DERECHOS Y PQRS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.95,
      similitud_minima: 0.95,
      similitud_maxima: 0.95,
      ejemplos_descripciones: [
        'Cliente presenta formalmente derecho de petición solicitando copia del contrato de apertura, pagaré en blanco con carta de instrucciones y extractos consolidados.'
      ],
      es_nuevo_patron: false,
      expedientes_ids: ['2026-000113']
    },
    {
      id: 'GRP-008',
      nombre: 'Manifestación genérica sin hechos específicos',
      categoria_sugerida: 'OTROS',
      cantidad_expedientes: 1,
      similitud_promedio: 0.72,
      similitud_minima: 0.72,
      similitud_maxima: 0.72,
      ejemplos_descripciones: [
        'Solicito comedidamente que me colaboren revisando mi caso porque no estoy de acuerdo con lo que me dijeron por teléfono.'
      ],
      es_nuevo_patron: true,
      expedientes_ids: ['2026-000115']
    }
  ];


  return { records, groups };
}

