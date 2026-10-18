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
import { Settings2, ScanLine, Package, CreditCard, LayoutGrid, LogIn, LogOut, Bell, Clock, ClipboardList } from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; color: string; darkColor: string; icon: any }> = {
  CHECK_IN:    { label: 'Check-In',     color: '#4f46e5', darkColor: '#818cf8', icon: LogIn },
  CHECK_OUT:   { label: 'Check-Out',    color: '#059669', darkColor: '#34d399', icon: LogOut },
  CHECKPOINT:  { label: 'Checkpoint',   color: '#6366f1', darkColor: '#818cf8', icon: ScanLine },
  SERVICE:     { label: 'Service Area', color: '#7c3aed', darkColor: '#a78bfa', icon: LayoutGrid },
  COLLECTION:  { label: 'Collection',   color: '#0891b2', darkColor: '#22d3ee', icon: Package },
  PAYMENT:     { label: 'Payment',      color: '#d97706', darkColor: '#fbbf24', icon: CreditCard },
  NOTIFICATION:{ label: 'Notify',       color: '#db2777', darkColor: '#f472b6', icon: Bell },
  WAITING_PERIOD:{ label: 'Waiting',    color: '#64748b', darkColor: '#94a3b8', icon: Clock },
  FORM:        { label: 'Form',         color: '#0284c7', darkColor: '#38bdf8', icon: ClipboardList },
};

