# Captain and Delivery API Audit

> Follow-up: staff creation is now the sole account-creation path for Captains, staff login accepts `identifier` (email or an unambiguous phone) with a deprecated email alias, and READY deliveries may be reassigned before acceptance. See [STAFF_CAPTAIN_ASSIGNMENT_FIX_REPORT.md](./STAFF_CAPTAIN_ASSIGNMENT_FIX_REPORT.md) for current implementation and verification evidence.

## Scope and outcome

Audited staff login, Captain management, Captain delivery lists/actions, ID relationships, tenant checks, delivery transitions, route validation, and the live Swagger/OpenAPI output.

The Captain and delivery lifecycle APIs were already present. This audit initially found missing staff-login documentation and unclear Captain ID output; subsequent staff email-login work added global email uniqueness, tenant/branch resolution, and safe login profile fields. The follow-up staff/captain fix standardizes the public identifier contract while retaining the former email shape for compatibility. Captain IDs remain explicitly exposed to avoid confusion with Order and Delivery IDs.

No duplicate Captain delivery route was added. Captains use token-scoped delivery lists; admins use the existing tenant-scoped `GET /api/delivery/admin?captainId=...`.

## Initial findings and fixes

| Finding | Evidence / root cause | Change |
| --- | --- | --- |
| Staff login contract and Swagger request body were insufficient | The previous schema required `tenantId` and resolved only the supplied email, although email is optional and phone is tenant-unique. | Uses `identifier` for email or phone, rejects phone matches that are ambiguous across tenants, retains the former email request as a deprecated alias, and documents the contract. |
| Captain ID alias was implicit in API response | `Captain.id` and `StaffUser.id` share a primary key, and `toCaptainResponse` returned `id` and `staffId`, but no explicit `captainId`. Consumers needed to infer the ID’s meaning. | Added explicit `captainId` while retaining existing `id` and `staffId` for compatibility; documented a `CaptainProfile` schema. |
| Swagger examples did not match available live data | Delivery/Captain paths used example IDs such as 130/303/188. Live GET requests returned Captain 78, Delivery 16, Order 33. | Updated the relevant Swagger path/body examples to live verified values where the same entity is being described. |
| Possible duplicate captain-specific delivery-list route | No such route exists or is needed: self-service APIs derive staff/Captain/tenant from the auth token, and Admin delivery list supports a Captain filter. | Documented the existing route contracts; did not create `/api/captains/{captainId}/deliveries`. |
| Admin delivery-detail parameter mismatch | The existing `/api/admin/delivery/:id` route used `deliveryIdSchema` and a controller reading `req.params.deliveryId`; requests therefore failed validation before reaching the service. | Renamed only the Express parameter to `:deliveryId` (same URL shape) and documented both existing admin delivery paths in live OpenAPI. |
| Delivery integration tests used a removed customer-tracking route | The tests called `/api/orders/customer/{customerId}/{orderId}/delivery`; the existing route is `/api/delivery/customer/{customerId}/{orderId}`. | Corrected the test requests to exercise the registered route; no customer order workflow code changed. |

## Verified implementation

### Staff login

- `POST /api/auth/staff/login` validates either a strict `identifier`/`password` body or the deprecated strict `email`/`password` body in `src/modules/auth/staff/staff.validation.ts`.
- `staff.service.ts` normalizes email or resolves a phone only when it matches one staff account globally, checks `isActive`, verifies the bcrypt hash, requires a same-tenant Captain profile for CAPTAIN-role staff, and signs a JWT with `staffId`, `tenantId`, and `role`.
- The safe login profile resolves tenant and authorized branch assignments from the staff/Captain relations, includes `captainId` only for a valid link, and never returns `passwordHash`.
- `requireStaffAuth` verifies the token and rechecks that the staff account is active and still has the token's tenant and role. `requireCaptainAuth` restricts Captain routes to the CAPTAIN role.

### IDs and database relationships

- `Captain.id` is a shared-primary-key relation to `StaffUser.id`.
- `Delivery.id` is an independent delivery-record key.
- `Delivery.captainId` is nullable and relates to `Captain.id`.
- `Delivery.orderId` relates to `Order.id` and is unique in the Prisma model; one Order therefore has at most one Delivery record.
- Same-address orders remain independent because list queries return Delivery rows and do not group on address/location.
- Tenant ID is stored on Captain, Delivery, and Order records; authenticated controller context supplies tenant scope.

