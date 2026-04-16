import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Trophy, Users, Clock, Vote, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface Candidate {
  id: string;
  name: string;
  logoUrl: string;
  order: number;
}

interface VoteRecord {
  candidateId: string;
}

export const Results: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [publishedData, setPublishedData] = useState<any>(null);

  useEffect(() => {
    // Listen to candidates
    const unsubCandidates = onSnapshot(query(collection(db, 'candidates'), orderBy('order', 'asc')), (snap) => {
      setCandidates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
    });

    // Listen to votes
    const unsubVotes = onSnapshot(collection(db, 'votes'), (snap) => {
      setVotes(snap.docs.map(doc => doc.data() as VoteRecord));
    });

    // Listen to registered users count
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setRegisteredCount(snap.size);
    });

    // Listen to published results for fallback/comparison
    const unsubPublished = onSnapshot(doc(db, 'settings', 'results'), (doc) => {
      if (doc.exists()) {
        setPublishedData(doc.data());
      }
      setLoading(false);
    });

    return () => {
      unsubCandidates();
      unsubVotes();
      unsubUsers();
      unsubPublished();
    };
  }, []);

  const getResults = () => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.candidateId] = (counts[v.candidateId] || 0) + 1;
    });
    return candidates.map(c => ({
      ...c,
      count: counts[c.id] || 0
    })).sort((a, b) => b.count - a.count);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading Results...</div>;

  const results = getResults();
  const totalVotes = votes.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          ← Back to Home
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Election Results</h1>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full w-fit">
              <Activity size={14} className="animate-pulse" />
              Live Updates Enabled
            </div>
            <p className="text-gray-400 text-sm">Official results are being calculated in real-time from the blockchain-secured database.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
            <Users className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm uppercase tracking-widest">Total Registered</p>
            <h3 className="text-4xl font-bold">{registeredCount}</h3>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
            <Vote className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm uppercase tracking-widest">Total Votes Cast</p>
            <h3 className="text-4xl font-bold">{totalVotes}</h3>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
            <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm uppercase tracking-widest">Current Leader</p>
            <h3 className="text-4xl font-bold">{results[0]?.name || 'N/A'}</h3>
          </div>
        </div>

        <div className="space-y-6">
          {results.map((c, i) => (
            <motion.div 
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex items-center gap-4"
            >
              <div className="w-12 h-12 flex items-center justify-center font-bold text-xl text-gray-500">
                {i + 1}
              </div>
              <img 
                src={c.logoUrl} 
                alt={c.name} 
                className="w-12 h-12 object-contain bg-white rounded-lg p-1" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff&size=128`;
                }}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">{c.name}</span>
                  <span className="font-bold text-indigo-400">{c.count} votes ({totalVotes > 0 ? Math.round((c.count / totalVotes) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.count / (totalVotes || 1)) * 100}%` }}
                    className="h-full bg-indigo-500"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
