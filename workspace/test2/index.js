import dotenv from "dotenv";
import express from "express";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerAllTools } from "./tool-registry.js";
import { authenticateUserAccount, getUsersSchemaDetails, registerUserAccount } from "./db/auth.js";

// Make HTTP server env loading independent of the current working directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
import cors from 'cors'; // Add this
app.use(cors()); // Enable CORS
app.use(express.json({ limit: "10mb" }));

const frontendDir = path.join(__dirname, "frontend");
app.use(express.static(frontendDir));

function sendFrontendFile(fileName, res) {
  res.sendFile(path.join(frontendDir, fileName));
}

const AUTH_SESSION_COOKIE = "lumicore_session";
const AUTH_SESSION_TTL_MS = 60 * 60 * 1000;
const POST_LOGIN_REDIRECT_URL = process.env.POST_LOGIN_REDIRECT_URL
  || "http://127.0.0.1:18789/#token=984247bffb816e601e74726b1f3ab20cf5cb54596f365bd9";
const authSessions = new Map();

function parseCookies(headerValue) {
  if (typeof headerValue !== "string" || headerValue.length === 0) {
    return {};
  }

  return headerValue.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = rawName.trim();
    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(rawValueParts.join("=").trim() || "");
    return cookies;
  }, {});
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of authSessions.entries()) {
    if (!session || session.expiresAt <= now) {
      authSessions.delete(token);
    }
  }
}

function createAuthSession(user) {
  cleanupExpiredSessions();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + AUTH_SESSION_TTL_MS;
  authSessions.set(token, { user, expiresAt });
  return { token, expiresAt };
}

function getAuthSessionFromRequest(req) {
  cleanupExpiredSessions();
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[AUTH_SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const session = authSessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    authSessions.delete(token);
    return null;
  }

  return { token, ...session };
}

