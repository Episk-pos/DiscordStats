import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { discordApi } from '../services/api';
import type { GuildStats, MessageStats } from '../types/discord';
import { TrendingUp, Users, MessageSquare, Award, Activity } from 'lucide-react';

const COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#00b0f4'];

export default function Dashboard() {
  const [guildId, setGuildId] = useState('');
  const [guildStats, setGuildStats] = useState<GuildStats | null>(null);
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    if (!guildId) {
      setError('Please enter a Guild ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [guild, messages] = await Promise.all([
        discordApi.getGuildStats(guildId),
        discordApi.getMessageStats(guildId, 500),
      ]);

      setGuildStats(guild);
      setMessageStats(messages);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch stats. Make sure the bot is in the server and has proper permissions.');
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="dashboard">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Discord Analytics Dashboard</h1>
        <p>Visualize your server's activity and engagement</p>
      </motion.div>

      <div className="input-group">
        <label htmlFor="guildId">Enter your Discord Server ID</label>
        <input
          id="guildId"
          type="text"
          value={guildId}
          onChange={(e) => setGuildId(e.target.value)}
          placeholder="1234567890123456789"
          onKeyPress={(e) => e.key === 'Enter' && fetchStats()}
        />
        <button
          className="fetch-button"
          onClick={fetchStats}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Fetch Stats'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your Discord stats...</p>
        </div>
      )}

      {guildStats && messageStats && !loading && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div className="stats-grid" variants={item}>
            <div className="stat-card">
              <h3><Users size={16} style={{ display: 'inline', marginRight: '8px' }} />Total Members</h3>
              <div className="value">{guildStats.memberCount.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <h3><Activity size={16} style={{ display: 'inline', marginRight: '8px' }} />Online Members</h3>
              <div className="value">{guildStats.onlineMembers.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <h3><MessageSquare size={16} style={{ display: 'inline', marginRight: '8px' }} />Total Messages</h3>
              <div className="value">{messageStats.totalMessages.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <h3><TrendingUp size={16} style={{ display: 'inline', marginRight: '8px' }} />Text Channels</h3>
              <div className="value">{guildStats.textChannels}</div>
            </div>
          </motion.div>

          <motion.div className="chart-container" variants={item}>
            <h2>Message Activity by Hour</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={messageStats.messagesByHour.map((count, hour) => ({ hour: `${hour}:00`, messages: count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="#99aab5" />
                <YAxis stroke="#99aab5" />
                <Tooltip
                  contentStyle={{ background: '#2c2f33', border: '1px solid #5865f2', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="messages" stroke="#5865f2" strokeWidth={3} dot={{ fill: '#5865f2', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div className="chart-container" variants={item}>
            <h2>Top 10 Most Active Users</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={messageStats.topUsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="username" stroke="#99aab5" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#99aab5" />
                <Tooltip
                  contentStyle={{ background: '#2c2f33', border: '1px solid #57f287', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="count" fill="#57f287" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div className="chart-container" variants={item}>
            <h2>Messages by Channel</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={Object.entries(messageStats.messagesByChannel).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(messageStats.messagesByChannel).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#2c2f33', border: '1px solid #eb459e', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div className="chart-container" variants={item}>
            <h2><Award size={20} style={{ display: 'inline', marginRight: '8px' }} />Top Emojis</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={messageStats.topEmojis}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="emoji" stroke="#99aab5" />
                <YAxis stroke="#99aab5" />
                <Tooltip
                  contentStyle={{ background: '#2c2f33', border: '1px solid #fee75c', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="count" fill="#fee75c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
