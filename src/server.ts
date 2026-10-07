import "dotenv/config";
import { createServer } from "node:http";
import app from "./app";
import { initializeDeliverySocket } from "./realtime/delivery-socket";

const PORT = Number(process.env.PORT) || 5000;

const server = createServer(app);
initializeDeliverySocket(server);

server.listen(PORT, () => {
  console.log(`Restaurant Backend running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});