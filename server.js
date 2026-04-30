import express from "express";
import cors from "cors";
import { initializeFirebase } from "./src/config/firebase.js";
import routes from "./src/routes/index.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.use("/", routes);

// Start server
async function startServer() {
  try {
    await initializeFirebase();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server start failed:", error);
    process.exit(1);
  }
}

startServer();
