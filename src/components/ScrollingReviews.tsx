import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export const ScrollingReviews: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(
      collection(db, 'votes'), 
      where('highlighted', '==', true)
    ), (snap) => {
      const allHighlighted = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(allHighlighted.filter((r: any) => !r.hidden));
    });
    return () => unsub();
  }, []);

  if (reviews.length === 0) return null;

  // Duplicate reviews for seamless loop
  const displayReviews = [...reviews, ...reviews];

  return (
    <div className="overflow-hidden bg-gray-900/40 py-2.5 border-y border-gray-800/40 backdrop-blur-md relative">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-950 to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-950 to-transparent z-10" />
      
      <motion.div 
        key={reviews.length}
        className="flex gap-10 whitespace-nowrap px-4 will-change-transform"
        initial={{ x: "0%" }}
        animate={{ x: "-50%" }}
        transition={{ 
          repeat: Infinity, 
          duration: Math.max(3, reviews.length * 0.7), 
          ease: "linear",
          repeatType: "loop"
        }}
      >
        {displayReviews.map((r, i) => (
          <div key={`${r.id}-${i}`} className="flex items-center gap-3.5 text-white/90">
            <div className="flex items-center gap-2">
              {r.googlePhotoURL ? (
                <img 
                  src={r.googlePhotoURL} 
                  alt="" 
                  className="w-6 h-6 rounded-full border border-indigo-500/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                  {(r.voterName || 'V').charAt(0)}
                </div>
              )}
              <span className="font-bold text-xs sm:text-sm tracking-tight">{r.voterName || 'Anonymous Voter'}</span>
            </div>
            <span className="text-gray-400 text-xs sm:text-sm italic">"{r.reason || 'No comment provided'}"</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${star <= (r.rating || 0) ? 'text-yellow-500 fill-current' : 'text-gray-700'}`} 
                />
              ))}
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-800 mx-1" />
          </div>
        ))}
      </motion.div>
    </div>
  );
};
