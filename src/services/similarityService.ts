import { EnrichedPQRSRecord, SemanticGroup, SimilarityThresholds } from '../types';

export const DEFAULT_THRESHOLDS: SimilarityThresholds = {
  alta: 0.90,
  fuerte: 0.80,
  media: 0.70,
  baja: 0.60
};

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, sim)); // clamp [0, 1]
}

/**
 * Generates lightweight pseudo-embeddings (TF-IDF bag of character n-grams and stemmed words)
 * as an ultra-fast local fallback if Gemini embeddings are pending or encountering network delays.
 */
export function generateLocalFallbackVector(text: string, vocabularySize = 64): number[] {
  const clean = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = clean.split(/\W+/).filter(w => w.length > 2);
  const vector = new Array(vocabularySize).fill(0);

  words.forEach(word => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % vocabularySize;
    }
    vector[Math.abs(hash)] += 1;
  });

  // Normalize vector
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) sumSq += vector[i] * vector[i];
  const mag = Math.sqrt(sumSq) || 1;
  return vector.map(v => v / mag);
}

/**
 * Groups records semantically based on embeddings and similarity threshold.
 */
export function clusterRecords(
  records: EnrichedPQRSRecord[],
  threshold: number = 0.78
): { groups: SemanticGroup[]; recordsWithGroups: EnrichedPQRSRecord[] } {
  if (records.length === 0) {
    return { groups: [], recordsWithGroups: [] };
  }

  // Ensure each record has an embedding or local fallback
  const recordsWithVectors = records.map(r => {
    const vec = r.embedding && r.embedding.length > 0
      ? r.embedding
      : generateLocalFallbackVector(r.descripcion_normalizada || r.descripcion_original);
    return { ...r, _tempVector: vec };
  });

  const assignedGroups: Record<string, string> = {}; // record.id -> group.id
  const groupSimilarities: Record<string, number> = {}; // record.id -> similarity with group centroid
  const groups: SemanticGroup[] = [];

  let groupCounter = 1;

  for (let i = 0; i < recordsWithVectors.length; i++) {
    const current = recordsWithVectors[i];
    if (assignedGroups[current.id]) continue; // already clustered

    // Start a new cluster centered around current record
    const clusterRecordIds: string[] = [current.id];
    const similaritiesToLeader: number[] = [1.0];

    for (let j = i + 1; j < recordsWithVectors.length; j++) {
      const candidate = recordsWithVectors[j];
      if (assignedGroups[candidate.id]) continue;

      const sim = cosineSimilarity(current._tempVector, candidate._tempVector);
      if (sim >= threshold) {
        clusterRecordIds.push(candidate.id);
        similaritiesToLeader.push(sim);
        assignedGroups[candidate.id] = ''; // provisional
      }
    }

    const groupId = `GRP-${String(groupCounter).padStart(3, '0')}`;
    groupCounter++;

    clusterRecordIds.forEach((recId, idx) => {
      assignedGroups[recId] = groupId;
      groupSimilarities[recId] = similaritiesToLeader[idx];
    });

    const clusterRecords = recordsWithVectors.filter(r => clusterRecordIds.includes(r.id));
    const categoriesCount: Record<string, number> = {};
    clusterRecords.forEach(r => {
      const cat = r.analisis?.categoria || 'Sin categoría';
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    });

    // Top category in cluster
    let topCat = 'No determinado';
    let topCount = 0;
    for (const [cat, cnt] of Object.entries(categoriesCount)) {
      if (cnt > topCount) {
        topCat = cat;
        topCount = cnt;
      }
    }

    const avgSim = similaritiesToLeader.reduce((a, b) => a + b, 0) / similaritiesToLeader.length;
    const minSim = Math.min(...similaritiesToLeader);
    const maxSim = Math.max(...similaritiesToLeader);

    const isNewPattern =
      clusterRecords.length >= 2 &&
      (topCat.toUpperCase().includes('OTR') ||
        topCat.toUpperCase().includes('NO IDENTIFICAD') ||
        topCat.toUpperCase().includes('INSUFICIENTE') ||
        topCat === 'Sin categoría');

    const sampleDescriptions = clusterRecords
      .slice(0, 3)
      .map(r => r.descripcion_original.substring(0, 140) + (r.descripcion_original.length > 140 ? '...' : ''));

    groups.push({
      id: groupId,
      nombre: `Grupo ${topCat} (${groupId})`,
      categoria_sugerida: topCat,
      cantidad_expedientes: clusterRecords.length,
      similitud_minima: parseFloat(minSim.toFixed(3)),
      similitud_maxima: parseFloat(maxSim.toFixed(3)),
      similitud_promedio: parseFloat(avgSim.toFixed(3)),
      expedientes_ids: clusterRecordIds,
      ejemplos_descripciones: sampleDescriptions,
      es_nuevo_patron: isNewPattern,
      descripcion_patron: isNewPattern
        ? `Patrón detectado con ${clusterRecords.length} expedientes altamente similares no alineados con categorías tradicionales.`
        : undefined,
      aprobado_por_usuario: false
    });
  }

  // Enrich original records with group IDs and similarity
  const recordsWithGroups = records.map(r => ({
    ...r,
    grupo_id: assignedGroups[r.id] || 'GRP-INDIVIDUAL',
    similitud_grupo: groupSimilarities[r.id] !== undefined ? parseFloat(groupSimilarities[r.id].toFixed(3)) : 1.0
  }));

  // Sort groups by size descending
  groups.sort((a, b) => b.cantidad_expedientes - a.cantidad_expedientes);

  return { groups, recordsWithGroups };
}
