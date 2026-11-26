import { createRoot } from 'react-dom/client';
import { lazy, Suspense, type ComponentType } from 'react';

const previews = import.meta.glob<{ default: ComponentType }>('../components/*/preview.tsx');
const loaderByName = Object.fromEntries(
  Object.entries(previews).map(([path, load]) => [path.split('/')[2], load]),
);

const name = new URLSearchParams(location.search).get('c');
const load = name ? loaderByName[name] : undefined;
if (name) document.head.append(Object.assign(document.createElement('script'), { src: '/frame-probe.js' }));
const Page = lazy(load ?? (() => import('./gallery/Gallery')));

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={null}>
    <Page />
  </Suspense>,
);
