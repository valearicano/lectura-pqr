import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ArrowRight, 
  Sparkles, 
  Download,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { parseExcelFile, exportEnrichedExcel } from '../services/excelService';
import { detectColumns } from '../services/columnDetector';
import { validateRecords } from '../services/dataValidator';
import { clusterRecords } from '../services/similarityService';
import { SAMPLE_PQRS_DATA } from '../services/sampleData';
import { 
  ColumnDetectionResult, 
  EnrichedPQRSRecord, 
  ValidationSummary, 
  ProcessStatus,
  SemanticGroup 
} from '../types';

interface UploadViewProps {
  onProcessingCompleted: (records: EnrichedPQRSRecord[], groups: SemanticGroup[]) => void;
  onNavigate: (tab: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onProcessingCompleted, onNavigate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [detection, setDetection] = useState<ColumnDetectionResult | null>(null);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [showErrorRows, setShowErrorRows] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ProcessStatus | null>(null);
  const [completedRecords, setCompletedRecords] = useState<EnrichedPQRSRecord[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle File Selection
  const handleFile = async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setCompletedRecords(null);

      const parsed = await parseExcelFile(selectedFile);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Auto detect columns
      const detected = detectColumns(parsed.headers);
      setDetection(detected);

      // Validate records
      const validated = validateRecords(
        parsed.rows,
        detected.expedienteCol,
        detected.resumenCol,
        detected.descripcionCol,
        selectedFile.name
      );
      setValidation(validated);
    } catch (err: any) {
      alert(`Error al leer el archivo: ${err.message}`);
    }
  };

  // 2. Load Sample Data button
  const handleLoadSample = () => {
    const sampleHeaders = ['numero_expediente', 'resumen', 'descripcion_radicacion'];
    const sampleRows = SAMPLE_PQRS_DATA.map(item => ({
      numero_expediente: item.numero_expediente,
      resumen: item.resumen_original,
      descripcion_radicacion: item.descripcion_original
    }));

    setFileName('PQRS_Inventario_Bancario_Demo.xlsx');
    setHeaders(sampleHeaders);
    setRawRows(sampleRows);

    const detected = detectColumns(sampleHeaders);
    setDetection(detected);

    const validated = validateRecords(
      sampleRows,
      detected.expedienteCol,
      detected.resumenCol,
      detected.descripcionCol,
      'PQRS_Inventario_Bancario_Demo.xlsx'
    );
    setValidation(validated);
    setCompletedRecords(null);
  };

  // 3. Manual Column Selector change
  const handleColumnChange = (field: 'expediente' | 'resumen' | 'descripcion', colName: string) => {
    if (!detection) return;
    const updated: ColumnDetectionResult = {
      ...detection,
      expedienteCol: field === 'expediente' ? colName : detection.expedienteCol,
      resumenCol: field === 'resumen' ? colName : detection.resumenCol,
      descripcionCol: field === 'descripcion' ? colName : detection.descripcionCol
    };
    setDetection(updated);

    // Re-validate with new column mappings
    const validated = validateRecords(
      rawRows,
      updated.expedienteCol,
      updated.resumenCol,
      updated.descripcionCol,
      fileName
    );
    setValidation(validated);
  };

