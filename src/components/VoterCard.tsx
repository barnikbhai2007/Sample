import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface VoterCardProps {
  name: string;
  school: string;
  photoURL: string;
  voterId: string;
  showDownload?: boolean;
}

export const VoterCard: React.FC<VoterCardProps> = ({ name, school, photoURL, voterId, showDownload = true }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = async () => {
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `voter-card-${voterId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={cardRef}
        className="w-80 h-48 rounded-2xl p-4 relative overflow-hidden border"
        style={{
          background: 'linear-gradient(to bottom right, #312e81, #1e3a8a)',
          borderColor: '#4338ca',
          color: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-bl-full" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img 
              src={photoURL} 
              alt={name} 
              crossOrigin="anonymous"
              className="w-12 h-12 rounded-full border-2" 
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} 
            />
            <div>
              <h3 className="font-bold text-lg leading-tight">{name}</h3>
              <p className="text-xs" style={{ color: '#c7d2fe' }}>Class: 12th</p>
            </div>
          </div>
          <img 
            src="https://res.cloudinary.com/speed-searches/image/upload/v1775643609/FINAL_20260408_154719_0000_nkldtb.png" 
            alt="Logo" 
            crossOrigin="anonymous"
            className="w-12 h-12 object-contain" 
          />
        </div>

        <div className="text-xs space-y-1 mb-4" style={{ color: '#c7d2fe' }}>
          <p>School: {school}</p>
          <p className="font-mono" style={{ color: '#e0e7ff' }}>ID: {voterId}</p>
          <p className="font-bold mt-2" style={{ color: '#a5b4fc' }}>ChunabKeParva v3.0</p>
        </div>

        <div className="absolute bottom-4 right-4 bg-white p-1 rounded">
          <QRCodeSVG value={voterId} size={40} />
        </div>
      </div>

      {showDownload && (
        <button 
          onClick={downloadCard}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-colors"
        >
          Download Voter Card
        </button>
      )}
    </div>
  );
};
