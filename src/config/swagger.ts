import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Restaurant Backend API",
      version: "1.0.0",
      description: "Restaurant Management Backend API Documentation",
    },

    servers: [
      {
        //url: "http://localhost:5100",
        //description: "Local development server",
         url: "/",
        description: "current development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token from admin login. Format: Authorization: Bearer <token>",
        },
        customerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token from customer login. Format: Authorization: Bearer <token>",
        },
        staffAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Bearer JWT from POST /api/auth/staff/login. For Captain routes, the token's staffId and tenantId determine the Captain profile and tenant; never pass a client-supplied captainId as proof of ownership.",
        },
      },
      schemas: {
        CaptainProfile: {
          type: "object",
          required: ["id", "captainId", "staffId", "fullName", "phone", "role", "isActive"],
          properties: {
            id: {
              type: "integer",
              description: "Legacy-compatible alias of captainId.",
              example: 78,
            },
            captainId: {
              type: "integer",
              description: "Captain profile ID. It is also the linked StaffUser.id.",
              example: 78,
            },
            staffId: {
              type: "integer",
              description: "Linked StaffUser primary key; equal to captainId in the shared-primary-key relation.",
              example: 78,
            },
            fullName: { type: "string", example: "Captain One" },
            phone: { type: "string", example: "9876543210" },
            email: { type: "string", nullable: true, example: "captain@example.com" },
            role: { type: "string", enum: ["CAPTAIN"], example: "CAPTAIN" },
            isActive: { type: "boolean", example: true },
            vehicleType: { type: "string", nullable: true, example: "Bike" },
            vehicleNumber: { type: "string", nullable: true, example: "TN01AB1234" },
            currentStatus: { type: "string", example: "AVAILABLE" },
            branchAssignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", example: "T001-B001" },
                  name: { type: "string", example: "Main Branch" },
                },
              },
            },
          },
        },
        CaptainDelivery: {
          type: "object",
          required: ["id", "deliveryId", "orderId", "captainId", "order", "captain", "status", "assignedAt", "acceptedAt"],
          properties: {
            id: { type: "integer", example: 55 },
            deliveryId: {
              type: "integer",
              description: "Primary key of the Delivery record; use this in delivery detail and action paths.",
              example: 130,
            },
            orderId: {
              type: "integer",
              description: "Primary key of the linked customer Order; distinct from deliveryId.",
              example: 188,
            },
            captainId: {
              type: "integer",
              nullable: true,
              description: "Captain profile ID assigned to this delivery; null when unassigned. Captain.id shares the StaffUser.id primary key.",
              example: 303,
            },
            order: {
              type: "object",
              required: ["id", "orderNumber", "status", "fulfillmentType", "customer", "items", "totals"],
              properties: {
                id: { type: "integer", example: 101 },
                orderId: { type: "integer", description: "Same customer Order ID as the top-level orderId.", example: 188 },
                orderNumber: { type: "string", example: "ORD-20261013-001" },
                status: { type: "string", enum: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "REJECTED"] },
                fulfillmentType: { type: "string", enum: ["DELIVERY", "PICKUP"] },
                customer: {
                  type: "object",
                  properties: {
                    fullName: { type: "string", nullable: true, example: "Sam Customer" },
                    phone: { type: "string", example: "9876543210" },
                  },
                },
                deliveryAddressLine: { type: "string", nullable: true },
                deliveryLandmark: { type: "string", nullable: true },
                deliveryLatitude: { type: "string", nullable: true, example: "13.0827000" },
                deliveryLongitude: { type: "string", nullable: true, example: "80.2707000" },
                deliveryPhone: { type: "string", nullable: true },
                instructions: { type: "string", nullable: true, example: "Leave at the reception" },
                paymentStatus: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] },
                payment: {
                  type: "object",
                  nullable: true,
                  properties: {
                    method: { type: "string", nullable: true, enum: ["CASH_ON_DELIVERY", "ONLINE"] },
                    status: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] },
                  },
                },
                itemCount: { type: "integer", example: 2 },
                totals: {
                  type: "object",
                  properties: {
                    subtotal: { type: "number" },
                    discountAmount: { type: "number" },
                    packagingCharge: { type: "number" },
                    deliveryCharge: { type: "number" },
                    cgstAmount: { type: "number" },
                    sgstAmount: { type: "number" },
                    igstAmount: { type: "number" },
                    totalAmount: { type: "number" },
                  },
                },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      productName: { type: "string" },
                      variantName: { type: "string", nullable: true },
                      quantity: { type: "integer" },
                      unitPrice: { type: "number" },
                      lineTotal: { type: "number" },
                    },
                  },
                },
              },
            },
            captain: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                fullName: { type: "string" },
              },
            },
            status: {
              type: "string",
              enum: ["PENDING", "OFFERED", "ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "ARRIVED", "DELIVERED", "FAILED", "CANCELLED"],
            },
            assignedAt: { type: "string", format: "date-time", nullable: true },
            acceptedAt: { type: "string", format: "date-time", nullable: true },
            pickedUpAt: { type: "string", format: "date-time", nullable: true },
            outForDeliveryAt: { type: "string", format: "date-time", nullable: true },
            arrivedAt: { type: "string", format: "date-time", nullable: true },
            deliveredAt: { type: "string", format: "date-time", nullable: true },
            assignmentHistory: {
              type: "array",
              description: "Included in admin delivery responses; records Captain assignment outcomes.",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  captainId: { type: "integer" },
                  captainName: { type: "string" },
                  status: { type: "string", enum: ["OFFERED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"] },
                  offeredAt: { type: "string", format: "date-time" },
                  respondedAt: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
            currentLocation: {
              type: "object",
              nullable: true,
              properties: {
                latitude: { type: "string", example: "13.0827000" },
                longitude: { type: "string", example: "80.2707000" },
                recordedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },

    security: [],

    tags: [
      {
        name: "Health",
        description: "Backend health and status APIs",
      },
      {
        name: "Auth",
        description: "Authentication and login APIs (Customer and Admin)",
      },
      {
        name: "Customer App",
        description: "Customer-facing APIs for mobile app and website (Profile, Address, My Orders, Order Tracking)",
      },
      {
        name: "Admin CRM",
        description: "Admin customer management and CRM operations",
      },
      {
        name: "Orders",
        description: "Customer-facing order APIs for the logged-in customer (Create order, My Orders, Status tracking, Cancel order)",
      },
      {
        name: "Admin Orders",
        description: "Restaurant admin order management APIs (View all orders, Accept, Reject, Update status)",
      },
      {
        name: "Categories",
        description: "Category management APIs",
      },
      {
        name: "Products",
        description: "Product management APIs",
      },
      {
        name: "Product Variants",
        description: "Product variant management APIs",
      },
      {
        name: "Add-on Groups",
        description: "Add-on group and product add-on management APIs",
      },
      {
        name: "Reports",
        description: "Admin reporting and analytics APIs",
      },
      {
        name: "Staff",
        description: "Staff management APIs",
      },
      {
        name: "Captains",
        description: "Captain management and assignment APIs",
      },
      {
        name: "Tenants",
        description: "Tenant/Restaurant management APIs",
      },
      {
        name: "Branches",
        description: "Branch management APIs",
      },
      {
        name: "Payments",
        description: "Payment processing APIs",
      },
      {
        name: "Deliveries",
        description: "Delivery management APIs",
      },
      {
        name: "Coupons",
        description: "Coupon and promotional code APIs",
      },
      {
        name: "Offers",
        description: "Offer and promotion APIs",
      },
      {
        name: "Loyalty",
        description: "Loyalty program and rewards APIs",
      },
      {
        name: "Reviews",
        description: "Customer review and rating APIs",
      },
    ],
  },

  apis: [
    "./src/routes/**/*.ts",
    "./src/modules/**/*.routes.ts",
    "./src/controllers/**/*.ts",
  ],

  failOnErrors: true,
};

const swaggerSpec = swaggerJSDoc(options);

for (const [path, definition] of Object.entries((swaggerSpec as { paths?: Record<string, Record<string, unknown>> }).paths ?? {})) {
  if (/^\/api\/(categories|products|product-variants|addon-groups|addon-group-items|product-addon-groups)(\/|$)/.test(path)) {
    for (const [method, operation] of Object.entries(definition ?? {})) {
      if (method.toLowerCase() === "get" && operation && typeof operation === "object" && !("$ref" in operation)) {
        (operation as { security?: unknown }).security = [];
      }
    }
  }

  if (/^\/api\/tenants(\/|$)/.test(path)) {
    for (const [method, operation] of Object.entries(definition ?? {})) {
      if (operation && typeof operation === "object" && !("$ref" in operation)) {
        (operation as { security?: unknown }).security = [];
      }
    }
  }

  if (/^\/api\/orders(\/|$)/.test(path) || /^\/api\/payments(\/|$)/.test(path)) {
    for (const operation of Object.values(definition ?? {})) {
      if (operation && typeof operation === "object" && !("$ref" in operation)) {
        (operation as { security?: unknown }).security = [{ customerAuth: [] }];
      }
    }
  }

  if (/^\/api\/(admin\/orders|staff)(\/|$)/.test(path)) {
    for (const operation of Object.values(definition ?? {})) {
      if (operation && typeof operation === "object" && !("$ref" in operation)) {
        (operation as { security?: unknown }).security = [{ bearerAuth: [] }];
      }
    }
  }

  if (/^\/api\/customers(\/|$)/.test(path)) {
    const customerAppPath = /\/profile(\/|$)|\/addresses(\/|$)/.test(path);
    for (const operation of Object.values(definition ?? {})) {
      if (operation && typeof operation === "object" && !("$ref" in operation)) {
        (operation as { security?: unknown }).security = [
          { [customerAppPath ? "customerAuth" : "bearerAuth"]: [] },
        ];
      }
    }
  }
}

export default swaggerSpec;
