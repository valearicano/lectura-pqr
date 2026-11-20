export interface PQRSRecord {
  id: string; // unique internal ID
  numero_expediente: string;
  resumen_original: string;
  descripcion_original: string;
  descripcion_normalizada?: string;
  fecha_carga?: string;
  archivo_origen?: string;
  hash_descripcion?: string;
  columnas_adicionales?: Record<string, any>;
  estado_procesamiento?: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
}

export const CATEGORIAS_OPERATIVAS = [
  'SEGUROS',
  'CUOTAS DE MANEJO',
  'HONORARIOS Y GASTOS DE COBRANZA',
  'PSE',
  'GMF',
  'EMBARGOS DE CUENTAS',
  'FRAUDE / SUPLANTACIÓN',
  'MOVIMIENTOS NO RECONOCIDOS',
  'APLICACIÓN DE PAGO',
  'COBRO DE INTERESES',
  'ERROR EN APLICATIVOS',
  'DERECHOS DE PETICIÓN',
  'CDT',
  'GT5',
  'FRAUDES',
  'CUOTA DE MANEJO',
  'TRANSFERENCIAS',
  'PAGOS / ABONOS',
  'CANALES DIGITALES',
  'TARJETAS',
  'CRÉDITOS / CARTERA',
  'CARTERA / CRÉDITOS',
  'CONDICIONES',
  'PRODUCTOS',
  'COMISIONES Y COBROS',
  'INFORMACIÓN Y DOCUMENTOS',
  'EMBARGOS',
  'ACTUALIZACIÓN DE DATOS',
  'SERVICIO / ATENCIÓN',
  'OTRAS SOLICITUDES',
  'OTRAS',
  'INFORMACIÓN INSUFICIENTE',
  'REVISIÓN HUMANA'
] as const;

export const CATEGORIAS_MAESTRAS_16 = [
  'SEGUROS',
  'CUOTAS DE MANEJO',
  'HONORARIOS Y GASTOS DE COBRANZA',
  'PSE',
  'GMF',
  'EMBARGOS DE CUENTAS',
  'FRAUDE / SUPLANTACIÓN',
  'MOVIMIENTOS NO RECONOCIDOS',
  'APLICACIÓN DE PAGO',
  'COBRO DE INTERESES',
  'ERROR EN APLICATIVOS',
  'DERECHOS DE PETICIÓN',
  'CDT',
  'GT5',
  'TRANSFERENCIAS',
  'PAGOS / ABONOS',
  'CANALES DIGITALES',
  'TARJETAS',
  'CRÉDITOS / CARTERA',
  'CARTERA / CRÉDITOS',
  'CONDICIONES',
  'PRODUCTOS',
  'COMISIONES Y COBROS',
  'INFORMACIÓN Y DOCUMENTOS',
  'SERVICIO / ATENCIÓN',
  'OTRAS',
  'REVISIÓN HUMANA',
  // Aliases for historical backwards compatibility
  'FRAUDES',
  'CUOTA DE MANEJO',
  'EMBARGOS',
  'GMF / 4X1000',
  'FRAUDE / NO RECONOCIDO',
  'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
  'PROBLEMAS TRANSACCIONES',
  'COBROS / CARGOS',
  'DATOS / INFORMACIÓN',
  'CUENTAS'
] as const;

export const CATEGORIAS_OFICIALES_16 = CATEGORIAS_MAESTRAS_16;

export type CategoriaPQR16 = typeof CATEGORIAS_OPERATIVAS[number] | typeof CATEGORIAS_MAESTRAS_16[number] | string;

export type TipoPQR = 'PETICIÓN' | 'QUEJA' | 'RECLAMO' | 'SOLICITUD';

export type SentimientoPQR = 'positivo' | 'negativo' | 'neutro';

export type TipoCasoSFC = 'Solicitud' | 'Reclamo';

export type OrigenClasificacion =
  | 'CLASIFICACION_INICIAL'
  | 'RECUPERADO_SEGUNDA_VALIDACION'
  | 'CONFIRMADO_OTRAS';

export interface SegundaValidacionOtrasInfo {
  ejecutada: boolean;
  estado: 'NO_APLICA' | 'RECUPERADO' | 'CONFIRMADO_OTRAS' | 'ERROR_CONSERVADO_OTRAS';
  categoria_inicial: string;
  subcategoria_inicial: string;
  categoria_final: string;
  subcategoria_final: string;
  motivo_permanencia_otras?: string;
  resultado_validacion: string;
  evidencia_validacion?: string;
  motivo_revision_humana?: string;
  error_api?: string;
  fecha_validacion?: string;
}

export interface GeminiStageUsage {
  llamadas: number;
  expedientes_enviados: number;
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  errores: number;
}

export interface BatchTelemetryMetrics {
  llamadas_gemini_total: number;
  llamadas_clasificacion_inicial: number;
  llamadas_tipo_caso: number;
  llamadas_segunda_validacion_otras: number;
  cache_hits: number;
  tokens: {
    disponible: boolean;
    prompt_tokens: number;
    candidates_tokens: number;
    total_tokens: number;
  };
  por_etapa: {
    clasificacion_inicial: GeminiStageUsage;
    tipo_caso: GeminiStageUsage;
    segunda_validacion_otras: GeminiStageUsage;
  };
  errores_segunda_validacion: string[];
}

