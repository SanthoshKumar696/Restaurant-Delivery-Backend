import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Restaurant Backend running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});