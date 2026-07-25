import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, Paper } from '../types';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

interface EditableGraphViewProps {
  data: GraphData;
  mode: 'select' | 'connect';
  onSelectNode: (paper: Paper | null) => void;
  onAddEdge: (source: string, target: string) => void;
  onRemoveEdge: (source: string, target: string) => void;
  onRemoveNode: (nodeId: string) => void;
}

const EditableGraphView: React.FC<EditableGraphViewProps> = ({
  data,
  mode,
  onSelectNode,
  onAddEdge,
  onRemoveEdge,
  onRemoveNode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectSource, setConnectSource] = useState<string | null>(null);

  // Keep refs in sync for use inside D3 event closures
  const modeRef = useRef(mode);
  const connectSourceRef = useRef<string | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { connectSourceRef.current = connectSource; }, [connectSource]);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);

  // Cancel connect mode on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectSource(null);
        setSelectedNodeId(null);
        onSelectNode(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSelectNode]);

  // Dashed "pending edge" line that follows cursor in connect mode
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const pendingLine = svg.select<SVGLineElement>('#pending-edge');

    if (!connectSource) {
      pendingLine.attr('opacity', 0);
      return;
    }

    // Find source node position from simulation
    const sourceNode = simulationRef.current?.nodes().find((n: any) => n.id === connectSource);
    if (!sourceNode) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!svgRef.current) return;
      const transform = d3.zoomTransform(svgRef.current);
      const [mx, my] = transform.invert(d3.pointer(event, svgRef.current));
      const currentSourceNode = simulationRef.current?.nodes().find((n: any) => n.id === connectSourceRef.current);
      if (!currentSourceNode) return;
      pendingLine
        .attr('x1', currentSourceNode.x)
        .attr('y1', currentSourceNode.y)
        .attr('x2', mx)
        .attr('y2', my)
        .attr('opacity', 1);
    };

    svgRef.current.addEventListener('mousemove', handleMouseMove);
    return () => svgRef.current?.removeEventListener('mousemove', handleMouseMove);
  }, [connectSource]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  };

  const handleCenter = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  const handleResetPositions = () => {
    if (!simulationRef.current) return;
    simulationRef.current.nodes().forEach((d: any) => { d.fx = null; d.fy = null; });
    simulationRef.current.alpha(0.3).restart();
  };

  // Main D3 render — re-runs when data changes
  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || window.innerWidth;
    const height = svgRef.current.clientHeight || window.innerHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Arrowhead
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'editable-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Pending edge line (dashed, hidden by default)
    svg.append('line')
      .attr('id', 'pending-edge')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6 4')
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    const g = svg.append('g');
    gRef.current = g;

    // Simulation — pure force layout, no axis positioning
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(70))
      .force('link', d3.forceLink(data.links as any).id((d: any) => d.id).strength(0.3).distance(150));

    simulationRef.current = simulation;

    // Links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 2.5)
      .attr('marker-end', 'url(#editable-arrow)')
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        event.stopPropagation();
        const src = typeof d.source === 'object' ? d.source.id : d.source;
        const tgt = typeof d.target === 'object' ? d.target.id : d.target;
        onRemoveEdge(src, tgt);
      })
      .on('mouseover', function() {
        d3.select(this).attr('stroke', '#ef4444').attr('stroke-opacity', 0.9);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', '#94a3b8').attr('stroke-opacity', 0.5);
      });

    // Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(makeDrag(simulation) as any)
      .on('contextmenu', (event, d: any) => {
        event.preventDefault();
        event.stopPropagation();
        const nodeId = d.id as string;

        if (connectSourceRef.current === nodeId) {
          setConnectSource(null);
        }
        if (selectedNodeIdRef.current === nodeId) {
          setSelectedNodeId(null);
          onSelectNode(null);
        }

        onRemoveNode(nodeId);
      })
      .on('click', (event, d: any) => {
        if (event.defaultPrevented) return;
        event.stopPropagation();

        const currentMode = modeRef.current;
        const currentSource = connectSourceRef.current;

        if (currentMode === 'connect') {
          if (!currentSource) {
            // First click — set source
            setConnectSource(d.id);
            // Highlight source node
            d3.select(event.currentTarget).select('circle')
              .attr('stroke', '#3b82f6')
              .attr('stroke-width', 4)
              .attr('fill', '#eff6ff');
          } else if (currentSource === d.id) {
            // Clicked same node — cancel
            setConnectSource(null);
            resetAllNodes();
          } else {
            // Second click — create edge
            onAddEdge(currentSource, d.id);
            setConnectSource(null);
            resetAllNodes();
          }
        } else {
          // Select mode
          const currentSelected = selectedNodeIdRef.current;
          resetAllNodes();
          if (currentSelected === d.id) {
            setSelectedNodeId(null);
            onSelectNode(null);
          } else {
            setSelectedNodeId(d.id);
            onSelectNode(d);
            d3.select(event.currentTarget).select('circle')
              .attr('stroke', '#3b82f6')
              .attr('stroke-width', 5)
              .attr('fill', '#eff6ff');
          }
        }
      })
      .on('mouseover', (event, d: any) => {
        d3.select(event.currentTarget).select('.main-circle')
          .transition().duration(150)
          .attr('r', d.isPrimary ? 25 : 22);
        if (tooltipRef.current) {
          d3.select(tooltipRef.current)
            .style('opacity', '1')
            .html(`
              <div class="font-bold text-slate-900 text-xs mb-1">${escapeHtml(d.title)}</div>
              <div class="text-[10px] text-slate-500">${d.year} · ${d.citationCount} citations</div>
            `);
        }
      })
      .on('mousemove', (event) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.left = (event.pageX + 15) + 'px';
          tooltipRef.current.style.top = (event.pageY - 10) + 'px';
        }
      })
      .on('mouseout', (event, d: any) => {
        d3.select(event.currentTarget).select('.main-circle')
          .transition().duration(150)
          .attr('r', d.isPrimary ? 20 : 18);
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', '0');
        }
      });

    node.append('circle')
      .attr('class', 'main-circle')
      .attr('r', (d: any) => d.isPrimary ? 20 : 18)
      .attr('fill', '#ffffff')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 3);

    // Author + year label
    const label = node.append('text')
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('user-select', 'none');

    label.append('tspan')
      .attr('x', 0)
      .attr('dy', '0em')
      .text((d: any) => (d.authors?.[0] || '').split(' ')[0].replace(/,/g, ''))
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1e293b');

    label.append('tspan')
      .attr('x', 0)
      .attr('dy', '1.25em')
      .text((d: any) => d.year || '')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .attr('font-weight', 'bold');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function makeDrag(sim: any) {
      return d3.drag()
        .on('start', (event: any) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', (event: any) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', (event: any) => {
          if (!event.active) sim.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        });
    }

    function resetAllNodes() {
      nodeGroup.selectAll('g').each(function() {
        d3.select(this).select('circle')
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 3)
          .attr('fill', '#ffffff');
      });
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform));

    zoomRef.current = zoom;
    svg.call(zoom);

    return () => simulation.stop();
  }, [data, onAddEdge, onRemoveEdge, onSelectNode]);

  // Update cursor based on mode
  const cursorStyle = mode === 'connect'
    ? (connectSource ? 'crosshair' : 'cell')
    : 'default';

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#fcfaf8]" style={{ cursor: cursorStyle }}>
      <svg ref={svgRef} className="w-full h-full block" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 bg-white/95 backdrop-blur shadow-xl border border-slate-100 px-4 py-3 rounded-lg z-50 max-w-[220px] transition-opacity duration-200 text-sm"
        style={{ transition: 'opacity 0.2s' }}
      />

      {/* Connect mode banner */}
      {mode === 'connect' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full shadow-lg pointer-events-none">
          {connectSource ? 'Click second paper to connect · Esc to cancel · C to toggle mode' : 'Click a paper to start connecting · C to toggle mode'}
        </div>
      )}

      {/* Edge hint */}
      {mode === 'select' && data.links.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur border border-slate-200 text-slate-400 text-[11px] font-medium px-4 py-2 rounded-full pointer-events-none">
          Click an arrow to remove it
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-xl pointer-events-auto">
        <button onClick={handleCenter} className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900" title="Center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>
        </button>
        <button onClick={handleZoomIn} className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900" title="Zoom in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        </button>
        <button onClick={handleZoomOut} className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900" title="Zoom out">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
        </button>
        <div className="h-[1px] bg-slate-100 mx-2 my-0.5" />
        <button onClick={handleResetPositions} className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900" title="Reset positions">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m0 0H15"/></svg>
        </button>
      </div>

      {/* Empty state */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <p className="text-slate-400 text-sm font-medium">Search and add papers to start building</p>
        </div>
      )}
    </div>
  );
};

export default EditableGraphView;
