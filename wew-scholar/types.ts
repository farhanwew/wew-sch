
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  citationCount: number;
  abstract?: string;
  isPrimary?: boolean;
}

export interface Link {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: Paper[];
  links: Link[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  paperCount: number;
  graphData: GraphData;
}

export interface ArchitecturePlan {
  step: string;
  title: string;
  description: string;
  golangTools: string[];
}

export interface SearchResult {
  query: string;
  papers: Paper[];
}
