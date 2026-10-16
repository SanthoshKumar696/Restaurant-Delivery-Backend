# Captain Assigned-Delivery Workflow Verification

## Scope and finding

The backend already provides the requested Captain delivery workflow; no duplicate delivery APIs or delivery records were added. The registered routes and services were inspected and exercised end-to-end over HTTP.

No Captain app source is present in this backend repository. The nearby `restaurnat-testing-application` React project contains only customer and test-admin pages and API clients; it has no Captain login, Captain routes, or delivery screens. The `fingerprint-app` directory is unrelated. Therefore, this work verifies the backend contract but does not claim a Captain UI integration.

## Existing login and identity contract

`POST /api/auth/staff/login` is public and accepts `{ "identifier": "<email-or-phone>", "password": "..." }`. Staff has no username field in the Prisma model; the current supported login identifiers are email or phone. The legacy email-only `{ "email": "...", "password": "..." }` alias remains supported. A successful Captain response includes the staff ID, tenant ID, role, authorized branch assignments, and linked Captain ID, without a password hash.

The staff JWT contains `staffId`, `tenantId`, and `role`. `requireCaptainAuth` verifies the active staff row against those claims and requires role `CAPTAIN`. The Prisma schema models `Captain.id` as a shared-primary-key relation to `StaffUser.id`; this is the only ID equality used by the auth flow. `Delivery.id` and `Delivery.orderId` are separate values. Captain listing operations are scoped by both authenticated tenant and staff ID; detail and actions additionally verify delivery ownership against the authenticated identity and tenant.

## Existing HTTP contracts

All Captain endpoints use the same `Authorization: Bearer <staff login token>` header. The API derives Captain ID and tenant from that token; no Captain ID is sent by the client.

| Operation | Existing method and path |
| --- | --- |
| Upcoming assigned deliveries | `GET /api/delivery/my-upcoming` |
| Current accepted/in-progress deliveries | `GET /api/delivery/my-current` |
| Completed deliveries | `GET /api/delivery/completed` |
| Delivery detail | `GET /api/delivery/{deliveryId}` |
| Accept assignment | `POST /api/delivery/{deliveryId}/accept` |
| Reject assignment | `POST /api/delivery/{deliveryId}/reject` |
| Confirm pickup | `POST /api/delivery/{deliveryId}/picked-up` |
| Start delivery | `POST /api/delivery/{deliveryId}/out-for-delivery` |
| Save GPS location | `POST /api/delivery/{deliveryId}/location` with `latitude` and `longitude` |
| Mark arrived | `POST /api/delivery/{deliveryId}/arrived` |
| Complete delivery | `POST /api/delivery/{deliveryId}/complete` with customer `otp` |

The ID in every delivery detail/action path is `deliveryId` from the list response, not `orderId` or `captainId`. Upcoming/current/completed responses include nested order data with order number, item snapshots, totals, address, instructions, and delivery status.

Allowed progression is `ASSIGNED` → `ACCEPTED` → `PICKED_UP` → `OUT_FOR_DELIVERY` → `ARRIVED` → `DELIVERED`. Reject is allowed only while `ASSIGNED`; it returns the existing delivery to `PENDING`/unassigned and stores a `REJECTED` offer history entry. Completion requires customer OTP. The completion transaction sets the delivery to `DELIVERED`, the linked order to `COMPLETED`, and records order status history.

## End-to-end API and database test

`SKIP_DELIVERY_SOCKET_ASSERTIONS=1 npm run test:manual` passed. This integration suite sent real HTTP requests to the running test server and queried the database for state assertions. Test data used isolated tenant `MAN50597940`; the primary run used order `247`, delivery `175`, and authenticated Captain/staff ID `416` after reassignment to Ramesh. These are test fixture IDs, not production identifiers.

| Flow step | HTTP result | Database/response result |
| --- | --- | --- |
| Admin accepts customer order, marks `PREPARING`, then `READY` | Each request HTTP 200 | Order reached `READY`; its one existing delivery was `PENDING` before assignment |
| Admin assigns Captain | HTTP 200 | The existing Delivery ID `175` remained attached to Order ID `247`; status became `ASSIGNED` |
| Captain logs in by staff email | HTTP 200 | JWT and profile identified staff ID `416`, tenant `MAN50597940`, role `CAPTAIN`, and linked Captain ID; token was used for subsequent calls |
| Captain loads upcoming list | HTTP 200 | Returned the assigned delivery, distinct delivery/order IDs, order details/items/totals/address/instructions, and `ASSIGNED` status |
| Captain opens delivery detail | HTTP 200 | Resolved using delivery ID `175`; previous Captain access after reassignment was rejected with HTTP 403 |
| Captain accepts assignment | HTTP 200 | Existing delivery changed to `ACCEPTED`; offer recorded as `ACCEPTED`; it disappeared from upcoming and appeared in current list |
| Captain pickup | HTTP 200 | Delivery status changed to `PICKED_UP` |
| Captain starts delivery | HTTP 200 | Delivery changed to `OUT_FOR_DELIVERY`; linked Order changed to `OUT_FOR_DELIVERY` |
| Captain updates location and marks arrival | Each request HTTP 200 | Location was saved; status became `ARRIVED` |
| Customer requests completion OTP; Captain completes | Each request HTTP 200 | Delivery persisted as `DELIVERED`; linked Order persisted as `COMPLETED` |
| Captain refreshes completed/current/upcoming lists | Each request HTTP 200 | Delivery appeared in completed and was absent from current and upcoming |
| Duplicate acceptance, post-acceptance reassignment, duplicate lifecycle transitions | HTTP 409 | Invalid repeat/progressed transitions were refused |
| Competing admin assignments | One HTTP 200, one HTTP 409 | A single Delivery record remained; the successful assignment and offer history matched persisted state |
| Reject an assigned delivery | HTTP 200 | Delivery returned to `PENDING` and offer history retained status `REJECTED`; reassignment to the rejecting Captain was rejected |

Socket assertions were explicitly skipped for this manual run. Socket behavior remains separately covered by the system integration suite.

## Live Swagger verification

At `http://localhost:5100/api-docs/`, the Swagger UI returned HTTP 200. The live `swagger-ui-init.js` bootstrap also returned HTTP 200 and contained all documented paths above, including the exact completion route `/api/delivery/{deliveryId}/complete` and tracking route `/api/delivery/{deliveryId}/location`.

## Build and tests

- `npm run build` — PASS.
- `npm test` — PASS; system suite includes Captain identity, tenant isolation, lifecycle, and delivery ownership assertions.
- `SKIP_DELIVERY_SOCKET_ASSERTIONS=1 npm run test:manual` — PASS; full HTTP/database lifecycle described above.
- `git diff --check` — PASS.

## App scope

Per the user's clarification, this task was limited to backend APIs and workflow verification. The backend contract and delivery lifecycle are verified; no Captain app UI changes were requested in this scope. No Captain-specific app source was present in the accessible workspace.
