# Captain Delivery API Workflow Report

## Backend process and entry point

| Check | Result |
| --- | --- |
| Development command | `npm run dev` → `tsx watch src/server.ts` |
| Production command | `npm start` → `node dist/server.js` |
| Listener | Port `5100`, Node PID `153980` (the tsx-watch worker after its source reload) |
| Running entry point | `src/server.ts`, loaded by this repository's `tsx` runtime; it is running TypeScript source, not `dist/server.js`. |
| Working directory | `C:\Users\nexova\Desktop\restaurant-backend` (repository root used by the dev launch). |
| Swagger UI | `GET http://localhost:5100/api-docs/` → **200** |
| Live OpenAPI source | `GET http://localhost:5100/api-docs/swagger-ui-init.js` → **200**; the OpenAPI document is embedded in the bootstrap script. `/api-docs/openapi.json` is not a route. |

## Live OpenAPI parameter verification

The running specification reports OpenAPI `3.0.3` and includes 108 paths. The live document was parsed after the changes.

| Operation | Live contract |
| --- | --- |
| `POST /api/auth/staff/login` | Required JSON body: `tenantId`, `password`, and either `phone` or `email`. No query/path parameters. |
| `POST /api/captains` | Required Captain create JSON body; Admin bearer auth. |
| `GET /api/captains` | Admin bearer auth; no request parameters or body. |
| `GET /api/captains/{captainId}` / `PUT /api/captains/{captainId}` | Required path `captainId`; Admin bearer auth. PUT also requires a JSON body. |
| `GET /api/delivery/my-deliveries`, `/my-upcoming`, `/my-current`, `/completed` | Staff bearer auth; no client-supplied captain ID or body. These GETs correctly have no parameters. |
| `GET /api/delivery/{deliveryId}` | Required path `deliveryId`; Staff bearer auth. The value identifies a Delivery record, not an Order. |
| `POST /api/delivery/{deliveryId}/accept` | Required path `deliveryId`; Staff bearer auth; no request body. |
| `POST /api/delivery/{deliveryId}/reject` | Required path `deliveryId`; Staff bearer auth; no rejection-reason body is supported by the current schema. |
| `POST /api/delivery/{deliveryId}/picked-up`, `/out-for-delivery`, `/arrived` | Required path `deliveryId`; Staff bearer auth; no request body. |
| `POST /api/delivery/{deliveryId}/location` | Required path `deliveryId`, required latitude/longitude JSON body; Staff bearer auth. |
| `POST /api/delivery/{deliveryId}/complete` | Required path `deliveryId`, required six-digit OTP JSON body; Staff bearer auth. |
| `GET /api/delivery/admin?captainId=...` and `GET /api/admin/delivery?captainId=...` | Optional query `captainId` identifies a Captain profile. Admin bearer auth; tenant remains token-scoped. |
| `GET /api/delivery/admin/{deliveryId}` and `GET /api/admin/delivery/{deliveryId}` | Required path `deliveryId` identifies a Delivery record. Admin bearer auth and tenant scope. |
| `POST /api/delivery/{deliveryId}/assign` | Required path `deliveryId` plus required body `captainId`; Admin bearer auth. |
| `GET /api/delivery/customer/{customerId}/{orderId}` | Required path `customerId` and `orderId`; Customer bearer auth. `orderId` identifies the Order; the service follows its Delivery relation. |

List endpoints with no client-supplied filters intentionally show no parameters. The request body schemas and bearer-auth requirements are present for the operations that need them. Captain delivery paths use `staffAuth`; the admin variants use `bearerAuth`. Successful response schemas reference the live `CaptainProfile` and `CaptainDelivery` components; list responses define `items[]`, and Captain detail/action responses define `data`.

## Identifier mapping confirmed from Prisma and API code

