# Livora Stream — instrucciones para la IA

Este archivo lo carga Claude Code automáticamente al trabajar dentro de
`livora-stream/`. Es corto a propósito: lo importante está en el plan.

## Antes de escribir código

1. Lee [`PLAN.md`](PLAN.md). Su tabla **Estado actual** dice en qué fase y paso
   está el proyecto y si hay algún bloqueo.
2. Trabaja sobre el paso marcado 🔄, o el primero ⏳ de la fase actual. Si la
   fase actual está ⛔ (bloqueada por una decisión del usuario), trabaja en la
   Fase 9 y dilo.
3. No cambies de fase ni de proveedor ni de nombre sin una decisión del usuario
   registrada en la tabla **Decisiones tomadas** del plan.

## Al terminar

1. Ejecuta las **Comprobaciones** del plan que correspondan al paso.
2. Actualiza `PLAN.md`: estado del paso, línea **Falta** si quedó algo, tabla
   **Estado actual** (fase, paso, fecha, último commit, salud).
3. Haz commit del plan **junto con** el código. Verifica el índice antes
   (`git status --porcelain`) y el remoto después del push.

## Reglas del proyecto

- Rutas **absolutas** al cambiar de carpeta: este proyecto convive en el repo
  con un ERP (`../server`, `../client`) que no se debe tocar.
- Los eventos de tiempo real viven duplicados en `server/src/realtime/events.ts`
  y `mobile/src/realtime/events.ts`: si cambias uno, cambia el otro.
- Colores solo desde `mobile/src/theme/index.ts`. Sobre el verde de marca el
  texto va en `colors.onPrimary`, nunca en blanco.
- El logo se regenera con `mobile/scripts/generate-icons.py`; no edites los PNG
  a mano.
- La recarga de monedas (`POST /api/wallet/topup`) es simulada y debe seguir
  documentada como tal hasta la Fase 6.
- Un paso se marca ✅ solo con una comprobación que lo demuestre.
