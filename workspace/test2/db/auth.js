import crypto from "node:crypto";
import { getPool, queryRows } from "./mysql.js";

const USERS_TABLE = "users";
const USERS_COLUMNS = {
  id: "id",
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  passwordHash: "password_hash",
  role: "role",
  status: "status",
  approvedBy: "approved_by",
  approvedAt: "approved_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

let usersSchemaCache = null;

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeEmail(value) {
  const trimmed = normalizeText(value);
  return trimmed ? trimmed.toLowerCase() : "";
}

function splitFullName(fullName) {
  const parts = normalizeText(fullName)
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function quote(column) {
  return `\`${column}\``;
}

async function loadUsersSchema() {
  if (usersSchemaCache) {
    return usersSchemaCache;
  }

  const rows = await queryRows(
    `
      SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
      ORDER BY ORDINAL_POSITION
    `,
    [USERS_TABLE],
  );

  const columns = new Map();
  const orderedColumns = [];

  for (const row of rows) {
    const columnName = normalizeText(row?.column_name);
    if (!columnName) continue;
    columns.set(columnName.toLowerCase(), {
      name: columnName,
      dataType: normalizeText(row?.data_type).toLowerCase(),
    });
    orderedColumns.push(columnName);
  }

  const getColumn = (name) => columns.get(String(name).toLowerCase())?.name ?? null;

  usersSchemaCache = {
    columns,
    orderedColumns,
    idColumn: getColumn(USERS_COLUMNS.id),
    firstNameColumn: getColumn(USERS_COLUMNS.firstName),
    lastNameColumn: getColumn(USERS_COLUMNS.lastName),
    emailColumn: getColumn(USERS_COLUMNS.email),
    passwordHashColumn: getColumn(USERS_COLUMNS.passwordHash),
    roleColumn: getColumn(USERS_COLUMNS.role),
    statusColumn: getColumn(USERS_COLUMNS.status),
    approvedByColumn: getColumn(USERS_COLUMNS.approvedBy),
    approvedAtColumn: getColumn(USERS_COLUMNS.approvedAt),
    createdAtColumn: getColumn(USERS_COLUMNS.createdAt),
    updatedAtColumn: getColumn(USERS_COLUMNS.updatedAt),
  };

  return usersSchemaCache;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedValue) {
  if (typeof storedValue !== "string" || storedValue.length === 0) {
    return false;
  }

  if (!storedValue.startsWith("scrypt$")) {
    return storedValue === password;
  }

  const parts = storedValue.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  const actualHex = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actualHex, "hex"), Buffer.from(expectedHex, "hex"));
}

function readApprovalState(row, schema) {
  const statusValue = normalizeText(row?.[schema.statusColumn]).toLowerCase();
  const approvedBy = row?.[schema.approvedByColumn];
  const approvedAt = row?.[schema.approvedAtColumn];
  const approvedFromStatus = ["approved", "active", "enabled", "verified"].includes(statusValue);
  const approved = approvedFromStatus || Boolean(approvedBy) || Boolean(approvedAt);

  return {
    approved,
    status: approved ? "approved" : (statusValue || "pending"),
  };
}

function buildPublicUser(row, schema) {
  const approval = readApprovalState(row, schema);

  return {
    id: row?.[schema.idColumn] ?? null,
    firstName: row?.[schema.firstNameColumn] ?? null,
    lastName: row?.[schema.lastNameColumn] ?? null,
    email: row?.[schema.emailColumn] ?? null,
    role: row?.[schema.roleColumn] ?? null,
    status: row?.[schema.statusColumn] ?? null,
    approved: approval.approved,
    approvalStatus: approval.status,
    approvedAt: row?.[schema.approvedAtColumn] ?? null,
    approvedBy: row?.[schema.approvedByColumn] ?? null,
  };
}

export async function getUsersSchemaDetails() {
  const schema = await loadUsersSchema();
  return schema;
}

export async function registerUserAccount({ firstName, lastName, fullName, email, password }) {
  const schema = await loadUsersSchema();
  const safeEmail = normalizeEmail(email);
  const safePassword = normalizeText(password);
  const splitName = splitFullName(fullName);
  const safeFirstName = normalizeText(firstName) || splitName.firstName;
  const safeLastName = normalizeText(lastName) || splitName.lastName;

  if (!safeFirstName) {
    throw new Error("First name is required.");
  }

  if (!safeLastName) {
    throw new Error("Last name is required.");
  }

  if (!safeEmail) {
    throw new Error("Email is required.");
  }

  if (safePassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!schema.emailColumn || !schema.passwordHashColumn || !schema.statusColumn) {
    throw new Error("The users table is missing required columns.");
  }

  const [duplicateRows] = await getPool().execute(
    `SELECT 1 FROM ${quote(USERS_TABLE)} WHERE LOWER(${quote(schema.emailColumn)}) = LOWER(?) LIMIT 1`,
    [safeEmail],
  );

  if (Array.isArray(duplicateRows) && duplicateRows.length > 0) {
    const duplicateError = new Error("An account already exists for that email.");
    duplicateError.code = "DUPLICATE_ACCOUNT";
    throw duplicateError;
  }

  const now = new Date();
  const columns = [];
  const values = [];
  const add = (columnName, value) => {
    if (!columnName) return;
    columns.push(quote(columnName));
    values.push(value);
  };

  add(schema.firstNameColumn, safeFirstName);
  add(schema.lastNameColumn, safeLastName);
  add(schema.emailColumn, safeEmail);
  add(schema.passwordHashColumn, hashPassword(safePassword));
  add(schema.roleColumn, "user");
  add(schema.statusColumn, "pending");
  add(schema.approvedByColumn, null);
  add(schema.approvedAtColumn, null);
  add(schema.createdAtColumn, now);
  add(schema.updatedAtColumn, now);

  if (columns.length === 0) {
    throw new Error("The users table could not be mapped.");
  }

  const placeholders = columns.map(() => "?").join(", ");
  const [result] = await getPool().execute(
    `INSERT INTO ${quote(USERS_TABLE)} (${columns.join(", ")}) VALUES (${placeholders})`,
    values,
  );

  return {
    insertedId: Number(result?.insertId ?? 0),
    approvalStatus: "pending",
  };
}

export async function authenticateUserAccount({ email, password }) {
  const schema = await loadUsersSchema();
  const safeEmail = normalizeEmail(email);
  const safePassword = normalizeText(password);

  if (!safeEmail) {
    throw new Error("Email is required.");
  }

  if (!safePassword) {
    throw new Error("Password is required.");
  }

  if (!schema.emailColumn || !schema.passwordHashColumn || !schema.statusColumn) {
    throw new Error("The users table is missing required columns.");
  }

  const [rows] = await getPool().execute(
    `SELECT * FROM ${quote(USERS_TABLE)} WHERE LOWER(${quote(schema.emailColumn)}) = LOWER(?) LIMIT 1`,
    [safeEmail],
  );

  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    const notFoundError = new Error("No account found for that email.");
    notFoundError.code = "ACCOUNT_NOT_FOUND";
    throw notFoundError;
  }

  if (!verifyPassword(safePassword, row?.[schema.passwordHashColumn])) {
    const passwordError = new Error("Invalid password.");
    passwordError.code = "INVALID_PASSWORD";
    throw passwordError;
  }

  const approval = readApprovalState(row, schema);
  if (!approval.approved) {
    const pendingError = new Error("Your account is waiting for admin approval.");
    pendingError.code = "PENDING_APPROVAL";
    pendingError.approvalStatus = approval.status;
    throw pendingError;
  }

  return {
    user: buildPublicUser(row, schema),
  };
}
