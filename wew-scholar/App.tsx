
import React, { useState, useCallback, useEffect } from 'react';
import { Project, Paper, GraphData } from './types';
import GraphView from './components/GraphView';
import Sidebar from './components/Sidebar';
import ProjectList from './components/ProjectList';
import LandingPage from './components/LandingPage';
import SearchResults from './components/SearchResults';
import PaperDetail from './components/PaperDetail';
import AuthModal from './components/AuthModal';
import { MOCK_PROJECTS } from './constants';
import { useAuth, authFetch } from './contexts/AuthContext';

type AppView = 'LANDING' | 'SEARCH_RESULTS' | 'PAPER_DETAIL' | 'LIBRARY' | 'WORKSPACE';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as AppView;
    return (viewParam && ['LANDING', 'SEARCH_RESULTS', 'PAPER_DETAIL', 'LIBRARY', 'WORKSPACE'].includes(viewParam)) ? viewParam : 'LANDING';
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
  
  // New states for search flow
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [previewPaper, setPreviewPaper] = useState<Paper | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);

  // Auth state
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

const handleSearch = async (query: string) => {
    console.log("Searching for:", query);
    setSearchQuery(query);
    setIsSearching(true);
    setView('SEARCH_RESULTS');
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(
        `${apiUrl}/api/search?query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setSearchResults(data.papers);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (paper: Paper) => {
    setPreviewPaper(paper);
    setView('PAPER_DETAIL');
  };

  const handleBackToSearchResults = () => {
    setView('SEARCH_RESULTS');
    setPreviewPaper(null);
  };

  const handleBuildGraph = async (paper: Paper, useDeepGraph: boolean = false) => {
    setIsBuilding(true);
    console.log("Building graph for:", paper.title, useDeepGraph ? "(deep)" : "(simple)");
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    try {
      // Use deep-graph endpoint for inter-connections, or regular graph for simple view
      const endpoint = useDeepGraph 
        ? `${apiUrl}/api/paper/${paper.id}/deep-graph?citations=15&references=15`
        : `${apiUrl}/api/paper/${paper.id}/graph?citations=20&references=20`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to build graph');
      }
      
      const data = await response.json();
      
      // Transform API response to match frontend types
      // API returns { paper, graph: { nodes, edges } }
      // Frontend expects { nodes, links }
      const graphData: GraphData = {
        nodes: data.graph.nodes,
        links: data.graph.edges.map((edge: { source: string; target: string }) => ({
          source: edge.source,
          target: edge.target,
          value: 1,
        })),
      };
      
      // Create a temporary project for this graph
      const tempProject: Project = {
        id: `temp-${paper.id}`,
        name: paper.title,
        description: `Citation graph for "${paper.title}"`,
        lastModified: new Date().toLocaleDateString(),
        paperCount: graphData.nodes.length,
        graphData: graphData,
      };
      
      setActiveProject(tempProject);
      setSelectedPaper(paper);
      setView('WORKSPACE');
    } catch (error) {
      console.error('Failed to build graph:', error);
      alert('Failed to build citation graph. Please try again.');
    } finally {
      setIsBuilding(false);
    }
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

  const handleSaveToLibrary = async (projectName: string) => {
    if (!activeProject) return;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    console.log('[Save] Starting save to library...', { apiUrl, projectName });
    
    try {
      // 1. Create project (requires auth)
      console.log('[Save] Creating project...');
      const projectResponse = await authFetch(`${apiUrl}/api/projects`, {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          description: `Citation graph with ${activeProject.graphData.nodes.length} papers`,
        }),
      });
      
      if (!projectResponse.ok) {
        const errorText = await projectResponse.text();
        console.error('[Save] Failed to create project:', errorText);
        throw new Error('Failed to create project');
      }
      
      const { project } = await projectResponse.json();
      console.log('[Save] Project created:', project.id);
    
      // 2. Save graph data (requires auth)
      console.log('[Save] Saving graph data...');
      const graphResponse = await authFetch(`${apiUrl}/api/projects/${project.id}/graph`, {
        method: 'POST',
        body: JSON.stringify({
          nodes: activeProject.graphData.nodes.map(node => ({
            id: node.id,
            title: node.title,
            authors: node.authors,
            year: node.year,
            citationCount: node.citationCount,
            abstract: node.abstract || '',
            isPrimary: node.isPrimary || false,
            doi: node.doi || '',
            pdfUrl: node.pdfUrl || '',
            arxivId: node.arxivId || '',
          })),
          edges: activeProject.graphData.links.map(link => ({
            // D3 may have converted source/target to objects, handle both cases
            source: typeof link.source === 'object' ? (link.source as any).id : link.source,
            target: typeof link.target === 'object' ? (link.target as any).id : link.target,
          })),
        }),
      });
      
      if (!graphResponse.ok) {
        const errorText = await graphResponse.text();
        console.error('[Save] Failed to save graph:', errorText);
        throw new Error('Failed to save graph');
      }
      
      console.log('[Save] Graph saved successfully!');
      
      // 3. Update active project with saved ID
      setActiveProject({
        ...activeProject,
        id: project.id,
        name: projectName,
      });
      
      console.log('[Save] Complete! Project ID:', project.id);
    } catch (error) {
      console.error('[Save] Error:', error);
      throw error;
    }
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
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none antialiased">WewScholar</h1>
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
              {isAuthenticated ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center hover:bg-teal-700 transition-colors cursor-pointer border border-teal-700 shadow-sm text-white font-medium text-sm"
                  >
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </header>
      )}

{/* Main Views */}
      {view === 'LANDING' && (
        <LandingPage onSearch={handleSearch} onGoToLibrary={handleGoToLibrary} />
      )}

      {view === 'SEARCH_RESULTS' && (
        <main className="w-full h-full overflow-y-auto animate-in fade-in duration-700">
          <SearchResults
            query={searchQuery}
            papers={searchResults}
            onSelectPaper={handleSelectSearchResult}
            onBackToSearch={handleBackToLanding}
            isLoading={isSearching}
          />
        </main>
      )}

      {view === 'PAPER_DETAIL' && previewPaper && (
        <main className="w-full h-full overflow-y-auto animate-in fade-in duration-700">
          <PaperDetail
            paper={previewPaper}
            onBack={handleBackToSearchResults}
            onBuildGraph={handleBuildGraph}
            isBuilding={isBuilding}
          />
        </main>
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
            currentProject={activeProject}
            onSaveToLibrary={handleSaveToLibrary}
            graphData={activeProject.graphData}
          />
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default App;