function setAuthSessionCookie(res, token, expiresAt) {
  const maxAgeSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  res.setHeader("Set-Cookie", `${AUTH_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
}

function clearAuthSessionCookie(res) {
  res.setHeader("Set-Cookie", `${AUTH_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Add request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`[${timestamp}] Headers:`, req.headers);
  if (req.body) {
    console.log(`[${timestamp}] Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

const OPENCLAW_COMMAND = process.env.OPENCLAW_BIN
  || (process.platform === "win32"
    ? path.join(process.env.APPDATA || "", "npm", "openclaw.ps1")
    : "openclaw");
const OPENCLAW_WORKDIR = process.env.OPENCLAW_CWD || __dirname;

const resultImagePath = path.resolve(process.cwd(), "result.png");

const tools = new Map();
registerAllTools({
  registerTool(name, config, handler) {
    tools.set(name, { config, handler });
  },
});

const toolAliases = new Map([
  ["volume_de_preparation_en_magazin", "volume_de_preparation_par_magazin"],
  ["volume_de_preparation_magazin", "volume_de_preparation_par_magazin"],
  ["volume_de_preparation_en_magasin", "volume_de_preparation_par_magazin"],
  ["volume_de_preparation_par_magasin", "volume_de_preparation_par_magazin"],
  ["volume_de_preparation_carton", "volume_de_preparation_en_carton"],
  ["volume_preparation_en_carton", "volume_de_preparation_en_carton"],
  ["volume_preparation_carton", "volume_de_preparation_en_carton"],
  ["volume_de_preparation_en_palette", "volume_de_preparation_en_palette"],
  ["volume_de_preparation_palette", "volume_de_preparation_en_palette"],
  ["volume_preparation_en_palette", "volume_de_preparation_en_palette"],
  ["volume_preparation_palette", "volume_de_preparation_en_palette"],
  ["volume_de_preparation_en_cartons", "volume_de_preparation_en_carton"],
  ["volume_de_preparation_cartons", "volume_de_preparation_en_carton"],
  ["volume_preparation_cartons", "volume_de_preparation_en_carton"],
]);

function normalizeToolName(name) {
  if (typeof name !== "string") return "";
  return decodeURIComponent(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveToolName(name) {
  const normalized = normalizeToolName(name);
  return toolAliases.get(normalized) ?? normalized;
}

function parseAgentOutput(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    throw new Error("OpenClaw returned empty output");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const maybeJson = trimmed.slice(start, end + 1);
      return JSON.parse(maybeJson);
    }
    throw new Error("OpenClaw output was not valid JSON");
  }
}

function extractTextPayload(agentResult) {
  const payloads = Array.isArray(agentResult?.result?.payloads)
    ? agentResult.result.payloads
    : agentResult?.payloads;
  if (!Array.isArray(payloads)) {
    return "";
  }
  return payloads
    .map((payload) => (typeof payload?.text === "string" ? payload.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

function extractSessionId(agentResult) {
  const nestedSessionId = agentResult?.result?.meta?.agentMeta?.sessionId;
  if (typeof nestedSessionId === "string" && nestedSessionId.trim()) {
    return nestedSessionId.trim();
  }
  return "";
}

function runOpenClawAgent({ message, agent, sessionId, timeoutMs = Number.parseInt(process.env.OPENCLAW_TIMEOUT_MS || "120000", 10) }) {
  return new Promise((resolve, reject) => {
    const baseArgs = ["agent", "--json", "--message", message];
    if (agent) {
      baseArgs.push("--agent", agent);
    }
    if (sessionId) {
      baseArgs.push("--session-id", sessionId);
    }
    const thinking = String(process.env.OPENCLAW_THINKING || "minimal").trim();
    if (thinking) {
      baseArgs.push("--thinking", thinking);
    }
    if (String(process.env.OPENCLAW_FORCE_LOCAL || "").trim() === "1") {
      baseArgs.push("--local");
    }

    const isPowerShellScript = process.platform === "win32" && /\.ps1$/i.test(OPENCLAW_COMMAND);
    const isCmdScript = process.platform === "win32" && /\.(cmd|bat)$/i.test(OPENCLAW_COMMAND);
    const child = isPowerShellScript
      ? spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", OPENCLAW_COMMAND, ...baseArgs], {
          cwd: OPENCLAW_WORKDIR,
          windowsHide: true,
          env: process.env,
        })
      : isCmdScript
      ? spawn(OPENCLAW_COMMAND, baseArgs, {
          cwd: OPENCLAW_WORKDIR,
          windowsHide: true,
          env: process.env,
          shell: true,
        })
      : spawn(OPENCLAW_COMMAND, baseArgs, {
          cwd: OPENCLAW_WORKDIR,
          windowsHide: true,
          env: process.env,
        });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`OpenClaw request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const detail = [
          stderr.trim(),
          stdout.trim(),
          `Exit code ${code}`,
        ].filter(Boolean).join(" | ");
        reject(new Error(detail));
        return;
      }

      try {
        const parsed = parseAgentOutput(stdout);
        resolve({
          raw: parsed,
          text: extractTextPayload(parsed),
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function materializeImageResult(result) {
  if (!result || !Array.isArray(result.content)) return null;

  const imageItem = result.content.find(
    (item) => item && item.type === "image" && typeof item.data === "string",
  );

  if (!imageItem) return null;

  const buffer = Buffer.from(imageItem.data, "base64");
  await fs.writeFile(resultImagePath, buffer);

  const imageUrl = "http://127.0.0.1:3001/result.png";
  result.content = [{ type: "text", text: `Image generated: result.png (${imageUrl})` }];

  return {
    name: "result.png",
    path: resultImagePath,
    url: imageUrl,
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lumicore-http-tools" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/login", (_req, res) => {
  sendFrontendFile("login.html", res);
});

app.get("/register", (_req, res) => {
  sendFrontendFile("register.html", res);
});

app.get("/auth/schema", async (_req, res) => {
  try {
    const schema = await getUsersSchemaDetails();
    res.json({
      ok: true,
      table: "users",
      columns: schema.orderedColumns,
      statusColumn: schema.statusColumn,
      approvedByColumn: schema.approvedByColumn,
      approvedAtColumn: schema.approvedAtColumn,
      emailColumn: schema.emailColumn,
      firstNameColumn: schema.firstNameColumn,
      lastNameColumn: schema.lastNameColumn,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read users schema";
    const status = error?.code === "ECONNREFUSED" || error?.code === "ER_ACCESS_DENIED_ERROR" ? 503 : 500;
    res.status(status).json({ ok: false, error: message });
  }
});

app.post("/auth/register", async (req, res) => {
  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName : "";
  const fullName = typeof req.body?.fullName === "string" ? req.body.fullName : "";
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  try {
    const result = await registerUserAccount({ firstName, lastName, fullName, email, password });
    res.status(201).json({
      ok: true,
      approvalStatus: result.approvalStatus,
      message: "Registration saved. Wait for admin approval in the users table before logging in.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    const status = error?.code === "DUPLICATE_ACCOUNT"
      ? 409
      : error?.code === "ECONNREFUSED" || error?.code === "ER_ACCESS_DENIED_ERROR"
        ? 503
        : 400;
    res.status(status).json({ ok: false, error: message });
  }
});

app.get("/auth/session", (req, res) => {
  const session = getAuthSessionFromRequest(req);
  if (!session) {
    res.json({ ok: true, authenticated: false, redirectTo: POST_LOGIN_REDIRECT_URL });
    return;
  }

  res.json({
    ok: true,
    authenticated: true,
    redirectTo: POST_LOGIN_REDIRECT_URL,
    expiresAt: new Date(session.expiresAt).toISOString(),
    user: session.user,
  });
});

app.post("/auth/login", async (req, res) => {
  const email = typeof req.body?.email === "string"
    ? req.body.email.trim()
    : typeof req.body?.identifier === "string"
      ? req.body.identifier.trim()
      : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  try {
    const result = await authenticateUserAccount({ email, password });
    const session = createAuthSession(result.user);
    setAuthSessionCookie(res, session.token, session.expiresAt);
    res.json({
      ok: true,
      message: "Login successful.",
      user: result.user,
      redirectTo: POST_LOGIN_REDIRECT_URL,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";

    if (error?.code === "PENDING_APPROVAL") {
      res.status(403).json({
        ok: false,
        error: message,
        approvalStatus: error.approvalStatus || "pending",
      });
      return;
    }

    const status = error?.code === "ACCOUNT_NOT_FOUND" || error?.code === "INVALID_PASSWORD"
      ? 401
      : error?.code === "ECONNREFUSED" || error?.code === "ER_ACCESS_DENIED_ERROR"
        ? 503
        : 400;
    res.status(status).json({ ok: false, error: message });
  }
});

app.post("/auth/logout", (req, res) => {
  const session = getAuthSessionFromRequest(req);
  if (session) {
    authSessions.delete(session.token);
  }

  clearAuthSessionCookie(res);
  res.json({ ok: true, message: "Logged out." });
});

app.get("/tools", (_req, res) => {
  const list = [...tools.entries()].map(([name, item]) => ({
    name,
    title: item.config?.title ?? name,
    description: item.config?.description ?? "",
  }));
  res.json({ ok: true, count: list.length, tools: list });
});

app.get("/result.png", async (_req, res) => {
  try {
    await fs.access(resultImagePath);
    res.sendFile(resultImagePath);
  } catch {
    res.status(404).json({ ok: false, error: "result.png not found" });
  }
});

app.post("/tools/:toolName", async (req, res) => {
  const toolName = resolveToolName(req.params.toolName);
  const tool = tools.get(toolName);

  if (!tool) {
    res.status(404).json({ ok: false, error: `Unknown tool: ${toolName}` });
    return;
  }

  try {
    const input = req.body && typeof req.body === "object" ? req.body : {};
    const result = await tool.handler(input);
    const imageFile = await materializeImageResult(result);
    res.json({ ok: true, tool: toolName, result, imageFile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown tool error";
    res.status(500).json({ ok: false, tool: toolName, error: message });
  }
});

app.post("/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const agent = typeof req.body?.agent === "string" ? req.body.agent.trim() : "";
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
  const timeoutMsRaw = Number.parseInt(String(req.body?.timeoutMs ?? ""), 10);
  const timeoutMs = Number.isFinite(timeoutMsRaw)
    ? Math.max(30000, Math.min(timeoutMsRaw, 600000))
    : Number.parseInt(process.env.OPENCLAW_TIMEOUT_MS || "120000", 10);
  const includeRaw = req.body?.includeRaw === true;

  if (!message) {
    res.status(400).json({ ok: false, error: "message is required" });
    return;
  }

  try {
    const result = await runOpenClawAgent({
      message,
      agent: agent || "preparation",
      sessionId,
      timeoutMs,
    });

    const resolvedSessionId = extractSessionId(result.raw) || sessionId;

    const responseBody = {
      ok: true,
      text: result.text,
      agent: agent || "preparation",
      sessionId: resolvedSessionId,
    };

    if (includeRaw) {
      responseBody.result = result.raw;
    }

    res.json(responseBody);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "OpenClaw request failed";
    res.status(502).json({ ok: false, error: messageText });
  }
});

const port = Number.parseInt(process.env.PORT || "3001", 10);
app.listen(port, () => {
  console.log(`LumiCore HTTP tools server listening on http://localhost:${port}`);
  console.log(`Tools loaded: ${tools.size}`);
});