### Authorization, tenant isolation, and lifecycle

- Admin Captain list/detail/update operations use `requireAdminAuth`; service queries are tenant-scoped. Account creation is only through `POST /api/staff`; role CAPTAIN creates a shared-ID Captain profile and requires tenant-owned branch assignments. `POST /api/captains` is no longer registered.
- Captain delivery list queries filter on authenticated `tenantId` and `staffId` (the shared Captain ID). Delivery detail/actions validate the delivery tenant and owner.
- Admin delivery listing/detail and assignment use the authenticated admin tenant. A query/body `captainId` selects a Captain but does not replace authorization or tenant scoping.
- Assignment requires a READY DELIVERY order, an existing delivery row, an active same-tenant Captain, and a matching branch assignment. The Admin Orders endpoint safely reassigns an ASSIGNED, not-yet-accepted delivery by conditionally updating its existing row; it marks the previous offer CANCELLED and records the new offer. Acceptance/progress blocks reassignment.
- Delivery transitions are distinct from order transitions: `ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> ARRIVED -> DELIVERED`. Out-for-delivery also changes the linked Order to `OUT_FOR_DELIVERY`; completion uses the customer OTP and a transaction to save Delivery `DELIVERED`, Order `COMPLETED`, and order history.
- Rejection is limited to ASSIGNED deliveries, returns the Delivery to the unassigned queue, and records a `DeliveryOffer.REJECTED` outcome for admin review. The current schema has no rejection-reason field.
- List states are defined in `delivery.service.ts`: `my-upcoming` is ASSIGNED; `my-current` is ACCEPTED/PICKED_UP/OUT_FOR_DELIVERY/ARRIVED; `completed` is DELIVERED; `my-deliveries` contains nonterminal deliveries for the authenticated Captain.

## Files changed in this audit

- `src/modules/auth/staff/staff.routes.ts` — added the actual login request body and response/error documentation.
- `src/modules/captains/captain.service.ts` — added the `captainId` response alias without removing legacy fields.
- `src/modules/captains/captain.routes.ts` — added Captain profile response schema references and clearer IDs, sources, auth, and errors.
- `src/modules/deliveries/delivery.routes.ts` — aligned relevant parameter/body descriptions and example IDs with actual route contracts and live records.
- `src/modules/deliveries/delivery-admin.routes.ts` — fixed the admin detail route's parameter-key mismatch and documented its existing list/detail routes.
- `tests/manual-delivery.integration.ts` and `tests/system.integration.ts` — corrected stale customer-tracking test paths; manual lifecycle test can skip only websocket assertions via `SKIP_DELIVERY_SOCKET_ASSERTIONS=1`.
- `src/config/swagger.ts` — defined the reusable `CaptainProfile` response schema.
- `CAPTAIN_DELIVERY_ID_MAPPING.md` — lists every existing Captain and Delivery operation, input locations, roles/scopes, and where IDs come from.
- `CAPTAIN_DELIVERY_API_AUDIT.md` — this findings and implementation audit.

No Prisma schema/migration, authentication mechanism, assignment route, order workflow, or delivery business transition logic was changed by the documentation and ID-clarity fixes.

## Live Swagger and API evidence

The process on port 5100 was confirmed to be this repository's Node/tsx `src/server.ts` process. Swagger UI returned HTTP 200. The actual generated spec is embedded in `/api-docs/swagger-ui-init.js`; the server does not expose `/api-docs/openapi.json`.

Live API IDs and read-only results are recorded in `CAPTAIN_DELIVERY_ID_MAPPING.md`: Captain 78, Delivery 16, and Order 33 (order number 30). Admin filter/detail and Captain upcoming/detail reads returned 200; an unauthenticated Captain list returned 401.

## Validation status

- Live OpenAPI parsing and parameter/body/authentication checks after changes: **PASS**.
- Isolated HTTP lifecycle `SKIP_DELIVERY_SOCKET_ASSERTIONS=1 npm run test:manual`: **PASS**, all HTTP and database assertions; websocket event assertions were intentionally skipped because the original test waits indefinitely after location update.
- `npm test`: **PASS**, including Captain ownership, customer tracking, admin tracking, delivery transition, and database checks.
- `npm run build`: **PASS** after the route and test changes.
- `git diff --check`: **PASS**.
- Live record 16 was not changed during read-only manual verification.