- `Captain.id` shares its primary key with and references `StaffUser.id`; a Captain staff JWT's `staffId` resolves to that Captain ID.
- `Delivery.id` is an independent identifier.
- `Delivery.captainId` references `Captain.id`.
- `Delivery.orderId` references `Order.id` and is unique.
- Captain self-service filters use authenticated `staffId` plus authenticated `tenantId`; request-supplied Captain IDs are not accepted as proof of ownership.

## HTTP lifecycle test

The isolated integration test starts the actual Express app on a loopback HTTP listener and uses the real routes, middleware, JWTs, services, and Prisma database. It creates a unique tenant fixture and creates the customer Order through `POST /api/orders`; it does not insert a Delivery or Order directly. The existing port-5100 live data was not changed. The run used `SKIP_DELIVERY_SOCKET_ASSERTIONS=1` because the socket-event promises in the manual test had no timeout and blocked after the location HTTP request; all HTTP and database assertions remained enabled.

Fixture identifiers returned by the successful run:

- Tenant: `MAN54939768`
- Captain Dinesh: `captainId=333`
- Captain Ramesh: `captainId=334`
- Captain Suresh: `captainId=335`
- Customer Order: `orderId=198`
- Delivery record: `deliveryId=139`
- Two additional same-address orders: `(orderId=199, deliveryId=140)` and `(orderId=200, deliveryId=141)`

| Step | Request / verification | Result |
| --- | --- | --- |
| Admin authentication | `POST /api/auth/admin/login` using the isolated tenant admin | **PASS**, 200 |
| Customer authentication | Customer OTP send and verify endpoints; token used for order creation | **PASS**, 200 for both |
| Order creation | `POST /api/orders`; DELIVERY order response supplied `orderId=198` | **PASS**, 201 |
| Admin acceptance and readiness | Existing admin accept, PREPARING, and READY routes | **PASS**, each 200 |
| Captain creation and login | `POST /api/captains` for Dinesh/Ramesh/Suresh; `POST /api/auth/staff/login` with existing staff auth | **PASS**, 201 creates and 200 logins |
| Admin assignment | `POST /api/admin/orders/198/assign-captain` with `{ "captainId": 333 }` | **PASS**, 200; response and DB show Delivery 139 `ASSIGNED`, Captain 333, and `assignedAt`. |
| Captain-scoped retrieval | `GET /api/delivery/my-upcoming` and `GET /api/delivery/my-deliveries` with Dinesh's staff token | **PASS**, 200; Delivery 139 / Order 198 returned with customer, address, items, quantities, totals, and timestamps. |
| Other-captain isolation | The same Captain delivery list/dashboard with Ramesh's token; Ramesh requests detail and acceptance for Delivery 139 | **PASS**, no Delivery 139 in Ramesh's lists; detail and accept return 403. |
| Tenant isolation | Foreign-tenant Captain is absent from local Captain results; attempts to spoof tenant during assignment are rejected | **PASS**, foreign records do not appear and tenant spoofing returns 403. |
| Detail and admin reads | `GET /api/delivery/139` as Dinesh; admin Order/Delivery detail and Captain-filtered delivery list | **PASS**, 200; correct linked IDs and no password hash in Captain responses. |
| Captain acceptance | `POST /api/delivery/139/accept` with Dinesh's staff token | **PASS**, 200; delivery enters `ACCEPTED`, appears in current list, and `DeliveryOffer` is persisted as `ACCEPTED` with `respondedAt`. Duplicate acceptance returns 409. |
| Delivery progress | Pickup, out-for-delivery, location update, and arrival endpoints | **PASS**, expected HTTP 200; duplicate transitions return 409. Customer and admin tracking requests return 200. |
| Completion | Customer delivery OTP endpoint followed by `POST /api/delivery/139/complete` | **PASS**, 200; Prisma read verifies Delivery `DELIVERED` and linked Order `COMPLETED`. Duplicate completion returns 409. |
| Status-specific lists | Fresh upcoming/current/completed requests after completion | **PASS**, completed list contains Order 198 / Delivery 139 / Captain 333; the delivery is absent from upcoming and current lists. |
| Same-address handling | Two independent orders with the same address, IDs above | **PASS**, both orders/delivery IDs remain separate list records. |
| Manual workflow suite | `SKIP_DELIVERY_SOCKET_ASSERTIONS=1 npm run test:manual` | **PASS**, emitted `{"passed":true,...}` with the fixture IDs above. |
| System regression suite | `npm test` | **PASS**, emitted `{"passed":true,...}`. |

