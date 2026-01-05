
import React, { useEffect, useState } from 'react';
import { Project, Paper } from '../types';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
}

interface APIProject {
  id: string;
  name: string;
  description: string;
  paperCount: number;
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

const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<APIProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${apiUrl}/api/projects`);
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
      // Fetch graph data for this project
      const response = await fetch(`${apiUrl}/api/projects/${project.id}/graph`);
      if (response.ok) {
        const data = await response.json();
        
        // Transform to frontend Project type
        const fullProject: Project = {
          id: project.id,
          name: project.name,
          description: project.description,
          paperCount: project.paperCount,
          lastModified: new Date(project.updatedAt).toLocaleDateString(),
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
        console.error('No graph data found for project');
        alert('This project has no graph data yet.');
      }
    } catch (error) {
      console.error('Failed to fetch project graph:', error);
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent triggering card click
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    setDeletingId(projectId);
    
    try {
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from local state
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        console.error('Failed to delete project');
        alert('Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingId(null);
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

  return (
    <div className="max-w-6xl mx-auto px-8 py-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
        <div className="space-y-6">
          <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Research Library
          </div>
          <h2 className="serif text-6xl text-slate-900 tracking-tight leading-tight">
            Your Knowledge <br/>Landscape.
          </h2>
          <p className="text-slate-500 text-xl font-light max-w-xl leading-relaxed">
            A minimalist workspace for mapping citations, discovering gaps, and architecting your next research project.
          </p>
        </div>
        <button className="px-8 py-4 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-3 shadow-2xl hover:-translate-y-1">
          <span className="text-xl">+</span> Create New Map
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => handleSelectProject(project)}
              className={`group p-10 border border-slate-200 bg-white rounded-2xl cursor-pointer hover:border-slate-900 transition-all flex flex-col justify-between h-[340px] shadow-sm hover:shadow-2xl relative overflow-hidden ${loadingProjectId === project.id ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {/* Loading overlay */}
              {loadingProjectId === project.id && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
              )}
              
              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                disabled={deletingId === project.id}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all shadow-sm"
                title="Delete project"
              >
                {deletingId === project.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
              
              {/* Visual Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-md">
                     <span className="mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">{project.paperCount} Papers</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(project.updatedAt)}</span>
                </div>
                <h3 className="serif text-3xl text-slate-900 mb-4 group-hover:translate-x-1 transition-transform line-clamp-2">
                  {project.name}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 font-light">
                  {project.description}
                </p>
              </div>
              
              <div className="relative z-10 pt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-300 group-hover:text-slate-900 transition-all">
                  Launch Workspace 
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <span className="translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty placeholder - always show */}
          <div className="p-10 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center h-[340px] text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold">New Workspace</span>
            <span className="text-[10px] text-slate-300 mt-2 font-medium">Start from a single paper or PDF</span>
          </div>

          {/* Empty state when no projects */}
          {projects.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-10">
              <p className="text-slate-400 text-lg">No projects yet. Search for a paper and build your first citation graph!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectList;
