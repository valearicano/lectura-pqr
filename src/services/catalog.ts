import { CategoryItem } from '../types';

export const DEFAULT_CATALOG: CategoryItem[] = [
  {
    id: 'cat-pago-itau',
    nombre: 'PAGO A ITAU',
    descripcion: 'Pagos realizados a Itaú no reflejados, no aplicados, pendientes, incompletos, demorados o rechazados (Exclusivo para expedientes con TIPO ORIGEN = ITAU)',
    activa: true,
    subcategorias: [
      { id: 'sub-ita-1', nombre: 'PAGO NO REFLEJADO', activa: true, descripcion: 'Pagos realizados por el cliente que no aparecen reflejados en el saldo o tarjeta' },
      { id: 'sub-ita-2', nombre: 'APLICACIÓN DE PAGO', activa: true, descripcion: 'Pagos debitados o consignados pendientes o no aplicados a la obligación' },
      { id: 'sub-ita-3', nombre: 'TRANSFERENCIA NO ABONADA', activa: true, descripcion: 'Transferencias enviadas que no se acreditan en la cuenta o tarjeta Itaú' },
      { id: 'sub-ita-4', nombre: 'PAGO PENDIENTE / DEMORA', activa: true, descripcion: 'Pagos en proceso con demora excesiva, estado retenido o rechazado' },
      { id: 'sub-ita-5', nombre: 'COMPROBANTE NO ENCONTRADO', activa: true, descripcion: 'Inconvenientes para ubicar el registro, comprobante o soporte del pago realizado' },
      { id: 'sub-ita-6', nombre: 'PAGO DUPLICADO / PARCIAL', activa: true, descripcion: 'Solo aparece reflejado uno de los pagos o se presentó débito doble' }
    ]
  },
  {
    id: 'cat-fraudes',
    nombre: 'FRAUDES',
    descripcion: 'Manifestación del cliente de no reconocer operaciones, débitos, compras, transferencias o productos, así como clonación, suplantación o hurto (Prioridad 1)',
    activa: true,
    subcategorias: [
      { id: 'sub-fra-1', nombre: 'OPERACIÓN NO RECONOCIDA', activa: true, descripcion: 'Compras, débitos, retiros o transferencias no reconocidas o desconocidas por el cliente' },
      { id: 'sub-fra-2', nombre: 'SUPLANTACIÓN O ROBO', activa: true, descripcion: 'Suplantación de identidad, clonación de tarjeta o hurto de productos' }
    ]
  },
  {
    id: 'cat-pse',
    nombre: 'PSE',
    descripcion: 'Operaciones, pagos, compras, soporte técnico y fallas en la pasarela de pagos electrónicos PSE (Prioridad 2)',
    activa: true,
    subcategorias: [
      { id: 'sub-pse-1', nombre: 'PAGO PSE', activa: true, descripcion: 'Pagos o transacciones realizadas por medio de la pasarela PSE' },
      { id: 'sub-pse-2', nombre: 'ERROR / FALLA PSE', activa: true, descripcion: 'Transacciones PSE rechazadas, no aplicadas, errores o caídas del servicio' },
      { id: 'sub-pse-3', nombre: 'SOPORTE TRANSACCIONAL', activa: true, descripcion: 'Confirmación, soporte o consulta de estado de compras y pagos PSE' }
    ]
  },
  {
    id: 'cat-cdt',
    nombre: 'CDT',
    descripcion: 'Certificados de depósito a término explícitos: visualización, rendimientos, pago y certificados Deceval (Prioridad 3)',
    activa: true,
    subcategorias: [
      { id: 'sub-cdt-1', nombre: 'CDT - VISUALIZACIÓN', activa: true, descripcion: 'Problemas para visualizar el CDT en la aplicación o banca digital' },
      { id: 'sub-cdt-2', nombre: 'CDT - RENDIMIENTOS', activa: true, descripcion: 'Pago de rendimientos, liquidación de intereses y diferencias de tasas en CDT' },
      { id: 'sub-cdt-3', nombre: 'CDT - PAGO / CANCELACIÓN', activa: true, descripcion: 'Redención, vencimiento, pago, cancelación o desembolso de CDT' },
      { id: 'sub-cdt-4', nombre: 'CDT - CERTIFICADOS Y SOPORTES', activa: true, descripcion: 'Certificados Deceval, certificados de titularidad o tributarios de CDT' }
    ]
  },
  {
    id: 'cat-gt5',
    nombre: 'GT5',
    descripcion: 'Operaciones especiales GT5: cargos a cuenta en oficina, cargo cuenta día, RECUP TRANX y transacciones no aplicadas (Prioridad 4)',
    activa: true,
    subcategorias: [
      { id: 'sub-gt5-1', nombre: 'CARGO A CUENTA EN OFICINA', activa: true, descripcion: 'Cargos o débitos efectuados a cuenta en oficina' },
      { id: 'sub-gt5-2', nombre: 'CARGO CUENTA DÍA', activa: true, descripcion: 'Cargos o movimientos correspondientes a cuenta día' },
      { id: 'sub-gt5-3', nombre: 'RECUP TRANX', activa: true, descripcion: 'Recuperación de transacción (RECUP TRANX) o ajustes asociados' },
      { id: 'sub-gt5-4', nombre: 'TRANSACCIÓN NO APLICADA', activa: true, descripcion: 'Cargos por transacción no aplicada' }
    ]
  },
  {
    id: 'cat-gmf',
    nombre: 'GMF',
    descripcion: 'Gravamen a los Movimientos Financieros (4x1000): cobro, marcación, desmarcación y devoluciones (Prioridad 5)',
    activa: true,
    subcategorias: [
      { id: 'sub-gmf-1', nombre: 'COBRO', activa: true, descripcion: 'Inconformidad o reclamo por aplicación del 4x1000' },
      { id: 'sub-gmf-2', nombre: 'MARCACIÓN', activa: true, descripcion: 'Solicitud para marcar cuenta como exenta del 4x1000' },
      { id: 'sub-gmf-3', nombre: 'DESMARCACIÓN', activa: true, descripcion: 'Solicitud para desmarcar cuenta o retirar beneficio' },
      { id: 'sub-gmf-4', nombre: 'DEVOLUCIÓN', activa: true, descripcion: 'Solicitud de reintegro o devolución de 4x1000 debitado' }
    ]
  },
  {
    id: 'cat-cuota',
    nombre: 'CUOTAS DE MANEJO',
    descripcion: 'Cobro, inconformidad, exoneración, aclaración o devolución de cuotas de manejo y administración periódica de tarjetas o productos',
    activa: true,
    subcategorias: [
      { id: 'sub-cuo-1', nombre: 'COBRO', activa: true, descripcion: 'Cobro de cuota de manejo, tarifa de manejo o cargo de administración del producto' },
      { id: 'sub-cuo-2', nombre: 'DEVOLUCIÓN O REVERSIÓN', activa: true, descripcion: 'Solicitud de devolución, reintegro, reversión o eliminación de cuota de manejo' },
      { id: 'sub-cuo-3', nombre: 'EXONERACIÓN O BENEFICIO NO APLICADO', activa: true, descripcion: 'Reclamo por cobro de cuota prometida como gratuita, beneficio no aplicado o pérdida de exoneración' },
      { id: 'sub-cuo-4', nombre: 'COBRO POSTERIOR A CANCELACIÓN', activa: true, descripcion: 'Cobro de cuota de manejo de una tarjeta cancelada, bloqueada, inactiva o cerrada' },
      { id: 'sub-cuo-5', nombre: 'COBRO DUPLICADO', activa: true, descripcion: 'Cobro repetido o duplicado de cuota de manejo en el mismo periodo' },
      { id: 'sub-cuo-6', nombre: 'COBRO NO RECONOCIDO', activa: true, descripcion: 'Cuota de manejo o cobro de administración no reconocido o no autorizado por el cliente' },
      { id: 'sub-cuo-7', nombre: 'ACLARACIÓN DEL VALOR O LAS CONDICIONES', activa: true, descripcion: 'Consulta o aclaración sobre incremento, periodicidad, cálculo o valor facturado de cuota de manejo' },
      { id: 'sub-cuo-8', nombre: 'OTRO MOTIVO DE CUOTA DE MANEJO', activa: true, descripcion: 'Otros reclamos y solicitudes asociadas a cuotas de manejo' }
    ]
  },
  {
    id: 'cat-honorarios-cobranza',
    nombre: 'HONORARIOS Y GASTOS DE COBRANZA',
    descripcion: 'Cobro de honorarios jurídicos o prejurídicos, gastos de cobranza, gestión de recuperación de cartera y cargos por mora cuestionados',
    activa: true,
    subcategorias: [
      { id: 'sub-cob-1', nombre: 'COBRO DE HONORARIOS', activa: true, descripcion: 'Cobro de honorarios de abogado, gestión jurídica o prejurídica de cobranza' },
      { id: 'sub-cob-2', nombre: 'GASTOS DE COBRANZA', activa: true, descripcion: 'Cargos por gestión de cobro, recuperación de cartera o gastos administrativos de mora' },
      { id: 'sub-cob-3', nombre: 'COBRO CUESTIONADO POR NO ESTAR EN MORA', activa: true, descripcion: 'El cliente manifiesta estar al día, haber pagado a tiempo o que el banco aplicó el pago tarde' },
      { id: 'sub-cob-4', nombre: 'COBRO DESPUÉS DEL PAGO', activa: true, descripcion: 'Cobro de gastos u honorarios después de haber pagado o cancelado la totalidad de la deuda' },
      { id: 'sub-cob-5', nombre: 'VALOR O CÁLCULO NO CONFORME', activa: true, descripcion: 'Cobro considerado excesivo, desacuerdo con el porcentaje o solicitud de detalle del cálculo' },
      { id: 'sub-cob-6', nombre: 'DEVOLUCIÓN O REVERSIÓN', activa: true, descripcion: 'Solicitud de devolución, reintegro, ajuste o eliminación del cargo de honorarios o cobranza' },
      { id: 'sub-cob-7', nombre: 'COBRO DUPLICADO', activa: true, descripcion: 'Cargos de cobranza u honorarios cobrados de manera duplicada o repetida' },
      { id: 'sub-cob-8', nombre: 'FALTA DE INFORMACIÓN O SOPORTES', activa: true, descripcion: 'Solicitud de soportes de la gestión o reclamo por cobro sin comunicación previa' },
      { id: 'sub-cob-9', nombre: 'COBRO POSTERIOR A NORMALIZACIÓN', activa: true, descripcion: 'Cobro de honorarios después de haber normalizado, refinanciado o reestructurado la obligación' },
      { id: 'sub-cob-10', nombre: 'OTRO MOTIVO DE HONORARIOS O GASTOS DE COBRANZA', activa: true, descripcion: 'Otras inconformidades y solicitudes relativas a honorarios o gastos de cobranza' }
    ]
  },
  {
    id: 'cat-seguros',
    nombre: 'SEGUROS',
    descripcion: 'Pólizas de seguro individuales o vinculadas a créditos (vida, desempleo, fraude) (Prioridad 7)',
    activa: true,
    subcategorias: [
      { id: 'sub-seg-1', nombre: 'PÓLIZAS Y COBROS', activa: true, descripcion: 'Cobro de primas, pólizas de vida, seguros atados a crédito' },
      { id: 'sub-seg-2', nombre: 'CANCELACIÓN Y DEVOLUCIÓN', activa: true, descripcion: 'Cancelación, desistimiento o reintegro de pólizas de seguros' }
    ]
  },
  {
    id: 'cat-transferencias',
    nombre: 'TRANSFERENCIAS',
    descripcion: 'Transferencias interbancarias, transferencias retenidas, ACH, Bre-B o giros',
    activa: true,
    subcategorias: [
      { id: 'sub-tra-1', nombre: 'TRANSFERENCIAS', activa: true, descripcion: 'Transferencias rechazadas, retenidas, no recibidas o problemas ACH / Bre-B' },
      { id: 'sub-tra-2', nombre: 'SALDOS Y MOVIMIENTOS', activa: true, descripcion: 'Revisión de saldos, diferencias o movimientos entre cuentas' }
    ]
  },
  {
    id: 'cat-pagos',
    nombre: 'PAGOS / ABONOS',
    descripcion: 'Aplicación de pagos a obligaciones, débitos automáticos y recaudos de convenios (excluye PSE)',
    activa: true,
    subcategorias: [
      { id: 'sub-pag-1', nombre: 'APLICACIÓN DE PAGO', activa: true, descripcion: 'Pagos realizados no reflejados o mala aplicación de abonos' },
      { id: 'sub-pag-2', nombre: 'DÉBITOS AUTOMÁTICOS', activa: true, descripcion: 'Inscripción, cancelación o débitos automáticos duplicados' },
      { id: 'sub-pag-3', nombre: 'PAGOS Y RECAUDOS', activa: true, descripcion: 'Pago de convenios, facturas o servicios públicos' }
    ]
  },
  {
    id: 'cat-canales',
    nombre: 'CANALES DIGITALES',
    descripcion: 'Banca móvil, portal virtual, bloqueo de credenciales, token y fallas técnicas',
    activa: true,
    subcategorias: [
      { id: 'sub-can-1', nombre: 'BANCA MÓVIL Y VIRTUAL', activa: true, descripcion: 'Problemas de usuario, contraseña, token, OTP, bloqueos de acceso' },
      { id: 'sub-can-2', nombre: 'FALLAS TECNOLÓGICAS', activa: true, descripcion: 'Errores en pantalla, caídas de sistema o pantallas en blanco' }
    ]
  },
  {
    id: 'cat-tarjetas',
    nombre: 'TARJETAS',
    descripcion: 'Gestión física y operativa de tarjetas débito y crédito: entrega de plástico, cupo, avances, compras y beneficios',
    activa: true,
    subcategorias: [
      { id: 'sub-tar-1', nombre: 'PLÁSTICO Y BLOQUEO', activa: true, descripcion: 'Envío de plástico, entrega, deterioro, reposición y bloqueo de tarjeta' },
      { id: 'sub-tar-2', nombre: 'CUPO Y AVANCES', activa: true, descripcion: 'Solicitud de aumento de cupo, disponibilidad, avances y ajustes de límite' },
      { id: 'sub-tar-3', nombre: 'COMPRAS Y DEVOLUCIONES', activa: true, descripcion: 'Devolución de compras pendientes, transacciones comerciales y cargos duplicados en datáfono' },
      { id: 'sub-tar-4', nombre: 'DIFERIDOS Y FINANCIACIÓN', activa: true, descripcion: 'Compras diferidas a cuotas, rediferidos y plazo de financiación' },
      { id: 'sub-tar-5', nombre: 'MILLAS Y PROGRAMAS DE LEALTAD', activa: true, descripcion: 'Acumulación de millas, puntos, canje y beneficios del programa de lealtad' }
    ]
  },
  {
    id: 'cat-creditos',
    nombre: 'CRÉDITOS / CARTERA',
    descripcion: 'Préstamos, libranzas, créditos de consumo o hipotecarios, acuerdos de pago y refinanciación',
    activa: true,
    subcategorias: [
      { id: 'sub-cre-1', nombre: 'ESTADO DE OBLIGACIÓN / SALDOS', activa: true, descripcion: 'Consulta de saldo de crédito, plan de pagos y cuotas' },
      { id: 'sub-cre-2', nombre: 'REFINANCIACIÓN Y ACUERDOS', activa: true, descripcion: 'Acuerdos de pago, reestructuración o alivios de cartera' },
      { id: 'sub-cre-3', nombre: 'VALOR DE LA CUOTA Y PLAN DE PAGOS', activa: true, descripcion: 'Aumento, variación o inconsistencia en el valor de la cuota mensual de crédito, leasing, vivienda o plan de amortización' }
    ]
  },
  {
    id: 'cat-condiciones',
    nombre: 'CONDICIONES',
    descripcion: 'Inconformidad, desacuerdo, reclamación o revisión sobre condiciones de cartera/crédito: tasas de interés, cambio de tasa, plazos, cuotas pactadas, cambio de condiciones o migración',
    activa: true,
    subcategorias: [
      { id: 'sub-con-1', nombre: 'TASA DE INTERÉS', activa: true, descripcion: 'Inconformidad con la tasa asignada, tasa incorrecta, tasa no acordada, tasa superior o intereses que no corresponden a la tasa pactada' },
      { id: 'sub-con-2', nombre: 'CAMBIO DE TASA', activa: true, descripcion: 'Aumento de tasa, modificación no informada o conversión de tasa fija a variable' },
      { id: 'sub-con-3', nombre: 'PLAZO DEL CRÉDITO', activa: true, descripcion: 'Modificación, ampliación o desacuerdo con el plazo asignado, número de cuotas o tiempo de financiación' },
      { id: 'sub-con-4', nombre: 'VALOR DE CUOTA POR CONDICIONES', activa: true, descripcion: 'Cuota mensual o plan de pagos que quedó diferente a lo pactado, más alta de lo informado o no respeta condiciones acordadas' },
      { id: 'sub-con-5', nombre: 'MODALIDAD DE FINANCIACIÓN', activa: true, descripcion: 'Desacuerdo con la modalidad del crédito, forma de liquidación o condiciones del producto contratado' },
      { id: 'sub-con-6', nombre: 'CONDICIONES PACTADAS NO RESPETADAS', activa: true, descripcion: 'Incumplimiento de lo ofrecido, negociación inicial o condiciones aprobadas distintas a las pactadas' },
      { id: 'sub-con-7', nombre: 'CAMBIO DE CONDICIONES', activa: true, descripcion: 'Modificación unilateral de condiciones del crédito o cambios sin previo aviso' },
      { id: 'sub-con-8', nombre: 'CONDICIONES COMERCIALES', activa: true, descripcion: 'Ofertas comerciales, beneficios prometidos no aplicados o condiciones diferentes a la solicitud' },
      { id: 'sub-con-9', nombre: 'CONDICIONES DESPUÉS DE MIGRACIÓN', activa: true, descripcion: 'Cambio de tasa, cuota o condiciones de la obligación tras un proceso de migración o cesión' },
      { id: 'sub-con-10', nombre: 'OTRAS CONDICIONES DEL CRÉDITO', activa: true, descripcion: 'Inconformidad general o desacuerdo con las condiciones del crédito o leasing' }
    ]
  },
  {
    id: 'cat-productos',
    nombre: 'PRODUCTOS',
    descripcion: 'Cancelación, activación o condiciones generales de cuentas y productos bancarios',
    activa: true,
    subcategorias: [
      { id: 'sub-prod-1', nombre: 'CANCELACIÓN DE PRODUCTOS', activa: true, descripcion: 'Cierre o cancelación voluntaria de cuentas, tarjetas o créditos' },
      { id: 'sub-prod-2', nombre: 'CONDICIONES DEL PRODUCTO', activa: true, descripcion: 'Consultas sobre tasas, beneficios o condiciones contractuales' },
      { id: 'sub-prod-3', nombre: 'ACTIVACIÓN DE PRODUCTOS', activa: true, descripcion: 'Activación de cuentas, tarjetas o tokens para uso' }
    ]
  },
  {
    id: 'cat-comisiones',
    nombre: 'COMISIONES Y COBROS',
    descripcion: 'Comisiones operativas, tarifas bancarias e intereses (excluye cuota de manejo y GMF)',
    activa: true,
    subcategorias: [
      { id: 'sub-com-1', nombre: 'COMISIONES Y TARIFAS', activa: true, descripcion: 'Cobros operativos, tarifas de retiros o servicios' },
      { id: 'sub-com-2', nombre: 'INTERESES', activa: true, descripcion: 'Liquidación de intereses corrientes o moratorios' }
    ]
  },
  {
    id: 'cat-documentos',
    nombre: 'INFORMACIÓN Y DOCUMENTOS',
    descripcion: 'Expedición de paz y salvo, certificaciones bancarias, extractos y derechos de petición',
    activa: true,
    subcategorias: [
      { id: 'sub-doc-1', nombre: 'CERTIFICADOS Y PAZ Y SALVO', activa: true, descripcion: 'Paz y salvo, certificados tributarios o de saldo' },
      { id: 'sub-doc-2', nombre: 'EXTRACTOS Y DOCUMENTOS', activa: true, descripcion: 'Copias de pagarés, contratos o extractos históricos' }
    ]
  },
  {
    id: 'cat-embargos',
    nombre: 'EMBARGOS',
    descripcion: 'Oficios judiciales, retenciones por embargo de cuentas y solicitudes de desembargo',
    activa: true,
    subcategorias: [
      { id: 'sub-emb-1', nombre: 'APLICACIÓN DE EMBARGO', activa: true, descripcion: 'Medidas cautelares o retención judicial sobre cuentas' },
      { id: 'sub-emb-2', nombre: 'DESEMBARGO', activa: true, descripcion: 'Solicitud de desembargo o levantamiento de medida' }
    ]
  },
  {
    id: 'cat-datos',
    nombre: 'ACTUALIZACIÓN DE DATOS',
    descripcion: 'Modificación de teléfonos, correos, dirección o información personal',
    activa: true,
    subcategorias: [
      { id: 'sub-dat-1', nombre: 'DATOS DE CONTACTO', activa: true, descripcion: 'Actualización de celular, correo electrónico o dirección física' }
    ]
  },
  {
    id: 'cat-servicio',
    nombre: 'SERVICIO / ATENCIÓN',
    descripcion: 'Inconformidad con la atención humana en oficinas/sucursales o demoras en tiempos de respuesta',
    activa: true,
    subcategorias: [
      { id: 'sub-ser-1', nombre: 'ATENCIÓN ASESOR Y SUCURSAL', activa: true, descripcion: 'Inconformidad con el trato o mala asesoría recibida' },
      { id: 'sub-ser-2', nombre: 'TIEMPOS DE RESPUESTA', activa: true, descripcion: 'Demoras excesivas o falta de respuesta a solicitudes previas' }
    ]
  },
  {
    id: 'cat-otras',
    nombre: 'OTRAS',
    descripcion: 'Casos atípicos con información suficiente que no corresponden a la operativa bancaria estándar',
    activa: true,
    subcategorias: [
      { id: 'sub-otr-1', nombre: 'CASOS ATÍPICOS', activa: true, descripcion: 'Situaciones no estándar clasificables de forma individual' }
    ]
  },
  {
    id: 'cat-revision',
    nombre: 'REVISIÓN HUMANA',
    descripcion: 'Casos estrictamente sin información analizable, texto vacío, ruido o expresiones ambiguas',
    activa: true,
    subcategorias: [
      { id: 'sub-rev-1', nombre: 'INFORMACIÓN INSUFICIENTE', activa: true, descripcion: 'Descripción vacía, ruido o ambigüedad total sin motivo identificado' }
    ]
  }
];

export function getOfficialCategoriesList(): string[] {
  return DEFAULT_CATALOG.map(c => c.nombre);
}

export function getOfficialCatalog(): { id: string; nombre: string; descripcion: string; subcategorias: string[]; activa: boolean }[] {
  return DEFAULT_CATALOG.map(c => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    subcategorias: c.subcategorias.map(s => s.nombre),
    activa: c.activa
  }));
}

export function getCatalogSummary(catalog: CategoryItem[] = DEFAULT_CATALOG): string {
  return catalog
    .filter(c => c.activa)
    .map(c => {
      const subs = c.subcategorias.filter(s => s.activa).map(s => s.nombre).join(', ');
      return `- ${c.nombre}: ${c.descripcion}. Subcategorías: [${subs}]`;
    })
    .join('\n');
}
