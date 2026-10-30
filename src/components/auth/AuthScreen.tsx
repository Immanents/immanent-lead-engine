import { useState } from 'react'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

interface AuthScreenProps {
  onAuth: () => void
}

const INPUT: React.CSSProperties = {
  width: '100%',
  background: 'var(--c-surface)',
  border: '1px solid var(--c-edge)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--c-ink)',
  outline: 'none',

  transition: 'border-color 0.15s',
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        })
        if (resetError) throw resetError
        setSuccess("Password reset email sent. Check your inbox and follow the link to set a new password.")
      } else if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (signUpError) throw signUpError
        setSuccess('Account created! Check your email to confirm, then log in.')
        setMode('login')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        onAuth()
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--c-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,

      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'none',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'var(--c-primary-l)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Zap size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--c-ink)',
              letterSpacing: '-0.03em',
              marginBottom: 6,
            }}
          >
            Immanent Lead Engine
          </h1>
          <p style={{ fontSize: 13, color: 'var(--c-ink-3)' }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-edge)',
            borderRadius: 14,
            padding: 28,
          }}
        >
          {/* Mode tabs — hidden when in forgot mode */}
          {mode !== 'forgot' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: 'var(--c-bg)',
                borderRadius: 8,
                padding: 3,
                marginBottom: 24,
              }}
            >
              {(['login', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                  style={{
                    padding: '8px 0',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: mode === m ? 'var(--c-surface-3)' : 'transparent',
                    color: mode === m ? 'var(--c-ink)' : 'var(--c-ink-3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--c-ink-3)', marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  style={INPUT}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-l)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--c-edge)')}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--c-ink-3)', marginBottom: 6 }}>
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={INPUT}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-l)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--c-edge)')}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--c-ink-3)' }}>
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setSuccess(null) }}
                      style={{
                        fontSize: 12,
                        color: 'var(--c-primary-l)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,

                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--c-primary-l)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--c-primary-l)')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    style={{ ...INPUT, paddingRight: 42 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-l)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--c-edge)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--c-ink-3)',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'var(--t-red-bg)',
                  border: '1px solid var(--t-red-bd)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--t-red)',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: 'var(--t-green-bg)',
                  border: '1px solid var(--t-green-bd)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--t-green)',
                }}
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 0',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                background: 'var(--c-primary-l)',
                color: '#fff',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s',
                marginTop: 4,
              }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  border: '1px solid var(--c-edge)',
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-ink-2)',

                }}
              >
                ← Back to Sign In
              </button>
            )}
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-edge-2)', marginTop: 24 }}>
          Immanent Studio · Internal Client Acquisition System
        </p>
      </div>
    </div>
  )
}
