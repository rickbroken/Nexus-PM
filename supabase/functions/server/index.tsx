import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import {
  getFinancialSummary,
  getProjectFinances,
  markRecurringChargePaid,
  getUpcomingRecurringCharges,
  getFinancialReports,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "./finance.tsx";
import { autoArchiveTasks } from "./auto-archive-tasks.ts";
import { createUser } from "./users.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-17d656ff/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== USER ROUTES =====
app.post("/make-server-17d656ff/users/create", createUser);

// ===== FINANCE ROUTES =====
app.get("/make-server-17d656ff/finance/summary", getFinancialSummary);
app.get("/make-server-17d656ff/finance/project/:projectId", getProjectFinances);
app.post("/make-server-17d656ff/finance/recurring/:id/pay", markRecurringChargePaid);
app.get("/make-server-17d656ff/finance/recurring/upcoming", getUpcomingRecurringCharges);
app.get("/make-server-17d656ff/finance/reports", getFinancialReports);
app.get("/make-server-17d656ff/finance/payment-methods", getPaymentMethods);
app.post("/make-server-17d656ff/finance/payment-methods", createPaymentMethod);
app.put("/make-server-17d656ff/finance/payment-methods/:id", updatePaymentMethod);
app.delete("/make-server-17d656ff/finance/payment-methods/:id", deletePaymentMethod);

// ===== KV STORE ROUTES =====
app.get("/make-server-17d656ff/kv/:key", async (c) => {
  const key = c.req.param("key");
  const value = await kv.get(key);
  
  if (value === null) {
    return c.json({ error: "Key not found" }, 404);
  }
  
  return c.json({ key, value });
});

app.put("/make-server-17d656ff/kv/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  
  await kv.set(key, body.value);
  
  return c.json({ key, value: body.value });
});

// ===== TASKS AUTO-ARCHIVE ROUTE =====
app.post("/make-server-17d656ff/tasks/auto-archive", async (c) => {
  const result = await autoArchiveTasks();
  return c.json(result);
});

Deno.serve(app.fetch);