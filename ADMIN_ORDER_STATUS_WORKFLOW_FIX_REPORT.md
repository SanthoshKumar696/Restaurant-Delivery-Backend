# Admin Order Status Workflow Fix Report

## Root cause

The existing transition table already requires `CONFIRMED → PREPARING → READY`; it correctly rejects `CONFIRMED → READY` with HTTP 409 and `INVALID_ORDER_TRANSITION`. The reported error means the request sequence attempted to skip PREPARING, rather than the READY transition being absent. No frontend application source exists in this backend repository to correct or inspect for a skipped PATCH request.

The status guard is retained. Its error message now explicitly instructs clients to move a confirmed order to PREPARING before READY, while preserving the established status code and error code. Swagger documents the required progression.

## Correct status rules

- `PENDING → CONFIRMED` or `REJECTED`
- `CONFIRMED → PREPARING` or `CANCELLED`
- `PREPARING → READY` or `CANCELLED`
- READY, OUT_FOR_DELIVERY, and terminal-state behavior remains governed by the existing transitions and fulfillment-specific rules.

Order and delivery statuses remain separate. Transitioning an order to READY persists `readyAt` and does not change the existing delivery's PENDING status. Assignment is available only after READY and reuses the existing delivery assignment service and delivery record.

## HTTP results

The system integration test uses authenticated Admin and Customer requests over HTTP against the Express application and verifies database state after transitions.

| Test | Result |
|---|---|
| Customer creates delivery order | PASS — HTTP 201; Admin PENDING list includes it |
| PATCH PENDING → READY | PASS — HTTP 409, `INVALID_ORDER_TRANSITION`; order remains PENDING |
| PATCH with invalid status | PASS — HTTP 400; order remains PENDING |
| Existing Admin accept endpoint | PASS — HTTP 200; response reports CONFIRMED |
| PATCH CONFIRMED → READY, skipping PREPARING | PASS — HTTP 409, `INVALID_ORDER_TRANSITION`, explanatory message; order remains CONFIRMED, `readyAt` remains null, delivery remains PENDING |
| PATCH CONFIRMED → PREPARING | PASS — HTTP 200; response reports PREPARING |
| PATCH PREPARING → READY | PASS — HTTP 200; response and Admin detail report READY; database status and `readyAt` are persisted |
| READY order delivery state | PASS — delivery remains PENDING until assignment |
| Terminal order → READY | PASS — HTTP 409; terminal status remains unchanged |
| Captain assignment and delivery regression | PASS — manual HTTP integration verified assignment after READY, Captain retrieval/acceptance, and assignment rejection cases |

## Regression checks

- `npm run build` — PASS.
- `npm test` — PASS; system integration output reported `passed: true`.
- `npm run test:manual` — PASS; manual delivery integration output reported `passed: true`.
- Existing customer creation, Admin acceptance, Captain login, delivery assignment, and delivery acceptance paths were exercised by the integration suites.

## Files changed

- `src/modules/admin-orders/order/order.service.ts` — retain the strict transition table and give the forbidden `CONFIRMED → READY` skip an actionable message without changing its HTTP 409 / `INVALID_ORDER_TRANSITION` behavior.
- `src/modules/admin-orders/order/order.routes.ts` — document the strict CONFIRMED → PREPARING → READY progression and its 409 response in Swagger.
- `tests/system.integration.ts` — assert the valid transition sequence, skipped and invalid transition rejections, terminal-state protection, list visibility, and persisted status/timestamp/delivery state.

## Remaining blockers

- **BLOCKED (frontend review):** This repository contains the backend only; no frontend status-update client was available to verify or modify. A frontend that calls READY immediately after acceptance must send PREPARING first.
- **PASS (backend):** The tested API rejects the skipped transition and supports the intended authenticated lifecycle.
