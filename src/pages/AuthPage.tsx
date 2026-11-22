import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import '../AuthPage.css'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const isRegister = mode === 'register'

  // Maquetado: no se valida nada, solo se pasa al resumen.
  function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.location.assign('/')
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setShowPassword(false)
  }

  return (
    <main className="auth-page">
      <header className="auth-page-header">
        <div className="brand" aria-label="Saldo Claro">
          <span className="brand-mark"><Icon name="wallet" size={19} /></span>
          <span>saldo<span className="brand-light">claro</span></span>
        </div>
      </header>

      <div className="auth-layout">
        <section className="auth-story" aria-label="Sobre Saldo Claro">
          <div className="auth-story-main">
            <span className="auth-story-kicker">TRANQUILIDAD, PASO A PASO</span>
            <h1>Que tus cuentas no te tomen por sorpresa.</h1>
            <p>Ten tus saldos, pagos próximos y gastos cotidianos en un solo lugar.</p>
            <div className="auth-story-points">
              <span><i aria-hidden="true">✓</i> Una vista simple de tu dinero</span>
              <span><i aria-hidden="true">✓</i> Cuentas organizadas por fuente</span>
            </div>
          </div>
          <p className="auth-story-footer">Un espacio para ordenar, sin juicios.</p>
          <span className="auth-decoration" aria-hidden="true">✳</span>
        </section>

        <section className="auth-form-side">
          <div className="auth-content">
            <div className="auth-switch" role="group" aria-label="Tipo de acceso">
              <button
                className={!isRegister ? 'selected' : ''}
                type="button"
                aria-pressed={!isRegister}
                onClick={() => changeMode('login')}
              >
                Iniciar sesión
              </button>
              <button
                className={isRegister ? 'selected' : ''}
                type="button"
                aria-pressed={isRegister}
                onClick={() => changeMode('register')}
              >
                Crear cuenta
              </button>
            </div>

            <p className="eyebrow auth-eyebrow">{isRegister ? 'EMPIEZA EN UN MOMENTO' : 'QUÉ BUENO VERTE'}</p>
            <h2 id="auth-title">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
            <p className="auth-intro">
              {isRegister
                ? 'Prepara un espacio sencillo para organizar tu plata.'
                : 'Vuelve a tu resumen y revisa qué cuentas vienen.'}
            </p>

            <form className="auth-form" onSubmit={submitAuth}>
              {isRegister && (
                <label htmlFor="auth-name">
                  Nombre
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Tu nombre"
                    required
                  />
                </label>
              )}
              <label htmlFor="auth-email">
                Correo electrónico
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@correo.cl"
                  required
                />
              </label>
              <label htmlFor="auth-password">
                Contraseña
                <span className="password-field">
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder={isRegister ? 'Al menos 8 caracteres' : 'Escribe tu contraseña'}
                    minLength={isRegister ? 8 : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </span>
              </label>

              <button className="button button-primary auth-submit" type="submit">
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                <Icon name="arrow" size={16} />
              </button>
            </form>

            <p className="auth-footnote">
              {isRegister
                ? 'Es solo una maqueta: puedes entrar con cualquier dato.'
                : '¿Aún no tienes una cuenta?'}
              {!isRegister && (
                <button type="button" onClick={() => changeMode('register')}>Crear una</button>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
