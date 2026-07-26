import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from './AppSidebar.jsx'
import Topbar from './Topbar.jsx'

const pageTitles = {
  '/':         'Overview',
  '/drivers':  'Drivers',
  '/routes':   'Routes',
  '/buses':    'Buses',
  '/chatbot':  'Fleet AI Chatbot',
}

/** Routes that should fill the full remaining height without scroll padding */
const FULL_HEIGHT_ROUTES = ['/chatbot']

const AppLayout = () => {
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const location = useLocation()

  const title =
    pageTitles[location.pathname] ||
    (/^\/drivers\/[^/]+\/edit$/.test(location.pathname)
      ? 'Edit Driver'
      : location.pathname.startsWith('/drivers/')
      ? 'Driver Details'
      : 'Dashboard')

  const isFullHeight = FULL_HEIGHT_ROUTES.includes(location.pathname)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />

        {isFullHeight ? (
          /* Full-height pages: flex column, no scroll on the outer container */
          <div className="flex flex-1 flex-col overflow-hidden p-4 md:p-5">
            <div className="flex flex-1 flex-col min-h-0 mx-auto w-full max-w-4xl">
              <Outlet />
            </div>
          </div>
        ) : (
          /* Normal pages: scrollable with generous padding */
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

export default AppLayout
