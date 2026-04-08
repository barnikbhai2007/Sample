import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface Candidate {
  id: string;
  name: string;
  logoUrl: string;
  order: number;
}

export const EVMComponent: React.FC<{onVote: (candidateId: string) => void}> = ({ onVote }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [blinking, setBlinking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'candidates'), orderBy('order', 'asc'), limit(6));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = () => {
    if (selected === null) return;
    setBlinking(true);
    
    // Beep sound
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      setBlinking(false);
      onVote(selected);
    }, 2000);
  };

  if (loading) {
    return <div className="text-white text-center p-8">Loading EVM...</div>;
  }

  if (candidates.length === 0) {
    return <div className="text-white text-center p-8">No candidates registered.</div>;
  }

  return (
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-6 text-center">Electronic Voting Machine</h2>
      <div className="bg-gray-200 p-4 rounded-xl border-4 border-gray-400">
        <div className="flex items-center justify-between mb-4 bg-gray-300 p-2 rounded">
          <span className="text-sm font-bold text-green-700 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Ready
          </span>
          <span className="text-sm font-bold text-gray-700">Ballot Unit</span>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {candidates.map((c) => (
            <div key={c.id} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300">
              <span className="w-6 font-bold text-gray-800">{c.order}</span>
              <div className="flex-1 h-12 bg-gray-100 border border-gray-300 rounded flex items-center justify-between px-2">
                <span className="text-sm font-bold text-gray-800 truncate max-w-[100px]">{c.name}</span>
                <img src={c.logoUrl} alt={c.name} className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
                  <div className={`w-4 h-4 rounded-full ${blinking && selected === c.id ? 'bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'bg-gray-400'}`}></div>
              </div>
              <button 
                onClick={() => setSelected(c.id)}
                className={`w-12 h-10 rounded-lg border-2 transition-all ${selected === c.id ? 'bg-red-600 border-red-800 scale-95 shadow-inner' : 'bg-blue-900 border-blue-950 hover:bg-blue-800'}`}
              />
            </div>
          ))}
        </div>
        <button 
          onClick={handleSubmit} 
          disabled={selected === null || blinking}
          className={`mt-6 w-full text-white p-4 rounded-xl font-bold text-lg transition-all ${blinking ? 'bg-red-600 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]' : selected === null ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg active:scale-95'}`}
        >
          {blinking ? 'REGISTERING VOTE...' : 'SUBMIT VOTE'}
        </button>
      </div>
    </div>
  );
};
