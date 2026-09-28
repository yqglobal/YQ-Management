import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Settings2, GripVertical, CheckCircle2 } from 'lucide-react';

const CustomNode = ({ data }: any) => {
  return (
    <div className="px-4 py-3 shadow-lg rounded-xl bg-white dark:bg-zinc-900 border-2 border-indigo-500 w-64">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500" />
      
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{data.name}</h3>
        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
          {data.type}
        </span>
      </div>
      {data.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{data.description}</p>}
      
      <div className="mt-3 flex gap-2">
        <button 
          onClick={() => data.onEdit(data.step)}
          className="text-xs flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <Settings2 className="w-3 h-3" /> Edit Properties
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

interface FlowBuilderProps {
  flow: any;
  onEditStep: (step: any) => void;
  onSaveTransitions: (fromStepId: string, transitions: any[]) => void;
  onEditEdge?: (edge: any) => void;
}

export function FlowBuilder(props: FlowBuilderProps) {
  const { flow, onEditStep, onSaveTransitions } = props;
  // Convert flow steps and transitions into React Flow Nodes & Edges
  const initialNodes = useMemo(() => {
    if (!flow?.steps) return [];
    
    // Sort by order to roughly position them vertically
    const sorted = [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);
    
    return sorted.map((step: any, index: number) => ({
      id: step.id,
      type: 'custom',
      position: { x: 250, y: index * 180 + 50 },
      data: { 
        name: step.name, 
        description: step.description, 
        type: step.type,
        step: step,
        onEdit: onEditStep 
      },
    }));
  }, [flow, onEditStep]);

  const initialEdges = useMemo(() => {
    if (!flow?.steps) return [];
    
    const edges: any[] = [];
    flow.steps.forEach((step: any) => {
      if (step.transitions && step.transitions.length > 0) {
        step.transitions.forEach((t: any) => {
          if (t.toStepId) {
            edges.push({
              id: `e-${step.id}-${t.toStepId}`,
              source: step.id,
              target: t.toStepId,
              label: t.label || '',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            });
          }
        });
      } else {
        // Fallback: If no explicit transitions, draw a line to the next step based on stepOrder
        const sorted = [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);
        const currentIndex = sorted.findIndex((s: any) => s.id === step.id);
        if (currentIndex < sorted.length - 1) {
          const nextStep = sorted[currentIndex + 1];
          edges.push({
            id: `e-auto-${step.id}-${nextStep.id}`,
            source: step.id,
            target: nextStep.id,
            animated: true,
            style: { stroke: '#a1a1aa', strokeWidth: 2, strokeDasharray: '5,5' }, // dashed for implicit
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a1a1aa' },
          });
        }
      }
    });
    return edges;
  }, [flow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when flow changes
  useEffect(() => {
    setNodes(initialNodes as any);
    setEdges(initialEdges as any);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => {
      const newEdges = addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' } }, eds);
      
      // Calculate all outgoing transitions for the source node
      const outgoingEdges = newEdges.filter(e => e.source === params.source);
      const transitions = outgoingEdges.map((e, index) => ({
        toStepId: e.target,
        isDefault: index === 0,
        label: e.label || ''
      }));
      
      // Save all transitions to backend
      onSaveTransitions(params.source, transitions);
      
      return newEdges;
    });
  }, [setEdges, onSaveTransitions]);

  return (
    <div className="w-full h-[600px] border border-border dark:border-dark-border rounded-2xl overflow-hidden bg-zinc-50 dark:bg-black/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={(_, edge) => {
          if (props.onEditEdge) props.onEditEdge(edge);
        }}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#ccc" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
