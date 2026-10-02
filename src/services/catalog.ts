import { CategoryItem } from '../types';

export const DEFAULT_CATALOG: CategoryItem[] = [
  {
    id: 'cat-cdt',
    nombre: 'CDT',
    descripcion: 'Apertura, visualización, rendimientos, pago y certificaciones de certificados de depósito a término',
    activa: true,
    subcategorias: [
      { id: 'sub-cdt-1', nombre: 'CDT - VISUALIZACIÓN', activa: true, descripcion: 'Problemas para visualizar el CDT en app o canales digitales' },
      { id: 'sub-cdt-2', nombre: 'CDT - RENDIMIENTOS', activa: true, descripcion: 'Pago, liquidación o diferencias en rendimientos e intereses' },
      { id: 'sub-cdt-3', nombre: 'CDT - PAGO / CANCELACIÓN', activa: true, descripcion: 'Redención, vencimiento, cancelación y desembolso del CDT' },
      { id: 'sub-cdt-4', nombre: 'CDT - CERTIFICADOS Y SOPORTES', activa: true, descripcion: 'Certificados Deceval, titularidad o soportes tributarios' }
    ]
  },
  {
    id: 'cat-productos',
    nombre: 'PRODUCTOS',
    descripcion: 'Gestión del ciclo de vida y condiciones de cuentas, tarjetas, créditos y otros productos',
    activa: true,
    subcategorias: [
      { id: 'sub-prod-1', nombre: 'CANCELACIÓN DE PRODUCTOS', activa: true, descripcion: 'Cancelación voluntaria o cierre de cuentas, tarjetas, créditos u otros productos' },
      { id: 'sub-prod-2', nombre: 'CONDICIONES DEL PRODUCTO', activa: true, descripcion: 'Consultas o reclamos sobre tasas, beneficios, restricciones o cambios de condiciones' },
      { id: 'sub-prod-3', nombre: 'ACTIVACIÓN DE PRODUCTOS', activa: true, descripcion: 'Activación de cuentas, tarjetas, tokens o habilitación para uso' }
    ]
  },
  {
    id: 'cat-gmf',
    nombre: 'GMF / 4X1000',
    descripcion: 'Gravamen a los Movimientos Financieros (4x1000)',
    activa: true,
    subcategorias: [
      { id: 'sub-gmf-1', nombre: 'COBRO', activa: true, descripcion: 'Reclamos por cobro o aplicación del 4x1000' },
      { id: 'sub-gmf-2', nombre: 'MARCACIÓN', activa: true, descripcion: 'Solicitud de marcación de cuenta como exenta' },
      { id: 'sub-gmf-3', nombre: 'DESMARCACIÓN', activa: true, descripcion: 'Solicitud de retiro de marcación o desmarcación de cuenta' },
      { id: 'sub-gmf-4', nombre: 'DEVOLUCIÓN', activa: true, descripcion: 'Solicitud de reintegro o devolución de GMF cobrado' }
    ]
  },
  {
    id: 'cat-transacciones',
    nombre: 'TRANSACCIONES',
    descripcion: 'Operaciones bancarias, transferencias, movimientos y saldos',
    activa: true,
    subcategorias: [
      { id: 'sub-tra-1', nombre: 'TRANSFERENCIAS', activa: true, descripcion: 'Transferencias rechazadas, no recibidas, retenidas, ACH o Bre-B' },
      { id: 'sub-tra-2', nombre: 'ACLARACIÓN DE TRANSACCIONES', activa: true, descripcion: 'Explicación de movimientos, notas débito/crédito o cobros transaccionales' },
      { id: 'sub-tra-3', nombre: 'SALDOS Y MOVIMIENTOS', activa: true, descripcion: 'Saldo incorrecto, dinero no reflejado o diferencias en balances' }
    ]
  },
  {
    id: 'cat-canales',
    nombre: 'CANALES DIGITALES',
    descripcion: 'Plataformas digitales, app móvil, portal transaccional y disponibilidad técnica',
    activa: true,
    subcategorias: [
      { id: 'sub-can-1', nombre: 'BANCA MÓVIL Y VIRTUAL', activa: true, descripcion: 'Problemas de usuario, contraseña, token, OTP, bloqueos de acceso' },
      { id: 'sub-can-2', nombre: 'FALLAS TECNOLÓGICAS', activa: true, descripcion: 'Errores en pantalla, caídas de sistema, lentitud o funciones caídas' }
    ]
  },
  {
    id: 'cat-pagos',
    nombre: 'PAGOS',
    descripcion: 'Procesamiento de pagos, pasarelas, convenios y débitos programados',
    activa: true,
    subcategorias: [
      { id: 'sub-pag-1', nombre: 'PSE', activa: true, descripcion: 'Operaciones, errores, compras, rechazos y soporte en pasarela PSE' },
      { id: 'sub-pag-2', nombre: 'DÉBITOS AUTOMÁTICOS', activa: true, descripcion: 'Inscripción, cancelación, débitos duplicados o no aplicados' },
      { id: 'sub-pag-3', nombre: 'PAGOS Y RECAUDOS', activa: true, descripcion: 'Pagos de servicios públicos, convenios o abonos a obligaciones' }
    ]
  },
  {
    id: 'cat-comisiones',
    nombre: 'COMISIONES Y COBROS',
    descripcion: 'Costos financieros, cuotas mensuales, comisiones y liquidación de cobros',
    activa: true,
    subcategorias: [
      { id: 'sub-com-1', nombre: 'CUOTA DE MANEJO', activa: true, descripcion: 'Cobro, reclamación, exoneración o devolución de cuota de manejo' },
      { id: 'sub-com-2', nombre: 'COMISIONES Y TARIFAS', activa: true, descripcion: 'Cobros operativos, tarifas de transferencias o comisiones por servicios' },
      { id: 'sub-com-3', nombre: 'INTERESES', activa: true, descripcion: 'Liquidación de intereses corrientes, de mora o tasas aplicadas' }
    ]
  },
  {
    id: 'cat-tarjetas',
    nombre: 'TARJETAS',
    descripcion: 'Tarjetas de crédito y débito, plásticos, beneficios y fidelización',
    activa: true,
    subcategorias: [
      { id: 'sub-tar-1', nombre: 'MILLAS Y PROGRAMAS DE LEALTAD', activa: true, descripcion: 'Acumulación de millas, puntos, canje de premios y beneficios' },
      { id: 'sub-tar-2', nombre: 'PLÁSTICO Y BLOQUEO', activa: true, descripcion: 'Envío de plástico, entrega, deterioro, bloqueo y cupo disponible' }
    ]
  },
  {
    id: 'cat-creditos',
    nombre: 'CRÉDITOS Y CARTERA',
    descripcion: 'Obligaciones crediticias, préstamos, cartera y acuerdos de pago',
    activa: true,
    subcategorias: [
      { id: 'sub-cre-1', nombre: 'ESTADO DE OBLIGACIÓN / SALDOS', activa: true, descripcion: 'Información de saldo pendiente, plan de pagos y cuotas' },
      { id: 'sub-cre-2', nombre: 'REFINANCIACIÓN Y ACUERDOS', activa: true, descripcion: 'Acuerdos de pago, reestructuración y reportes a centrales' }
    ]
  },
  {
    id: 'cat-seguros',
    nombre: 'SEGUROS',
    descripcion: 'Pólizas de seguro individuales o vinculadas a productos bancarios',
    activa: true,
    subcategorias: [
      { id: 'sub-seg-1', nombre: 'PÓLIZAS Y COBROS', activa: true, descripcion: 'Cobro de primas, pólizas de vida, desempleo o asociadas a crédito' },
      { id: 'sub-seg-2', nombre: 'CANCELACIÓN Y DEVOLUCIÓN', activa: true, descripcion: 'Cancelación, desistimiento o solicitud de reintegro de seguros' }
    ]
  },
  {
    id: 'cat-fraude',
    nombre: 'FRAUDE Y SEGURIDAD',
    descripcion: 'Transacciones no reconocidas, fraudes y seguridad de la información',
    activa: true,
    subcategorias: [
      { id: 'sub-fra-1', nombre: 'TRANSACCIONES NO RECONOCIDAS', activa: true, descripcion: 'Compras, débitos, retiros o transferencias no autorizadas por el titular' },
      { id: 'sub-fra-2', nombre: 'SUPLANTACIÓN Y CLONACIÓN', activa: true, descripcion: 'Suplantación de identidad, clonación de tarjeta o estafa' }
    ]
  },
  {
    id: 'cat-documentos',
    nombre: 'DOCUMENTOS Y CERTIFICACIONES',
    descripcion: 'Emisión y envío de documentos bancarios formales',
    activa: true,
    subcategorias: [
      { id: 'sub-doc-1', nombre: 'CERTIFICADOS Y PAZ Y SALVO', activa: true, descripcion: 'Expedición de paz y salvo, certificados tributarios y bancarios' },
      { id: 'sub-doc-2', nombre: 'EXTRACTOS Y DOCUMENTOS', activa: true, descripcion: 'Copias de pagarés, contratos o extractos históricos' }
    ]
  },
  {
    id: 'cat-servicio',
    nombre: 'SERVICIO Y ATENCIÓN',
    descripcion: 'Calidad de atención humana y tiempos de respuesta de la entidad',
    activa: true,
    subcategorias: [
      { id: 'sub-ser-1', nombre: 'ATENCIÓN ASESOR Y SUCURSAL', activa: true, descripcion: 'Inconformidad con el trato o asesoría recibida en oficina o canales' },
      { id: 'sub-ser-2', nombre: 'TIEMPOS DE RESPUESTA', activa: true, descripcion: 'Demoras injustificadas en trámites o respuesta a solicitudes previas' }
    ]
  },
  {
    id: 'cat-otras',
    nombre: 'OTRAS',
    descripcion: 'Casos atípicos que de manera fundamentada no corresponden a ningún gran tema',
    activa: true,
    subcategorias: [
      { id: 'sub-otr-1', nombre: 'CASOS ATÍPICOS', activa: true, descripcion: 'Situaciones no estándar clasificables de forma individual' }
    ]
  },
  {
    id: 'cat-revision',
    nombre: 'REVISIÓN HUMANA',
    descripcion: 'Casos estrictamente sin información analizable o texto ininteligible',
    activa: true,
    subcategorias: [
      { id: 'sub-rev-1', nombre: 'INFORMACIÓN INSUFICIENTE', activa: true, descripcion: 'Descripción vacía, solo título o texto ilegible' }
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
      return `- ${c.nombre}: ${c.descripcion}. Subcategorías de intención: [${subs}]`;
    })
    .join('\n');
}