  // 4. Start Intelligent Processing Pipeline
  const handleStartAnalysis = async () => {
    if (!validation || validation.registrosValidos.length === 0) {
      alert('No hay registros válidos para procesar.');
      return;
    }

    setIsProcessing(true);
    const validRecords = validation.registrosValidos;
    const batchSize = 10;
    const totalBatches = Math.ceil(validRecords.length / batchSize);

    const processStatus: ProcessStatus = {
      id: `proc_${Date.now()}`,
      estado: 'PROCESSING',
      totalExpedientes: validRecords.length,
      expedientesProcesados: 0,
      loteActual: 1,
      totalLotes: totalBatches,
      faseActual: 'Iniciando lectura inteligente con IA...',
      porcentaje: 5,
      errores: [],
      archivoNombre: fileName,
      iniciadoEn: new Date().toISOString()
    };
    setCurrentProgress({ ...processStatus });

    const analyzedRecords: EnrichedPQRSRecord[] = [];

    try {
      // Step A: Process batches with Gemini Analysis
      for (let i = 0; i < totalBatches; i++) {
        const batch = validRecords.slice(i * batchSize, (i + 1) * batchSize);
        const currentBatchNum = i + 1;

        processStatus.loteActual = currentBatchNum;
        processStatus.faseActual = `Lectura IA: Procesando lote ${currentBatchNum} de ${totalBatches} (${batch.length} casos)...`;
        processStatus.porcentaje = Math.round(10 + (i / totalBatches) * 60);
        setCurrentProgress({ ...processStatus });

        const payload = batch.map(r => ({
          numero_expediente: r.numero_expediente,
          resumen_original: r.resumen_original,
          descripcion_original: r.descripcion_normalizada || r.descripcion_original,
          hash_descripcion: r.hash_descripcion
        }));

        try {
          const res = await fetch('/api/analyze-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: payload })
          });
          const data = await res.json();

          if (data.success && Array.isArray(data.analyses)) {
            batch.forEach((rec, idx) => {
              const analysis = data.analyses[idx];
              analyzedRecords.push({
                ...rec,
                analisis: analysis,
                estado_procesamiento: 'COMPLETADO'
              });
            });
          } else {
            throw new Error(data.error || 'Error en respuesta de análisis');
          }
        } catch (batchErr: any) {
          console.error(`Error en lote ${currentBatchNum}:`, batchErr);
          processStatus.errores.push(`Lote ${currentBatchNum}: ${batchErr.message}`);
          // Keep records with manual review flag
          batch.forEach(rec => {
            analyzedRecords.push({
              ...rec,
              analisis: {
                numero_expediente: rec.numero_expediente,
                tema_principal: 'OTROS',
                subtema: 'Pendiente de análisis',
                producto: 'NO IDENTIFICADO',
                problema_principal: 'Falla temporal al procesar lote',
                solicitud_cliente: 'Revisión requerida',
                categoria: 'OTROS',
                subcategoria: 'Revisión humana',
                resumen_normalizado: `Expediente ${rec.numero_expediente} pendiente`,
                justificacion: 'Error durante la llamada a IA.',
                confianza: 50,
                nivel_confianza: 'Baja',
                requiere_revision: true,
                posible_inconsistencia: false,
                modelo_ia: 'gemini-3.8-flash',
                fecha_analisis: new Date().toISOString(),
                estado_revision: 'PENDIENTE'
              }
            });
          });
        }

        processStatus.expedientesProcesados = analyzedRecords.length;
        setCurrentProgress({ ...processStatus });
      }

      // Step B: Calculate Embeddings & Semantic Similarity
      processStatus.faseActual = 'Generando embeddings semánticos y calculando similitud...';
      processStatus.porcentaje = 75;
      processStatus.estado = 'EMBEDDING';
      setCurrentProgress({ ...processStatus });

      // Request embeddings from server in batch
      try {
        const textDescriptions = analyzedRecords.map(r => r.descripcion_normalizada || r.descripcion_original);
        const embRes = await fetch('/api/embeddings-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textDescriptions })
        });
        const embData = await embRes.json();
        if (embData.success && Array.isArray(embData.embeddings)) {
          analyzedRecords.forEach((rec, idx) => {
            rec.embedding = embData.embeddings[idx];
          });
        }
      } catch (embErr) {
        console.warn('Embeddings fallback local activado:', embErr);
      }

      // Step C: Cluster and group records
      processStatus.faseActual = 'Agrupando expedientes con problemáticas similares...';
      processStatus.porcentaje = 88;
      processStatus.estado = 'GROUPING';
      setCurrentProgress({ ...processStatus });

