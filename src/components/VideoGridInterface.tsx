
import React from 'react';
import VideoGrid from './VideoGrid';
import { Film, Layers, Zap } from 'lucide-react';

const VideoGridInterface: React.FC = () => {
  return (
    <div className="w-full h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Million Video Grid</h1>
              <p className="text-sm text-gray-400">1,000,000 video slots • 10x10 pixels each</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Interactive Mosaic</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span>15s Max Length</span>
            </div>
          </div>
        </div>
      </header>

      {/* Instructions */}
      <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
        <p className="text-sm text-gray-300">
          Click any slot to upload a video (max 15 seconds). Use zoom controls to navigate the massive grid. Each slot is exactly 10x10 pixels.
        </p>
      </div>

      {/* Main Grid */}
      <main className="flex-1 relative">
        <VideoGrid />
      </main>
    </div>
  );
};

export default VideoGridInterface;
