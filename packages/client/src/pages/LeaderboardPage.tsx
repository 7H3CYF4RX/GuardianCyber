import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Shield, Star, Clock, ArrowLeft, Zap, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { LeaderboardEntry, LevelCompletedEvent } from '@guardian/shared';
import { useAuthStore } from '@/store/authStore';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number | null; total_score: number; levels_completed: number } | null>(null);
  const [ticker, setTicker] = useState<LevelCompletedEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Initial fetch
    api.get('/leaderboard').then(({ data }) => {
      setEntries(data.entries);
      setUpdatedAt(data.updatedAt);
    });
    api.get('/leaderboard/me').then(({ data }) => setMyRank(data));

    // Live updates via Socket.IO
    const socket = getSocket();
    socket.on('leaderboard:update', (data: { entries: LeaderboardEntry[]; updatedAt: string }) => {
      setEntries(data.entries);
      setUpdatedAt(data.updatedAt);
    });
    socket.on('level:completed', (event: LevelCompletedEvent) => {
      setTicker((prev) => [event, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('leaderboard:update');
      socket.off('level:completed');
    };
  }, []);

  function getRankStyle(rank: number) {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'text-white/50';
  }

  function getRankBg(rank: number) {
    if (rank === 1) return 'border-yellow-400/30 bg-yellow-400/5';
    if (rank === 2) return 'border-gray-400/20 bg-gray-400/5';
    if (rank === 3) return 'border-amber-600/20 bg-amber-600/5';
    return 'border-white/5';
  }

  return (
    <div className="min-h-screen bg-navy-900 grid-bg">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyber-amber/3 rounded-full blur-3xl pointer-events-none" />

      <header className="glass border-b border-white/5 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button id="btn-back-lb" onClick={() => navigate('/levels')} className="text-white/30 hover:text-neon-green transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Trophy className="w-5 h-5 text-cyber-amber" />
          <h1 className="font-mono font-bold text-white flex-1">Leaderboard</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span className="text-xs font-mono text-neon-green">LIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Ticker feed */}
        {ticker.length > 0 && (
          <div className="glass rounded-xl p-4 border-neon-green/10">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-neon-green" />
              <span className="font-mono text-xs text-neon-green uppercase tracking-wider">Recent Completions</span>
            </div>
            <div className="space-y-1.5">
              {ticker.map((t, i) => (
                <div key={i} className="flex items-center gap-3 font-mono text-sm animate-slide-in-right">
                  <Star className="w-3 h-3 text-neon-green flex-shrink-0" />
                  <span className="text-white font-semibold">{t.username}</span>
                  <span className="text-white/40">cleared</span>
                  <span className="text-white/70 truncate">{t.levelTitle}</span>
                  <span className="text-neon-green ml-auto flex-shrink-0">+{t.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My rank card */}
        {myRank && user && (
          <div className="glass rounded-xl p-5 border-neon-green/20">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="font-mono text-3xl font-bold text-neon-green">
                  {myRank.rank ? `#${myRank.rank}` : '--'}
                </div>
                <div className="text-xs font-mono text-white/30">Your Rank</div>
              </div>
              <div className="flex-1">
                <div className="font-mono font-bold text-white">{user.username}</div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs font-mono text-white/40 flex items-center gap-1">
                    <Zap className="w-3 h-3" />{myRank.levels_completed} levels
                  </span>
                  <span className="text-xs font-mono text-cyber-amber flex items-center gap-1">
                    <Trophy className="w-3 h-3" />{myRank.total_score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-mono font-semibold text-white text-sm">Top Agents</h2>
            {updatedAt && (
              <span className="text-xs font-mono text-white/20">
                Updated {new Date(updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="py-16 text-center text-white/20 font-mono text-sm">
              <Trophy className="w-8 h-8 mx-auto mb-3 text-white/10" />
              No scores yet. Be the first!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-6 py-4 border-l-2 transition-all duration-200 ${
                    entry.username === user?.username
                      ? 'border-l-neon-green bg-neon-green/5'
                      : `border-l-transparent ${getRankBg(Number(entry.rank))}`
                  }`}
                >
                  <div className={`w-8 text-center font-mono font-bold text-sm ${getRankStyle(Number(entry.rank))}`}>
                    {Number(entry.rank) <= 3 ? ['🥇', '🥈', '🥉'][Number(entry.rank) - 1] : `#${entry.rank}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`font-mono font-semibold text-sm ${entry.username === user?.username ? 'text-neon-green' : 'text-white'}`}>
                      {entry.username}
                      {entry.username === user?.username && <span className="text-white/30 ml-2 text-xs">(you)</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="text-xs font-mono text-white/30 flex items-center gap-1">
                        <Shield className="w-3 h-3" />{entry.levelsCompleted}/14
                      </span>
                      {entry.avgTimeSeconds && (
                        <span className="text-xs font-mono text-white/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(Number(entry.avgTimeSeconds) / 60)}m avg
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-white">
                      {Number(entry.totalScore).toLocaleString()}
                    </div>
                    <div className="text-xs font-mono text-white/30">pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
