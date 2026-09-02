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
        url: "http://localhost:5000",
        description: "Local development server",
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
      },
    },

    security: [{ bearerAuth: [] }],

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
}

export default swaggerSpec;