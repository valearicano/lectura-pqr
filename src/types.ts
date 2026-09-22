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

export interface PQRSAnalysis {
  numero_expediente: string;
  tema_principal: string;
  subtema: string;
  producto: string;
  problema_principal: string;
  solicitud_cliente: string;
  categoria: string;
  subcategoria: string;
  resumen_normalizado: string;
  justificacion: string;
  confianza: number; // 0 to 100
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
  todasLasColumnas: string[];
  confianzaDeteccion: {
    expediente: boolean;
    resumen: boolean;
    descripcion: boolean;
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
