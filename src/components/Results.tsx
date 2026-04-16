import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Trophy, Users, Clock, Vote } from 'lucide-react';
import { motion } from 'framer-motion';

interface PublishedResult {
  id: string;
  name: string;
  count: number;
  logoUrl: string;
}

interface PublishedData {
  publishedAt: string;
  totalVotes: number;
  totalRegistered: number;
  results: PublishedResult[];
}

export const Results: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [data, setData] = useState<PublishedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'results'), (doc) => {
      if (doc.exists()) {
        setData(doc.data() as PublishedData);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading Results...</div>;

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">No results published yet.</h1>
        <button onClick={onBack} className="text-indigo-400 hover:underline">Back to Home</button>
      </div>
    );
  }

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
          <p className="text-gray-400">Official results updated periodically by the administrator</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full w-fit mx-auto">
            <Clock size={14} />
            Last Updated: {new Date(data.publishedAt).toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
            <Users className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm uppercase tracking-widest">Total Registered</p>
            <h3 className="text-4xl font-bold">{data.totalRegistered}</h3>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
            <Vote className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm uppercase tracking-widest">Total Votes Cast</p>
            <h3 className="text-4xl font-bold">{data.totalVotes}</h3>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
            <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm uppercase tracking-widest">Current Leader</p>
            <h3 className="text-4xl font-bold">{data.results[0]?.name || 'N/A'}</h3>
          </div>
        </div>

        <div className="space-y-6">
          {data.results.map((c, i) => (
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
                  <span className="font-bold text-indigo-400">{c.count} votes ({data.totalVotes > 0 ? Math.round((c.count / data.totalVotes) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.count / (data.totalVotes || 1)) * 100}%` }}
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
