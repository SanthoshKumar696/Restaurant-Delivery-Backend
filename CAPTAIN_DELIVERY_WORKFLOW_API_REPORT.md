# Captain Delivery Workflow API Report

## Gap Analysis

- The existing Captain endpoints already reused staff JWT authentication and enforced Captain ownership and tenant scope for detail, acceptance, pickup, tracking, and completion.
- `/api/delivery/my-upcoming`, `/my-current`, and `/completed` already separated the delivery lists; the list/detail response needed order instructions, item count, and payment details.
- Admin assignment rejected a second active delivery for the same Captain, preventing two same-address orders from remaining individually assigned.
- The database already had `DeliveryOfferStatus.REJECTED` and `respondedAt`, but no Captain rejection endpoint. Admin delivery responses did not expose offer history.
- `DeliveryOffer` has no rejection-reason column; reason persistence would require a schema migration, so this change records the supported rejection status and timestamp without adding a new field.

## Endpoints Reused or Added

| Endpoint | Result |
|---|---|
| `POST /api/auth/staff/login` | **PASS** — Existing staff login authenticates Captains; Captain and delivery IDs use the existing shared staff/Captain primary key relationship. |
| `GET /api/delivery/my-deliveries` | **PASS** — Lists nonterminal deliveries assigned to the authenticated Captain. |
| `GET /api/delivery/my-upcoming` | **PASS** — Lists only `ASSIGNED` deliveries. |
| `GET /api/delivery/my-current` | **PASS** — Lists `ACCEPTED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, and `ARRIVED` deliveries. |
| `GET /api/delivery/completed` | **PASS** — Lists only `DELIVERED` deliveries. |
| `GET /api/delivery/:id` | **PASS** — Returns enriched details only to the assigned Captain in the same tenant. |
| `POST /api/delivery/:id/accept` | **PASS** — Accepts only the authenticated Captain’s `ASSIGNED` delivery; acceptance is recorded in the delivery and offer history. |
| `POST /api/delivery/:id/reject` | **PASS** — New Captain-authenticated route. Records a rejected offer, clears the assignment, and returns the delivery to the admin unassigned queue. Only `ASSIGNED` deliveries can be rejected. |
| `POST /api/delivery/:id/picked-up`, `/out-for-delivery`, `/arrived`, `/complete` | **PASS** — Existing lifecycle routes retained and verified. Completion continues to require the customer OTP. |
| `GET /api/delivery/admin/:id` | **PASS** — Admin response now exposes offer history, including Captain name, status, and response timestamp. |

The list and detail responses include order and delivery IDs/statuses, customer name and phone, delivery address and coordinates, instructions, item names/quantities, item count, totals, payment status/method when available, and lifecycle timestamps. Password hashes and tokens are not returned.

## HTTP Examples and Results

The final `npm run test:manual` run used real HTTP requests against the project’s Express application and isolated test data. It completed with `passed: true`.

### Same address, distinct customers and deliveries

Two test customers placed delivery orders to `Shared Chennai Address`. Both were assigned to Captain `303`:

| Customer | Order ID | Delivery ID | Final delivery status |
|---|---:|---:|---|
| Customer 38 | 188 | 130 | `DELIVERED` |
| Customer 39 | 189 | 131 | `DELIVERED` |

**PASS** — The upcoming list returned both records separately, with distinct order and delivery IDs. Accepting delivery `130` did not accept or remove delivery `131`; delivery `131` stayed `ASSIGNED` until separately accepted. Each completed independently, and both appeared in the completed list. Captain status remained `BUSY` after the first completion and changed to `AVAILABLE` after the second.

### Assignment and acceptance

**PASS** — Customer order `187` was accepted by the admin, moved through `PREPARING` and `READY`, and assigned to Captain `303`. The Captain accepted delivery `129`; a duplicate acceptance returned **409**. Delivery and offer acceptance status/timestamp were verified in the database.

### Rejection and admin reassignment

**PASS** — Captain `305` rejected delivery `132` while it was `ASSIGNED`. The API returned **200**, the delivery returned to `PENDING` with no assigned Captain, and the database offer record was `REJECTED` with `respondedAt` set. The delivery disappeared from that Captain’s upcoming list. The admin delivery detail exposed the rejection, then reassigned the delivery to Captain `304` without deleting the rejection record.

Example request:

```http
POST /api/delivery/132/reject
Authorization: Bearer <Captain token>
```

Verified response fields:

```json
{
  "success": true,
  "message": "Delivery rejected and returned to the unassigned queue",
  "data": {
    "id": 132,
    "status": "PENDING",
    "captain": null
  }
}
```

**PASS** — Rejecting delivery `130` after pickup returned **409**; the delivery continued through its normal delivery lifecycle.

### Ownership, tenant scope, and lifecycle

- **PASS** — Another Captain received **403** when attempting to view, accept, or update a delivery owned by Captain `303`.
- **PASS** — A foreign-tenant Captain’s list did not include the test tenant’s deliveries.
- **PASS** — Invalid captain, tenant mismatch, pre-READY assignment, pickup-order assignment, missing delivery record, reassignment, and invalid lifecycle actions were rejected by existing validation/authorization rules.
- **PASS** — For deliveries `129`, `130`, and `131`, the database showed delivery status `DELIVERED` and order status `COMPLETED`; completed records remained individually retrievable.

## Live Server and Swagger Verification

**PASS** — Port `5100` was served by PID `100652`, running the project’s `tsx` loader with `src/server.ts` and the repository’s `node_modules`. The server remained running; it was not stopped or restarted.

**PASS** — Read-only HTTP checks against `http://localhost:5100` authenticated Captain `303` through the existing staff-login endpoint, fetched completed deliveries `130` and `131`, retrieved delivery `130`, confirmed delivery `132` was absent from Captain `305`’s upcoming list, and confirmed admin delivery detail retained the rejection history.

