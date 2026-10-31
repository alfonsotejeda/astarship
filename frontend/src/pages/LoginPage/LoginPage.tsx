import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE, ROLE_LABEL } from "@/app/providers/auth/roles";
import type { User } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Field } from "@/components/Field/Field";
import type { IconName } from "@/components/Icon/icons";
import Particles from "@/components/Particles/Particles";
import { createAccount, signIn } from "@/lib/api/auth";
import type { BackendRole, RegisterRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import "./LoginPage.css";

// Demo logins until every screen talks to the backend; ids match src/mocks/data/users.ts
const MOCK_USERS: User[] = [
  { id: 1, name: "Laura Pérez", role: "guide" },
  { id: 5, name: "Marta Rivas", role: "manager" },
  { id: 6, name: "Daniel Ortega", role: "tourist" },
  { id: 4, name: "Rosa Fernández", role: "admin" },
];

const ROLE_ICON: Record<User["role"], IconName> = {
  guide: "layers",
  manager: "check-circle",
  tourist: "calendar",
  admin: "shield",
};

const REGISTER_ROLE_OPTIONS = [
  { value: "tourist", label: ROLE_LABEL.tourist },
  { value: "guide", label: ROLE_LABEL.guide },
  { value: "operations_manager", label: ROLE_LABEL.manager },
  { value: "admin", label: ROLE_LABEL.admin },
];

type AuthMode = "login" | "register";

function requestErrorMessage(error: unknown, mode: AuthMode): string {
  if (error instanceof ApiError) {
    if (mode === "login" && error.status === 401) {
      return "El correo o la contraseña no coinciden. Revisa las mayúsculas o pide a tu administrador que te restablezca la contraseña.";
    }
    if (mode === "register" && error.status === 409) {
      return "Ya existe una cuenta con ese correo. Inicia sesión con ella.";
    }
    if (error.status === 422) {
      return "Revisa los datos del formulario e inténtalo de nuevo.";
    }
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return "No se pudo conectar con la API. Comprueba que el backend esté en marcha.";
    }
    if (error.status >= 500) {
      return mode === "register"
        ? "El servidor no pudo crear la cuenta. Inténtalo de nuevo."
        : "El servidor no pudo iniciar sesión. Inténtalo de nuevo.";
    }
    return error.message;
  }

  return "No se pudo conectar con el servidor. Comprueba que la API esté en marcha.";
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registerRole, setRegisterRole] = useState<BackendRole>("tourist");
  const isRegister = mode === "register";

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  function switchMode(next: AuthMode) {
    if (submitting) return;
    setMode(next);
    setError(null);
    setPasswordError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setPasswordError("");

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (isRegister) {
      if (password !== data.get("confirmPassword")) {
        setPasswordError("Las contraseñas no coinciden. Vuelve a escribirlas.");
        const confirmation =
          event.currentTarget.elements.namedItem("confirmPassword");
        if (confirmation instanceof HTMLInputElement) confirmation.focus();
        return;
      }

      const name = String(data.get("name") ?? "").trim();
      const base = { name, email, password };
      const payload: RegisterRequest =
        registerRole === "tourist"
          ? { ...base, role: "tourist", age: Number(data.get("age")) }
          : registerRole === "guide"
            ? {
                ...base,
                role: "guide",
                specialty: String(data.get("specialty") ?? "").trim(),
              }
            : { ...base, role: registerRole };

      setSubmitting(true);
      try {
        await createAccount(payload);
        const session = await signIn({ email, password });
        login(session.user, session.token, true);
      } catch (requestError) {
        setError(requestErrorMessage(requestError, "register"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const session = await signIn({ email, password });
      login(session.user, session.token, data.get("keep") === "on");
    } catch (requestError) {
      setError(requestErrorMessage(requestError, "login"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <section className="login__brand">
        <div className="login__particles" aria-hidden="true">
          <Particles
            particleColors={["#ffffff", "#ffffff", "#ffffff"]}
            particleCount={200}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            glow={0.5}
            twinkle={0.3}
            moveParticlesOnHover
            hoverEffect="parallax"
            sizeRandomness={1}
            shape="circle"
            depthOfField={0}
            connections={false}
            particleHoverFactor={1}
            drift="none"
            cameraDistance={20}
            clickBurst
            intro
          />
        </div>

        <div className="login__logo">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            width={36}
            height={36}
          />
          <span>Astarship</span>
        </div>

        <div className="login__pitch">
          <svg
            className="login__route"
            viewBox="0 0 420 120"
            width={420}
            height={130}
            aria-hidden="true"
          >
            <path
              d="M20 96 C 110 0, 210 130, 300 40 S 380 30, 400 24"
              fill="none"
              stroke="var(--route)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle cx={20} cy={96} r={10} fill="var(--origin)" />
            <circle
              cx={150}
              cy={66}
              r={6}
              fill="var(--surface)"
              stroke="var(--route)"
              strokeWidth={3}
            />
            <circle
              cx={268}
              cy={62}
              r={6}
              fill="var(--surface)"
              stroke="var(--route)"
              strokeWidth={3}
            />
            <circle cx={400} cy={24} r={10} fill="var(--destination)" />
          </svg>
          <h1 className="login__headline">
            El recorrido perfecto, hecho a tu medida.
          </h1>
          <p className="login__lead">
            Tus gustos, tu energía, tu tiempo. Astarship los convierte en el
            itinerario ideal.{" "}
          </p>
        </div>

        <span className="login__credits">
          Bases de Datos II · Ingeniería de Software · Equipo HAVING Fe
        </span>
      </section>

      <main className="login__panel">
        <form
          className="login__form"
          key={mode}
          onSubmit={handleSubmit}
          onChange={() => {
            setError(null);
            setPasswordError("");
          }}
        >
          <div className="login__intro">
            <h2 className="login__title">
              {isRegister ? "Crea tu cuenta" : "Inicia sesión"}
            </h2>
            <span className="login__subtitle">
              {isRegister
                ? "Completa tus datos para empezar a armar itinerarios."
                : "Con la cuenta que te dio tu agencia."}
            </span>
          </div>

          {error && <Alert tone="bad">{error}</Alert>}

          {isRegister && (
            <>
              <Field
                id="register-name"
                name="name"
                label="Nombre"
                type="text"
                autoComplete="name"
                required
              />
              <Field
                id="register-role"
                name="role"
                label="Tipo de cuenta"
                options={REGISTER_ROLE_OPTIONS}
                value={registerRole}
                onChange={(event) =>
                  setRegisterRole(event.target.value as BackendRole)
                }
                required
              />
              {registerRole === "tourist" && (
                <Field
                  id="register-age"
                  name="age"
                  label="Edad"
                  type="number"
                  min={0}
                  max={120}
                  autoComplete="off"
                  required
                />
              )}
              {registerRole === "guide" && (
                <Field
                  id="register-specialty"
                  name="specialty"
                  label="Especialidad"
                  type="text"
                  autoComplete="off"
                  required
                />
              )}
            </>
          )}

          <Field
            id={isRegister ? "register-email" : "login-email"}
            name="email"
            label="Correo"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            id={isRegister ? "register-password" : "login-password"}
            name="password"
            label="Contraseña"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />

          {isRegister && (
            <Field
              id="register-password-confirm"
              name="confirmPassword"
              label="Repite la contraseña"
              type="password"
              autoComplete="new-password"
              error={passwordError || undefined}
              required
            />
          )}

          {!isRegister && (
            <div className="login__options">
              <Checkbox name="keep" label="Mantener la sesión" />
              {/* TODO: point this at the password-recovery route once it exists. */}
              <a className="login__link" href="#">
                ¿Olvidaste la contraseña?
              </a>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            block
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting
              ? isRegister
                ? "Creando cuenta…"
                : "Entrando…"
              : isRegister
                ? "Crear cuenta"
                : "Entrar"}
          </Button>

          <p className="login__switch">
            <span>
              {isRegister ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta?"}
            </span>
            <button
              type="button"
              className="login__link login__switch-action"
              disabled={submitting}
              onClick={() => switchMode(isRegister ? "login" : "register")}
            >
              {isRegister ? "Inicia sesión" : "Crear cuenta"}
            </button>
          </p>

          <div className="login__demo">
            <span className="login__demo-title">Accesos de demostración</span>
            <div className="login__demo-grid">
              {MOCK_USERS.map((mock) => (
                <Button
                  key={mock.role}
                  icon={ROLE_ICON[mock.role]}
                  aria-label={`Entrar como ${ROLE_LABEL[mock.role].toLowerCase()}`}
                  onClick={() => login(mock, `mock-${mock.id}`)}
                >
                  {ROLE_LABEL[mock.role]}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              icon="layers"
              onClick={() => navigate("/preview")}
            >
              Ver componentes
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
