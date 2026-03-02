import { createServer } from "http";
import { Server } from "socket.io";
import { setupListeners } from "./setup-listeners.js";

const PORT = process.env.SERVER_PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "https://typeracer-task.vercel.app";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

setupListeners(io);

httpServer.listen(PORT, () => console.log(`Server is running on port ${PORT}`));