      const { groups, recordsWithGroups } = clusterRecords(analyzedRecords, 0.78);

      // Step D: Sync with Supabase (if configured)
      processStatus.faseActual = 'Sincronizando expedientes con base de datos...';
      processStatus.porcentaje = 95;
      setCurrentProgress({ ...processStatus });

      try {
        await fetch('/api/supabase/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: recordsWithGroups })
        });
      } catch (dbErr) {
        console.warn('Sync con Supabase no completada (modo local activo):', dbErr);
      }

      // Step E: Complete
      processStatus.faseActual = 'Procesamiento finalizado exitosamente.';
      processStatus.porcentaje = 100;
      processStatus.estado = processStatus.errores.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';
      processStatus.finalizadoEn = new Date().toISOString();
      setCurrentProgress({ ...processStatus });
      setIsProcessing(false);
      setCompletedRecords(recordsWithGroups);

      // Dispatch results to parent
      onProcessingCompleted(recordsWithGroups, groups);
    } catch (generalErr: any) {
      console.error('Fallo en el pipeline general:', generalErr);
      processStatus.estado = 'FAILED';
      processStatus.faseActual = `Error fatal: ${generalErr.message}`;
      setCurrentProgress({ ...processStatus });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Instructions */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Carga y Validación de Archivo PQRS</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sube inventarios históricos en formato <strong>.xlsx</strong>, <strong>.xls</strong> o <strong>.csv</strong>. 
          El sistema detectará automáticamente las columnas clave y separará los registros con inconsistencias de formato.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        id="drop-zone-excel"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all shadow-sm group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          {file ? `Archivo seleccionado: ${file.name}` : 'Arrastra y suelta tu archivo Excel o CSV aquí'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Formatos compatibles: XLSX, XLS, CSV. Sin límite estricto de filas por procesamiento por lotes.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-500">
            Seleccionar archivo desde el computador
          </span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleLoadSample();
            }}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold border border-slate-300 flex items-center"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Cargar 15 Casos de Prueba Reales
          </button>
        </div>
      </div>

      {/* Validation & Column Detection Panel (visible when file or sample loaded) */}
      {detection && validation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Archivo Listo Para Validación</span>
              <h3 className="text-lg font-bold text-slate-900">{fileName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                {validation.totalFilas} Filas
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md">
                {validation.totalColumnas} Columnas
              </span>
            </div>
          </div>

          {/* Column Mapping Selectors */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Detección y Asignación de Columnas Clave</h4>
            <p className="text-xs text-slate-500 mb-4">
              Verifica que cada rol apunte a la columna correspondiente de tu archivo. Puedes cambiarlas si la detección automática difiere.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Expediente col */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Número de Expediente / Radicado:
                </label>
                <select
                  value={detection.expedienteCol}
                  onChange={e => handleColumnChange('expediente', e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-[11px] text-emerald-600 font-medium block mt-1">
                  ✓ Identificador único de caso
                </span>
              </div>

              {/* Resumen col */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Resumen / Asunto Original (Opcional):
                </label>
                <select
                  value={detection.resumenCol}
                  onChange={e => handleColumnChange('resumen', e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- No incluir resumen --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Se utilizará solo para comparar inconsistencias
                </span>
              </div>

              {/* Descripcion col */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                <label className="block text-xs font-bold text-blue-950 uppercase mb-1">
                  Descripción Completa (Fuente Principal):
                </label>
                <select
                  value={detection.descripcionCol}
                  onChange={e => handleColumnChange('descripcion', e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-blue-300 rounded-lg p-2 text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                  ★ Fuente primaria de clasificación IA
                </span>
              </div>
            </div>
          </div>

          {/* Validation Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium block">Registros Válidos</span>
              <span className="text-xl font-bold text-emerald-700">{validation.filasValidas}</span>
              <span className="text-[11px] text-emerald-600 block">Listos para procesar</span>
            </div>

            <div className={`p-3 rounded-xl border ${validation.filasConError > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-xs text-slate-700 font-medium block">Registros Con Error</span>
              <span className={`text-xl font-bold ${validation.filasConError > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                {validation.filasConError}
              </span>
              {validation.filasConError > 0 && (
                <button
                  type="button"
                  onClick={() => setShowErrorRows(!showErrorRows)}
                  className="text-[11px] text-blue-600 underline font-medium block"
                >
                  {showErrorRows ? 'Ocultar errores' : 'Ver detalle errores'}
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600 font-medium block">Sin Descripción</span>
              <span className="text-lg font-bold text-slate-800">{validation.filasSinDescripcion}</span>
              <span className="text-[11px] text-slate-400 block">Omitidos</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600 font-medium block">Duplicados</span>
              <span className="text-lg font-bold text-slate-800">{validation.filasDuplicadas}</span>
              <span className="text-[11px] text-slate-400 block">Radicados repetidos</span>
            </div>
          </div>

          {/* Collapsible Error Rows Detail */}
          {showErrorRows && validation.registrosConError.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs">
              <h5 className="font-bold text-amber-900 mb-2">Filas con errores detectadas (no detienen el procesamiento del resto):</h5>
              <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-amber-200/60">
                {validation.registrosConError.map((err, idx) => (
                  <div key={idx} className="pt-1 flex items-start gap-2">
                    <span className="font-semibold text-amber-800 shrink-0">Fila {err.fila}:</span>
                    <span className="text-amber-900">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Preview Table */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center">
              <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
              Vista Previa de Registros a Procesar (Primeros 3):
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Expediente</th>
                    <th className="p-2.5">Resumen Original</th>
                    <th className="p-2.5">Descripción de la Radicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validation.registrosValidos.slice(0, 3).map(r => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-semibold text-slate-800">{r.numero_expediente}</td>
                      <td className="p-2.5 text-slate-600">{r.resumen_original || '-'}</td>
                      <td className="p-2.5 text-slate-800">{r.descripcion_original}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Launch Action */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Se procesarán <strong>{validation.filasValidas}</strong> expedientes válidos en lotes automáticos con Gemini AI.
            </div>
            <button
              id="btn-iniciar-analisis"
              onClick={handleStartAnalysis}
              disabled={isProcessing || validation.filasValidas === 0}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Procesando Lotes con IA...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Iniciar Análisis Inteligente
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Real-time Multi-Stage Progress Modal / Panel (Section 37) */}
      {currentProgress && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">Orquestador PQRS en Ejecución</h4>
                <p className="text-xs text-slate-400">{currentProgress.archivoNombre}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800">
              {currentProgress.porcentaje}%
            </span>
          </div>

          {/* Main Progress Bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress.porcentaje}%` }}
            ></div>
          </div>

          <div className="text-xs font-mono text-slate-300">
            &gt; {currentProgress.faseActual}
          </div>

          {/* Checklist Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-800">
            <div className="flex items-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Archivo cargado</span>
            </div>
            <div className="flex items-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Datos validados</span>
            </div>
            <div className={`flex items-center ${currentProgress.porcentaje >= 60 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Lectura IA</span>
            </div>
            <div className={`flex items-center ${currentProgress.porcentaje >= 90 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Agrupación</span>
            </div>
          </div>

          {/* Success Call to Action after Completion */}
          {completedRecords && !isProcessing && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-400 font-semibold">
                ✓ ¡{completedRecords.length} expedientes analizados y enriquecidos exitosamente!
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-download-after-process"
                  onClick={() => exportEnrichedExcel(completedRecords)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center shadow"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Descargar PQRS_ANALIZADAS.xlsx
                </button>
                <button
                  onClick={() => onNavigate('expedientes')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center shadow"
                >
                  Explorar Expedientes &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
