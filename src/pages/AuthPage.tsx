import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import { clientDiagnostics, describeError } from '../lib/client-diagnostics'
import '../AuthPage.css'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let isCurrent = true
    requireSupabase().auth.getSession().then(({ data, error }) => {
      if (error) clientDiagnostics.error('auth.session_check_failed', describeError(error))
      if (isCurrent && data.session) window.location.replace('/')
    }).catch((error: unknown) => {
      clientDiagnostics.error('auth.session_check_crashed', describeError(error))
    })
    return () => { isCurrent = false }
  }, [])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setError('')
    setIsSubmitting(true)
    const operation = isRegister ? 'auth.signup' : 'auth.login'

    try {
      clientDiagnostics.info('auth.operation.started', { operation })
      const form = new FormData(event.currentTarget)
      const email = String(form.get('email') ?? '').trim()
      const password = String(form.get('password') ?? '')
      const client = requireSupabase()

      if (isRegister) {
        const displayName = String(form.get('name') ?? '').trim()
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        if (signUpError) throw signUpError
        if (data.session) {
          clientDiagnostics.info('auth.operation.succeeded', { operation })
          window.location.assign('/')
          return
        }
        clientDiagnostics.info('auth.operation.succeeded', { operation, confirmationRequired: true })
        setNotice('Te enviamos un correo para confirmar tu cuenta. Después podrás iniciar sesión.')
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        clientDiagnostics.info('auth.operation.succeeded', { operation })
        window.location.assign('/')
      }
    } catch (cause) {
      clientDiagnostics.error('auth.operation.failed', { operation, ...describeError(cause) })
      setError(cause instanceof Error ? cause.message : 'No pudimos completar el acceso. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setNotice('')
    setError('')
    setShowPassword(false)
  }

  return (
    <main className="auth-page">
      <header className="auth-page-header">
        <div className="brand" aria-label="Saldo Claro">
          <span className="brand-mark"><Icon name="wallet" size={19} /></span>
          <span>saldo<span className="brand-light">claro</span></span>
        </div>
        <a className="auth-demo-link" href="/demo/">Ver demo</a>
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
            <div className="auth-connection-note">
              <span className="connection-dot" />
              {isSupabaseConfigured ? 'Tus datos quedan separados por cuenta' : 'Conexión pendiente de configurar'}
            </div>

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

              {notice && <p className="auth-notice" role="status">{notice}</p>}
              {error && <p className="auth-error" role="alert">{error}</p>}
              {!isSupabaseConfigured && (
                <p className="auth-error" role="status">
                  Para activar el acceso, configura <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> en <code>.env.local</code>.
                </p>
              )}
              <button className="button button-primary auth-submit" type="submit" disabled={!isSupabaseConfigured || isSubmitting}>
                {isSubmitting ? 'Conectando…' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                <Icon name="arrow" size={16} />
              </button>
            </form>

            <p className="auth-footnote">
              {isRegister
                ? 'Usaremos tu correo para crear una sesión privada.'
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
