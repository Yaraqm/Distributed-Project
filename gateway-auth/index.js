import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import httpProxy from "http-proxy";
import "dotenv/config";

const app = express();
const proxy = httpProxy.createProxyServer({});

// FIX: parse JSON for all routes
app.use(express.json());

// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Allow proxy to forward POST JSON
proxy.on("proxyReq", (proxyReq, req) => {
  // Forward Authorization header BEFORE sending body
  if (req.headers.authorization) {
    proxyReq.setHeader("Authorization", req.headers.authorization);
  }

  // Forward user metadata
  if (req.headers["x-user-id"]) {
    proxyReq.setHeader("x-user-id", req.headers["x-user-id"]);
  }
  if (req.headers["x-user-role"]) {
    proxyReq.setHeader("x-user-role", req.headers["x-user-role"]);
  }

  // Forward body ONLY for POST/PUT and ONLY if not already sent
  if (req.body && req.method !== "GET") {
    const bodyData = JSON.stringify(req.body);

    // **IMPORTANT FIX** → Only set headers BEFORE writing body
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));

    // Write body BEFORE the request streams
    proxyReq.write(bodyData);
  }
});

// AUTH MIDDLEWARE
app.use((req, res, next) => {
  if (req.path.startsWith("/auth")) return next(); // allow login/register

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.headers["x-user-id"] = user.id;
    req.headers["x-user-role"] = user.role;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
});

// ROUTES
app.all("/auth/*", (req, res) =>
  proxy.web(req, res, { target: "http://localhost:4000" })
);

app.all("/doctor/*", (req, res) =>
  proxy.web(req, res, { target: "http://localhost:4001" })
);

app.all("/admin/*", (req, res) =>
  proxy.web(req, res, { target: "http://localhost:4002" })
);

app.all("/lab/*", (req, res) =>
  proxy.web(req, res, { target: "http://localhost:4003" })
);

app.all("/pharmacy/*", (req, res) =>
  proxy.web(req, res, { target: "http://localhost:4004" })
);

app.listen(3000, () => console.log("gateway-auth running on port 3000"));
