import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { isSupabaseConfigured } from './lib/supabase'
import Layout from './components/Layout'
import { LoadingState } from './components/ui'
import SetupRequired from './pages/SetupRequired'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevoRemito from './pages/NuevoRemito'
import Remitos from './pages/Remitos'
import Productos from './pages/Productos'
import Stock from './pages/Stock'
import HistorialPrecios from './pages/HistorialPrecios'
import Reportes from './pages/Reportes'
import Facturacion from './pages/Facturacion'

function RutasProtegidas() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState texto="Iniciando…" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <Layout />
}

function RutaLogin() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequired />
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<RutaLogin />} />
            <Route element={<RutasProtegidas />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/remitos" element={<Remitos />} />
              <Route path="/remitos/nuevo" element={<NuevoRemito />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/historial" element={<HistorialPrecios />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/facturacion" element={<Facturacion />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
