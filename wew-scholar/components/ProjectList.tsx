
import React, { useEffect, useState } from 'react';
import { Project, Paper } from '../types';
import { authFetch } from '../contexts/AuthContext';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onCreateCustomGraph: () => void;
}

interface APIProject {
  id: string;
  name: string;
  description: string;
  paperCount: number;
  projectType: string;
  createdAt: string;
  updatedAt: string;
}

interface APIGraphNode {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citationCount: number;
  abstract?: string;
  isPrimary?: boolean;
  doi?: string;
  pdfUrl?: string;
  arxivId?: string;
}

type FilterTab = 'all' | 'auto' | 'custom';

const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject, onCreateCustomGraph }) => {
  const [projects, setProjects] = useState<APIProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<APIProject | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const response = await authFetch(`${apiUrl}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (project: APIProject) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setLoadingProjectId(project.id);
    try {
      const response = await fetch(`${apiUrl}/api/projects/${project.id}/graph`);
      if (response.ok) {
        const data = await response.json();
        const fullProject: Project = {
          id: project.id,
          name: project.name,
          description: project.description,
          paperCount: project.paperCount,
          lastModified: new Date(project.updatedAt).toLocaleDateString(),
          projectType: project.projectType === 'custom' ? 'custom' : 'auto',
          graphData: {
            nodes: (data.graph.nodes || []).map((node: APIGraphNode): Paper => ({
              id: node.id,
              title: node.title,
              authors: node.authors || [],
              year: node.year,
              citationCount: node.citationCount,
              abstract: node.abstract,
              isPrimary: node.isPrimary,
              doi: node.doi,
              pdfUrl: node.pdfUrl,
              arxivId: node.arxivId,
            })),
            links: (data.graph.edges || []).map((edge: { source: string; target: string }) => ({
              source: edge.source,
              target: edge.target,
              value: 1,
            })),
          },
        };
        onSelectProject(fullProject);
      } else {
        // For custom graphs with no graph data yet, open builder with empty graph
        if (project.projectType === 'custom') {
          const emptyProject: Project = {
            id: project.id,
            name: project.name,
            description: project.description,
            paperCount: 0,
            lastModified: new Date(project.updatedAt).toLocaleDateString(),
            projectType: 'custom',
            graphData: { nodes: [], links: [] },
          };
          onSelectProject(emptyProject);
        } else {
          alert('This project has no graph data yet.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch project graph:', error);
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setDeletingId(projectId);
    try {
      const response = await authFetch(`${apiUrl}/api/projects/${projectId}`, { method: 'DELETE' });
      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        alert('Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditProject = (e: React.MouseEvent, project: APIProject) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditName(project.name);
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !editName.trim()) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setIsSaving(true);
    try {
      const response = await authFetch(`${apiUrl}/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editingProject.description }),
      });
      if (response.ok) {
        setProjects(projects.map(p =>
          p.id === editingProject.id
            ? { ...p, name: editName.trim(), updatedAt: new Date().toISOString() }
            : p
        ));
        setEditingProject(null);
        setEditName('');
      } else {
        alert('Failed to update project. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const visibleProjects = projects
    .filter(p => filterTab === 'all' || (filterTab === 'custom' ? p.projectType === 'custom' : p.projectType !== 'custom'))
    .filter(p => !nameFilter || p.name.toLowerCase().includes(nameFilter.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
        <div className="space-y-4">
          <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Research Library
          </div>
          <h2 className="serif text-5xl text-slate-900 tracking-tight leading-tight">
            Your Knowledge <br/>Landscape.
          </h2>
          <p className="text-slate-500 text-lg font-light max-w-xl leading-relaxed">
            Map citations, build reading paths, and save the papers that matter.
          </p>
        </div>
        <div className="flex flex-col gap-3 items-end">
          <button
            onClick={onCreateCustomGraph}
            className="px-6 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Build Custom Graph
          </button>
          <p className="text-[11px] text-slate-400">or search a paper to auto-generate</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4 mb-8">
        {/* Tabs */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
          {(['all', 'auto', 'custom'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                filterTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'auto' ? 'Citation Graphs' : 'My Graphs'}
            </button>
          ))}
        </div>

        {/* Name search */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="Filter by name..."
            className="bg-transparent text-xs outline-none text-slate-700 w-full placeholder:text-slate-400"
          />
          {nameFilter && (
            <button onClick={() => setNameFilter('')} className="text-slate-300 hover:text-slate-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400 ml-auto">{visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProjects.map((project) => {
            const isCustom = project.projectType === 'custom';
            return (
              <div
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`group p-8 border bg-white rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-[300px] shadow-sm relative overflow-hidden ${
                  loadingProjectId === project.id ? 'opacity-70 pointer-events-none' : ''
                } ${isCustom ? 'border-teal-100 hover:border-teal-400' : 'border-slate-200 hover:border-slate-900'}`}
              >
                {loadingProjectId === project.id && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                  </div>
                )}

                {/* Edit button */}
                <button
                  onClick={(e) => handleEditProject(e, project)}
                  className="absolute top-4 right-14 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  disabled={deletingId === project.id}
                  className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all shadow-sm"
                  title="Delete"
                >
                  {deletingId === project.id ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  )}
                </button>

                {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-28 h-28 -mr-14 -mt-14 rounded-full group-hover:scale-110 transition-transform ${isCustom ? 'bg-teal-50' : 'bg-slate-50'}`} />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-md ${isCustom ? 'bg-teal-50 border border-teal-100' : 'bg-slate-50 border border-slate-100'}`}>
                        <span className={`mono text-[10px] uppercase tracking-widest font-bold ${isCustom ? 'text-teal-600' : 'text-slate-500'}`}>
                          {project.paperCount} Papers
                        </span>
                      </div>
                      {isCustom && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[9px] font-bold uppercase tracking-wider rounded-full">
                          My Graph
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(project.updatedAt)}</span>
                  </div>
                  <h3 className="serif text-2xl text-slate-900 mb-3 group-hover:translate-x-1 transition-transform line-clamp-2">
                    {project.name}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 font-light">
                    {project.description || (isCustom ? 'Custom reading graph' : 'Citation graph')}
                  </p>
                </div>

                <div className="relative z-10 pt-4 flex items-center justify-between">
                  <div className={`text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all ${isCustom ? 'text-teal-200 group-hover:text-teal-600' : 'text-slate-300 group-hover:text-slate-900'}`}>
                    {isCustom ? 'Open Builder' : 'Launch Workspace'}
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCustom ? 'bg-teal-50 group-hover:bg-teal-600 group-hover:text-white' : 'bg-slate-50 group-hover:bg-slate-900 group-hover:text-white'}`}>
                    <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty placeholder */}
          <div
            onClick={onCreateCustomGraph}
            className="p-8 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center h-[300px] text-slate-400 hover:bg-slate-50 hover:border-teal-300 transition-all cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm group-hover:border-teal-300 transition-colors">
              <svg className="w-5 h-5 opacity-40 group-hover:opacity-60 group-hover:text-teal-600 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold group-hover:text-teal-600 transition-colors">Build Custom Graph</span>
            <span className="text-[10px] text-slate-300 mt-2 font-medium">Add papers and draw connections</span>
          </div>

          {visibleProjects.length === 0 && !isLoading && projects.length > 0 && (
            <div className="col-span-full text-center py-10">
              <p className="text-slate-400">No projects match your filter.</p>
            </div>
          )}

          {projects.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-10">
              <p className="text-slate-400">No projects yet. Search for a paper or build a custom graph!</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[400px] shadow-2xl">
            <h3 className="serif text-2xl text-slate-900 mb-2">Rename Project</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Project name"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 mt-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditingProject(null); setEditName(''); }}
                className="flex-1 py-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim() || isSaving}
                className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
