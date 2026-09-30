import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Settings2, ScanLine, Package, CreditCard, LayoutGrid } from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  CHECKPOINT: { label: 'Checkpoint',   color: '#6366f1', icon: ScanLine },
  SERVICE:    { label: 'Service Area', color: '#8b5cf6', icon: LayoutGrid },
  COLLECTION: { label: 'Collection',   color: '#059669', icon: Package },
  PAYMENT:    { label: 'Payment',      color: '#f59e0b', icon: CreditCard },
};

const CustomNode = ({ data }: any) => {
  const cfg = TYPE_CONFIG[data.type] || TYPE_CONFIG.SERVICE;
  const Icon = cfg.icon;
  return (
    <div
      style={{ borderColor: cfg.color }}
      className="relative w-[240px] bg-white dark:bg-zinc-900 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: cfg.color, width: 12, height: 12, border: '2px solid white' }}
      />

      {/* Header stripe */}
      <div style={{ background: cfg.color }} className="h-1.5 rounded-t-xl" />

      <div className="p-4">
        {/* Type badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg"
            style={{ color: cfg.color, background: `${cfg.color}18` }}
          >
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          {data.isOptional && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
              Optional
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight mb-1">
          {data.name}
        </h3>

        {/* Description */}
        {data.description && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {data.description}
          </p>
        )}

        {/* Edit button */}
        <button
          onClick={() => data.onEdit(data.step)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{ color: cfg.color, background: `${cfg.color}15` }}
        >
          <Settings2 className="w-3.5 h-3.5" /> Edit Properties
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: cfg.color, width: 12, height: 12, border: '2px solid white' }}
      />
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

  const initialNodes = useMemo(() => {
    if (!flow?.steps) return [];
    const sorted = [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);
    const colWidth = 280;
    const rowHeight = 210;
    const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));

    return sorted.map((step: any, index: number) => ({
      id: step.id,
      type: 'custom',
      position: {
        x: (index % cols) * colWidth + 60,
        y: Math.floor(index / cols) * rowHeight + 60,
      },
      data: {
        name: step.name,
        description: step.description,
        type: step.type,
        isOptional: step.isOptional,
        step,
        onEdit: onEditStep,
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
              label: t.label || (t.isDefault ? 'Default' : ''),
              animated: t.isDefault,
              style: { stroke: t.isDefault ? '#6366f1' : '#a78bfa', strokeWidth: 2.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: t.isDefault ? '#6366f1' : '#a78bfa' },
              labelStyle: { fontSize: 10, fontWeight: 700, fill: '#6366f1' },
              labelBgStyle: { fill: '#eef2ff', borderRadius: 6 },
            });
          }
        });
      } else {
        const sorted = [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);
        const ci = sorted.findIndex((s: any) => s.id === step.id);
        if (ci < sorted.length - 1) {
          const next = sorted[ci + 1];
          edges.push({
            id: `e-auto-${step.id}-${next.id}`,
            source: step.id,
            target: next.id,
            animated: true,
            style: { stroke: '#c4b5fd', strokeWidth: 2, strokeDasharray: '6,4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#c4b5fd' },
          });
        }
      }
    });
    return edges;
  }, [flow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes as any);
    setEdges(initialEdges as any);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => {
    setEdges((eds) => {
      const newEdges = addEdge({
        ...params,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      }, eds);
      const outgoing = newEdges.filter(e => e.source === params.source);
      const transitions = outgoing.map((e, i) => ({
        toStepId: e.target,
        isDefault: i === 0,
        label: (e.label as string) || '',
      }));
      onSaveTransitions(params.source, transitions);
      return newEdges;
    });
  }, [setEdges, onSaveTransitions]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={(_, edge) => { if (props.onEditEdge) props.onEditEdge(edge); }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        attributionPosition="bottom-right"
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#4f4f5a22" gap={20} variant={BackgroundVariant.Dots} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n: any) => TYPE_CONFIG[n.data?.type]?.color || '#6366f1'}
          maskColor="rgba(0,0,0,0.06)"
        />
      </ReactFlow>
    </div>
  );
}

