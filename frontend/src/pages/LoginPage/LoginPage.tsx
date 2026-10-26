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
import "./LoginPage.css";

// Mock users until the backend login (#47) and the real form (#95) exist.
const MOCK_USERS: User[] = [
  {
    name: "Laura Pérez",
    role: "guide",
    authorizations: [
      { packageId: 1, canGenerate: true, canValidate: false },
      { packageId: 2, canGenerate: false, canValidate: true },
    ],
  },
  { name: "Marta Rivas", role: "manager" },
  { name: "Daniel Ortega", role: "tourist" },
  { name: "Rosa Fernández", role: "admin" },
];

const ROLE_ICON: Record<User["role"], IconName> = {
  guide: "layers",
  manager: "check-circle",
  tourist: "calendar",
  admin: "shield",
};

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO(#47, #95): call the backend login here and setError(true) if it fails.
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
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
          <span>Astarship</span>
        </div>

        <div className="login__pitch">
          <svg
            className="login__route"
            viewBox="0 0 420 120"
            width={420}
            height={120}
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
            Itinerarios turísticos que se arman solos.
          </h1>
          <p className="login__lead">
            Elige las actividades, fija el equilibrio entre tipos, categorías y
            esfuerzo, y deja que Astarship ordene el recorrido.
          </p>
        </div>

        <span className="login__credits">
          Bases de Datos II · Ingeniería de Software · Equipo HAVING Fe
        </span>
      </section>

      <main className="login__panel">
        <form
          className="login__form"
          onSubmit={handleSubmit}
          onChange={() => setError(false)}
        >
          <div className="login__intro">
            <h2 className="login__title">Inicia sesión</h2>
            <span className="login__subtitle">
              Con la cuenta que te dio tu agencia.
            </span>
          </div>

          {error && (
            <Alert tone="bad">
              El correo o la contraseña no coinciden. Revisa las mayúsculas o
              pide a tu administrador que te restablezca la contraseña.
            </Alert>
          )}

          <Field
            id="login-email"
            name="email"
            label="Correo"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            id="login-password"
            name="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
          />

          <div className="login__options">
            <Checkbox name="keep" label="Mantener la sesión" />
            {/* TODO: point this at the password-recovery route once it exists. */}
            <a className="login__link" href="#">
              ¿Olvidaste la contraseña?
            </a>
          </div>

          <Button type="submit" variant="primary" block>
            Entrar
          </Button>

          <div className="login__demo">
            <span className="login__demo-title">Accesos de demostración</span>
            <div className="login__demo-grid">
              {MOCK_USERS.map((mock) => (
                <Button
                  key={mock.role}
                  icon={ROLE_ICON[mock.role]}
                  aria-label={`Entrar como ${ROLE_LABEL[mock.role].toLowerCase()}`}
                  onClick={() => login(mock)}
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
