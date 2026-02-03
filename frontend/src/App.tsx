import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Dashboard } from './pages/Dashboard';
import { Activities } from './pages/Activities';
import { Settings } from './pages/Settings';
import { Events } from './pages/Events';
import { Trends } from './pages/Trends';
import { LivingGradient, AdaptiveNav } from './components/morphic';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen text-white">
          <LivingGradient />
          <main className="relative z-10 pb-32">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/events" element={<Events />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </AnimatePresence>
          </main>
          <AdaptiveNav />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
