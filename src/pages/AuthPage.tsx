import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import '../AuthPage.css'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'

  // Si ya hay una sesión abierta, pasa directo al resumen.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    requireSupabase().auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace('/')
    })
  }, [])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setError('')
    setIsSubmitting(true)

    try {
      const form = new FormData(event.currentTarget)
      const email = String(form.get('email'))
      const password = String(form.get('password'))
      const client = requireSupabase()

      if (isRegister) {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: String(form.get('name')).trim() } },
        })
        if (signUpError) throw signUpError
        if (data.session) window.location.assign('/')
        else setNotice('Te enviamos un correo para confirmar tu cuenta. Después podrás iniciar sesión.')
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        window.location.assign('/')
      }
    } catch (cause) {
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
          <h1>Que tus cuentas no te tomen por sorpresa.</h1>
          <p>Tu saldo libre, tus pagos próximos y tus gastos del día en un solo lugar.</p>
          {/* Decoración: la regla de 30 días que se ve en el resumen */}
          <ol className="auth-ruler" aria-hidden="true">
            {Array.from({ length: 30 }, (_, dia) => (
              <li className={dia === 0 ? 'today' : dia === 6 || dia === 17 || dia === 24 ? 'bill' : ''} key={dia} style={{ '--i': dia } as React.CSSProperties} />
            ))}
          </ol>
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

            <h2 id="auth-title">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
            <p className="auth-intro">
              {isRegister
                ? 'Un espacio simple para ordenar tu plata.'
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
