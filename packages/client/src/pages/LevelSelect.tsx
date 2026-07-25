import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, CheckCircle2, Star, Trophy, LogOut, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { LevelWithProgress } from '@guardian/shared';

const VULN_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt Injection',
  jailbreak: 'Jailbreak',
  output_filter: 'Output Filter',
  rag_injection: 'RAG Injection',
  system_prompt_leakage: 'Prompt Leakage',
  multi_turn: 'Social Engineering',
  excessive_agency: 'Excessive Agency',
  insecure_output: 'Insecure Output',
  training_data: 'Data Leakage',
  knowledge_integrity: 'RAG Poisoning',
  resource_abuse: 'DoW Attack',
  agent_trust: 'Multi-Agent',
  guardrail_bypass: 'Guardrail Bypass',
};

const VULN_COLORS: Record<string, string> = {
  prompt_injection: 'text-cyber-blue border-cyber-blue/30 bg-cyber-blue/10',
  jailbreak: 'text-cyber-purple border-cyber-purple/30 bg-cyber-purple/10',
  output_filter: 'text-cyber-amber border-cyber-amber/30 bg-cyber-amber/10',
  rag_injection: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  system_prompt_leakage: 'text-cyber-crimson border-cyber-crimson/30 bg-cyber-crimson/10',
  multi_turn: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  excessive_agency: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  insecure_output: 'text-red-400 border-red-400/30 bg-red-400/10',
  training_data: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  knowledge_integrity: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  resource_abuse: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  agent_trust: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
  guardrail_bypass: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
};

function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < difficulty ? 'star-filled fill-current' : 'star-empty'}`}
        />
      ))}
    </div>
  );
}

export default function LevelSelect() {
  const [levels, setLevels] = useState<LevelWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    api.get('/levels').then(({ data }) => {
      setLevels(data);
      setLoading(false);
    });
  }, []);

  const completedCount = levels.filter((l) => l.completed).length;
  const totalScore = levels.reduce((sum, l) => sum + (l.bestScore || 0), 0);

  function handleLogout() {
    api.post('/auth/logout').finally(() => {
      clearAuth();
      navigate('/');
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 grid-bg flex items-center justify-center">
        <div className="text-neon-green font-mono animate-pulse">Initializing levels...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-neon-green" />
            <span className="font-mono font-bold text-neon-green tracking-wider">CYBERCREWS</span>
            <span className="text-white/20 font-mono text-sm hidden sm:block">/ Level Select</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 font-mono text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                <span className="text-white/50">{completedCount}/{levels.length} Cleared</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyber-amber" />
                <span className="text-white/50">{totalScore.toLocaleString()} pts</span>
              </div>
            </div>

            <button
              id="btn-leaderboard"
              onClick={() => navigate('/leaderboard')}
              className="btn-ghost text-sm py-2 px-4"
            >
              Leaderboard
            </button>

            <button id="btn-logout" onClick={handleLogout} className="text-white/30 hover:text-white/60 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Progress track */}
        <div className="mb-10 overflow-x-auto pb-4">
          <div className="flex items-center gap-2 min-w-max">
            {levels.map((lvl, i) => (
              <React.Fragment key={lvl.id}>
                <button
                  id={`level-pill-${lvl.id}`}
                  onClick={() => lvl.unlocked && navigate(`/level/${lvl.id}`)}
                  disabled={!lvl.unlocked}
                  className="level-pill"
                >
                  <div
                    className={`level-pill-circle ${
                      lvl.completed ? 'completed' : lvl.unlocked ? 'unlocked' : 'locked'
                    }`}
                  >
                    {lvl.completed ? <CheckCircle2 className="w-4 h-4" /> : lvl.unlocked ? lvl.orderIndex : <Lock className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] font-mono text-white/30">{lvl.orderIndex}</span>
                </button>
                {i < levels.length - 1 && (
                  <div className={`w-8 h-px ${lvl.completed ? 'bg-neon-green/50' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Level grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {levels.map((lvl) => (
            <div
              key={lvl.id}
              className={`glass rounded-xl p-6 transition-all duration-200 ${
                lvl.unlocked
                  ? 'hover:border-neon-green/30 hover:shadow-neon cursor-pointer group'
                  : 'opacity-50 cursor-not-allowed'
              } ${lvl.completed ? 'border-neon-green/20' : ''}`}
              onClick={() => lvl.unlocked && navigate(`/level/${lvl.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-mono text-white/30 mb-1">Level {lvl.orderIndex}</div>
                  <h2 className="font-semibold text-white group-hover:text-neon-green transition-colors leading-tight">
                    {lvl.title.replace(`Level ${lvl.orderIndex}: `, '')}
                  </h2>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {lvl.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-neon-green" />
                  ) : lvl.unlocked ? (
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-neon-green transition-colors" />
                  ) : (
                    <Lock className="w-5 h-5 text-white/20" />
                  )}
                </div>
              </div>

              <p className="text-white/40 text-sm font-mono leading-relaxed mb-4 line-clamp-2">
                {lvl.objective}
              </p>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${VULN_COLORS[lvl.vulnCategory] || 'text-white/40 border-white/10'}`}>
                  {VULN_LABELS[lvl.vulnCategory] || lvl.vulnCategory}
                </span>
                <DifficultyStars difficulty={lvl.difficulty} />
              </div>

              {lvl.completed && (lvl.bestScore ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-cyber-amber" />
                  <span className="font-mono text-xs text-cyber-amber">{lvl.bestScore} pts</span>
                  <span className="text-white/20 text-xs font-mono ml-auto">{lvl.attemptCount} attempt{lvl.attemptCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
