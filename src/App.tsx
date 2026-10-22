import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation, Link } from 'react-router'
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { BADGES, ProgressProvider, levelFor, useProgress } from './features/progress/progress'
import { useTheme } from './lib/theme'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

// Home is the landing page and stays in the main bundle; the other pages load on first visit.
const ModulePage = lazy(() => import('./pages/ModulePage').then((m) => ({ default: m.ModulePage })))
const Glossary = lazy(() => import('./pages/Glossary').then((m) => ({ default: m.Glossary })))
const CheatSheet = lazy(() => import('./pages/CheatSheet').then((m) => ({ default: m.CheatSheet })))
const Labs = lazy(() => import('./pages/Labs').then((m) => ({ default: m.Labs })))
const OAuthPlayground = lazy(() => import('./pages/OAuthPlayground').then((m) => ({ default: m.OAuthPlayground })))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
      <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden>
        <rect x="1" y="1" width="24" height="28" rx="6" className="fill-key stroke-ink" strokeWidth="2" />
        <rect x="9" y="4.5" width="8" height="2.5" rx="1.25" className="fill-paper" />
        <circle cx="13" cy="14" r="4" className="fill-paper" />
        <rect x="7" y="21" width="12" height="3" rx="1.5" className="fill-paper" />
      </svg>
      IAM Academy
    </Link>
  )
}

function XpPill() {
  const { xp } = useProgress()
  const lvl = levelFor(xp)
  return (
    <div className="hidden items-center gap-2 rounded-full border-2 border-ink bg-paper py-1 pl-3 pr-1 sm:flex" title={lvl.next ? `Next: ${lvl.next}` : 'Max level'}>
      <span className="text-sm font-semibold">{lvl.name}</span>
      <span className="rounded-full bg-ink px-2 py-0.5 font-display text-xs font-bold tabular-nums text-paper">{xp} XP</span>
    </div>
  )
}

function BadgeToast() {
  const { lastBadge, clearLastBadge } = useProgress()
  useEffect(() => {
    if (!lastBadge) return
    const t = setTimeout(clearLastBadge, 3800)
    return () => clearTimeout(t)
  }, [lastBadge, clearLastBadge])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {lastBadge && (
          <m.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 border-ink bg-paper px-4 py-3 shadow-badge"
          >
            <span className="text-3xl" aria-hidden>
              {BADGES[lastBadge].emoji}
            </span>
            <span>
              <span className="block font-display font-bold">Badge unlocked: {BADGES[lastBadge].name}</span>
              <span className="text-sm text-muted">+50 XP. {BADGES[lastBadge].how}.</span>
            </span>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const NAV = [
  { to: '/learn/fundamentals', label: 'Learn', match: '/learn' },
  { to: '/labs', label: 'Labs' },
  { to: '/oauth-playground', label: 'OAuth playground' },
  { to: '/glossary', label: 'Glossary' },
  { to: '/cheat-sheet', label: 'Cheat sheet' },
]

function Shell() {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-fog/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Logo />
          <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto text-[0.95rem]" aria-label="Main">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.match ?? n.to)
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-semibold ${active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
                >
                  {n.label}
                </NavLink>
              )
            })}
          </nav>
          <XpPill />
          <button onClick={toggle} className="rounded-lg p-2 hover:bg-ink/5" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      <main id="main">
        <Suspense fallback={<div className="mx-auto mt-10 h-64 max-w-6xl animate-pulse rounded-[1.75rem] bg-line/40" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn/:slug" element={<ModulePage />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/cheat-sheet" element={<CheatSheet />} />
            <Route path="/oauth-playground" element={<OAuthPlayground />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="no-print mt-24 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted">
          <span>IAM Academy: learn identity & access management by doing.</span>
          <span>Fjordtech AS and its people are fictional.</span>
        </div>
      </footer>
      <BadgeToast />
    </div>
  )
}

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      {/* Skip transform and layout animations for people who ask the OS for reduced motion. */}
      <MotionConfig reducedMotion="user">
        <ProgressProvider>
          <HashRouter>
            <ScrollToTop />
            <Shell />
          </HashRouter>
        </ProgressProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
