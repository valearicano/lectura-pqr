import { CategoryItem } from '../types';

export const DEFAULT_CATALOG: CategoryItem[] = [
  {
    id: 'cat-pagos',
    nombre: 'PAGOS',
    descripcion: 'Gestiones relacionadas con pagos de obligaciones, abonos, canales y aplicación contable',
    activa: true,
    subcategorias: [
      { id: 'sub-pagos-1', nombre: 'Aplicación de pago', activa: true, descripcion: 'Pago efectuado pero no reflejado o no aplicado en el saldo' },
      { id: 'sub-pagos-2', nombre: 'Pago no reflejado', activa: true, descripcion: 'Pago que no aparece en el extracto o consulta de saldo' },
      { id: 'sub-pagos-3', nombre: 'Pago duplicado', activa: true, descripcion: 'Cobro o débito doble por una misma transacción de pago' },
      { id: 'sub-pagos-4', nombre: 'Pago rechazado', activa: true, descripcion: 'Inconvenientes en el procesamiento o rechazo del pago' },
      { id: 'sub-pagos-5', nombre: 'Devolución de pago', activa: true, descripcion: 'Solicitud de reintegro de dinero por pagos erróneos o en exceso' },
      { id: 'sub-pagos-6', nombre: 'Acuerdo o convenio de pago', activa: true, descripcion: 'Negociación de acuerdos, refinanciación o convenios' },
      { id: 'sub-pagos-7', nombre: 'Medios de pago', activa: true, descripcion: 'Consultas o problemas sobre canales, tarjetas, PSE u otros medios' },
      { id: 'sub-pagos-8', nombre: 'Otro tema de pagos', activa: true, descripcion: 'Otros casos concernientes a pagos' }
    ]
  },
  {
    id: 'cat-cobros',
    nombre: 'COBROS',
    descripcion: 'Inconformidades o consultas con conceptos liquidados, tasas, comisiones o saldos',
    activa: true,
    subcategorias: [
      { id: 'sub-cobros-1', nombre: 'Cobro de intereses', activa: true, descripcion: 'Inconformidad con intereses corrientes, de mora o capitalizados' },
      { id: 'sub-cobros-2', nombre: 'Cobro no reconocido', activa: true, descripcion: 'Cargos o débitos en la cuenta o tarjeta que el cliente no identifica' },
      { id: 'sub-cobros-3', nombre: 'Cobro de comisiones', activa: true, descripcion: 'Comisiones por transferencias, retiros, certificaciones o gestión' },
      { id: 'sub-cobros-4', nombre: 'Cuotas de manejo', activa: true, descripcion: 'Inconformidad o solicitud de exoneración de cuota de manejo' },
      { id: 'sub-cobros-5', nombre: 'Cobros adicionales', activa: true, descripcion: 'Cargos administrativos o conceptos adicionales no claros' },
      { id: 'sub-cobros-6', nombre: 'Saldo incorrecto', activa: true, descripcion: 'Diferencias entre el saldo real y el reportado en extractos' },
      { id: 'sub-cobros-7', nombre: 'Otro tema de cobros', activa: true, descripcion: 'Otras inconformidades relacionadas con cobros' }
    ]
  },
  {
    id: 'cat-seguros',
    nombre: 'SEGUROS',
    descripcion: 'Pólizas de vida, desempleo, fraude, automóvil u otros seguros vinculados',
    activa: true,
    subcategorias: [
      { id: 'sub-seguros-1', nombre: 'Tema de seguros', activa: true, descripcion: 'Consultas generales sobre coberturas o pólizas' },
      { id: 'sub-seguros-2', nombre: 'Cobro de seguro', activa: true, descripcion: 'Cargos de primas de seguro en los extractos' },
      { id: 'sub-seguros-3', nombre: 'Cancelación de seguro', activa: true, descripcion: 'Solicitud formal de desistimiento o cancelación de póliza' },
      { id: 'sub-seguros-4', nombre: 'Seguro no reconocido', activa: true, descripcion: 'Seguros activados sin consentimiento informado' },
      { id: 'sub-seguros-5', nombre: 'Información sobre seguro', activa: true, descripcion: 'Requerimientos de certificados o condiciones de póliza' },
      { id: 'sub-seguros-6', nombre: 'Otro tema de seguros', activa: true, descripcion: 'Otros trámites con aseguradoras o pólizas' }
    ]
  },
  {
    id: 'cat-aplicativos',
    nombre: 'APLICATIVOS Y CANALES',
    descripcion: 'Fallas técnicas en App móvil, portal web, cajeros, audio-respuesta o canal digital',
    activa: true,
    subcategorias: [
      { id: 'sub-app-1', nombre: 'Error en aplicativo', activa: true, descripcion: 'Fallo general o bloqueo en la aplicación' },
      { id: 'sub-app-2', nombre: 'Error en página web', activa: true, descripcion: 'Problemas en el portal transaccional o página institucional' },
      { id: 'sub-app-3', nombre: 'Error en aplicación móvil', activa: true, descripcion: 'Cierre inesperado, pantalla en blanco o error en smartphone' },
      { id: 'sub-app-4', nombre: 'Problemas de acceso', activa: true, descripcion: 'Bloqueo de usuario, clave olvidada, OTP o biometría fallida' },
      { id: 'sub-app-5', nombre: 'Error transaccional', activa: true, descripcion: 'Transacción interrumpida o código de error al operar' },
      { id: 'sub-app-6', nombre: 'Problema con canal digital', activa: true, descripcion: 'Inconveniente con WhatsApp, chat virtual o portal' },
      { id: 'sub-app-7', nombre: 'Otro problema tecnológico', activa: true, descripcion: 'Otras fallas de sistemas o infraestructura digital' }
    ]
  },
  {
    id: 'cat-fraude',
    nombre: 'FRAUDE Y SEGURIDAD',
    descripcion: 'Transacciones no consentidas, suplantación de identidad, phishing o incidentes de seguridad',
    activa: true,
    subcategorias: [
      { id: 'sub-fraude-1', nombre: 'Fraude', activa: true, descripcion: 'Eventos delictivos o estafas perpetradas por terceros' },
      { id: 'sub-fraude-2', nombre: 'Suplantación', activa: true, descripcion: 'Apertura de productos o créditos a nombre de la víctima' },
      { id: 'sub-fraude-3', nombre: 'Movimiento no reconocido', activa: true, descripcion: 'Movimientos financieros no realizados por el titular' },
      { id: 'sub-fraude-4', nombre: 'Compra no reconocida', activa: true, descripcion: 'Cargos en comercios físicos o virtuales no efectuados' },
      { id: 'sub-fraude-5', nombre: 'Transferencia no reconocida', activa: true, descripcion: 'Envíos de dinero o transferencias sin autorización' },
      { id: 'sub-fraude-6', nombre: 'Transacción no reconocida', activa: true, descripcion: 'Otras transacciones débito o crédito desconocidas' },
      { id: 'sub-fraude-7', nombre: 'Otro tema de seguridad', activa: true, descripcion: 'Incidentes adicionales de ciberseguridad o sospechas' }
    ]
  },
  {
    id: 'cat-derechos',
    nombre: 'DERECHOS Y PQRS',
    descripcion: 'Mecanismos formales de quejas, peticiones legales, solicitudes de documentos o reclamos',
    activa: true,
    subcategorias: [
      { id: 'sub-der-1', nombre: 'Derecho de petición', activa: true, descripcion: 'Petición formal al amparo de la normatividad constitucional' },
      { id: 'sub-der-2', nombre: 'Petición', activa: true, descripcion: 'Solicitud formal de un servicio, acción o trámite' },
      { id: 'sub-der-3', nombre: 'Queja', activa: true, descripcion: 'Inconformidad con la atención recibida o el personal' },
      { id: 'sub-der-4', nombre: 'Reclamo', activa: true, descripcion: 'Exigencia de cumplimiento o revisión por insatisfacción con el producto' },
      { id: 'sub-der-5', nombre: 'Solicitud de información', activa: true, descripcion: 'Requerimiento de aclaraciones, tasas o políticas' },
      { id: 'sub-der-6', nombre: 'Solicitud de documentos', activa: true, descripcion: 'Paz y salvo, copias de pagarés, contratos o extractos históricos' },
      { id: 'sub-der-7', nombre: 'Otro tema PQRS', activa: true, descripcion: 'Otras manifestaciones formales' }
    ]
  },
  {
    id: 'cat-otros',
    nombre: 'OTROS',
    descripcion: 'Casos que escapan al catálogo estándar, información insuficiente o requieren triaje humano',
    activa: true,
    subcategorias: [
      { id: 'sub-otros-1', nombre: 'Otra categoría', activa: true, descripcion: 'Tema válido pero no contemplado en el catálogo oficial' },
      { id: 'sub-otros-2', nombre: 'No identificado', activa: true, descripcion: 'No es posible determinar la categoría por falta de contexto' },
      { id: 'sub-otros-3', nombre: 'Información insuficiente', activa: true, descripcion: 'El texto es demasiado vago o ambiguo para clasificar' },
      { id: 'sub-otros-4', nombre: 'Revisión humana', activa: true, descripcion: 'Caso complejo que amerita análisis directo por un analista' }
    ]
  }
];

