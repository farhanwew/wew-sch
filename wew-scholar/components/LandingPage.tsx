
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LandingPageProps {
  onSearch: (query: string) => void;
  onGoToLibrary: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSearch, onGoToLibrary }) => {
  const [query, setQuery] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const nodes = d3.range(30).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 25 + 2,
      color: Math.random() > 0.6 ? '#134e4a' : '#2dd4bf'
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw lines
      ctx.beginPath();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
          }
        }
      }
      ctx.stroke();

      // Draw nodes
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.08;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-[#fcfaf8] overflow-hidden">
      {/* Background Subtle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-60" />

      {/* Top Bar matching Screenshot style */}
      <nav className="absolute top-0 w-full px-12 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onGoToLibrary}>
           <div className="w-8 h-8 bg-teal-900 rounded-sm flex items-center justify-center">
             <div className="w-3.5 h-3.5 border border-white rotate-45"></div>
           </div>
           <span className="text-sm font-bold tracking-tight text-slate-800 uppercase">NexusScholar</span>
        </div>
        <div className="flex items-center gap-8">
           <button onClick={onGoToLibrary} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Library</button>
           <button className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">About</button>
           <button className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Log In</button>
        </div>
      </nav>

      {/* Main Search Content */}
      <div className="relative z-10 w-full max-w-4xl px-8 text-center -mt-16">
        <h1 className="text-[52px] md:text-[64px] font-bold text-slate-900 tracking-tight leading-[1.1] mb-14 antialiased">
          Explore academic papers<br />in a visual graph
        </h1>

        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto mb-10">
          <div className="flex items-center bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-2 focus-within:ring-4 focus-within:ring-teal-500/5 transition-all">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, paper title, DOI or another identifier"
              className="flex-1 bg-transparent px-8 py-4 text-[17px] outline-none text-slate-700 placeholder:text-slate-400 font-medium"
            />
            <button 
              type="submit"
              className="bg-[#004e7c] text-white px-10 py-4 rounded-full font-bold text-[15px] hover:bg-[#003d61] transition-all whitespace-nowrap shadow-sm"
            >
              Build a graph
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-4">
           <button 
            onClick={onGoToLibrary}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-teal-700 transition-colors flex items-center gap-2"
          >
            <span>Browse Your Library</span>
            <span className="text-lg leading-none mt-0.5">→</span>
          </button>
        </div>
      </div>

      {/* Static Info Badges */}
      <div className="absolute bottom-12 w-full flex justify-center gap-16 pointer-events-none opacity-40">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">200M+ Papers</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Real-time Citation Extraction</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Interactive Visualization</span>
         </div>
      </div>
    </div>
  );
};

export default LandingPage;