**PASS** — The live Swagger UI document at `/api-docs/` contains OpenAPI `3.0.3`, all existing Captain list/detail/accept routes, the new `POST /api/delivery/{id}/reject` path with `staffAuth`, required path parameter, and documented **409** error. Captain list response references resolve to `#/components/schemas/CaptainDelivery`.

### Full-flow live-server test limitation

**BLOCKED** — A full *new customer order creation* run against the already-running PID `100652` stopped during test setup at `POST /api/auth/customer/send-otp`. That request returned **200**, but the test harness then received no OTP from its own in-memory test provider because the live server and test runner are separate processes. The harness stopped before order creation; this was not an order or delivery API failure. I did not retry against the live server to avoid sending additional OTPs to test phone numbers through its configured SMS provider. The complete customer-to-completion HTTP flow passed using the project’s test server, and the resulting persisted test records were then verified via HTTP against port `5100`.

## Database Fields and Relationship Changes

- No Prisma schema or migration changes were required.
- `Delivery.captainId` continues to reference the Captain profile, whose primary key is the associated `StaffUser.id`; protected routes derive this ID and the tenant from the authenticated staff context.
- Assignment/acceptance/rejection outcomes use the existing `DeliveryOffer` row, unique by `(deliveryId, captainId)`, with `status`, `offeredAt`, and `respondedAt`.
- Rejection sets the delivery back to `PENDING` and clears its Captain assignment; the offer row preserves the `REJECTED` outcome for admin review.
- `Delivery` remains unique per order. No grouping or deduplication by customer/address/coordinates was added.

## Files Changed

- `src/modules/deliveries/delivery.service.ts` — Enriched order response fields; allows a Captain to hold multiple active deliveries; tracks offers on assignment, acceptance, and rejection; returns admin-visible assignment history; preserves `BUSY` status until all active deliveries are resolved.
- `src/modules/deliveries/delivery.controller.ts` — Added the authenticated Captain rejection handler.
- `src/modules/deliveries/delivery.routes.ts` — Registered and documented the rejection endpoint.
- `src/config/swagger.ts` — Documented the enriched Captain delivery response and admin assignment history.
- `tests/manual-delivery.integration.ts` — Added two-customer same-address workflow, isolated acceptance/completion, rejection/history, reassignment, and optional base-URL support for real-server checks.

## Regression Results

| Check | Result |
|---|---|
| `npm run build` | **PASS** |
| `npm run test:manual` | **PASS** — Final run included same-address orders `188`/`189`, deliveries `130`/`131`, and rejection delivery `132`. |
| `npm test` | **PASS** — System integration output ended with `passed: true`; logged 4xx errors were expected negative assertions. |
| Live Swagger/OpenAPI validation | **PASS** |
| Read-only Captain/admin API verification on port `5100` | **PASS** |
| Full fresh-customer flow initiated directly against the existing port `5100` process | **BLOCKED** — OTP test-provider state is process-local, as detailed above. |

## Remaining Limitations

- **NOT SUPPORTED BY CURRENT MODEL** — Captain rejection reasons are not persisted because `DeliveryOffer` has no reason field. Rejection status and timestamp are persisted. Adding a reason requires a deliberate Prisma schema migration.
- The existing delivery-offer model allows one offer row per Captain and delivery. Reassignment to the same Captain after that Captain rejected the delivery is refused with **409** so the recorded rejection is not overwritten.
