import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EnrichedPQRSRecord, CategoryItem, SemanticGroup } from '../src/types';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false }
      });
    } catch (err) {
      console.error('Error initializing Supabase client:', err);
      return null;
    }
  }

  return supabaseClient;
}

export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'Variables de entorno SUPABASE_URL o SUPABASE_KEY no configuradas en el servidor. La plataforma opera con almacenamiento en memoria/local persistente.'
    };
  }

  try {
    const { data, error } = await client.from('categorias').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Error al consultar Supabase: ${error.message}. Por favor verifique haber ejecutado el script SQL en Supabase SQL Editor.`,
        details: error
      };
    }
    return {
      connected: true,
      message: 'Conexión exitosa a Supabase PostgreSQL y tablas accesibles.',
      details: data
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Error de red o configuración con Supabase: ${err.message}`
    };
  }
}

export async function saveRecordsToSupabase(records: EnrichedPQRSRecord[]): Promise<{ success: boolean; savedCount: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    // Graceful no-op when Supabase not connected
    return { success: true, savedCount: 0 };
  }

  try {
    // 1. Upsert expedientes
    const expedientesRows = records.map(r => ({
      id: r.id,
      numero_expediente: r.numero_expediente,
      resumen_original: r.resumen_original,
      descripcion_original: r.descripcion_original,
      archivo_origen: r.archivo_origen || 'Carga manual',
      hash_descripcion: r.hash_descripcion,
      estado_procesamiento: r.estado_procesamiento || 'COMPLETADO',
      updated_at: new Date().toISOString()
    }));

    const { error: expError } = await client.from('expedientes').upsert(expedientesRows, { onConflict: 'id' });
    if (expError) throw expError;

    // 2. Upsert analisis_expedientes
    const analisisRows = records
      .filter(r => r.analisis)
      .map(r => {
        const a = r.analisis!;
        return {
          id: `ana_${r.id}`,
          expediente_id: r.id,
          tema_principal: a.tema_principal,
          subtema: a.subtema,
          producto: a.producto,
          problema_principal: a.problema_principal,
          solicitud_cliente: a.solicitud_cliente,
          categoria: a.categoria,
          subcategoria: a.subcategoria,
          resumen_normalizado: a.resumen_normalizado,
          justificacion: a.justificacion,
          confianza: a.confianza,
          nivel_confianza: a.nivel_confianza,
          posible_inconsistencia: a.posible_inconsistencia,
          requiere_revision: a.requiere_revision,
          estado_revision: a.estado_revision || 'PENDIENTE',
          categoria_humana: a.categoria_humana || null,
          subcategoria_humana: a.subcategoria_humana || null,
          resumen_humano: a.resumen_humano || null,
          modelo_ia: a.modelo_ia || 'gemini-3.8-flash',
          updated_at: new Date().toISOString()
        };
      });

    if (analisisRows.length > 0) {
      const { error: anaError } = await client.from('analisis_expedientes').upsert(analisisRows, { onConflict: 'id' });
      if (anaError) throw anaError;
    }

    return { success: true, savedCount: records.length };
  } catch (err: any) {
    console.error('Error guardando en Supabase:', err);
    return { success: false, savedCount: 0, error: err.message };
  }
}