export interface PQRSAnalysis {
  numero_expediente: string;
  // Core user-requested fields
  categoria: CategoriaPQR16 | string;
  categoria_principal?: string;
  subcategoria: string;
  tipo_caso?: TipoCasoSFC;
  sentimiento?: SentimientoPQR;
  resumen_requerimiento?: string;
  intencion_cliente?: string;
  confianza: number; // 0 to 100
  requiere_revision_humana: boolean | 'SI' | 'NO';
  producto?: string;
  tipo_pqr?: TipoPQR;
  motivo?: string;
  submotivo?: string;
  que_solicita_exactamente?: string;
  hechos_principales?: string;
  sustento_clasificacion?: string;
  motivo_de_revision?: string;
  existe_inconsistencia?: 'SI' | 'NO';
  evidencia_textual?: string;
  evidencia_clasificacion?: string;
  producto_detectado?: string;
  categoria_ia?: string;
  subcategoria_ia?: string;
  propuesta_respuesta?: string;
  // Informational tags only (never alter classification or Excel export)
  etiquetas_informativas?: string[];
  // Internal traceability for selective second-pass OTRAS validation (never exported to Excel)
  origen_clasificacion?: OrigenClasificacion;
  segunda_validacion_otras?: SegundaValidacionOtrasInfo;

  // Classical & structured fields (compatible with all views)
  tema_principal: string;
  subtema: string;
  problema_principal: string;
  solicitud_cliente: string;
  resumen_normalizado: string;
  justificacion: string;
  nivel_confianza: 'Alta' | 'Media' | 'Baja';
  requiere_revision: boolean;
  posible_inconsistencia: boolean;
  motivo_inconsistencia?: string;
  modelo_ia?: string;
  version_prompt?: string;
  fecha_analisis?: string;
  // Human review state
  estado_revision?: 'PENDIENTE' | 'APROBADO' | 'MODIFICADO' | 'AJUSTADO' | 'NO_APLICA';
  categoria_humana?: string;
  subcategoria_humana?: string;
  resumen_humano?: string;
  notas_revision?: string;
  usuario_revision?: string;
  revisado_por?: string;
  fecha_revision?: string;
}

export interface PQRSMainCategory {
  id: string;
  nombre: string;
  descripcion: string;
  subcategorias: string[];
  activa: boolean;
}


export interface SemanticGroup {
  id: string; // e.g. GRP-001
  nombre: string;
  categoria_sugerida: string;
  cantidad_expedientes: number;
  similitud_minima: number;
  similitud_maxima: number;
  similitud_promedio: number;
  expedientes_ids: string[];
  ejemplos_descripciones: string[];
  es_nuevo_patron: boolean;
  descripcion_patron?: string;
  aprobado_por_usuario?: boolean;
}

export interface EnrichedPQRSRecord extends PQRSRecord {
  analisis?: PQRSAnalysis;
  grupo_id?: string;
  similitud_grupo?: number;
  embedding?: number[];
}

export interface CategoryItem {
  id: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  subcategorias: SubcategoryItem[];
}

export interface SubcategoryItem {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface ColumnDetectionResult {
  expedienteCol: string;
  resumenCol: string;
  descripcionCol: string;
  submotivoCol?: string;
  productoCol?: string;
  fechaRadicacionCol?: string;
  fechaCompromisoCol?: string;
  todasLasColumnas: string[];
  confianzaDeteccion: {
    expediente: boolean;
    resumen: boolean;
    descripcion: boolean;
    submotivo?: boolean;
    producto?: boolean;
    fechaRadicacion?: boolean;
    fechaCompromiso?: boolean;
  };
}

export interface ValidationSummary {
  totalFilas: number;
  totalColumnas: number;
  filasValidas: number;
  filasConError: number;
  filasSinDescripcion: number;
  filasSinExpediente: number;
  filasDuplicadas: number;
  registrosValidos: PQRSRecord[];
  registrosConError: {
    fila: number;
    numero_expediente?: string;
    error: string;
    datosBrutos: any;
  }[];
}

export interface SimilarityThresholds {
  alta: number; // default 0.90
  fuerte: number; // default 0.80
  media: number; // default 0.70
  baja: number; // < 0.70
}

export interface ProcessStatus {
  id: string;
  estado:
    | 'IDLE'
    | 'UPLOADED'
    | 'VALIDATING'
    | 'PROCESSING'
    | 'EMBEDDING'
    | 'GROUPING'
    | 'VALIDATING_RESULTS'
    | 'COMPLETED'
    | 'COMPLETED_WITH_WARNINGS'
    | 'FAILED';
  totalExpedientes: number;
  expedientesProcesados: number;
  loteActual: number;
  totalLotes: number;
  faseActual: string;
  porcentaje: number;
  errores: string[];
  archivoNombre: string;
  iniciadoEn?: string;
  finalizadoEn?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  connected: boolean;
  lastSync?: string;
}
