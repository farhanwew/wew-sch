import React from 'react';
import { Paper } from '../types';

interface PaperDetailProps {
  paper: Paper;
  onBack: () => void;
  onBuildGraph: (paper: Paper) => void;
  isBuilding?: boolean;
}

const PaperDetail: React.FC<PaperDetailProps> = ({
  paper,
  onBack,
  onBuildGraph,
  isBuilding = false,
}) => {
  return (
    <div className="w-full min-h-screen bg-[#fcfaf8] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back to results</span>
        </button>

        {/* Paper detail card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <h1 className="serif text-2xl text-slate-900 mb-4 leading-tight">
                  {paper.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{paper.authors.join(', ')}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span>{paper.year}</span>
                  {paper.doi && (
                    <>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <a 
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-teal-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {paper.doi}
                      </a>
                    </>
                  )}
                </div>
              </div>
              
              {/* Citation badge */}
              <div className="flex flex-col items-center px-4 py-3 bg-slate-50 rounded-xl">
                <span className="mono text-2xl font-light text-slate-900">
                  {paper.citationCount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Citations</span>
              </div>
            </div>
          </div>

          {/* Abstract section */}
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Abstract
            </h2>
            {paper.abstract ? (
              <p className="text-slate-700 leading-relaxed text-[15px]">
                {paper.abstract}
              </p>
            ) : (
              <p className="text-slate-400 italic">No abstract available</p>
            )}
          </div>

          {/* Metadata section */}
          <div className="p-8 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Details
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wide">Authors</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {paper.authors.map((author, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-full"
                    >
                      {author}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wide">Year</span>
                <p className="mt-1 text-slate-700 font-medium">{paper.year}</p>
              </div>
              {paper.doi && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wide">DOI</span>
                  <p className="mt-1 text-slate-700 font-mono text-sm">{paper.doi}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action section */}
          <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="serif text-xl text-slate-900 mb-2">
                Ready to explore citations?
              </h3>
              <p className="text-slate-500 mb-6 max-w-md">
                Build an interactive citation graph to discover related papers and understand the research landscape.
              </p>
              <button
                onClick={() => onBuildGraph(paper)}
                disabled={isBuilding}
                className="px-8 py-4 bg-[#004e7c] text-white rounded-full font-bold text-[15px] hover:bg-[#003d61] transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {isBuilding && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                )}
                {isBuilding ? 'Building Graph...' : 'Build Citation Graph'}
                {!isBuilding && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperDetail;
