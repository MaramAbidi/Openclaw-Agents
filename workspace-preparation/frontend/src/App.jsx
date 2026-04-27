import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const OPENCLAW_URL = import.meta.env.OPENCLAW_URL || "";

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await api("/api/me");
        if (mounted) setUser(data.user);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      async login(email, password, rememberMe) {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, rememberMe }),
        });
        setUser(data.user);
        return data.user;
      },
      async signup(payload) {
        return api("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      },
      async logout() {
        await api("/api/auth/logout", {
          method: "POST",
        });
        setUser(null);
      },
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-shell centered">
        <div className="panel">
          <p className="eyebrow">Loading</p>
          <h1>Checking your session</h1>
          <p className="muted">Verifying secure access to the portal.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-shell centered">
        <div className="panel">
          <p className="eyebrow">Loading</p>
          <h1>Checking admin access</h1>
          <p className="muted">Verifying session and privileges.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <div>
          <div className="brand-name">Lumiscore</div>
          <div className="brand-subtitle">OpenClaw Portal</div>
        </div>
      </div>

      <nav className="nav-links">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/openclaw-info">OpenClaw Info</Link>
            {user.role === "admin" ? <Link to="/admin">Admin</Link> : null}
            <button className="nav-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="nav-cta">
              Request Access
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="page-shell">
      <Header />

      <main className="hero-grid">
        <section className="hero panel">
          <p className="eyebrow">Lumière Logistique inspired internal portal</p>
          <h1>Lumiscore AI Portal</h1>
          <p className="hero-copy">
            Secure access to OpenClaw tools for approved Lumière Logistique collaborators
          </p>
          <p className="muted">
            A premium internal gateway for operations, coordination, storage, distribution, and AI-assisted workflows
            built for a logistics environment in Tunisia.
          </p>

          <div className="button-row">
            <Link className="primary-button" to={user ? "/dashboard" : "/login"}>
              Login
            </Link>
            <Link className="secondary-button" to="/signup">
              Request Access
            </Link>
          </div>
        </section>

        <aside className="hero-side">
          <div className="stat-card panel">
            <div className="stat-label">Portal purpose</div>
            <div className="stat-value">Operations gateway</div>
            <p className="muted">Designed for internal workflows, approvals, and secure dashboard access.</p>
          </div>
          <div className="stat-card panel">
            <div className="stat-label">Access model</div>
            <div className="stat-value">Manual approval</div>
            <p className="muted">Only verified collaborators can sign in after admin review.</p>
          </div>
          <div className="stat-card panel">
            <div className="stat-label">OpenClaw</div>
            <div className="stat-value">Protected launch</div>
            <p className="muted">OpenClaw access stays behind approved sessions and browser-safe handling.</p>
          </div>
        </aside>
      </main>

      <section className="content-grid">
        <article className="panel">
          <p className="eyebrow">About</p>
          <h2>Internal digital gateway for coordinated operations</h2>
          <p className="muted">
            Lumiscore is presented as an internal AI operations gateway for a logistics company. It supports approved
            collaborators who need structured access to operational tools and dashboard workflows.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Why access is restricted</p>
          <h2>Reserved for verified company collaborators</h2>
          <p className="muted">
            The portal is designed for trusted operational users only. This keeps access aligned with internal
            governance, account approval, and secure use of connected tools.
          </p>
        </article>
      </section>

      <section className="panel workflow-panel">
        <p className="eyebrow">Approval workflow</p>
        <h2>Simple manual review process</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <span>1</span>
            <h3>Request access</h3>
            <p className="muted">A collaborator creates an account and submits a request.</p>
          </div>
          <div className="workflow-step">
            <span>2</span>
            <h3>Admin verifies company affiliation</h3>
            <p className="muted">An administrator reviews the pending request and confirms eligibility.</p>
          </div>
          <div className="workflow-step">
            <span>3</span>
            <h3>Approved users access OpenClaw</h3>
            <p className="muted">Once approved, the user can sign in and reach the protected dashboard.</p>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 16 }}>
          New sign-up requests are stored in MySQL with <code>pending</code> status until an admin approves them.
        </p>
      </section>

      <footer className="footer panel">
        <div>
          <div className="brand-name">Lumiscore</div>
          <p className="muted">Internal AI portal for logistics operations and approved collaborator access.</p>
        </div>
        <div className="footer-meta">
          <span>Contact: operations@lumiscore.local</span>
          <span>Location: Tunisia</span>
        </div>
      </footer>
    </div>
  );
}

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [navigate, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const currentUser = await login(email.trim(), password, rememberMe);
      navigate(currentUser.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell narrow">
      <Header />
      <section className="auth-layout">
        <div className="panel auth-copy">
          <p className="eyebrow">Secure access</p>
          <h1>Login</h1>
          <p className="muted">
            Sign in with your approved Lumiscore account to reach the protected dashboard and OpenClaw launch.
          </p>
        </div>

        <form className="panel auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.local"
              autoComplete="email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me on this device</span>
          </label>

          {error ? <div className="alert error">{error}</div> : null}

          <button className="primary-button full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="muted small">
            Need access? <Link to="/signup">Request access</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [navigate, user]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) {
      return "All fields are required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password)) {
      return "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(response.message);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell narrow">
      <Header />
      <section className="auth-layout">
        <div className="panel auth-copy">
          <p className="eyebrow">Request access</p>
          <h1>Sign Up</h1>
          <p className="muted">
            Create your request for a company-reviewed account. Approval is required before login is enabled.
          </p>
        </div>

        <form className="panel auth-form" onSubmit={handleSubmit}>
          <div className="split-grid">
            <label>
              <span>First name</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                placeholder="First name"
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                placeholder="Last name"
              />
            </label>
          </div>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="name@company.local"
            />
            <small className="helper-text">Use your company email or a company identifier reviewed by an admin.</small>
          </label>

          <div className="split-grid">
            <label>
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Strong password"
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                placeholder="Repeat password"
              />
            </label>
          </div>

          {error ? <div className="alert error">{error}</div> : null}
          {message ? <div className="alert success">{message}</div> : null}

          <button className="primary-button full" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit request"}
          </button>

          <p className="muted small">
            Already approved? <Link to="/login">Login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function openOpenClaw() {
    // MVP only: production should launch OpenClaw through a secure backend or trusted proxy path.
    if (OPENCLAW_URL) {
      window.open(OPENCLAW_URL, "_blank");
      return;
    }

    setMessage("OpenClaw is not configured yet. This is where the protected launcher would open the OpenClaw dashboard.");
  }

  return (
    <div className="page-shell narrow">
      <Header />
      <section className="dashboard-grid">
        <div className="panel">
          <p className="eyebrow">Approved session</p>
          <h1>Welcome, {user?.firstName || "user"}</h1>
          <p className="muted">Your account is active and ready for protected portal access.</p>
          <div className="status-row">
            <span className="pill orange">Status: {user?.status}</span>
            <span className="pill">Role: {user?.role}</span>
          </div>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={openOpenClaw}>
              Open OpenClaw
            </button>
            <Link className="secondary-button" to="/openclaw-info">
              OpenClaw Info
            </Link>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="warning-banner">
            Development mode: this OpenClaw URL may contain a static token and must not be exposed in production.
          </div>
          {message ? <div className="alert neutral">{message}</div> : null}
        </div>

        <aside className="panel side-notes">
          <p className="eyebrow">Session</p>
          <h2>Protected dashboard</h2>
          <p className="muted">
            This page is available only to authenticated and approved users. The session is maintained by
            express-session and protected route middleware.
          </p>
        </aside>
      </section>
    </div>
  );
}

function OpenClawInfoPage() {
  return (
    <div className="page-shell narrow">
      <Header />
      <section className="panel info-page">
        <p className="eyebrow">Protected information</p>
        <h1>OpenClaw launch model</h1>
        <p className="muted">
          This local MVP opens OpenClaw only from an approved session. In production, this should later be replaced by
          a secure backend proxy or trusted-proxy integration instead of exposing browser-accessible tokens.
        </p>
        <p className="muted">
          For now, the dashboard uses a direct <code>window.open(OPENCLAW_URL, "_blank")</code> flow from the frontend
          environment only.
        </p>
        <Link className="secondary-button" to="/dashboard">
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}

function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPendingUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await api("/api/admin/pending-users");
      setUsers(response.users);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPendingUsers();
  }, []);

  async function handleAction(id, action) {
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      await api(`/api/admin/users/${id}/${action}`, { method: "POST" });
      setMessage(`User ${action === "approve" ? "approved" : "rejected"} successfully.`);
      await loadPendingUsers();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-shell narrow">
      <Header />
      <section className="panel">
        <p className="eyebrow">Admin review</p>
        <h1>Pending access requests</h1>
        <p className="muted">
          Logged in as {user?.email}. Review requests manually before users can sign in. This list comes directly from
          MySQL.
        </p>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {loading ? (
          <p className="muted">Loading pending requests...</p>
        ) : users.length === 0 ? (
          <p className="muted">No pending users right now.</p>
        ) : (
          <div className="admin-list">
            {users.map((entry) => (
              <div key={entry.id} className="admin-item">
                <div>
                  <strong>
                    {entry.first_name} {entry.last_name}
                  </strong>
                  <div className="muted">{entry.email}</div>
                  <div className="muted small">Requested on {new Date(entry.created_at).toLocaleString()}</div>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busyId === entry.id}
                    onClick={() => handleAction(entry.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={busyId === entry.id}
                    onClick={() => handleAction(entry.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/openclaw-info"
        element={
          <ProtectedRoute>
            <OpenClawInfoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