### Issues found and corrected

1. The initial manual test waited indefinitely for websocket events after the location HTTP request. The HTTP location update did succeed and was persisted.
2. The first HTTP assertion failure after bypassing that wait was `GET /api/orders/customer/{customerId}/{orderId}/delivery` with no request body. It returned 400 `{"success":false,"message":"Validation failed","error":{"code":"VALIDATION_ERROR","details":[{"field":"params.orderId","message":"Invalid input: expected number, received NaN"}]}}` because the test used an obsolete, unregistered URL. The test now calls `/api/delivery/customer/{customerId}/{orderId}`.
3. The next failure was `GET /api/admin/delivery/{deliveryId}` with no request body. It returned 400 `VALIDATION_ERROR` because the route declared `:id` while validation and the controller read `deliveryId` (`params.deliveryId` received `NaN`). The route parameter key is now `:deliveryId`; the public URL shape is unchanged. Both existing admin delivery paths are documented.
4. Socket assertions remain enabled by default; `SKIP_DELIVERY_SOCKET_ASSERTIONS=1` skips only those assertions during the HTTP lifecycle run. Real-time event delivery remains **NOT TESTED** in this report.

## Files changed for this verification

- `src/config/swagger.ts` — add reusable Captain and delivery response schemas and explicit identifier meanings.
- `src/modules/auth/staff/staff.routes.ts` — document the existing staff-login request body, alternatives, response, and errors.
- `src/modules/captains/captain.routes.ts` — document Captain parameters, auth, and response schemas.
- `src/modules/captains/captain.service.ts` — expose `captainId` explicitly while retaining the compatible `id` and `staffId` fields.
- `src/modules/deliveries/delivery.routes.ts` — clarify existing delivery parameter/body/auth contracts and examples.
- `src/modules/deliveries/delivery-admin.routes.ts` — align the legacy admin detail route parameter name with its validator/controller and document existing admin list/detail routes.
- `tests/manual-delivery.integration.ts` — make the optional websocket assertion skip available and use the registered customer tracking URL.
- `tests/system.integration.ts` — use the registered customer tracking URL in regression requests.
- `CAPTAIN_DELIVERY_API_AUDIT.md` — record findings, corrections, and validation results.
- `CAPTAIN_DELIVERY_ID_MAPPING.md` — document identifier inputs, existing admin route aliases, and lifecycle evidence.
- `CAPTAIN_DELIVERY_WORKFLOW_TEST_REPORT.md` — record live OpenAPI inspection and HTTP/database workflow results.

## Overall status

- Live process and entry point: **PASS**
- Live Swagger UI and OpenAPI path/input/auth inspection: **PASS**
- Captain CRUD and staff login through the isolated real HTTP workflow: **PASS**
- Admin acceptance and manual assignment: **PASS**
- Captain-only assigned retrieval and detail authorization: **PASS**
- Captain acceptance and persisted state: **PASS**
- Completion and status-based lists: **PASS**
- `npm run build`, `npm test`, and isolated HTTP lifecycle: **PASS**
- Live port-5100 mutating lifecycle: **NOT TESTED**; the currently running server's shared records were deliberately left untouched. Full state-changing HTTP coverage ran against the same app on its isolated listener and verified database persistence.
- Websocket event delivery: **NOT TESTED** in the successful HTTP run; the original event wait has no timeout.