// ── Custom node for editable (middle) stages ──────────────────────────────────
const CustomNode = ({ data, selected }: any) => {
  const cfg = TYPE_CONFIG[data.type] || TYPE_CONFIG.SERVICE;
  const Icon = cfg.icon;
  const isSelected = data.isSelected || selected;

  return (
    <div
      onClick={() => data.onEdit && data.onEdit(data.step)}
      style={{
        borderColor: cfg.color,
        boxShadow: isSelected
          ? `0 0 0 3.5px ${cfg.color}60, 0 16px 36px -6px ${cfg.color}35`
          : undefined,
        transition: 'all 450ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`relative w-[230px] bg-white dark:bg-zinc-900 rounded-2xl border-2 cursor-pointer group ${
        isSelected
          ? 'shadow-2xl scale-[1.03] ring-2 ring-primary/40 dark:ring-primary/50 -translate-y-0.5 z-20'
          : 'shadow-md hover:shadow-xl hover:scale-[1.015] hover:-translate-y-0.5'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-zinc-900 !rounded-full shadow-sm z-10"
        style={{ background: cfg.color, top: -7 }}
      />

      {/* Clean top boundary stripe flush with card rounded border */}
      <div className="rounded-t-[14px] overflow-hidden">
        <div style={{ backgroundColor: cfg.color }} className="h-2 w-full" />
      </div>

      <div className="p-3.5">
        {/* Type badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
            style={{ color: cfg.color, background: `${cfg.color}18` }}
          >
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
          {data.isOptional && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">
              Optional
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug mb-1">
          {data.name}
        </h3>

        {/* Description */}
        {data.description && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-2.5">
            {data.description}
          </p>
        )}

        {/* Edit button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onEdit(data.step);
          }}
          className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border ${
            isSelected
              ? 'opacity-100 font-bold'
              : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{ color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}30` }}
        >
          <Settings2 className="w-3 h-3" /> {isSelected ? 'Configuring Stage' : 'Configure Stage'}
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-zinc-900 !rounded-full shadow-sm z-10"
        style={{ background: cfg.color, bottom: -7 }}
      />
    </div>
  );
};

// ── System node (locked Check-In / Check-Out) ─────────────────────────────────
const SystemNode = ({ data, selected }: any) => {
  const isCheckIn = data.type === 'CHECK_IN';
  const cfg = TYPE_CONFIG[data.type] || TYPE_CONFIG.CHECK_IN;
  const Icon = cfg.icon;
  const isSelected = data.isSelected || selected;

  return (
    <div
      onClick={() => data.onEdit && data.onEdit(data.step)}
      className={`relative w-[230px] rounded-2xl border-2 border-dashed bg-white dark:bg-zinc-900 cursor-pointer ${
        isSelected
          ? 'shadow-2xl scale-[1.03] ring-2 ring-primary/40 dark:ring-primary/50 -translate-y-0.5 z-20'
          : 'shadow-md hover:shadow-xl hover:scale-[1.015] hover:-translate-y-0.5'
      }`}
      style={{
        borderColor: cfg.color,
        boxShadow: isSelected
          ? `0 0 0 3.5px ${cfg.color}60, 0 16px 36px -6px ${cfg.color}35`
          : undefined,
        transition: 'all 450ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Only Check-Out gets a target handle (incoming arrows) */}
      {!isCheckIn && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-zinc-900 !rounded-full shadow-sm z-10"
          style={{ background: cfg.color, top: -7 }}
        />
      )}

      <div
        className="px-4 py-3 flex items-center gap-3 rounded-[14px]"
        style={{ background: `${cfg.color}12` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${cfg.color}25` }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
              {isCheckIn ? '🔒 Journey Start' : '🔒 Journey End'}
            </span>
          </div>
          <span className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">{data.name}</span>
          {data.description && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">{data.description}</p>
          )}
        </div>
      </div>

      {/* Only Check-In gets a source handle (outgoing arrows) */}
      {isCheckIn && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-zinc-900 !rounded-full shadow-sm z-10"
          style={{ background: cfg.color, bottom: -7 }}
        />
      )}
      {!isCheckIn && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3.5 !h-3.5 !border-2 !border-white dark:!border-zinc-900 !rounded-full shadow-sm z-10 opacity-30"
          style={{ background: cfg.color, bottom: -7 }}
        />
      )}
    </div>
  );
};

// ── Empty state when no middle stages ─────────────────────────────────────────
const EmptyStagePrompt = ({ data }: any) => (
  <div
    className="w-[230px] rounded-2xl border-2 border-dashed border-border dark:border-dark-border bg-card dark:bg-dark-card flex flex-col items-center justify-center py-6 px-4 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
    onClick={data.onAddStage}
  >
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-2">
      <Settings2 className="w-5 h-5 text-primary" />
    </div>
    <p className="text-sm font-semibold text-on-surface dark:text-white">Add Custom Stages</p>
    <p className="text-[10px] text-on-surface-variant mt-1">Click "+ Add Stage" to build your journey</p>
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
  </div>
);

const nodeTypes = { custom: CustomNode, system: SystemNode, emptyPrompt: EmptyStagePrompt };

interface FlowBuilderProps {
  flow: any; // includes ALL steps (system + custom)
  selectedStepId?: string | null;
  onEditStep: (step: any) => void;
  onSaveTransitions: (fromStepId: string, transitions: any[]) => void;
  onEditEdge?: (edge: any) => void;
  onAddStage?: () => void;
  fitViewTrigger?: number;
}

export function FlowBuilder(props: FlowBuilderProps) {
  const { flow, selectedStepId, onEditStep, onSaveTransitions, onAddStage, fitViewTrigger } = props;
  const [rfInstance, setRfInstance] = React.useState<any>(null);

  const handleFitView = useCallback(() => {
    if (!rfInstance) return;
    rfInstance.fitView({ padding: 0.28, maxZoom: 0.9, duration: 800 });
  }, [rfInstance]);

  // Listen for header fit view trigger
  useEffect(() => {
    if (fitViewTrigger && fitViewTrigger > 0) {
      handleFitView();
    }
  }, [fitViewTrigger, handleFitView]);

  const initialNodes = useMemo(() => {
    if (!flow?.steps) return [];
    const sorted = [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);

    const checkIn = sorted.find((s: any) => s.type === 'CHECK_IN');
    const checkOut = sorted.find((s: any) => s.type === 'CHECK_OUT');
    const middleSteps = sorted.filter((s: any) => s.type !== 'CHECK_IN' && s.type !== 'CHECK_OUT');

    const CENTER_X = 100;
    let y = 0;
    const nodes: any[] = [];

    // Check-In (always first)
    if (checkIn) {
      const isSelected = selectedStepId === checkIn.id;
      nodes.push({
        id: checkIn.id,
        type: 'system',
        position: { x: CENTER_X, y },
        data: { name: checkIn.name, description: checkIn.description, type: 'CHECK_IN', step: checkIn, onEdit: onEditStep, isSelected },
        selected: isSelected,
        draggable: false,
      });
      // Check-in is ~80px height, advance by 180px for a clean 100px space to the next card
      y += 180;
    }

    // Middle stages OR empty prompt
    if (middleSteps.length === 0) {
      const placeholderId = '__empty_prompt__';
      nodes.push({
        id: placeholderId,
        type: 'emptyPrompt',
        position: { x: CENTER_X, y },
        data: { onAddStage },
        draggable: false,
        selectable: false,
      });
      y += 220;
    } else {
      for (const step of middleSteps) {
        const isSelected = selectedStepId === step.id;
        nodes.push({
          id: step.id,
          type: 'custom',
          position: { x: CENTER_X, y },
          data: { name: step.name, description: step.description, type: step.type, isOptional: step.isOptional, step, onEdit: onEditStep, isSelected },
          selected: isSelected,
        });
        // Middle cards are ~165px height; advancing by 235px provides ~70px space between cards so boundaries never overlap
        y += 235;
      }
    }

    // Check-Out (always last)
    if (checkOut) {
      const isSelected = selectedStepId === checkOut.id;
      nodes.push({
        id: checkOut.id,
        type: 'system',
        position: { x: CENTER_X, y },
        data: { name: checkOut.name, description: checkOut.description, type: 'CHECK_OUT', step: checkOut, onEdit: onEditStep, isSelected },
        selected: isSelected,
        draggable: false,
      });
    }

    return nodes;
  }, [flow, onEditStep, onAddStage, selectedStepId]);

  const initialEdges = useMemo(() => {
    if (!flow?.steps) return [];
    const sorted = [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder);
    const edges: any[] = [];

    // For nodes without explicit transitions, auto-connect sequentially
    const hasPlaceholder = sorted.filter((s: any) => s.type !== 'CHECK_IN' && s.type !== 'CHECK_OUT').length === 0;

    if (hasPlaceholder) {
      const checkIn = sorted.find((s: any) => s.type === 'CHECK_IN');
      const checkOut = sorted.find((s: any) => s.type === 'CHECK_OUT');
      if (checkIn && checkOut) {
        edges.push({
          id: `e-${checkIn.id}-empty`,
          source: checkIn.id,
          target: '__empty_prompt__',
          animated: true,
          style: { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '6,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' },
        });
        edges.push({
          id: `e-empty-${checkOut.id}`,
          source: '__empty_prompt__',
          target: checkOut.id,
          animated: true,
          style: { stroke: '#34d399', strokeWidth: 2, strokeDasharray: '6,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#34d399' },
        });
      }
      return edges;
    }

    sorted.forEach((step: any) => {
      if (step.transitions && step.transitions.length > 0) {
        step.transitions.forEach((t: any) => {
          if (t.toStepId) {
            const targetStep = sorted.find((s: any) => s.id === t.toStepId);
            const color = t.isDefault
              ? (TYPE_CONFIG[step.type]?.color || '#6366f1')
              : '#a78bfa';
            edges.push({
              id: `e-${step.id}-${t.toStepId}`,
              source: step.id,
              target: t.toStepId,
              label: t.label || (t.isDefault ? '' : ''),
              animated: t.isDefault,
              style: { stroke: color, strokeWidth: 2.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color },
              labelStyle: { fontSize: 10, fontWeight: 700, fill: color },
              labelBgStyle: { fill: '#eef2ff', borderRadius: 6 },
            });
          }
        });
      } else {
        // Auto-connect sequential
        const ci = sorted.findIndex((s: any) => s.id === step.id);
        if (ci < sorted.length - 1) {
          const next = sorted[ci + 1];
          const srcColor = TYPE_CONFIG[step.type]?.color || '#818cf8';
          edges.push({
            id: `e-auto-${step.id}-${next.id}`,
            source: step.id,
            target: next.id,
            animated: true,
            style: { stroke: srcColor, strokeWidth: 2, strokeDasharray: '5,4', opacity: 0.7 },
            markerEnd: { type: MarkerType.ArrowClosed, color: srcColor },
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

  // Smoothly center the canvas onto selected step card with matching camera glide
  useEffect(() => {
    if (!selectedStepId || !rfInstance) return;
    const targetNode = nodes.find((n: any) => n.id === selectedStepId);
    if (targetNode) {
      const x = targetNode.position.x + 115;
      const y = targetNode.position.y + 80;
      rfInstance.setCenter(x, y, { duration: 750, zoom: Math.min(1.05, Math.max(0.88, rfInstance.getZoom())) });
    }
  }, [selectedStepId, rfInstance]);

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
    <div className="w-full h-full flow-builder-canvas">
      <style>{`
        .flow-builder-canvas .react-flow__controls {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .dark .flow-builder-canvas .react-flow__controls {
          background: rgba(24, 24, 27, 0.9);
          border: 1px solid #3f3f46;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
        }
        .flow-builder-canvas .react-flow__controls:hover {
          box-shadow: 0 14px 30px -5px rgba(0,0,0,0.12);
        }
        .flow-builder-canvas .react-flow__controls-button {
          background: transparent;
          border: none;
          border-bottom: 1px solid #e4e4e7;
          color: #52525b;
          width: 34px;
          height: 34px;
          padding: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.18s ease, color 0.18s ease, transform 0.15s ease;
        }
        .flow-builder-canvas .react-flow__controls-button:last-child {
          border-bottom: none;
        }
        .dark .flow-builder-canvas .react-flow__controls-button {
          border-bottom: 1px solid #3f3f46;
          color: #a1a1aa;
          fill: #a1a1aa;
        }
        .dark .flow-builder-canvas .react-flow__controls-button:last-child {
          border-bottom: none;
        }
        .flow-builder-canvas .react-flow__controls-button:hover {
          background: #f4f4f5;
          color: #4f46e5;
          transform: scale(1.06);
        }
        .flow-builder-canvas .react-flow__controls-button:active {
          transform: scale(0.92);
        }
        .dark .flow-builder-canvas .react-flow__controls-button:hover {
          background: #27272a;
          color: #818cf8;
          fill: #818cf8;
        }
        .flow-builder-canvas .react-flow__controls-button svg {
          fill: currentColor;
          width: 14px;
          height: 14px;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .flow-builder-canvas .react-flow__controls-button:hover svg {
          transform: scale(1.1);
        }
        .flow-builder-canvas .react-flow__node {
          transition: transform 450ms cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 450ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, box-shadow;
        }
        .flow-builder-canvas .react-flow__minimap {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid #e4e4e7;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 8px 20px -4px rgba(0,0,0,0.08);
        }
        .dark .flow-builder-canvas .react-flow__minimap {
          background: rgba(24, 24, 27, 0.9);
          border: 1px solid #3f3f46;
          box-shadow: 0 8px 20px -4px rgba(0,0,0,0.4);
        }
        .flow-builder-canvas .react-flow__minimap-svg {
          background: transparent !important;
        }
        .dark .flow-builder-canvas .react-flow__edge-path {
          stroke-opacity: 0.85;
        }
        .dark .flow-builder-canvas .react-flow__background {
          color: #3f3f46;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onNodeClick={(_, node) => {
          if (node.data?.step && onEditStep) {
            onEditStep(node.data.step);
          }
        }}
        onEdgeClick={(_, edge) => { if (props.onEditEdge) props.onEditEdge(edge); }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28, maxZoom: 0.9, duration: 800 }}
        attributionPosition="bottom-right"
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        selectionOnDrag={false}
      >
        <Background color="#4f4f5a18" gap={20} variant={BackgroundVariant.Dots} />
        <Controls
          showInteractive={false}
          fitViewOptions={{ padding: 0.28, maxZoom: 0.9, duration: 800 }}
          onFitView={handleFitView}
        />
        <MiniMap
          nodeColor={(n: any) => TYPE_CONFIG[n.data?.type]?.color || '#6366f1'}
          maskColor="rgba(0,0,0,0.06)"
          style={{ borderRadius: 12 }}
        />
      </ReactFlow>
    </div>
  );
}
