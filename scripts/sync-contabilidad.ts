import { runQuincenalContabilidadSync } from "../server/contabilidadSync";

try {
  const result = await runQuincenalContabilidadSync();
  console.log("CONTABILIDAD_SYNC_COMPLETA", JSON.stringify(result));
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : "Error no identificado durante la sincronización.";
  console.error("CONTABILIDAD_SYNC_FALLIDA", message);
  process.exit(1);
}
