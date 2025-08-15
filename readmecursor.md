# 🤖 CURSOR AGENT DOCUMENTATIE - APPALTI AI SALES PLATFORM

> LET OP: Dit document wordt actief bijgewerkt. Zie onderaan "Changelog Updates" voor de laatste wijzigingen (laatste update toegevoegd op: 2025-08-15 13:05 UTC).
## 📜 Changelog Updates

### 2025-08-15 13:05 UTC
- Rate limiting (optioneel):
  - Upstash Redis gebaseerde limiter toegevoegd. Zonder env (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) wordt limiter automatisch uitgeschakeld.
  - Toegepast op `/api/kvk/search`, `/api/kvk/suggest`, en `/api/memberships/invite` (50 req/min per IP).
- Sentry integratie:
  - `@sentry/nextjs` geconfigureerd via `src/sentry.server.config.ts` en `src/sentry.client.config.ts`. Activeert alleen als `SENTRY_DSN` staat.
- Audit logging:
  - `src/lib/audit.ts` toegevoegd; schrijft audit events naar `auditLogs`.
  - Audit events op client company create/update/delete en membership invite create.