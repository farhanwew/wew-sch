import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, Paper, GraphData, Link } from '../types';
import { authFetch } from '../contexts/AuthContext';
import EditableGraphView from './EditableGraphView';

interface CustomGraphBuilderProps {
  project: Project;
  onProjectUpdate: (updated: Project) => void;
  onBack: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CustomGraphBuilder: React.FC<CustomGraphBuilderProps> = ({ project, onProjectUpdate, onBack }) => {
  const [graphName, setGraphName] = useState(project.name);
  const [nodes, setNodes] = useState<Paper[]>(project.graphData.nodes);
  const [links, setLinks] = useState<Link[]>(project.graphData.links);
  const [mode, setMode] = useState<'select' | 'connect'>('select');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  const [leftTab, setLeftTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Manual entry form
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthors, setManualAuthors] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doSaveRef = useRef<() => void>(() => {});
  const graphNameRef = useRef(graphName);
  useEffect(() => { graphNameRef.current = graphName; }, [graphName]);

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    setIsDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      doSaveRef.current();
    }, 5000);
  }, []);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const doSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Update project name if changed
      const currentName = graphNameRef.current;
      if (currentName !== project.name) {
        await authFetch(`${API_URL}/api/projects/${project.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: currentName, description: project.description }),
        });
      }

      // Save graph data
      const res = await authFetch(`${API_URL}/api/projects/${project.id}/graph`, {
        method: 'POST',
        body: JSON.stringify({
          nodes: nodes.map(n => ({
            id: n.id,
            title: n.title,
            authors: n.authors,
            year: n.year,
            citationCount: n.citationCount,
            abstract: n.abstract || '',
            isPrimary: n.isPrimary || false,
            doi: n.doi || '',
            pdfUrl: n.pdfUrl || '',
            arxivId: n.arxivId || '',
          })),
          edges: links.map(l => ({
            source: typeof l.source === 'object' ? (l.source as any).id : l.source,
            target: typeof l.target === 'object' ? (l.target as any).id : l.target,
          })),
        }),
      });

      if (res.ok) {
        setIsDirty(false);
        setLastSaved(new Date());
        onProjectUpdate({
          ...project,
          name: currentName,
          graphData: { nodes, links },
          paperCount: nodes.length,
          projectType: 'custom',
        });
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, links, project, onProjectUpdate]);

  // Re-bind doSave when deps change so auto-save uses latest state
  useEffect(() => {
    doSaveRef.current = () => {
      void doSave();
    };
  }, [doSave]);

  const handleManualSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    doSaveRef.current();
  };

  // Keyboard shortcut: press C to toggle connect mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isTyping) return;

      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setMode(prev => prev === 'connect' ? 'select' : 'connect');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search S2
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/search?query=${encodeURIComponent(searchQuery)}&limit=8`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data.papers || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddNode = (paper: Paper) => {
    if (nodes.find(n => n.id === paper.id)) return; // Already in graph
    setNodes(prev => [...prev, paper]);
    scheduleSave();
  };

  const handleManualAdd = () => {
    if (!manualTitle.trim()) return;
    const authors = manualAuthors.trim()
      ? manualAuthors.split(',').map(a => a.trim()).filter(Boolean)
      : ['Unknown'];
    const year = parseInt(manualYear) || new Date().getFullYear();
    // Generate a stable local ID from title+year so duplicates are caught
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const paper: Paper = {
      id,
      title: manualTitle.trim(),
      authors,
      year,
      citationCount: 0,
      abstract: '',
      pdfUrl: manualUrl.trim() || undefined,
    };
    handleAddNode(paper);
    setManualTitle('');
    setManualAuthors('');
    setManualYear('');
    setManualUrl('');
  };

  const handleRemoveNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setLinks(prev => prev.filter(l => {
      const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return src !== nodeId && tgt !== nodeId;
    }));
    if (selectedPaper?.id === nodeId) setSelectedPaper(null);
    scheduleSave();
  };

  const handleAddEdge = (source: string, target: string) => {
    // Prevent duplicate edges
    const exists = links.some(l => {
      const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return src === source && tgt === target;
    });
    if (exists) return;
    setLinks(prev => [...prev, { source, target, value: 1 }]);
    scheduleSave();
  };

  const handleRemoveEdge = (source: string, target: string) => {
    setLinks(prev => prev.filter(l => {
      const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return !(src === source && tgt === target);
    }));
    scheduleSave();
  };

  const handleNameChange = (name: string) => {
    setGraphName(name);
    scheduleSave();
  };

  const graphData: GraphData = { nodes, links };
  const nodeIds = new Set(nodes.map(n => n.id));

  return (
    <div className="flex flex-col w-full h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Library
        </button>

        <div className="h-5 w-[1px] bg-slate-200" />

        <input
          type="text"
          value={graphName}
          onChange={e => handleNameChange(e.target.value)}
          className="text-base font-semibold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300 transition-colors min-w-[200px]"
          placeholder="Graph name..."
        />

        <div className="ml-auto flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setMode('select')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === 'select' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Select mode (click to inspect)"
            >
              Select
            </button>
            <button
              onClick={() => setMode('connect')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === 'connect' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Connect mode (C) — click two nodes to draw an edge"
            >
              Connect
            </button>
          </div>

          {/* Save status */}
          <div className="text-xs text-slate-400 min-w-[90px] text-right">
            {isSaving ? (
              <span className="text-blue-500">Saving…</span>
            ) : isDirty ? (
              <span className="text-amber-500">Unsaved</span>
            ) : lastSaved ? (
              <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ) : null}
          </div>

          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: search + node list */}
        <div className="w-72 flex flex-col border-r border-slate-200 bg-white shrink-0">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setLeftTab('search')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                leftTab === 'search' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Search S2
            </button>
            <button
              onClick={() => setLeftTab('manual')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                leftTab === 'manual' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Manual
            </button>
          </div>

          {/* Search tab */}
          {leftTab === 'search' && (
            <>
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search papers to add..."
                    className="bg-transparent text-sm outline-none text-slate-700 w-full placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-300 hover:text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {searchQuery && (
                <div className="flex-1 overflow-y-auto border-b border-slate-100">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-sm">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-slate-400 text-sm">No results found.</p>
                      <button
                        onClick={() => setLeftTab('manual')}
                        className="mt-2 text-xs text-teal-600 hover:text-teal-800 font-medium underline"
                      >
                        Add manually instead
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {searchResults.map(paper => {
                        const alreadyAdded = nodeIds.has(paper.id);
                        return (
                          <div
                            key={paper.id}
                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{paper.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{paper.authors?.[0]} · {paper.year}</p>
                            </div>
                            <button
                              onClick={() => handleAddNode(paper)}
                              disabled={alreadyAdded}
                              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors mt-0.5 ${
                                alreadyAdded
                                  ? 'bg-slate-100 text-slate-300 cursor-default'
                                  : 'bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white'
                              }`}
                              title={alreadyAdded ? 'Already in graph' : 'Add to graph'}
                            >
                              {alreadyAdded ? '✓' : '+'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Manual tab */}
          {leftTab === 'manual' && (
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  placeholder="e.g. Attention Is All You Need"
                  rows={2}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 resize-none placeholder:text-slate-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Authors <span className="text-slate-300 font-normal normal-case tracking-normal">comma-separated</span>
                </label>
                <input
                  type="text"
                  value={manualAuthors}
                  onChange={e => setManualAuthors(e.target.value)}
                  placeholder="Vaswani, Shazeer, Parmar…"
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 placeholder:text-slate-300"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Year</label>
                  <input
                    type="number"
                    value={manualYear}
                    onChange={e => setManualYear(e.target.value)}
                    placeholder={String(new Date().getFullYear())}
                    min="1900"
                    max="2100"
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 placeholder:text-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">URL / DOI</label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="https://arxiv.org/abs/…"
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 placeholder:text-slate-300"
                />
              </div>
              <button
                onClick={handleManualAdd}
                disabled={!manualTitle.trim()}
                className="w-full py-2 text-xs font-bold uppercase tracking-wider bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add to Graph
              </button>
            </div>
          )}

          {/* Node list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                In graph · {nodes.length}
              </span>
            </div>
            {nodes.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Search above to add papers
              </div>
            ) : (
              <div className="px-2 space-y-0.5 pb-4">
                {nodes.map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedPaper(selectedPaper?.id === node.id ? null : node)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                      selectedPaper?.id === node.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{node.title}</p>
                      <p className="text-[11px] text-slate-400">{node.year}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveNode(node.id); }}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove from graph"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Graph canvas */}
        <div className="flex-1 overflow-hidden">
          <EditableGraphView
            data={graphData}
            mode={mode}
            onSelectNode={p => setSelectedPaper(p)}
            onAddEdge={handleAddEdge}
            onRemoveEdge={handleRemoveEdge}
            onRemoveNode={handleRemoveNode}
          />
        </div>

        {/* Right: paper detail panel */}
        {selectedPaper && (
          <div className="w-72 border-l border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0">
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{selectedPaper.title}</h3>
                <button
                  onClick={() => setSelectedPaper(null)}
                  className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Authors</span>
                  <p className="mt-0.5">{selectedPaper.authors?.join(', ') || '—'}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Year</span>
                    <p className="mt-0.5">{selectedPaper.year || '—'}</p>
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Citations</span>
                    <p className="mt-0.5">{selectedPaper.citationCount?.toLocaleString() || '—'}</p>
                  </div>
                </div>
                {selectedPaper.abstract && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Abstract</span>
                    <p className="mt-0.5 text-slate-500 leading-relaxed line-clamp-6">{selectedPaper.abstract}</p>
                  </div>
                )}
              </div>

              {/* Open PDF link */}
              {(selectedPaper.pdfUrl || selectedPaper.arxivId || selectedPaper.doi) && (
                <a
                  href={
                    selectedPaper.pdfUrl ||
                    (selectedPaper.arxivId ? `https://arxiv.org/pdf/${selectedPaper.arxivId}.pdf` : undefined) ||
                    (selectedPaper.doi ? `https://doi.org/${selectedPaper.doi}` : undefined)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Open paper
                </a>
              )}

              <button
                onClick={() => handleRemoveNode(selectedPaper.id)}
                className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-100 rounded-lg py-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Remove from graph
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomGraphBuilder;
