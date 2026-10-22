// The app runs on framer-motion's lighter domAnimation features (set up in App). Components with
// `layout` animations wrap themselves in <LazyMotion features={loadDomMax}> to fetch the extra
// layout code on demand instead of shipping it in the main bundle.
export const loadDomMax = () => import('./motion-max').then((m) => m.default)
