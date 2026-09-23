import { CategoryItem, CATEGORIAS_OFICIALES_16 } from '../types';

export const DEFAULT_CATALOG: CategoryItem[] = [
  {
    id: 'cat-cuota-manejo',
    nombre: 'CUOTA DE MANEJO',
    descripcion: 'Todo lo relacionado con cuota de manejo (cobro, reversión, exoneración o aclaración)',
    activa: true,
    subcategorias: [
      { id: 'sub-cm-1', nombre: 'Cobro de cuota de manejo', activa: true, descripcion: 'Inconformidad con cargo facturado' },
      { id: 'sub-cm-2', nombre: 'Solicitud de reversión/devolución', activa: true, descripcion: 'Reclamo para anular cobro' },
      { id: 'sub-cm-3', nombre: 'Exoneración no aplicada', activa: true, descripcion: 'Incumplimiento de acuerdo de exoneración' }
    ]
  },
  {
    id: 'cat-pse',
    nombre: 'PSE',
    descripcion: 'Operaciones por pasarela PSE (errores, pagos, rechazos, compras o soporte)',
    activa: true,
    subcategorias: [
      { id: 'sub-pse-1', nombre: 'Error o falla técnica PSE', activa: true, descripcion: 'Mensajes de error, timeout o bloqueo' },
      { id: 'sub-pse-2', nombre: 'Pago PSE rechazado con débito', activa: true, descripcion: 'Descuento en cuenta sin aprobación' },
      { id: 'sub-pse-3', nombre: 'Soporte de transacción PSE', activa: true, descripcion: 'Solicitud de comprobante o validación' }
    ]
  },
  {
    id: 'cat-seguros',
    nombre: 'SEGUROS',
    descripcion: 'Pólizas y seguros asociados (vida, desempleo, tarjeta, cobro, cancelación o devolución)',
    activa: true,
    subcategorias: [
      { id: 'sub-seg-1', nombre: 'Cobro de seguro', activa: true, descripcion: 'Descuento o cobro de prima' },
      { id: 'sub-seg-2', nombre: 'Cancelación de seguro', activa: true, descripcion: 'Desistimiento de póliza' },
      { id: 'sub-seg-3', nombre: 'Seguro no reconocido', activa: true, descripcion: 'Póliza no consentida' }
    ]
  },
  {
    id: 'cat-gmf',
    nombre: 'GMF / 4X1000',
    descripcion: 'Gravamen a Movimientos Financieros (4x1000, marcación de cuenta exenta o devolución)',
    activa: true,
    subcategorias: [
      { id: 'sub-gmf-1', nombre: 'Marcación de cuenta exenta', activa: true, descripcion: 'Solicitud de exención legal' },
      { id: 'sub-gmf-2', nombre: 'Cobro indebido de GMF', activa: true, descripcion: 'Reclamo por descuento del 4x1000' }
    ]
  },
  {
    id: 'cat-transacciones',
    nombre: 'TRANSACCIONES',
    descripcion: 'Problemas generales con transacciones, operaciones o movimientos no fraudulentos',
    activa: true,
    subcategorias: [
      { id: 'sub-tra-1', nombre: 'Transacción pendiente / fallida', activa: true, descripcion: 'Operación no procesada o retenida' }
    ]
  },
  {
    id: 'cat-fraude',
    nombre: 'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
    descripcion: 'Compras, débitos, retiros o transferencias desconocidas o no autorizadas por el cliente',
    activa: true,
    subcategorias: [
      { id: 'sub-fra-1', nombre: 'Compra no reconocida', activa: true, descripcion: 'Consumo presencial o virtual desconocido' },
      { id: 'sub-fra-2', nombre: 'Débito o retiro no autorizado', activa: true, descripcion: 'Sustracción de fondos no reconocida' }
    ]
  },
  {
    id: 'cat-pagos',
    nombre: 'PAGOS / ABONOS',
    descripcion: 'Pagos de cuotas, abonos a créditos, aplicación contable y reversiones de pago',
    activa: true,
    subcategorias: [
      { id: 'sub-pag-1', nombre: 'Pago no aplicado / no reflejado', activa: true, descripcion: 'Abono realizado pendiente de acreditación' },
      { id: 'sub-pag-2', nombre: 'Reversión / devolución de abono', activa: true, descripcion: 'Reintegro por pago duplicado o erróneo' }
    ]
  },
  {
    id: 'cat-tarjetas',
    nombre: 'TARJETAS',
    descripcion: 'Tarjetas de crédito o débito (entrega, activación, bloqueo, cupo o renovación)',
    activa: true,
    subcategorias: [
      { id: 'sub-tar-1', nombre: 'Entrega o reposición de plástico', activa: true, descripcion: 'Envío y recepción de tarjeta' },
      { id: 'sub-tar-2', nombre: 'Bloqueo / desbloqueo', activa: true, descripcion: 'Gestión operativa del plástico' }
    ]
  },
  {
    id: 'cat-creditos',
    nombre: 'CRÉDITOS / CARTERA',
    descripcion: 'Créditos, saldos, cuotas, intereses, refinanciación y estado de cartera (salvo abonos)',
    activa: true,
    subcategorias: [
      { id: 'sub-cre-1', nombre: 'Saldo y liquidación de cuota', activa: true, descripcion: 'Revisión de plan de pagos o intereses' },
      { id: 'sub-cre-2', nombre: 'Refinanciación / acuerdo', activa: true, descripcion: 'Reestructuración de obligación' }
    ]
  },
  {
    id: 'cat-cuentas',
    nombre: 'CUENTAS',
    descripcion: 'Cuentas de ahorros o corrientes que no correspondan a otra categoría específica',
    activa: true,
    subcategorias: [
      { id: 'sub-cta-1', nombre: 'Apertura y cancelación', activa: true, descripcion: 'Trámites sobre cuentas' },
      { id: 'sub-cta-2', nombre: 'Estado y bloqueos de cuenta', activa: true, descripcion: 'Operatividad de la cuenta' }
    ]
  },
  {
    id: 'cat-transferencias',
    nombre: 'TRANSFERENCIAS',
    descripcion: 'Transferencias interbancarias o entre cuentas (salvo no reconocidas/fraude)',
    activa: true,
    subcategorias: [
      { id: 'sub-trf-1', nombre: 'Transferencia no acreditada / demorada', activa: true, descripcion: 'Retención en canje o ciclo' }
    ]
  },
  {
    id: 'cat-cobros',
    nombre: 'COBROS / CARGOS',
    descripcion: 'Cobros o cargos que no correspondan a cuota de manejo, GMF, seguro o crédito',
    activa: true,
    subcategorias: [
      { id: 'sub-cob-1', nombre: 'Comisiones y cargos varios', activa: true, descripcion: 'Tarifas operativas o no claras' }
    ]
  },
  {
    id: 'cat-datos',
    nombre: 'DATOS / INFORMACIÓN',
    descripcion: 'Solicitud de certificados, paz y salvo, soportes, extractos históricos o datos personales',
    activa: true,
    subcategorias: [
      { id: 'sub-dat-1', nombre: 'Certificados y paz y salvo', activa: true, descripcion: 'Expedición documental' },
      { id: 'sub-dat-2', nombre: 'Copia de contratos y pagarés', activa: true, descripcion: 'Soportes jurídicos' }
    ]
  },
  {
    id: 'cat-servicio',
    nombre: 'SERVICIO / ATENCIÓN',
    descripcion: 'Calidad de atención, inconformidad con asesores, oficinas o canales de contacto',
    activa: true,
    subcategorias: [
      { id: 'sub-ser-1', nombre: 'Atención en oficina / canal', activa: true, descripcion: 'Mala atención o tiempos de espera' }
    ]
  },
  {
    id: 'cat-otras',
    nombre: 'OTRAS',
    descripcion: 'Casos que no corresponden claramente a ninguna de las categorías anteriores',
    activa: true,
    subcategorias: [
      { id: 'sub-otr-1', nombre: 'Otros casos generales', activa: true, descripcion: 'No clasificable en categorías previas' }
    ]
  },
  {
    id: 'cat-revision',
    nombre: 'REVISIÓN HUMANA',
    descripcion: 'Descripción vacía, ambigua, contradictoria o sin información suficiente para clasificar',
    activa: true,
    subcategorias: [
      { id: 'sub-rev-1', nombre: 'Información insuficiente / vacía', activa: true, descripcion: 'Requiere contacto o triaje manual' }
    ]
  }
];

export function getOfficialCategoriesList(): string[] {
  return [...CATEGORIAS_OFICIALES_16];
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
