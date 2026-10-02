import { CategoryItem } from '../types';

export const DEFAULT_CATALOG: CategoryItem[] = [
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
    nombre: 'CUOTA DE MANEJO',
    descripcion: 'Cobro, inconformidad, exoneración o devolución de cuotas de manejo de tarjetas o cuentas (Prioridad 6)',
    activa: true,
    subcategorias: [
      { id: 'sub-cuo-1', nombre: 'COBRO', activa: true, descripcion: 'Cobro de cuota de manejo o tarifa mensual' },
      { id: 'sub-cuo-2', nombre: 'RECLAMACIÓN / INCONFORMIDAD', activa: true, descripcion: 'Reclamo por cobro no acordado o pérdida de exoneración' },
      { id: 'sub-cuo-3', nombre: 'DEVOLUCIÓN / REVERSIÓN', activa: true, descripcion: 'Solicitud de reversión o reintegro de cuota de manejo' }
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
    descripcion: 'Gestión física de tarjetas débito/crédito, entrega de plástico, cupo y programas de millas',
    activa: true,
    subcategorias: [
      { id: 'sub-tar-1', nombre: 'PLÁSTICO Y BLOQUEO', activa: true, descripcion: 'Envío de plástico, entrega, deterioro, bloqueo y cupo' },
      { id: 'sub-tar-2', nombre: 'MILLAS Y PROGRAMAS DE LEALTAD', activa: true, descripcion: 'Acumulación de millas, puntos y beneficios' }
    ]
  },
  {
    id: 'cat-creditos',
    nombre: 'CRÉDITOS / CARTERA',
    descripcion: 'Préstamos, libranzas, créditos de consumo o hipotecarios, acuerdos de pago y refinanciación',
    activa: true,
    subcategorias: [
      { id: 'sub-cre-1', nombre: 'ESTADO DE OBLIGACIÓN / SALDOS', activa: true, descripcion: 'Consulta de saldo de crédito, plan de pagos y cuotas' },
      { id: 'sub-cre-2', nombre: 'REFINANCIACIÓN Y ACUERDOS', activa: true, descripcion: 'Acuerdos de pago, reestructuración o alivios de cartera' }
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
