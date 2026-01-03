
import React, { useState, useCallback, useEffect } from 'react';
import { Project, Paper } from './types';
import GraphView from './components/GraphView';
import Sidebar from './components/Sidebar';
import ProjectList from './components/ProjectList';
import LandingPage from './components/LandingPage';
import { MOCK_PROJECTS } from './constants';

type AppView = 'LANDING' | 'LIBRARY' | 'WORKSPACE';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as AppView;
    return (viewParam && ['LANDING', 'LIBRARY', 'WORKSPACE'].includes(viewParam)) ? viewParam : 'LANDING';
  });

  const [activeProject, setActiveProject] = useState<Project | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('projectId');
    if (projectId) {
      return MOCK_PROJECTS.find(p => p.id === projectId) || null;
    }
    return null;
  });

  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(() => {
     if (activeProject) {
         return activeProject.graphData.nodes[0] || null;
     }
     return null;
  });
  
  const [showPlan, setShowPlan] = useState<boolean>(false);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== 'LANDING') {
      params.set('view', view);
    }
    if (activeProject) {
      params.set('projectId', activeProject.id);
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [view, activeProject]);

  const handleNodeSelect = useCallback((paper: Paper) => {
    setSelectedPaper(paper);
    setShowPlan(false);
  }, []);

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
    setSelectedPaper(project.graphData.nodes[0] || null);
    setView('WORKSPACE');
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // Open first mock project as search result simulation
    handleProjectSelect(MOCK_PROJECTS[0]);
  };

  const handleGoToLibrary = () => {
    setView('LIBRARY');
    setActiveProject(null);
    setSelectedPaper(null);
  };

  const handleBackToLanding = () => {
    setView('LANDING');
    setActiveProject(null);
    setSelectedPaper(null);
  };

  return (
    <div className="relative w-full h-screen bg-[#fcfaf8] text-slate-900 overflow-hidden">
      {/* Search Header - Only visible when NOT in landing */}
      {view !== 'LANDING' && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-10 py-5 transition-all animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={handleBackToLanding}>
              <div className="w-8 h-8 bg-[#134e4a] rounded-sm flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-3.5 h-3.5 border border-white rotate-45"></div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none antialiased">NexusScholar</h1>
                <span className="text-[8px] uppercase tracking-[0.3em] text-slate-400 font-extrabold mt-1">Workspace</span>
              </div>
            </div>

            <nav className="flex items-center gap-10">
              <button 
                onClick={handleBackToLanding}
                className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${view === 'LANDING' ? 'text-teal-700' : 'text-slate-400 hover:text-slate-900'}`}
              >
                Search
              </button>
              <button 
                onClick={handleGoToLibrary}
                className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${view === 'LIBRARY' ? 'text-teal-700' : 'text-slate-400 hover:text-slate-900'}`}
              >
                My Library
              </button>
              <div className="h-4 w-[1px] bg-slate-200"></div>
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200 shadow-sm">
                 <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
            </nav>
          </div>
        </header>
      )}

      {/* Main Views */}
      {view === 'LANDING' && (
        <LandingPage onSearch={handleSearch} onGoToLibrary={handleGoToLibrary} />
      )}

      {view === 'LIBRARY' && (
        <main className="w-full h-full overflow-y-auto pt-20 animate-in fade-in duration-700">
          <ProjectList onSelectProject={handleProjectSelect} />
        </main>
      )}

      {view === 'WORKSPACE' && activeProject && (
        <div className="flex w-full h-full animate-in fade-in duration-1000">
          <main className="flex-1 h-full pt-16">
            <GraphView 
              data={activeProject.graphData} 
              onSelectNode={handleNodeSelect} 
            />
          </main>

          <Sidebar 
            selectedPaper={selectedPaper} 
            showPlan={showPlan}
            onTogglePlan={() => setShowPlan(!showPlan)}
          />
        </div>
      )}
    </div>
  );
};

export default App;
