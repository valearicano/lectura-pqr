-- ==============================================================================
-- PLATAFORMA INTELIGENTE DE ANÁLISIS Y CATEGORIZACIÓN DE PQRS
-- Supabase / PostgreSQL Schema & Vector Support (Section 30)
-- ==============================================================================

-- 1. Optional: Enable pgvector extension if available in your PostgreSQL / Supabase instance
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla: categorias (Catálogo oficial y configurable de categorías y subcategorías)
CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria_padre_id TEXT REFERENCES categorias(id) ON DELETE SET NULL,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla: expedientes (Inventario original ingresado sin alterar datos originales)
CREATE TABLE IF NOT EXISTS expedientes (
    id TEXT PRIMARY KEY,
    numero_expediente VARCHAR(120) NOT NULL,
    resumen_original TEXT,
    descripcion_original TEXT NOT NULL,
    fecha_carga TIMESTAMPTZ DEFAULT NOW(),
    archivo_origen VARCHAR(255),
    hash_descripcion VARCHAR(128),
    estado_procesamiento VARCHAR(50) DEFAULT 'PENDIENTE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expedientes_numero ON expedientes(numero_expediente);
CREATE INDEX IF NOT EXISTS idx_expedientes_hash ON expedientes(hash_descripcion);

-- 4. Tabla: analisis_expedientes (Resultados del Lector Inteligente PQRS de Gemini)
CREATE TABLE IF NOT EXISTS analisis_expedientes (
    id TEXT PRIMARY KEY,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    tema_principal VARCHAR(150),
    subtema VARCHAR(150),
    producto VARCHAR(150) DEFAULT 'NO IDENTIFICADO',
    problema_principal TEXT,
    solicitud_cliente TEXT,
    categoria VARCHAR(150) NOT NULL,
    subcategoria VARCHAR(150),
    resumen_normalizado TEXT,
    justificacion TEXT,
    confianza NUMERIC(5,2),
    nivel_confianza VARCHAR(20), -- 'Alta', 'Media', 'Baja'
    posible_inconsistencia BOOLEAN DEFAULT false,
    requiere_revision BOOLEAN DEFAULT false,
    estado_revision VARCHAR(50) DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'APROBADO', 'MODIFICADO', 'NO_APLICA'
    categoria_humana VARCHAR(150),
    subcategoria_humana VARCHAR(150),
    resumen_humano TEXT,
    notas_revision TEXT,
    usuario_revision VARCHAR(120),
    modelo_ia VARCHAR(80) DEFAULT 'gemini-3.8-flash',
    version_prompt VARCHAR(50) DEFAULT 'v1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analisis_expediente_id ON analisis_expedientes(expediente_id);
CREATE INDEX IF NOT EXISTS idx_analisis_categoria ON analisis_expedientes(categoria);
CREATE INDEX IF NOT EXISTS idx_analisis_revision ON analisis_expedientes(requiere_revision, estado_revision);
CREATE INDEX IF NOT EXISTS idx_analisis_inconsistencia ON analisis_expedientes(posible_inconsistencia);

-- 5. Tabla: grupos_semanticos (Clustering de expedientes por similitud)
CREATE TABLE IF NOT EXISTS grupos_semanticos (
    id TEXT PRIMARY KEY, -- e.g. GRP-001
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria_id TEXT REFERENCES categorias(id) ON DELETE SET NULL,
    cantidad_expedientes INT DEFAULT 0,
    similitud_promedio NUMERIC(5,4),
    similitud_minima NUMERIC(5,4),
    similitud_maxima NUMERIC(5,4),
    es_nuevo_patron BOOLEAN DEFAULT false,
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla: expediente_grupo (Relación M:1 entre expedientes y grupos semánticos)
CREATE TABLE IF NOT EXISTS expediente_grupo (
    id TEXT PRIMARY KEY,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    grupo_id TEXT NOT NULL REFERENCES grupos_semanticos(id) ON DELETE CASCADE,
    similitud NUMERIC(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expediente_grupo_exp ON expediente_grupo(expediente_id);
CREATE INDEX IF NOT EXISTS idx_expediente_grupo_grp ON expediente_grupo(grupo_id);

-- 7. Tabla: embeddings (Almacenamiento de vectores para búsquedas semánticas eficientes)
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    modelo VARCHAR(80) DEFAULT 'gemini-embedding-2-preview',
    embedding JSONB, -- O tipo vector(768) si pgvector está habilitado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_expediente ON embeddings(expediente_id);

-- 8. Tabla: auditoria_revisiones (Trazabilidad humana, Section 40)
CREATE TABLE IF NOT EXISTS auditoria_revisiones (
    id TEXT PRIMARY KEY,
    expediente_id TEXT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    usuario VARCHAR(120),
    categoria_anterior VARCHAR(150),
    categoria_nueva VARCHAR(150),
    subcategoria_anterior VARCHAR(150),
    subcategoria_nueva VARCHAR(150),
    motivo_cambio TEXT,
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Row Level Security (RLS) (Section 31)
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis_expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_semanticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_revisiones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para usuarios autenticados / anónimos según rol
CREATE POLICY "Lectura permitida para usuarios autorizados" ON expedientes FOR SELECT USING (true);
CREATE POLICY "Escritura de expedientes autenticados" ON expedientes FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Lectura analisis" ON analisis_expedientes FOR SELECT USING (true);
CREATE POLICY "Escritura analisis" ON analisis_expedientes FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Lectura categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Modificacion categorias administradores" ON categorias FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Lectura grupos" ON grupos_semanticos FOR SELECT USING (true);
CREATE POLICY "Escritura grupos" ON grupos_semanticos FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Población inicial de categorías oficiales
INSERT INTO categorias (id, nombre, descripcion) VALUES
('PAGOS', 'PAGOS', 'Gestión de pagos, abonos, convenios y medios de pago'),
('COBROS', 'COBROS', 'Cobro de intereses, comisiones, cuotas de manejo y saldos'),
('SEGUROS', 'SEGUROS', 'Pólizas de seguro, cobros de primas y cancelaciones'),
('APLICATIVOS Y CANALES', 'APLICATIVOS Y CANALES', 'Fallas en App móvil, sitio web, accesos y canales digitales'),
('FRAUDE Y SEGURIDAD', 'FRAUDE Y SEGURIDAD', 'Suplantación, cargos no reconocidos y temas de seguridad'),
('DERECHOS Y PQRS', 'DERECHOS Y PQRS', 'Derecho de petición, peticiones, quejas y reclamos normativos'),
('OTROS', 'OTROS', 'Casos no identificados, información insuficiente o revisión humana')
ON CONFLICT (id) DO NOTHING;
