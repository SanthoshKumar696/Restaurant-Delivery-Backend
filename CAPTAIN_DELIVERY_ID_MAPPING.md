# Captain and Delivery API Input / ID Mapping

## Identifier relationships

| Identifier | Database meaning | Where to obtain it |
| --- | --- | --- |
| `tenantId` | Restaurant tenant key | For self-service, derive from the staff/customer JWT; admin APIs derive it from the authenticated admin. Staff login resolves it from the globally matched email or an unambiguous phone identifier. |
| `staffId` / `StaffUser.id` | Staff login account primary key | `data.staff.staffId` (also returned as legacy `data.staff.id`) from `POST /api/auth/staff/login`; for Captain, it equals `Captain.id`. |
| `captainId` / `Captain.id` | Captain profile and delivery-assignment identity | `captainId` returned by the Captain Management API (`GET /api/captains`, `GET /api/captains/me`). Legacy `id` is retained with the same value. |
| `orderId` / `Order.id` | Customer order primary key | Customer order creation or Admin Orders response. It is distinct from `deliveryId`. |
| `deliveryId` / `Delivery.id` | Separate delivery/assignment primary key | Delivery list, delivery detail, or assignment response. It is distinct from `orderId` and `captainId`. |
| `branchId` | Restaurant branch key | Branches available to the authenticated tenant. Staff creation and Captain profile updates validate every supplied branch against that tenant. |

`Captain.id` is the same primary key as `StaffUser.id`: `Captain.id` references `StaffUser.id`, not a separate staff foreign-key column. `Delivery.captainId` references `Captain.id`; `Delivery.orderId` references `Order.id` and is unique, so at most one Delivery row exists per Order. Multiple distinct Orders/Deliveries may belong to one Captain, including orders with the same address. Address/coordinates are not used as record keys.

## Actual endpoint contracts

`Bearer` below means the request header `Authorization: Bearer <token>`. No Captain endpoint accepts a client-supplied Captain ID as authorization proof. Captain self-service scope is derived from the staff token; admin data is tenant-scoped from admin authentication.

