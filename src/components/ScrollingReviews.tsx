import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export const ScrollingReviews: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'votes'), where('highlighted', '==', true)), (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="overflow-hidden bg-gray-900 py-4 border-y border-gray-800">
      <motion.div 
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['100%', '-100%'] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        {reviews.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-white">
            <span className="font-bold">{r.voterName}:</span>
            <span className="text-gray-400">{r.reason}</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-4 h-4 ${star <= (r.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                />
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
