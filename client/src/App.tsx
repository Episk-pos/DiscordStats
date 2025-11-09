import { useState } from 'react';
import { motion } from 'framer-motion';
import Dashboard from './components/Dashboard';
import './App.css';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  if (showDashboard) {
    return <Dashboard />;
  }

  return (
    <div className="app">
      <motion.div
        className="hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <BarChart3 size={80} color="#5865f2" style={{ marginBottom: '1rem' }} />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Discord Stats
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Beautiful, motivating visualizations of your Discord server activity.
          Track engagement, monitor growth, and understand your community better.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{ display: 'flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <div style={{ textAlign: 'center' }}>
            <Users size={32} color="#57f287" />
            <p style={{ marginTop: '0.5rem', color: '#99aab5' }}>Member Analytics</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <TrendingUp size={32} color="#fee75c" />
            <p style={{ marginTop: '0.5rem', color: '#99aab5' }}>Activity Trends</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <BarChart3 size={32} color="#eb459e" />
            <p style={{ marginTop: '0.5rem', color: '#99aab5' }}>Engagement Metrics</p>
          </div>
        </motion.div>

        <motion.button
          className="login-button"
          onClick={() => setShowDashboard(true)}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View Dashboard
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#99aab5' }}
        >
          <p>Powered by Discord API • Built with React & TypeScript</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default App;
