import assert from 'assert';
import {
  analyzePQRSBatchWithMetrics,
  BatchInputRecord,
  clearAnalysisCacheForTests,
  GenerateContentFn
} from '../server/geminiService';
import {
  computeClassificationQualityMetrics,
  mergeBatchTelemetry
} from '../src/services/qualityMetricsService';
import { buildExportRow, CANONICAL_ANALYSIS_COLUMNS } from '../src/services/excelService';
import { EnrichedPQRSRecord } from '../src/types';

async function runOtrasSecondValidationTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  const check = (label: string, condition: boolean, detail?: string) => {
    if (condition) {
      passed++;
      console.log(`✓ [PASÓ] ${label}`);
    } else {
      failed++;
      console.error(`✗ [FALLÓ] ${label}${detail ? ` -> ${detail}` : ''}`);
    }
  };

  console.log('='.repeat(80));
  console.log('PRUEBAS OBLIGATORIAS – SEGUNDA VALIDACIÓN SELECTIVA DE OTRAS Y OPTIMIZACIÓN IA');
  console.log('='.repeat(80));

  // =========================================================================
  // ESCENARIO 1: Expedientes correctamente clasificados inicialmente -> ZERO pass-2 calls
  // =========================================================================
  clearAnalysisCacheForTests();
  {
    const calls: string[] = [];
    const mockGen: GenerateContentFn = async (params: any) => {
      const prompt = String(params.contents || '');
      if (prompt.includes('SEGUNDA VALIDACIÓN SEMÁNTICA SELECTIVA')) {
        calls.push('SECOND_PASS');
        throw new Error('La segunda validación NO debe ejecutarse cuando no hay OTRAS.');
      }
      if (prompt.includes('CRITERIO OBLIGATORIO DE TIPO DE CASO') && !prompt.includes('MOTOR DE CLASIFICACIÓN')) {
        calls.push('TIPO_CASO');
        return {
          text: JSON.stringify([
            { expediente: 'OK-001', tipo_caso: 'Reclamo' },
            { expediente: 'OK-002', tipo_caso: 'Solicitud' }
          ]),
          usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, totalTokenCount: 150 }
        };
      }
      calls.push('PASS_1');
      return {
        text: JSON.stringify([
          {
            expediente: 'OK-003',
            categoria_principal: 'CANALES DIGITALES',
            subcategoria: 'BANCA MÓVIL Y VIRTUAL',
            tipo_caso: 'Solicitud',
            producto_detectado: 'CANALES DIGITALES',
            problema_principal: 'Bloqueo de acceso a la aplicación móvil',
            resumen_requerimiento: 'Cliente reporta bloqueo de clave en banca móvil.',
            intencion_cliente: 'Restablecer acceso a la app',
            evidencia_textual: 'mi clave quedó bloqueada al intentar ingresar a la aplicación',
            confianza: 94,
            requiere_revision_humana: false
          }
        ]),
        usageMetadata: { promptTokenCount: 400, candidatesTokenCount: 90, totalTokenCount: 490 }
      };
    };

    const batch1: BatchInputRecord[] = [
      {
        numero_expediente: 'OK-001',
        resumen_original: 'Compra no reconocida',
        descripcion_original: 'No reconozco una compra realizada con mi tarjeta de crédito por $500.000.'
      },
      {
        numero_expediente: 'OK-002',
        resumen_original: 'Visualización CDT',
        descripcion_original: 'No puedo visualizar el CDT en la plataforma digital del banco.'
      },
      {
        numero_expediente: 'OK-003',
        resumen_original: 'Acceso app',
        descripcion_original: 'Desde ayer mi clave quedó bloqueada al intentar ingresar a la aplicación.'
      }
    ];

    const res1 = await analyzePQRSBatchWithMetrics(batch1, undefined, {
      generateContentFn: mockGen,
      bypassCache: true
    });

    check(
      'Escenario 1a: Clasificaciones válidas iniciales se conservan intactas (FRAUDES, CDT, CANALES DIGITALES)',
      res1.analyses[0].categoria_principal === 'FRAUDES' &&
        res1.analyses[1].categoria_principal === 'CDT' &&
        res1.analyses[1].subcategoria === 'VISUALIZACIÓN' &&
        res1.analyses[2].categoria_principal === 'CANALES DIGITALES'
    );
    check(
      'Escenario 1b: Segunda validación NO se ejecuta cuando no hay casos OTRAS (0 llamadas pass-2)',
      res1.telemetry.llamadas_segunda_validacion_otras === 0 && !calls.includes('SECOND_PASS')
    );
    check(
      'Escenario 1c: Todos los casos válidos quedan marcados como CLASIFICACION_INICIAL',
      res1.analyses.every(a => a.origen_clasificacion === 'CLASIFICACION_INICIAL')
    );
    check(
      'Escenario 1d: Consumo de tokens registrado correctamente desde usageMetadata',
      res1.telemetry.tokens.disponible === true && res1.telemetry.tokens.total_tokens === 640
    );
  }

  // =========================================================================
  // ESCENARIOS 2, 3, 4 y 5: Mix real en un solo lote:
  //   - Caso ya válido (no entra a pass-2)
  //   - Caso OTRAS recuperable (lenguaje coloquial de canal digital)
  //   - Caso OTRAS multi-tema recuperable (prioriza problema principal)
  //   - Caso genuinamente sin categoría aplicable (conserva OTRAS con trazabilidad)
  //   - Caso ambiguo/incompleto (conserva OTRAS sin inventar)
  // =========================================================================
  clearAnalysisCacheForTests();
  {
    let secondPassPromptCaptured = '';
    let secondPassCalls = 0;

    const mockGen: GenerateContentFn = async (params: any) => {
      const prompt = String(params.contents || '');

      if (prompt.includes('SEGUNDA VALIDACIÓN SEMÁNTICA SELECTIVA')) {
        secondPassCalls++;
        secondPassPromptCaptured = prompt;
        return {
          text: JSON.stringify([
            {
              expediente: 'OTR-REC-01',
              decision: 'RECUPERAR',
              categoria_principal: 'CANALES DIGITALES',
              subcategoria: 'FALLAS TECNOLÓGICAS',
              tipo_caso: 'Solicitud',
              producto_detectado: 'CANALES DIGITALES',
              problema_principal: 'Falla técnica en pantalla en blanco dentro de la app',
              solicitud_cliente: 'Restablecer el funcionamiento de la aplicación para consultar sus productos',
              resumen_requerimiento: 'Reporta pantalla en blanco al abrir el aplicativo.',
              evidencia_textual: 'cada vez que abro el aplicativo se queda en blanco y se cierra solo',
              confianza: 91,
              resultado_validacion: 'Recuperado de OTRAS: describe falla tecnológica del canal digital con lenguaje cotidiano.'
            },
            {
              expediente: 'OTR-MULTI-02',
              decision: 'RECUPERAR',
              categoria_principal: 'ACTUALIZACIÓN DE DATOS',
              subcategoria: 'DATOS DE CONTACTO',
              tipo_caso: 'Solicitud',
              producto_detectado: 'CUENTA DE AHORROS',
              problema_principal: 'Necesidad de actualizar número celular y correo electrónico registrados',
              solicitud_cliente: 'Actualizar celular y correo para recibir notificaciones',
              resumen_requerimiento: 'Solicita actualización de número celular y correo de contacto.',
              evidencia_textual: 'lo que busco sobre todo es dejar al día el número donde me llaman y el buzón donde llegan mis avisos',
              confianza: 90,
              resultado_validacion: 'Recuperado de OTRAS priorizando el motivo principal entre varios temas mencionados.'
            },
            {
              expediente: 'OTR-REAL-03',
              decision: 'CONSERVAR_OTRAS',
              categoria_principal: 'OTRAS',
              subcategoria: 'CASOS ATÍPICOS',
              tipo_caso: 'Solicitud',
              producto_detectado: 'NO ESPECIFICADO',
              problema_principal: 'Propuesta de patrocinio cultural para evento barrial',
              solicitud_cliente: 'Solicita donación o patrocinio institucional para festival local',
              resumen_requerimiento: 'Solicita patrocinio institucional para evento comunitario local.',
              evidencia_textual: 'escribo como junta comunal para solicitar patrocinio para nuestro festival anual',
              confianza: 86,
              motivo_permanencia_otras: 'Solicitud institucional externa (patrocinio) sin categoría operativa aplicable en el catálogo bancario.',
              resultado_validacion: 'Confirmado en OTRAS: el requerimiento no corresponde a ningún producto ni proceso del catálogo vigente.',
              motivo_revision_humana: 'Escalar a área administrativa o relaciones institucionales; no corresponde a PQRS operativa estándar.'
            },
            {
              expediente: 'OTR-AMB-04',
              decision: 'CONSERVAR_OTRAS',
              categoria_principal: 'OTRAS',
              subcategoria: 'CASOS ATÍPICOS',
              tipo_caso: 'REVISION_HUMANA',
              producto_detectado: 'NO ESPECIFICADO',
              problema_principal: 'Inconformidad general sin producto ni hecho específico',
              solicitud_cliente: 'Pide revisión general sin detallar qué ocurrió',
              resumen_requerimiento: 'Manifiesta inconformidad general sin precisar producto ni problema.',
              evidencia_textual: 'tengo un inconveniente pendiente desde la semana pasada y necesito solución urgente',
              confianza: 45,
              motivo_permanencia_otras: 'Descripción ambigua e incompleta: no indica producto ni operación concreta.',
              resultado_validacion: 'Confirmado en OTRAS para evitar inventar hechos o forzar una categoría sin sustento.',
              motivo_revision_humana: 'Contactar al cliente para precisar producto y operación involucrada antes de reclasificar.'
            }
          ]),
          usageMetadata: { promptTokenCount: 750, candidatesTokenCount: 250, totalTokenCount: 1000 }
        };
      }

      if (prompt.includes('CRITERIO OBLIGATORIO DE TIPO DE CASO') && !prompt.includes('MOTOR DE CLASIFICACIÓN')) {
        return {
          text: JSON.stringify([{ expediente: 'VAL-01', tipo_caso: 'Reclamo' }]),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 }
        };
      }

      // Pass 1 returns OTRAS for the 4 non-deterministic cases
      return {
        text: JSON.stringify([
          {
            expediente: 'OTR-REC-01',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'Solicitud',
            producto_detectado: 'NO ESPECIFICADO',
            problema_principal: 'Inconveniente reportado en herramienta',
            resumen_requerimiento: 'Reporta inconveniente al abrir aplicativo.',
            intencion_cliente: 'Solución',
            evidencia_textual: 'se queda en blanco y se cierra solo',
            confianza: 60,
            requiere_revision_humana: false
          },
          {
            expediente: 'OTR-MULTI-02',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'Solicitud',
            producto_detectado: 'CUENTA DE AHORROS',
            problema_principal: 'Varios temas administrativos',
            resumen_requerimiento: 'Menciona cambios personales y consultas generales.',
            intencion_cliente: 'Ajuste de información',
            evidencia_textual: 'dejar al día el número donde me llaman y el buzón donde llegan mis avisos',
            confianza: 62,
            requiere_revision_humana: false
          },
          {
            expediente: 'OTR-REAL-03',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'Solicitud',
            producto_detectado: 'NO ESPECIFICADO',
            problema_principal: 'Petición externa comunitaria',
            resumen_requerimiento: 'Solicita patrocinio para festival comunitario.',
            intencion_cliente: 'Patrocinio',
            evidencia_textual: 'solicitar patrocinio para nuestro festival anual',
            confianza: 70,
            requiere_revision_humana: true
          },
          {
            expediente: 'OTR-AMB-04',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'REVISION_HUMANA',
            producto_detectado: 'NO ESPECIFICADO',
            problema_principal: 'Inconveniente sin especificar',
            resumen_requerimiento: 'Reporta inconveniente sin detallar hechos.',
            intencion_cliente: 'Solución urgente',
            evidencia_textual: 'tengo un inconveniente pendiente desde la semana pasada',
            confianza: 40,
            requiere_revision_humana: true
          }
        ]),
        usageMetadata: { promptTokenCount: 600, candidatesTokenCount: 180, totalTokenCount: 780 }
      };
    };

    const mixedBatch: BatchInputRecord[] = [
      {
        numero_expediente: 'VAL-01',
        resumen_original: 'Cobro GMF',
        descripcion_original: 'Me cobraron el 4x1000 en mi cuenta exenta de GMF y solicito devolución.'
      },
      {
        numero_expediente: 'OTR-REC-01',
        resumen_original: 'Novedad general',
        descripcion_original: 'Buenos días, cada vez que abro el aplicativo se queda en blanco y se cierra solo sin dejarme ver nada.'
      },
      {
        numero_expediente: 'OTR-MULTI-02',
        resumen_original: 'Varios asuntos',
        descripcion_original: 'Hace meses me mudé de ciudad y también tuve dudas sobre las nuevas políticas comerciales, pero lo que busco sobre todo es dejar al día el número donde me llaman y el buzón donde llegan mis avisos.'
      },
      {
        numero_expediente: 'OTR-REAL-03',
        resumen_original: 'Petición externa',
        descripcion_original: 'Escribo como junta comunal para solicitar patrocinio para nuestro festival anual del barrio.'
      },
      {
        numero_expediente: 'OTR-AMB-04',
        resumen_original: 'Revisión urgente',
        descripcion_original: 'Tengo un inconveniente pendiente desde la semana pasada y necesito solución urgente por favor.'
      }
    ];

    const res2 = await analyzePQRSBatchWithMetrics(mixedBatch, undefined, {
      generateContentFn: mockGen
    });

    // Check selective batching: only 1 pass-2 call for the 4 OTRAS, and VAL-01 NEVER sent to pass-2
    check(
      'Escenario 2a: Segunda validación agrupa los 4 OTRAS en 1 solo lote y excluye el expediente válido VAL-01',
      secondPassCalls === 1 &&
        res2.telemetry.llamadas_segunda_validacion_otras === 1 &&
        res2.telemetry.por_etapa.segunda_validacion_otras.expedientes_enviados === 4 &&
        !secondPassPromptCaptured.includes('VAL-01')
    );

    const val01 = res2.analyses[0];
    const rec01 = res2.analyses[1];
    const multi02 = res2.analyses[2];
    const real03 = res2.analyses[3];
    const amb04 = res2.analyses[4];

    check(
      'Escenario 2b: Expediente inicialmente válido (VAL-01 -> GMF) permanece sin cambios',
      val01.categoria_principal === 'GMF' && val01.origen_clasificacion === 'CLASIFICACION_INICIAL'
    );
    check(
      'Escenario 2c: Caso OTRAS recuperable (OTR-REC-01) pasa a CANALES DIGITALES > FALLAS TECNOLÓGICAS con evidencia',
      rec01.categoria_principal === 'CANALES DIGITALES' &&
        rec01.subcategoria === 'FALLAS TECNOLÓGICAS' &&
        rec01.origen_clasificacion === 'RECUPERADO_SEGUNDA_VALIDACION' &&
        rec01.segunda_validacion_otras?.estado === 'RECUPERADO' &&
        Boolean(rec01.evidencia_textual && rec01.evidencia_textual.length > 10)
    );
    check(
      'Escenario 5: Expediente multi-tema (OTR-MULTI-02) prioriza el motivo principal (ACTUALIZACIÓN DE DATOS > DATOS DE CONTACTO)',
      multi02.categoria_principal === 'ACTUALIZACIÓN DE DATOS' &&
        multi02.subcategoria === 'DATOS DE CONTACTO' &&
        multi02.origen_clasificacion === 'RECUPERADO_SEGUNDA_VALIDACION'
    );
    check(
      'Escenario 3: Caso sin categoría aplicable (OTR-REAL-03) permanece en OTRAS con trazabilidad interna completa',
      real03.categoria_principal === 'OTRAS' &&
        real03.origen_clasificacion === 'CONFIRMADO_OTRAS' &&
        real03.requiere_revision === true &&
        Boolean(real03.segunda_validacion_otras?.motivo_permanencia_otras) &&
        Boolean(real03.segunda_validacion_otras?.resultado_validacion) &&
        Boolean(real03.segunda_validacion_otras?.motivo_revision_humana) &&
        Boolean(real03.evidencia_textual)
    );
    check(
      'Escenario 4: Descripción ambigua/incompleta (OTR-AMB-04) conserva OTRAS sin inventar categoría y con justificación concreta',
      amb04.categoria_principal === 'OTRAS' &&
        amb04.origen_clasificacion === 'CONFIRMADO_OTRAS' &&
        amb04.requiere_revision === true &&
        Boolean(amb04.segunda_validacion_otras?.motivo_permanencia_otras?.includes('ambigua'))
    );

    // Check cache reuse on re-running the exact same batch -> ZERO Gemini calls!
    const res2Cached = await analyzePQRSBatchWithMetrics(mixedBatch, undefined, {
      generateContentFn: async () => {
        throw new Error('No debe llamar a Gemini cuando todos los registros están en caché.');
      }
    });
    check(
      'Optimización caché: Reprocesar lote idéntico usa caché (0 llamadas Gemini, 5 cache hits)',
      res2Cached.telemetry.llamadas_gemini_total === 0 && res2Cached.telemetry.cache_hits === 5
    );

    // Verify local quality metrics service (ZERO Gemini calls)
    const enrichedRecords: EnrichedPQRSRecord[] = mixedBatch.map((b, i) => ({
      id: b.numero_expediente,
      numero_expediente: b.numero_expediente,
      resumen_original: b.resumen_original,
      descripcion_original: b.descripcion_original,
      analisis: res2.analyses[i]
    }));

    const metrics = computeClassificationQualityMetrics(enrichedRecords, res2.telemetry);
    check(
      'Métricas locales (Sección 6): Conteos exactos y separación inicial / recuperados / confirmados OTRAS',
      metrics.totalProcesados === 5 &&
        metrics.totalClasificadoInicialmente === 1 &&
        metrics.totalInicialmenteEnOtras === 4 &&
        metrics.totalRecuperadosSegundaValidacion === 2 &&
        metrics.totalContinuaEnOtras === 2 &&
        metrics.porcentajeRecuperacionOtras === 50 &&
        metrics.porcentajeFinalOtras === 40 &&
        metrics.totalRequiereRevisionHumana === 2 &&
        metrics.motivosFrecuentesOtras.length === 2 &&
        metrics.llamadasGemini.total === 3 &&
        metrics.llamadasGemini.segundaValidacionOtras === 1 &&
        metrics.consumoTokens.disponible === true &&
        metrics.consumoTokens.totalTokens === 1900
    );

    // Verify Excel export keeps exact canonical columns, preserves all records, no duplicate columns, no internal traceability columns
    const exportRows = enrichedRecords.map(r => buildExportRow(r));
    const canonicalSet = new Set<string>(CANONICAL_ANALYSIS_COLUMNS as readonly string[]);
    const noExtraTraceCols = exportRows.every(row => {
      const keys = Object.keys(row);
      const hasAllCanonical = CANONICAL_ANALYSIS_COLUMNS.every(col => keys.includes(col));
      const hasTraceLeak = keys.some(
        k => k.includes('segunda_validacion') || k.includes('origen_clasificacion') || k.includes('motivo_permanencia')
      );
      const uniqueKeyCount = new Set(keys).size === keys.length;
      return hasAllCanonical && !hasTraceLeak && uniqueKeyCount && canonicalSet.size === 10;
    });
    check(
      'Exportación Excel: Sin duplicación de expedientes ni columnas y sin filtrar trazabilidad interna',
      exportRows.length === 5 && noExtraTraceCols
    );
  }

  // =========================================================================
  // ESCENARIO 6: Error de cuota (429 RESOURCE_EXHAUSTED) durante segunda validación
  // =========================================================================
  clearAnalysisCacheForTests();
  {
    const mockQuotaFailure: GenerateContentFn = async (params: any) => {
      const prompt = String(params.contents || '');
      if (prompt.includes('SEGUNDA VALIDACIÓN SEMÁNTICA SELECTIVA')) {
        throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for Gemini API');
      }
      if (prompt.includes('CRITERIO OBLIGATORIO DE TIPO DE CASO') && !prompt.includes('MOTOR DE CLASIFICACIÓN')) {
        return {
          text: JSON.stringify([{ expediente: 'Q-OK-01', tipo_caso: 'Reclamo' }]),
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 20, totalTokenCount: 100 }
        };
      }
      return {
        text: JSON.stringify([
          {
            expediente: 'Q-OTR-02',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'Solicitud',
            producto_detectado: 'NO ESPECIFICADO',
            problema_principal: 'Petición no estándar pendiente de revisión',
            resumen_requerimiento: 'Caso pendiente de clasificación detallada.',
            intencion_cliente: 'Revisión',
            evidencia_textual: 'requiero orientación especial sobre convenio institucional',
            confianza: 55,
            requiere_revision_humana: true
          }
        ]),
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 80, totalTokenCount: 380 }
      };
    };

    const quotaBatch: BatchInputRecord[] = [
      {
        numero_expediente: 'Q-OK-01',
        resumen_original: 'Pago no reflejado',
        descripcion_original: 'Pagué mi tarjeta de crédito ayer y el pago aún no se refleja.'
      },
      {
        numero_expediente: 'Q-OTR-02',
        resumen_original: 'Convenio especial',
        descripcion_original: 'Requiero orientación especial sobre un convenio institucional universitario con el banco.'
      }
    ];

    const resQuota = await analyzePQRSBatchWithMetrics(quotaBatch, undefined, {
      generateContentFn: mockQuotaFailure
    });

    check(
      'Escenario 6a: Error de cuota 429 en 2ª validación NO interrumpe el lote (2 expedientes completos)',
      resQuota.analyses.length === 2 &&
        resQuota.analyses[0].categoria_principal === 'PAGOS / ABONOS' &&
        resQuota.analyses[1].categoria_principal === 'OTRAS'
    );
    check(
      'Escenario 6b: Ante error de cuota, se conserva OTRAS sin inventar categoría y se registra trazabilidad del error',
      resQuota.analyses[1].segunda_validacion_otras?.estado === 'ERROR_CONSERVADO_OTRAS' &&
        Boolean(resQuota.analyses[1].segunda_validacion_otras?.error_api?.includes('429')) &&
        resQuota.telemetry.por_etapa.segunda_validacion_otras.errores === 1 &&
        resQuota.telemetry.errores_segunda_validacion.length === 1
    );

    const merged = mergeBatchTelemetry(resQuota.telemetry, resQuota.telemetry);
    check(
      'Merge local de telemetría multi-lote acumula llamadas, tokens y errores correctamente',
      merged.llamadas_gemini_total === resQuota.telemetry.llamadas_gemini_total * 2 &&
        merged.tokens.total_tokens === resQuota.telemetry.tokens.total_tokens * 2 &&
        merged.errores_segunda_validacion.length === 2
    );
  }

  // =========================================================================
  // ESCENARIO 7: Guardia de catálogo y regla CDT en segunda validación
  // =========================================================================
  clearAnalysisCacheForTests();
  {
    const mockInvalidRecovery: GenerateContentFn = async (params: any) => {
      const prompt = String(params.contents || '');
      if (prompt.includes('SEGUNDA VALIDACIÓN SEMÁNTICA SELECTIVA')) {
        return {
          text: JSON.stringify([
            {
              expediente: 'GUARD-01',
              decision: 'RECUPERAR',
              categoria_principal: 'CATEGORIA INVENTADA',
              subcategoria: 'SUBCATEGORIA FALSA',
              problema_principal: 'Tema externo',
              solicitud_cliente: 'Consulta general',
              evidencia_textual: 'consulta general sobre alianza cultural'
            },
            {
              expediente: 'GUARD-02',
              decision: 'RECUPERAR',
              categoria_principal: 'CDT',
              subcategoria: 'VISUALIZACIÓN',
              problema_principal: 'Consulta general sin CDT',
              solicitud_cliente: 'Consulta general',
              evidencia_textual: 'no encuentro un documento en mi cuenta general'
            }
          ]),
          usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 80, totalTokenCount: 280 }
        };
      }
      return {
        text: JSON.stringify([
          {
            expediente: 'GUARD-01',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'Solicitud',
            resumen_requerimiento: 'Consulta general sobre alianza cultural.',
            confianza: 55,
            requiere_revision_humana: true
          },
          {
            expediente: 'GUARD-02',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            tipo_caso: 'Solicitud',
            resumen_requerimiento: 'Consulta general sin mención de CDT.',
            confianza: 55,
            requiere_revision_humana: true
          }
        ]),
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 60, totalTokenCount: 260 }
      };
    };

    const guardBatch: BatchInputRecord[] = [
      {
        numero_expediente: 'GUARD-01',
        resumen_original: 'Consulta alianza',
        descripcion_original: 'Escribo para una consulta general sobre alianza cultural universitaria.'
      },
      {
        numero_expediente: 'GUARD-02',
        resumen_original: 'Consulta cuenta',
        descripcion_original: 'No encuentro un archivo adjunto antiguo en mi correspondencia general.'
      }
    ];

    const resGuard = await analyzePQRSBatchWithMetrics(guardBatch, undefined, {
      generateContentFn: mockInvalidRecovery,
      bypassCache: true
    });

    check(
      'Guardia catálogo y regla CDT: Segunda validación rechaza categoría inventada y CDT sin mención explícita, conservando OTRAS',
      resGuard.analyses[0].categoria_principal === 'OTRAS' &&
        resGuard.analyses[0].origen_clasificacion === 'CONFIRMADO_OTRAS' &&
        resGuard.analyses[1].categoria_principal === 'OTRAS' &&
        resGuard.analyses[1].origen_clasificacion === 'CONFIRMADO_OTRAS'
    );
  }

  console.log('-'.repeat(80));
  console.log(`RESULTADO SEGUNDA VALIDACIÓN OTRAS: ${passed}/${passed + failed} pruebas pasadas (${failed} fallidas)`);
  console.log('='.repeat(80));

  assert.strictEqual(failed, 0, `${failed} pruebas de segunda validación OTRAS fallaron.`);
}

runOtrasSecondValidationTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
