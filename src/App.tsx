import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';

const HomePage = lazy(() => import('./pages/HomePage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const LeaderPage = lazy(() => import('./pages/LeaderPage'));
const LeaderCreatePage = lazy(() => import('./pages/LeaderCreatePage'));
const LeaderPlacePage = lazy(() => import('./pages/LeaderPlacePage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const TrailWalkPage = lazy(() => import('./pages/TrailWalkPage'));

const Loading = () => (
  <div className="min-h-screen paper-grain flex flex-col items-center justify-center gap-2">
    <div className="w-8 h-8 rounded-full border-2 border-forest/25 border-t-forest animate-spin" />
    <p className="text-[10px] font-mono tracking-[0.2em] text-ink-4">LOADING</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/learn" element={<Layout><LearnPage /></Layout>} />
          <Route path="/leader" element={<Layout><LeaderPage /></Layout>} />
          <Route path="/leader/create" element={<Layout><LeaderCreatePage /></Layout>} />
          <Route path="/leader/place/:trailId" element={<Layout><LeaderPlacePage /></Layout>} />
          <Route path="/player" element={<Layout><PlayerPage /></Layout>} />
          <Route path="/play/:trailId" element={<TrailWalkPage />} />
          <Route path="*" element={<Layout><HomePage /></Layout>} />
        </Routes>
      </Suspense>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
