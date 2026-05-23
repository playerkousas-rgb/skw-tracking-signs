import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LearnPage from './pages/LearnPage';
import LeaderPage from './pages/LeaderPage';
import LeaderCreatePage from './pages/LeaderCreatePage';
import PlayerPage from './pages/PlayerPage';
import TrailWalkPage from './pages/TrailWalkPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/learn" element={<Layout><LearnPage /></Layout>} />
        <Route path="/leader" element={<Layout><LeaderPage /></Layout>} />
        <Route path="/leader/create" element={<Layout><LeaderCreatePage /></Layout>} />
        <Route path="/player" element={<Layout><PlayerPage /></Layout>} />
        <Route path="/play/:trailId" element={<TrailWalkPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;