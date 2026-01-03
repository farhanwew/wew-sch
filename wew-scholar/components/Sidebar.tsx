
import React from 'react';
import { Paper } from '../types';
import { ARCHITECTURE_PLAN } from '../constants';

interface SidebarProps {
  selectedPaper: Paper | null;
  showPlan: boolean;
  onTogglePlan: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedPaper, showPlan, onTogglePlan }) => {
  return (
    <div className="fixed top-0 right-0 w-[400px] h-full bg-white border-l border-slate-200 z-20 overflow-y-auto flex flex-col shadow-sm">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
          {showPlan ? 'Development Guide' : 'Document Details'}
        </h2>
        <button 
          onClick={onTogglePlan}
          className="text-[11px] font-bold text-slate-900 border border-slate-200 px-3 py-1 rounded hover:bg-slate-50 transition-colors"
        >
          {showPlan ? 'Close Guide' : 'Build Plan'}
        </button>
      </div>

      <div className="px-8 py-10 flex-1">
        {showPlan ? (
          <div className="space-y-12">
            <div className="pb-8 border-b border-slate-100">
              <h3 className="text-xl font-medium text-slate-900 mb-4">The Go Backend Architecture</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                A robust implementation for research graph generation using Go's high-performance concurrency model.
              </p>
            </div>
            {ARCHITECTURE_PLAN.map((item) => (
              <div key={item.step} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="mono text-xs text-slate-400">0{item.step}</span>
                  <h4 className="font-semibold text-slate-900">{item.title}</h4>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {item.golangTools.map(tool => (
                    <span key={tool} className="mono bg-slate-50 text-slate-600 px-2 py-1 rounded text-[10px] border border-slate-100">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : selectedPaper ? (
          <div className="space-y-10">
            <div className="space-y-3">
              <h3 className="text-2xl font-serif font-medium text-slate-900 leading-snug">{selectedPaper.title}</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPaper.authors.map(a => (
                  <span key={a} className="text-xs font-medium text-slate-500">{a}</span>
                ))}
                <span className="text-xs text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-400">{selectedPaper.year}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-100 p-4 rounded text-center">
                <div className="text-2xl font-light text-slate-900 leading-none mb-1">{selectedPaper.citationCount.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Citations</div>
              </div>
              <div className="border border-slate-100 p-4 rounded text-center">
                <div className="text-2xl font-light text-slate-900 leading-none mb-1">0.94</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Sim. Index</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Abstract</h4>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                {selectedPaper.abstract || "No extended abstract found for this publication."}
              </p>
            </div>

            <div className="pt-10 space-y-3">
               <button className="w-full py-3 text-sm font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors">
                 Full Publication
               </button>
               <button className="w-full py-3 text-sm font-semibold text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                 Export Graph Data
               </button>
            </div>

            {selectedPaper.doi && (
              <div className="mono text-[10px] text-slate-300 text-center uppercase tracking-tighter">
                DOI: {selectedPaper.doi || '10.1038/nature14539'}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <p className="text-sm italic">Select a node to inspect</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
