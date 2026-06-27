import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  username: string | null
  signIn: (username: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)

  async function fetchUsername(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single()
    if (data) setUsername(data.username as string)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user.id) fetchUsername(data.session.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user.id) {
        fetchUsername(newSession.user.id)
      } else {
        setUsername(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(usernameInput: string, password: string): Promise<string | null> {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('username', usernameInput.trim().toLowerCase())
      .single()

    if (profileError || !profile) {
      return 'Usuario o contraseña incorrectos.'
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email as string,
      password,
    })
    if (!error) return null
    if (error.message.includes('Invalid login credentials')) {
      return 'Usuario o contraseña incorrectos.'
    }
    return error.message
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, username, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
