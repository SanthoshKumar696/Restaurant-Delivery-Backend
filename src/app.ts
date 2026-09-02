import express from "express";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Restaurant Backend API",
  });
});

app.use("/api", routes);
app.use(errorHandler);

export default app;