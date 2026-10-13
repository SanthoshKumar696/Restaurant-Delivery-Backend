# Admin Order Captain Assignment Diagnostic Report

## Result

**PASS** — `POST /api/admin/orders/:orderId/assign-captain` is integrated into the existing Admin Orders route group and was exercised over HTTP on port `5100`. The authenticated Captain retrieved the assigned delivery and accepted it; the Admin order detail then showed delivery status `ACCEPTED`.

## Runtime and OpenAPI

- Development command: `npm run dev` → `tsx watch src/server.ts`.
- Production command: `npm start` → `node dist/server.js`.
- The live development server was started from the repository root on port `5100`; its entry point was `src/server.ts`, running TypeScript source through `tsx`.
- The project does not expose a standalone OpenAPI JSON URL. Swagger UI serves the generated document embedded as `swaggerDoc` in `GET /api-docs/swagger-ui-init.js`. The live document includes the new path, required integer `orderId` path parameter, required `captainId` body, `bearerAuth`, a success schema, and `400`, `401`, `403`, `404`, and `409` responses.
- `GET /api-docs/swagger.json` does not return a JSON document in this application; Swagger's UI bootstrap is the live source of the OpenAPI document.

## Endpoint and behavior

- **Added:** `POST /api/admin/orders/{orderId}/assign-captain`.
- Admin identity is required. The tenant comes from `req.admin.tenantId`; the request does not select a tenant.
- The endpoint finds the order and its existing delivery record in that tenant, requires a READY delivery order, then delegates to the existing `assignDelivery` service. It does not create a delivery or duplicate assignment logic.
- Shared delivery logic validates the active tenant Captain, branch compatibility, assignment state, availability, and prevents reassignment.
- Admin Orders list, status-filtered list, and detail responses now include delivery ID/status, Captain ID/name/email/phone, and `assignedAt`. A delivery without a Captain remains in the list as unassigned. Responses select only non-sensitive Captain fields.
- The existing tenant-scoped `GET /api/captains` remains the selection-list API; no second Captain list endpoint was added.

## HTTP verification

The manual integration workflow was run with `PORT=5100` and used HTTP requests to the application listener:

| Step | Result |
|---|---|
| Admin login | PASS — `200` |
| Customer OTP login and order creation | PASS — OTP send/verify `200`; order creation `201` |
| Admin retrieves order, accepts it, and advances through PREPARING and READY | PASS — order visible while unassigned; existing order workflow retained |
| Admin fetches tenant Captain list | PASS — `200`; foreign-tenant Captain excluded |
| Admin assigns Captain through the new Admin Orders endpoint | PASS — `200`; returned existing delivery ID, status `ASSIGNED`, Captain profile ID/name/email, and assignment timestamp |
| Admin retrieves list and detail after assignment | PASS — Captain assignment is present in both responses |
| Captain login | PASS — `200` using the existing staff login API |
| Captain retrieves assigned deliveries | PASS — `200`; assigned delivery is returned |
| Other Captain attempts access or acceptance | PASS — both denied with `403` |
| Assigned Captain accepts delivery | PASS — `200` |
| Admin retrieves order after Captain acceptance | PASS — `200`; delivery status is `ACCEPTED` |

### Validation and authorization cases

| Case | Result |
|---|---|
| Malformed order ID | PASS — `400` |
| Missing admin token | PASS — `401` |
| Tenant spoofing | PASS — `403` |
| Unknown Captain ID | PASS — `404` |
| Captain from another tenant | PASS — `404` |
| Inactive Captain | PASS — `404` |
| Assignment before READY | PASS — `409` |
| Reassignment attempt | PASS — `409` |
| Pickup order without a delivery record | PASS — `409` |
| READY delivery order with its delivery record absent | PASS — `409`, `DELIVERY_RECORD_NOT_FOUND` |

## Regression and build checks

- `npm run build` — PASS.
- `npm test` — PASS (system integration suite).
- `PORT=5100 npm run test:manual` — PASS (manual delivery and Admin Orders HTTP integration workflow).
- `git diff --check` — PASS.

## Files changed

- `src/modules/admin-orders/order/order.routes.ts` — registered the authenticated assignment route and documented parameters, request body, security, response schema, and errors.
- `src/modules/admin-orders/order/order.validation.ts` — validates positive Captain ID and numeric order ID.
- `src/modules/admin-orders/order/order.controller.ts` — derives tenant from authenticated admin context and returns the updated Admin Order response.
- `src/modules/admin-orders/order/order.service.ts` — fetches the tenant-scoped order/existing delivery and delegates assignment to the shared delivery service; projects delivery assignment data in list and detail reads.
- `src/modules/admin-orders/order/order.types.ts` — describes the delivery assignment fields returned by Admin Orders.
- `tests/manual-delivery.integration.ts` — exercises the new HTTP route, order projections, isolation/error cases, Captain retrieval/acceptance, and allows binding the test listener to a requested port.

## Remaining blockers

None identified for the Admin Orders assignment workflow. The production `node dist/server.js` entrypoint was not separately started; live verification used the existing development command and the HTTP integration harness.
