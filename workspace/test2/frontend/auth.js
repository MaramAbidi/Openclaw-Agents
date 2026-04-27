function setFeedback(message, state = "") {
  const feedback = document.querySelector("[data-feedback]");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.state = state;
}

function setLoading(isLoading) {
  const button = document.querySelector("[data-submit]");
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? "Working..." : button.dataset.label || "Continue";
}

async function submitAuthForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const mode = document.body.dataset.authMode || "login";
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const endpoint = mode === "register" ? "/auth/register" : "/auth/login";

  if (mode === "register") {
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");

    if (password !== confirmPassword) {
      setFeedback("Passwords do not match.", "error");
      return;
    }
  }

  try {
    setFeedback("Submitting your request...");
    setLoading(true);

    const body = mode === "register"
      ? {
          firstName: String(payload.firstName || "").trim(),
          lastName: String(payload.lastName || "").trim(),
          email: String(payload.email || "").trim(),
          password: String(payload.password || ""),
        }
      : {
          email: String(payload.email || "").trim(),
          password: String(payload.password || ""),
        };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      const message = result.error || "Something went wrong.";
      setFeedback(message, "error");
      return;
    }

    if (mode === "register") {
      setFeedback(result.message || "Registration saved. Wait for admin approval.", "success");
      form.reset();
      return;
    }

    setFeedback(result.message || "Login successful.", "success");
    window.location.href = result.redirectTo || "/";
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "Request failed.", "error");
  } finally {
    setLoading(false);
  }
}

document.querySelectorAll("[data-switch]").forEach((link) => {
  link.addEventListener("click", () => setFeedback("", ""));
});

const form = document.querySelector("[data-auth-form]");
if (form) {
  form.addEventListener("submit", submitAuthForm);
}

async function redirectIfSessionExists() {
  try {
    const response = await fetch("/auth/session", { credentials: "same-origin" });
    const result = await response.json();
    if (result?.authenticated && result?.redirectTo) {
      window.location.href = result.redirectTo;
    }
  } catch {
    // Ignore session probe failures and stay on the form.
  }
}

redirectIfSessionExists();