| Method and path | Inputs (location, requiredness, source) | Caller and scope | Success response / relevant errors |
| --- | --- | --- | --- |
| `POST /api/auth/staff/login` | Preferred JSON body: `identifier` and `password`; identifier accepts email or phone. The deprecated `email` + `password` shape remains supported. | Public login; email is globally unique and phone must identify exactly one staff account across tenants. Tenant and branch context are resolved from the database. | `200` token + safe staff profile with `staffId`, `tenantId`, `branchAssignments`/`branchIds`, optional single `branchId`, and linked `captainId`; `400` validation; `401` invalid, inactive, or ambiguous credentials; `403` missing Captain profile. |
| `POST /api/staff` | JSON body includes `fullName`, `phone`, `password`, `role`, optional `email` and `branchIds[]`. A CAPTAIN requires at least one branch ID. Tenant comes from admin authentication; a legacy supplied `tenantId` must match. | Admin bearer; staff and Captain branches are tenant-scoped. | `201` one staff account; role CAPTAIN creates exactly one linked Captain profile using the shared ID; `400/403` invalid fields or branch scope; `409` duplicate phone/email. |
| `GET /api/captains` | Admin bearer only; no path/query/body parameter. Each item returns `captainId` and legacy `id`. | Admin bearer; current admin tenant. | `200` Captain list; `401/403` auth/scope errors. |
| `GET /api/captains/available` | Admin bearer only; no path/query/body parameter. | Admin bearer; current admin tenant; active Captain availability filter. | `200` available Captain list; `401/403`. |
| `GET /api/captains/me` | Staff bearer only; no `captainId` input. Captain comes from `staffId` in token. | Captain role; token tenant. | `200` Captain profile; `401/403` auth/role; `404` missing Captain profile. |
| `GET /api/captains/availability` | Staff bearer only; no ID parameter. | Captain role; token tenant and staff identity. | `200` `{captainId,status}`; `401/403`; `404` Captain not found. |
| `PUT /api/captains/availability` | Staff bearer plus JSON `{ "status": "AVAILABLE" \| "OFFLINE" }`; no Captain ID in request. | Captain role; token tenant and staff identity. | `200` updated availability; `400` invalid status; `401/403`; `409` cannot go offline with active delivery. |
| `GET /api/captains/{captainId}` | Required positive-integer path `captainId`, obtained from `GET /api/captains`. | Admin bearer; current admin tenant. | `200` one Captain; `400` malformed ID; `401`; `404` absent/out-of-tenant. |
| `PUT /api/captains/{captainId}` | Required path `captainId` from Captain Management; JSON body has at least one Captain field (e.g. `fullName`, `phone`, `email`, `password`, `isActive`, vehicle fields, `branchIds[]`). | Admin bearer; current admin tenant; branch IDs validated against tenant. | `200` updated Captain; `400`; `401/403`; `404`; `409` identity conflict or active-delivery deactivation. |
| `GET /api/delivery/dashboard` | Staff bearer only; no Captain ID or tenant parameter. | Captain role; tenant + Captain derived from token. | `200` current/upcoming/completed arrays and counts; `401/403`. |
| `GET /api/delivery/my-deliveries` | Staff bearer only; no path/query/body parameter. | Captain role; token tenant + Captain. | `200` all active assigned/in-progress delivery records; `401/403`. |
| `GET /api/delivery/my-upcoming` | Staff bearer only; no path/query/body parameter. | Captain role; token tenant + Captain; delivery status `ASSIGNED`. | `200` upcoming delivery list; `401/403`. Each record's `deliveryId` is used for detail/actions. |
| `GET /api/delivery/my-current` | Staff bearer only; no path/query/body parameter. | Captain role; token tenant + Captain; statuses `ACCEPTED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `ARRIVED`. | `200` current-delivery list; `401/403`. |
| `GET /api/delivery/completed` | Staff bearer only; no Captain ID/status query parameter. | Captain role; token tenant + Captain; delivery status `DELIVERED`. | `200` completed-delivery list; `401/403`. Linked order status is `COMPLETED`. |
| `GET /api/delivery/admin` | Optional query `captainId`, a Captain Management ID from `GET /api/captains`; admin bearer required. | Admin role; tenant always derived from authenticated admin. | `200` tenant delivery list, each delivery is a separate item; `400` malformed filter; `401/403`. |
| `GET /api/delivery/admin/{deliveryId}` | Required positive-integer path `deliveryId` from admin delivery list. | Admin bearer; current admin tenant. | `200` delivery and linked order detail; `400`; `401`; `404` outside tenant/not found. |
| `GET /api/admin/delivery` | Optional query `captainId`, a Captain Management ID from `GET /api/captains`; admin bearer required. | Existing admin-route alias; tenant is always derived from admin authentication. | `200` tenant delivery list; `400`; `401/403`. The live OpenAPI now documents this alias as well. |
| `GET /api/admin/delivery/{deliveryId}` | Required positive-integer path `deliveryId` from the admin delivery list. | Existing admin-route alias; admin tenant scope. | `200` delivery and linked order; `400`; `401/403`; `404`. Route parameter name now matches its validator/controller and is documented in live OpenAPI. |
| `POST /api/admin/orders/{orderId}/assign-captain` | Required Order `orderId` path and JSON `{ "captainId": <Captain.id> }` from `GET /api/captains`. | Admin bearer; tenant from authenticated admin; READY DELIVERY order and same-tenant branch-authorized Captain. | `200` updated order and existing delivery ID, current Captain, previous Captain when reassigned, and status. Supports initial assignment and reassignment before acceptance; `409` after acceptance/progress or invalid state. |
| `POST /api/delivery/{deliveryId}/assign` | Required Delivery `deliveryId` path and JSON `{ "captainId": <Captain.id> }` from `GET /api/captains`. | Admin bearer; same tenant; delegates to the same shared assignment service as the Admin Orders endpoint. | `200` updated delivery; `400`; `401/403`; `404`; `409` order not READY, pickup, accepted/progressed state, or rejected Captain. |
| `GET /api/delivery/{deliveryId}` | Required path `deliveryId` from Captain's assigned list. | Staff bearer; Captain ownership and tenant checked against Delivery. | `200` Delivery + linked Order/customer/items/totals; `400`; `401`; `403` another Captain; `404`. |
| `POST /api/delivery/{deliveryId}/accept` | Required path `deliveryId` from `my-upcoming`; no body. Staff bearer is required. | Captain role; assignment and tenant from token; current status must be `ASSIGNED`. | `200` accepted Delivery; `401/403/404`; `409` invalid/concurrent transition. |
| `POST /api/delivery/{deliveryId}/reject` | Required path `deliveryId` from `my-upcoming`; no body/reason supported. Staff bearer required. | Captain role; assignment and tenant from token; status must be `ASSIGNED`. | `200` unassigned Delivery and persisted `DeliveryOffer.REJECTED` history; `400/401/403/404`; `409` invalid state. |
| `POST /api/delivery/{deliveryId}/picked-up` | Required path `deliveryId` from current list; no body. Staff bearer required. | Captain role; assigned Captain + tenant from token; status must be `ACCEPTED`. | `200` updated Delivery; `400/401/403/404`; `409` invalid state. |
| `POST /api/delivery/{deliveryId}/out-for-delivery` | Required path `deliveryId` from current list; no body. Staff bearer required. | Captain role; owned delivery/tenant; status must be `PICKED_UP`, linked order must be READY DELIVERY. | `200` updated Delivery and order status; `400/401/403/404`; `409` invalid state/order. |
| `POST /api/delivery/{deliveryId}/location` | Required path `deliveryId` from current list; JSON `{ "latitude": number, "longitude": number }`, each valid decimal-degree coordinates. Staff bearer required. | Captain role; owned delivery/tenant; delivery must be `OUT_FOR_DELIVERY` or `ARRIVED`. | `200` saved location; `400/401/403/404`; `409` not trackable. |
| `POST /api/delivery/{deliveryId}/arrived` | Required path `deliveryId` from current list; no body. Staff bearer required. | Captain role; owned delivery/tenant; status must be `OUT_FOR_DELIVERY`. | `200` updated Delivery; `400/401/403/404`; `409` invalid state. |
| `POST /api/delivery/{deliveryId}/complete` | Required path `deliveryId` from current list and JSON `{ "otp": "six digits" }`; OTP comes from customer OTP send route. Staff bearer required. | Captain role; owned delivery/tenant; status must be `ARRIVED`; linked Order must be `OUT_FOR_DELIVERY`. | `200` delivery `DELIVERED` + order `COMPLETED`; `400/401/403/404`; `409` state/order transition. |
| `GET /api/delivery/customer/{customerId}/{orderId}` | Required path `customerId` and `orderId`; Order ID comes from customer order response. Customer bearer required. | Customer ID must match token; order and Delivery tenant/customer relationship checked. | `200` tracking info; `401`; `404` unavailable/not owned. |
| `POST /api/delivery/customer/{customerId}/{orderId}/otp` | Required path `customerId` and `orderId`; no body. Customer bearer required. | Customer ID must match token; order must have an ARRIVED Delivery in the token tenant. | `200` OTP sent; `400`; `401`; `404`. |

There is no `GET /api/captains/{captainId}/deliveries` or generic `status` filter. The existing Captain self-service lists are token-scoped, and the admin filter is `GET /api/delivery/admin?captainId=...`. Do not pass `orderId` to a delivery route expecting `deliveryId`.

## Live API Verification

At verification, the listener on port 5100 was Node running this repository's `tsx src/server.ts`. The live Swagger UI returned HTTP 200 and the live OpenAPI document was read from `/api-docs/swagger-ui-init.js` (there is no `/api-docs/openapi.json` route).

Actual IDs read from live APIs: `captainId=78`, `deliveryId=16`, `orderId=33`, linked order number `30`.

| Request | Result |
| --- | --- |
| `POST /api/auth/admin/login` using the existing T001 test admin | **PASS**, 200 |
| `GET /api/captains/78` with admin token | **PASS**, 200 |
| `POST /api/auth/staff/login` for Captain 78 | **PASS**, 200 |
| `GET /api/delivery/admin?captainId=78` with admin token | **PASS**, 200; delivery 16, order 33, Captain 78, `ASSIGNED` |
| `GET /api/delivery/admin/16` with admin token | **PASS**, 200; linked order 33, number 30, order `READY`, delivery `ASSIGNED` |
| `GET /api/delivery/my-upcoming` with Captain token | **PASS**, 200; delivery 16 |
| `GET /api/delivery/16` with Captain token | **PASS**, 200; separate delivery/order IDs and no password hash in output |
| Unauthenticated `GET /api/delivery/my-deliveries` | **PASS**, 401 |

Live OpenAPI includes the exact Captain/delivery routes and ID parameter locations listed above, request-body schemas for login, assignment, location, completion, the `CaptainProfile`/`CaptainDelivery` schemas, and token security requirements. The login body now shows required `tenantId` and `password`, plus `phone` or `email` (`anyOf`). Actual Swagger examples include Captain 78 and Delivery 16.

The existing live delivery 16 was not mutated during the read-only diagnostic. Acceptance/rejection and status-changing results from the separate isolated HTTP lifecycle run are recorded in `CAPTAIN_DELIVERY_WORKFLOW_TEST_REPORT.md`.
