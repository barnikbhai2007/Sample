import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { MessageSquare, Search, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserData {
  uid: string;
  name: string;
  school: string;
  email: string;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserData[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserData));
    });
    return () => unsub();
  }, []);

  const handleSearch = () => {
    if (!search) {
      setResults([]);
      return;
    }
    const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
    setResults(filtered);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all z-50"
      >
        <MessageSquare />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 bg-gray-900 border-4 border-gray-700 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="bg-indigo-950 p-4 flex justify-between items-center border-b-4 border-indigo-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500">
                  <img 
                    src="https://res.cloudinary.com/speed-searches/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1775748565/IMG-20260409-WA0024_aznvrb.jpg" 
                    alt="Officer" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Presiding Officer</h3>
                  <p className="text-xs text-indigo-400 font-bold">Yuvraj</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-indigo-300 hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="p-4 bg-gray-900">
              <div className="flex gap-2 mb-4">
                <input 
                  placeholder="Search voter name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-gray-800 rounded-xl px-4 py-2 text-white outline-none border border-gray-700 focus:border-indigo-500"
                />
                <button onClick={handleSearch} className="bg-indigo-700 p-2 rounded-xl text-white hover:bg-indigo-600"><Search size={20} /></button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {results.map(u => (
                  <div key={u.uid} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-indigo-500 transition-colors">
                    <p className="font-bold text-white">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.school}</p>
                  </div>
                ))}
                {search && results.length === 0 && <p className="text-gray-500 text-sm text-center">No results found.</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
