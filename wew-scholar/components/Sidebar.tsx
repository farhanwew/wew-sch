
import React, { useState } from 'react';
import { Paper, Project, GraphData } from '../types';
import { ARCHITECTURE_PLAN } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

interface SidebarProps {
  selectedPaper: Paper | null;
  showPlan: boolean;
  onTogglePlan: () => void;
  currentProject?: Project | null;
  onSaveToLibrary?: (projectName: string) => Promise<void>;
  graphData?: GraphData | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  selectedPaper, 
  showPlan, 
  onTogglePlan,
  currentProject,
  onSaveToLibrary,
  graphData,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { isAuthenticated } = useAuth();

  const handleSaveClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  const handleAuthSuccess = () => {
    // After successful login, show the save modal
    setShowSaveModal(true);
  };

  const handleSave = async () => {
    if (!projectName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSaveToLibrary?.(projectName.trim());
      setShowSaveModal(false);
      setProjectName('');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save to library');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if this is a temporary project (not saved yet)
  const isUnsaved = currentProject?.id?.startsWith('temp-');

  const handleExportGraph = () => {
    const dataToExport = graphData || currentProject?.graphData;
    if (!dataToExport) {
      alert('No graph data to export');
      return;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      projectName: currentProject?.name || 'Untitled',
      nodes: dataToExport.nodes.map(node => ({
        id: node.id,
        title: node.title,
        authors: node.authors,
        year: node.year,
        doi: node.doi,
        citationCount: node.citationCount,
        abstract: node.abstract,
        isPrimary: node.isPrimary,
      })),
      edges: dataToExport.links.map(link => ({
        source: typeof link.source === 'object' ? (link.source as { id: string }).id : link.source,
        target: typeof link.target === 'object' ? (link.target as { id: string }).id : link.target,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'graph-data'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFullPublication = () => {
    console.log('[Full Publication] Selected paper:', selectedPaper);
    console.log('[Full Publication] PDF URL:', selectedPaper?.pdfUrl);
    console.log('[Full Publication] DOI:', selectedPaper?.doi);
    console.log('[Full Publication] ArXiv ID:', selectedPaper?.arxivId);
    
    // Priority: 1. Direct PDF, 2. ArXiv PDF, 3. DOI, 4. Google Scholar
    if (selectedPaper?.pdfUrl) {
      window.open(selectedPaper.pdfUrl, '_blank');
    } else if (selectedPaper?.arxivId) {
      window.open(`https://arxiv.org/pdf/${selectedPaper.arxivId}.pdf`, '_blank');
    } else if (selectedPaper?.doi) {
      window.open(`https://doi.org/${selectedPaper.doi}`, '_blank');
    } else {
      // Fallback to Google Scholar search
      const searchQuery = encodeURIComponent(`${selectedPaper?.title} ${selectedPaper?.authors?.[0] || ''}`);
      window.open(`https://scholar.google.com/scholar?q=${searchQuery}`, '_blank');
    }
  };

  const getPublicationButtonText = () => {
    if (selectedPaper?.pdfUrl) return 'Open PDF';
    if (selectedPaper?.arxivId) return 'Open ArXiv PDF';
    if (selectedPaper?.doi) return 'View Publication';
    return 'Search on Google Scholar';
  };

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
               {isUnsaved && (
                 <button 
                   onClick={handleSaveClick}
                   className="w-full py-3 text-sm font-semibold text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                   </svg>
                   {isAuthenticated ? 'Save to Library' : 'Sign in to Save'}
                 </button>
               )}
               {!isUnsaved && currentProject && (
                 <div className="w-full py-3 text-sm font-medium text-teal-700 bg-teal-50 rounded text-center">
                   Saved to "{currentProject.name}"
                 </div>
               )}
               <button 
                 onClick={handleFullPublication}
                 className="w-full py-3 text-sm font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
               >
                 {(selectedPaper?.pdfUrl || selectedPaper?.arxivId) && (
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                 )}
                 {getPublicationButtonText()}
               </button>
               <button 
                 onClick={handleExportGraph}
                 className="w-full py-3 text-sm font-semibold text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
               >
                 Export Graph Data
               </button>
            </div>

            {selectedPaper.doi && (
              <div className="mono text-[10px] text-slate-300 text-center uppercase tracking-tighter">
                DOI: {selectedPaper.doi}
              </div>
            )}
            {selectedPaper.pdfUrl && (
              <div className="flex items-center justify-center gap-1 text-[10px] text-green-600 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Open Access PDF Available
              </div>
            )}
            {!selectedPaper.pdfUrl && selectedPaper.arxivId && (
              <div className="flex items-center justify-center gap-1 text-[10px] text-orange-600 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                ArXiv: {selectedPaper.arxivId}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <p className="text-sm italic">Select a node to inspect</p>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[400px] shadow-2xl">
            <h3 className="serif text-2xl text-slate-900 mb-2">Save to Library</h3>
            <p className="text-slate-500 text-sm mb-6">
              Give your research project a name to save it to your library.
            </p>
            
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Transformer Architecture Research"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-6"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!projectName.trim() || isSaving}
                className="flex-1 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
