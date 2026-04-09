import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackFormProps {
  onSubmit: (rating: number, comment: string) => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl"
    >
      <h2 className="text-xl font-bold text-white mb-4">Rate your experience</h2>
      <div className="flex gap-2 mb-6 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`p-2 rounded-full transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-600'}`}
          >
            <Star className="w-8 h-8 fill-current" />
          </button>
        ))}
      </div>
      <textarea 
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="w-full h-32 bg-gray-800 rounded-xl p-4 text-white mb-4 border border-gray-700 focus:border-indigo-500 outline-none"
        placeholder="Why did you vote for this candidate? (Optional)"
      />
      <button 
        onClick={() => onSubmit(rating, comment)}
        disabled={rating === 0}
        className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="w-5 h-5" />
        Submit Feedback
      </button>
    </motion.div>
  );
};
