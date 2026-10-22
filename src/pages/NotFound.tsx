import { Link, useLocation } from 'react-router'
import { MODULE_INDEX } from '../data/moduleIndex'

// Shown for unknown routes and for /learn/:slug when the slug is not a module.
export function NotFound({ slug }: { slug?: string }) {
  const { pathname } = useLocation()

  return (
    <div className="mx-auto max-w-3xl px-4 pt-16 sm:pt-24">
      <p className="font-display text-lg font-bold text-key">404</p>
      <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">{slug ? 'Module not found' : 'Page not found'}</h1>
      <p className="mt-4 max-w-[60ch] text-xl text-muted">
        {slug ? (
          <>
            There is no module called <code className="break-all font-mono text-ink">{slug}</code>. It may have been renamed, or the link has a typo.
          </>
        ) : (
          <>
            Nothing lives at <code className="break-all font-mono text-ink">{pathname}</code>. Check the address, or head back home.
          </>
        )}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-key px-5 py-3 text-lg">
          Back to home
        </Link>
        <Link to={`/learn/${MODULE_INDEX[0].slug}`} className="btn px-5 py-3 text-lg">
          Start the course
        </Link>
      </div>
    </div>
  )
}
