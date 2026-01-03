
import React from 'react';
import { Project } from '../types';
import { MOCK_PROJECTS } from '../constants';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject }) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {MOCK_PROJECTS.map((project) => (
          <div 
            key={project.id}
            onClick={() => onSelectProject(project)}
            className="group p-10 border border-slate-200 bg-white rounded-2xl cursor-pointer hover:border-slate-900 transition-all flex flex-col justify-between h-[340px] shadow-sm hover:shadow-2xl relative overflow-hidden"
          >
            {/* Visual Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-md">
                   <span className="mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">{project.paperCount} Papers</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{project.lastModified}</span>
              </div>
              <h3 className="serif text-3xl text-slate-900 mb-4 group-hover:translate-x-1 transition-transform">
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

        {/* Improved Empty placeholder */}
        <div className="p-10 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center h-[340px] text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
            <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold">New Workspace</span>
          <span className="text-[10px] text-slate-300 mt-2 font-medium">Start from a single paper or PDF</span>
        </div>
      </div>
      
      {/* Background Stats */}
      <div className="mt-32 pt-16 border-t border-slate-100 flex flex-wrap gap-16 justify-center opacity-40">
        <div className="text-center">
          <div className="mono text-3xl font-light text-slate-900">4,281</div>
          <div className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Total Citations Indexed</div>
        </div>
        <div className="text-center">
          <div className="mono text-3xl font-light text-slate-900">128MB</div>
          <div className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Graph Storage Used</div>
        </div>
        <div className="text-center">
          <div className="mono text-3xl font-light text-slate-900">14ms</div>
          <div className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1">Traversal Latency</div>
        </div>
      </div>
    </div>
  );
};

export default ProjectList;
