import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LOGO_DATA_URL } from '../lib/logo'
import {
  IconArchiveBox,
  IconBanknotes,
  IconChartBar,
  IconClock,
  IconCube,
  IconDocumentList,
  IconDocumentPlus,
  IconHome,
  IconLogout,
  IconMenu,
  IconUsers,
  IconX,
} from './icons'

const navegacion = [
  { to: '/', label: 'Panel', icon: IconHome, end: true },
  { to: '/remitos/nuevo', label: 'Nuevo remito', icon: IconDocumentPlus },
  { to: '/remitos', label: 'Remitos', icon: IconDocumentList, end: true },
  { to: '/clientes', label: 'Clientes', icon: IconUsers },
  { to: '/productos', label: 'Productos', icon: IconCube },
  { to: '/stock', label: 'Stock', icon: IconArchiveBox },
  { to: '/historial', label: 'Historial de precios', icon: IconClock },
  { to: '/reportes', label: 'Más vendidos', icon: IconChartBar },
  { to: '/facturacion', label: 'Facturación mensual', icon: IconBanknotes },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { session, username, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <div className="rounded-lg bg-white p-1.5 shadow-sm">
          <img src={LOGO_DATA_URL} alt="DICOR" className="h-8 w-auto" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-white">DICOR</p>
          <p className="text-[11px] text-slate-400">Sistema de gestión</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navegacion.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <p className="truncate px-3 pb-2 text-xs text-slate-500">{username ?? session?.user.email}</p>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <IconLogout className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Sidebar fijo en escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">
        <SidebarContent />
      </aside>

      {/* Barra superior en móvil */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setMenuAbierto(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <IconMenu className="h-6 w-6" />
        </button>
        <img src={LOGO_DATA_URL} alt="DICOR" className="h-7 w-auto" />
        <span className="text-sm font-semibold text-slate-700">Sistema de gestión</span>
      </header>

      {/* Menú deslizable en móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMenuAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 shadow-2xl">
            <button
              onClick={() => setMenuAbierto(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Cerrar menú"
            >
              <IconX className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMenuAbierto(false)} />
          </div>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