export function getCatalogSummary(catalog: CategoryItem[] = DEFAULT_CATALOG): string {
  return catalog
    .filter(c => c.activa)
    .map(c => {
      const subs = c.subcategorias.filter(s => s.activa).map(s => s.nombre).join(', ');
      return `- ${c.nombre}: [${subs}]`;
    })
    .join('\n');
}

export function normalizeCategoryName(raw: string): string {
  const clean = raw.trim().toUpperCase();
  if (clean.includes('PAGO') || clean.includes('ABONO')) return 'PAGOS';
  if (clean.includes('COBRO') || clean.includes('INTERES') || clean.includes('COMISION') || clean.includes('CUOTA')) return 'COBROS';
  if (clean.includes('SEGURO') || clean.includes('POLIZA')) return 'SEGUROS';
  if (clean.includes('APP') || clean.includes('APLICATIVO') || clean.includes('WEB') || clean.includes('CLAVE') || clean.includes('ACCESO')) return 'APLICATIVOS Y CANALES';
  if (clean.includes('FRAUDE') || clean.includes('SUPLANT') || clean.includes('NO RECONOCID')) return 'FRAUDE Y SEGURIDAD';
  if (clean.includes('DERECHO') || clean.includes('PETICION') || clean.includes('QUEJA') || clean.includes('RECLAMO')) return 'DERECHOS Y PQRS';
  return raw.trim();
}

import { PQRSMainCategory } from '../types';

export function getOfficialCatalog(): PQRSMainCategory[] {
  return DEFAULT_CATALOG.map(c => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    subcategorias: c.subcategorias.map(s => s.nombre),
    activa: c.activa
  }));
}

