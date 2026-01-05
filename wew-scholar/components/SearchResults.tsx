import React from 'react';
import { Paper } from '../types';

interface SearchResultsProps {
  query: string;
  papers: Paper[];
  onSelectPaper: (paper: Paper) => void;
  onBackToSearch: () => void;
  isLoading?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  papers,
  onSelectPaper,
  onBackToSearch,
  isLoading = false,
}) => {
  return (
    <div className="w-full min-h-screen bg-[#fcfaf8] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-8">
        {/* Back button and search info */}
        <div className="mb-8">
          <button
            onClick={onBackToSearch}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to search</span>
          </button>
          
          <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
            Search Results
          </div>
          <h1 className="serif text-5xl text-slate-900 tracking-tight leading-tight mb-4">
            Results for "{query}"
          </h1>
          <p className="text-slate-500 text-lg font-light">
            {isLoading ? (
              'Searching...'
            ) : (
              <>
                Found <span className="font-semibold text-slate-700">{papers.length}</span> papers
              </>
            )}
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4"></div>
            <p className="text-slate-500">Searching papers...</p>
          </div>
        )}

        {/* Results list */}
        {!isLoading && papers.length > 0 && (
          <div className="space-y-4">
            {papers.map((paper) => (
              <div
                key={paper.id}
                onClick={() => onSelectPaper(paper)}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="serif text-xl text-slate-900 group-hover:text-teal-700 transition-colors mb-2">
                      {paper.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      {paper.authors.join(', ')} • {paper.year}
                    </p>
                    {paper.abstract && (
                      <p className="text-sm text-slate-600 line-clamp-2 font-light">
                        {paper.abstract}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="mono text-xs font-medium">{paper.citationCount.toLocaleString()}</span>
                    </div>
                    {paper.doi && (
                      <span className="text-xs text-slate-400 mono">
                        {paper.doi}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {paper.isPrimary && (
                      <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    View details
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && papers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="serif text-xl text-slate-900 mb-2">No papers found</h3>
            <p className="text-slate-500 mb-6">Try searching with different keywords or a DOI</p>
            <button
              onClick={onBackToSearch}
              className="px-6 py-3 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors"
            >
              Search again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
