
import { Project, ArchitecturePlan } from './types';

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Transformer Architectures",
    description: "Tracking the evolution of self-attention mechanisms from 2017 to the present.",
    lastModified: "2 hours ago",
    paperCount: 5,
    graphData: {
      nodes: [
        { id: "1", title: "Attention Is All You Need", authors: ["Vaswani et al."], year: 2017, citationCount: 98000, isPrimary: true, abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder..." },
        { id: "2", title: "BERT: Pre-training of Deep Bidirectional Transformers", authors: ["Devlin et al."], year: 2018, citationCount: 65000, abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers." },
        { id: "3", title: "Language Models are Few-Shot Learners", authors: ["Brown et al."], year: 2020, citationCount: 22000, abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task." },
        { id: "4", title: "Generative Pre-trained Transformer 2", authors: ["Radford et al."], year: 2019, citationCount: 15000, abstract: "Natural language processing tasks, such as question answering, machine translation, reading comprehension, and summarization, are typically approached with reinforcement learning." },
        { id: "5", title: "RoBERTa: A Robustly Optimized BERT Pretraining Approach", authors: ["Liu et al."], year: 2019, citationCount: 12000, abstract: "Language model pretraining has led to significant performance gains but careful comparison between different approaches is challenging." }
      ],
      links: [
        { source: "2", target: "1", value: 1 },
        { source: "3", target: "1", value: 1 },
        { source: "4", target: "1", value: 1 },
        { source: "5", target: "2", value: 1 },
        { source: "3", target: "4", value: 1 }
      ]
    }
  },
  {
    id: "p2",
    name: "Climate Impact on Alpine Ecosystems",
    description: "An analysis of biodiversity loss in high-altitude environments due to rising temperatures.",
    lastModified: "Yesterday",
    paperCount: 3,
    graphData: {
      nodes: [
        { id: "c1", title: "Global Warming in the Alps", authors: ["Schmidt et al."], year: 2021, citationCount: 450, isPrimary: true, abstract: "High-altitude ecosystems are disproportionately affected by climate change." },
        { id: "c2", title: "Floral Diversity Trends", authors: ["García et al."], year: 2022, citationCount: 120, abstract: "A decade of monitoring Alpine flora reveals significant upward migration." },
        { id: "c3", title: "Glacial Retreat Dynamics", authors: ["Müller et al."], year: 2020, citationCount: 2100, abstract: "Accelerated melting in the Swiss Alps correlates with local species extinction." }
      ],
      links: [
        { source: "c2", target: "c1", value: 1 },
        { source: "c3", target: "c1", value: 1 }
      ]
    }
  },
  {
    id: "p3",
    name: "Quantum Error Correction",
    description: "Exploring surface codes and topological stability in superconducting qubits.",
    lastModified: "3 days ago",
    paperCount: 2,
    graphData: {
      nodes: [
        { id: "q1", title: "Topological Quantum Memory", authors: ["Dennis et al."], year: 2002, citationCount: 3400, isPrimary: true, abstract: "Local interactions can protect quantum information in a topology-dependent manner." },
        { id: "q2", title: "Surface Codes for Qubits", authors: ["Fowler et al."], year: 2012, citationCount: 8900, abstract: "Surface codes provide a high threshold for quantum computation." }
      ],
      links: [
        { source: "q2", target: "q1", value: 1 }
      ]
    }
  }
];

export const ARCHITECTURE_PLAN: ArchitecturePlan[] = [
  {
    step: "1",
    title: "PDF Ingestion & Extraction",
    description: "Upload PDFs to Go backend. Use libraries to extract DOI, Title, and Reference list from the PDF binary.",
    golangTools: ["Fiber/Echo (API)", "pdfcpu (Parsing)", "Grobid (External OCR/Parser)"]
  },
  {
    step: "2",
    title: "Metadata Enrichment",
    description: "Use extracted DOI to fetch full metadata (Abstract, Year, Authors) and Citation Graphs from open APIs.",
    golangTools: ["OpenAlex API", "Semantic Scholar API", "Standard HTTP Client"]
  },
  {
    step: "3",
    title: "Graph Database Storage",
    description: "Store papers as nodes and citations as edges. This allows for fast traversal to find 'papers cited by' and 'papers that cite'.",
    golangTools: ["Neo4j (Bolt driver)", "PostgreSQL (Recursive CTEs)", "Ent/GORM (ORM)"]
  },
  {
    step: "4",
    title: "Real-time Visualization API",
    description: "Stream graph updates to the React frontend using WebSockets or high-performance REST endpoints.",
    golangTools: ["Go Channels", "Goroutines", "JSON Encoding"]
  }
];
