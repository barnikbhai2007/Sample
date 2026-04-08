import React, { useState, useEffect } from 'react';

export const TypingMessage = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [text]);
  return <div className="text-white">{displayedText}</div>;
};
