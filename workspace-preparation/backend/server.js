import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 8);
const REMEMBER_MAX_AGE_MS = Number(process.env.REMEMBER_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30);
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

function env(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

const DB_CONFIG = {
  host: env("MYSQL_HOST", "127.0.0.1"),
  port: Number(env("MYSQL_PORT", "3306")),
  user: env("MYSQL_USER", "root"),
  password: env("MYSQL_PASSWORD", ""),
  database: env("MYSQL_DATABASE", "lumiscore_openclaw"),
  waitForConnections: true,
  connectionLimit: 10,
};

function validateDatabaseEnv() {
  if (!env("MYSQL_PASSWORD")) {
    console.warn(
      "[config] MYSQL_PASSWORD is empty. If your local MySQL root account requires a password, set it in backend/.env."
    );
  }
}

const DEMO_ADMIN = {
  email: "admin@lumiscore.local",
  password: "Admin1234!",
  firstName: "Lumiscore",
  lastName: "Admin",
};

const APPROVAL_STATUSES = new Set(["pending", "approved", "rejected"]);

let pool;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    name: "lumiscore.session",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // Production: set secure=true behind HTTPS and review cookie policy for your deployment.
      secure: false,
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    status: user.status,
    approvedBy: user.approved_by,
    approvedAt: user.approved_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function setSessionUser(req, user) {
  req.session.user = {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  return next();
}

async function connectBaseDatabase() {
  const connection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

async function createPoolAndSchema() {
  await connectBaseDatabase();

  pool = mysql.createPool(DB_CONFIG);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      approved_by BIGINT UNSIGNED NULL,
      approved_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      KEY idx_users_status (status),
      KEY idx_users_role (role),
      KEY idx_users_approved_by (approved_by),
      CONSTRAINT fk_users_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await seedAdminAccount();
}

async function seedAdminAccount() {
  const [rows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [DEMO_ADMIN.email]);

  if (rows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_ADMIN.password, SALT_ROUNDS);
  await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'admin', 'approved')`,
    [DEMO_ADMIN.firstName, DEMO_ADMIN.lastName, DEMO_ADMIN.email, passwordHash]
  );

  console.log(`[seed] Admin account created for ${DEMO_ADMIN.email}`);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'user', 'pending')`,
      [firstName, lastName, email, passwordHash]
    );

    console.log(
      `[ADMIN NOTIFY] New access request submitted: ${email} (${firstName} ${lastName}) -> status=pending`
    );

    return res.status(201).json({
      message:
        "Your request has been submitted. An administrator must verify and approve your account before you can log in.",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("[signup] error:", error);
    return res.status(500).json({ error: "Failed to create the account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const rememberMe = Boolean(req.body?.rememberMe);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!APPROVAL_STATUSES.has(user.status)) {
      return res.status(403).json({ error: "This account has an unknown approval status." });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        error: "Your account is pending admin approval. Please wait for verification before logging in.",
        status: "pending",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        error: "This account was rejected by an administrator.",
        status: "rejected",
      });
    }

    setSessionUser(req, user);
    req.session.cookie.maxAge = rememberMe ? REMEMBER_MAX_AGE_MS : SESSION_MAX_AGE_MS;

    return res.json({
      user: publicUser(user),
    });
  } catch (error) {
    console.error("[login] error:", error);
    return res.status(500).json({ error: "Failed to log in." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("[logout] error:", error);
      return res.status(500).json({ error: "Failed to log out." });
    }

    res.clearCookie("lumiscore.session");
    return res.json({ ok: true });
  });
});

app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [req.session.user.id]);
    if (rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Session expired." });
    }

    return res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    console.error("[me] error:", error);
    return res.status(500).json({ error: "Failed to load session." });
  }
});

app.get("/api/admin/pending-users", requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, status, role, created_at
       FROM users
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    return res.json({ users: rows });
  } catch (error) {
    console.error("[admin/pending-users] error:", error);
    return res.status(500).json({ error: "Failed to load pending users." });
  }
});

app.post("/api/admin/users/:id/approve", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    const [rows] = await pool.query("SELECT id, status FROM users WHERE id = ? LIMIT 1", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    await pool.query(
      `UPDATE users
       SET status = 'approved', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [req.session.user.id, userId]
    );

    console.log(`[admin] Approved user id=${userId} by admin id=${req.session.user.id}`);

    return res.json({ ok: true });
  } catch (error) {
    console.error("[admin/approve] error:", error);
    return res.status(500).json({ error: "Failed to approve user." });
  }
});

app.post("/api/admin/users/:id/reject", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    const [rows] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    await pool.query(
      `UPDATE users
       SET status = 'rejected', approved_by = ?, approved_at = NULL
       WHERE id = ?`,
      [req.session.user.id, userId]
    );

    console.log(`[admin] Rejected user id=${userId} by admin id=${req.session.user.id}`);

    return res.json({ ok: true });
  } catch (error) {
    console.error("[admin/reject] error:", error);
    return res.status(500).json({ error: "Failed to reject user." });
  }
});

async function start() {
  try {
    validateDatabaseEnv();
    await createPoolAndSchema();
    console.log(`[config] Connected to MySQL database: ${DB_CONFIG.database}`);
    app.listen(PORT, () => {
      console.log(`Backend listening on http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize backend:", error);
    process.exit(1);
  }
}

start();
