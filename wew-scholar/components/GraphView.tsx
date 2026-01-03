
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Paper } from '../types';

interface GraphViewProps {
  data: GraphData;
  onSelectNode: (paper: Paper) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ data, onSelectNode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleResetPositions = () => {
    if (!simulationRef.current) return;
    const nodes = simulationRef.current.nodes();
    nodes.forEach((d: any) => {
      d.fx = null;
      d.fy = null;
    });
    simulationRef.current.alpha(0.3).restart();
    d3.select(svgRef.current).selectAll(".pinned-indicator").transition().duration(200).attr("opacity", 0);
  };

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  };

  const handleCenterView = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = window.innerWidth - 400; // Account for sidebar
    const height = window.innerHeight;
    const margin = { top: 180, right: 180, bottom: 180, left: 180 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    const tooltip = d3.select(tooltipRef.current);

    svg.selectAll("*").remove();

    // Arrowhead Definition
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28) // Offset for circle radius
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    // 1. Scales
    const years = data.nodes.map(d => d.year);
    const citations = data.nodes.map(d => d.citationCount);

    const xScale = d3.scaleLinear()
      .domain([d3.min(years)! - 1, d3.max(years)! + 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLog()
      .domain([Math.max(1, d3.min(citations)!), d3.max(citations)! * 2.5])
      .range([height - margin.bottom, margin.top]);

    const g = svg.append("g");

    // 2. Static Background Axes (Minimalist Professional Layout)
    const axisGroup = svg.append("g").attr("class", "static-axes pointer-events-none opacity-40");

    // Vertical Axis (Citations)
    axisGroup.append("line")
      .attr("x1", 90).attr("y1", height - 140)
      .attr("x2", 90).attr("y2", 140)
      .attr("stroke", "#64748b").attr("stroke-width", 1.5);
    
    axisGroup.append("path")
      .attr("d", "M86,150 L90,140 L94,150")
      .attr("fill", "none").attr("stroke", "#64748b").attr("stroke-width", 1.5);

    axisGroup.append("text")
      .attr("transform", `rotate(-90, 70, ${height/2})`)
      .attr("x", 70).attr("y", height/2)
      .attr("text-anchor", "middle")
      .attr("class", "mono text-[10px] fill-slate-500 uppercase tracking-[0.2em] font-bold")
      .text("More citations");

    // Horizontal Axis (Recency)
    axisGroup.append("line")
      .attr("x1", 130).attr("y1", height - 90)
      .attr("x2", width - 130).attr("y2", height - 90)
      .attr("stroke", "#64748b").attr("stroke-width", 1.5);

    axisGroup.append("path")
      .attr("d", `M${width - 140},${height - 94} L${width - 130},${height - 90} L${width - 140},${height - 86}`)
      .attr("fill", "none").attr("stroke", "#64748b").attr("stroke-width", 1.5);

    axisGroup.append("text")
      .attr("x", width / 2).attr("y", height - 72)
      .attr("text-anchor", "middle")
      .attr("class", "mono text-[10px] fill-slate-500 uppercase tracking-[0.2em] font-bold")
      .text("More recently published");

    // 3. Simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force("x", d3.forceX((d: any) => xScale(d.year)).strength(1))
      .force("y", d3.forceY((d: any) => yScale(Math.max(1, d.citationCount))).strength(1))
      .force("collide", d3.forceCollide(70)) 
      .force("link", d3.forceLink(data.links as any).id((d: any) => d.id).strength(0.02));

    simulationRef.current = simulation;

    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 3.5) // THICK LINES
      .attr("marker-end", "url(#arrowhead)");

    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("class", "cursor-grab active:cursor-grabbing")
      .call(drag(simulation) as any)
      .on("click", (event, d: any) => {
        onSelectNode(d);
        node.selectAll("circle.main-circle")
          .attr("stroke", "#1a1a1a")
          .attr("stroke-width", 3)
          .attr("fill", "#ffffff");
        
        d3.select(event.currentTarget).select("circle.main-circle")
          .attr("stroke-width", 5)
          .attr("stroke", "#3b82f6")
          .attr("fill", "#eff6ff");
      })
      .on("mouseover", (event, d: any) => {
        // Scale ONLY the circle, not the group (better performance)
        d3.select(event.currentTarget).select(".main-circle")
          .transition().duration(200)
          .attr("r", d.isPrimary ? 25 : 22);
          
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <div class="font-bold text-slate-900 text-xs mb-1">${d.title}</div>
          <div class="text-[10px] text-slate-500 flex gap-2">
            <span>${d.year}</span>
            <span>•</span>
            <span>${d.citationCount} citations</span>
          </div>
        `);
      })
      .on("mousemove", (event) => {
        // Direct DOM update for performance (bypassing D3 selection overhead for this high-freq event)
        if (tooltipRef.current) {
          tooltipRef.current.style.left = (event.pageX + 15) + "px";
          tooltipRef.current.style.top = (event.pageY - 10) + "px";
        }
      })
      .on("mouseout", (event, d: any) => {
        d3.select(event.currentTarget).select(".main-circle")
          .transition().duration(200)
          .attr("r", d.isPrimary ? 20 : 18);
          
        tooltip.transition().duration(200).style("opacity", 0);
      });

    node.append("circle")
      .attr("class", "main-circle")
      .attr("r", (d: any) => d.isPrimary ? 20 : 18)
      .attr("fill", "#ffffff")
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 3)
      .attr("class", "transition-all shadow-md hover:shadow-xl");

    // Blue Pinned Indicator
    node.append("circle")
      .attr("class", "pinned-indicator")
      .attr("cx", 14)
      .attr("cy", -14)
      .attr("r", 5)
      .attr("fill", "#3b82f6")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("opacity", 0);

    // Node Labels (Author, Year)
    const label = node.append("text")
      .attr("y", 45)
      .attr("text-anchor", "middle")
      .attr("class", "pointer-events-none select-none");

    label.append("tspan")
      .attr("x", 0)
      .attr("dy", "0em")
      .text((d: any) => d.authors[0].split(' ')[0].replace(/,/g, ''))
      .attr("class", "text-[13px] font-bold fill-slate-800");

    label.append("tspan")
      .attr("x", 0)
      .attr("dy", "1.25em")
      .text((d: any) => d.year)
      .attr("class", "mono text-[10px] fill-slate-400 font-bold");

    // Select pinned indicators once for performance
    const pinnedIndicators = node.selectAll(".pinned-indicator");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      
      // Update pinned indicators directly without re-selection
      pinnedIndicators
        .attr("opacity", (d: any) => (d.fx !== null && d.fx !== undefined) ? 1 : 0);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    return () => { simulation.stop(); };
  }, [data, onSelectNode]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#fcfaf8]">
      <svg ref={svgRef} className="w-full h-full block" />
      
      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 bg-white/95 backdrop-blur shadow-xl border border-slate-100 px-4 py-3 rounded-lg z-50 max-w-[200px] transition-opacity duration-200"
      ></div>

      {/* Workspace Controls */}
      <div className="absolute top-16 left-10 flex flex-col gap-4 pointer-events-auto">
         <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-5 py-3 shadow-sm min-w-[320px]">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Add papers to the graph..." className="bg-transparent text-sm w-full outline-none text-slate-700 font-semibold" />
         </div>
         <button 
           onClick={handleResetPositions}
           className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 transition-all flex items-center gap-3 w-max shadow-sm"
         >
           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m0 0H15"/></svg>
           Reset Positions
         </button>
      </div>

      {/* Floating Toolbar Sidebar */}
      <div className="absolute right-[430px] top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-xl pointer-events-auto">
         <button onClick={handleCenterView} className="p-4 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg></button>
         <button onClick={handleZoomIn} className="p-4 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg></button>
         <button onClick={handleZoomOut} className="p-4 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg></button>
         <div className="h-[1px] bg-slate-100 mx-3 my-1"></div>
         <button className="p-4 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button>
      </div>

      {/* Workspace Legend Overlay */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-12 bg-white border border-slate-200 px-12 py-5 rounded-full shadow-2xl pointer-events-none">
          <div className="flex items-center gap-3">
             <span className="text-slate-300 font-bold text-lg">→</span>
             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">References</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Results</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Moved Node</span>
          </div>
      </div>
    </div>
  );
};

export default GraphView;
