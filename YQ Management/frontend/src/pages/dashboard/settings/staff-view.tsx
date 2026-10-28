import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../components/AuthContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { WIDGET_MAP } from '../../../components/my-desk/WidgetRegistry';
import SettingsLayout from '../../../components/SettingsLayout';
import {
  ChevronUp, ChevronDown, Trash2, Plus, Pencil, Check,
  Layout, Users, Grip, LayoutDashboard,
  ArrowLeft, Save, Copy, Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────
interface WidgetConfig {
  id: string;
  type: string;
  position: { colSpan: number; rowSpan: number };
}

interface DeskTemplate {
  id: string;
  name: string;
  color: string;
  description?: string;
  layout: WidgetConfig[];
}

interface StaffViewData {
  version: 2;
  templates: DeskTemplate[];
  assignments: Record<string, string>; // userId → templateId
}

type SettingsUser = { id: string; email: string; name?: string; role: string };

// ─── Constants ───────────────────────────────────────────────────────────────
const WIDGET_DESCRIPTIONS: Record<string, string> = {
  CurrentTicketWidget: 'Shows the active visit/ticket being served.',
  CustomerHistoryWidget: 'Shows past visit history for the current customer.',
  CustomFormWidget: 'Renders a custom data-entry form for staff.',
  QueueGridWidget: 'Displays all live tickets in the queue.',
  ScheduleWidget: "Shows today's appointment schedule.",
  ClinicalNotesWidget: 'Lets staff add and view clinical notes.',
  PrescriptionWidget: 'Manage prescriptions for the active patient.',
};

const AVAILABLE_WIDGETS = Object.keys(WIDGET_MAP).map(key => ({
  id: key,
  name: key.replace(/([A-Z])/g, ' $1').trim(),
  description: WIDGET_DESCRIPTIONS[key] ?? 'A useful desk widget.',
}));

const TEMPLATE_COLORS = [
  '#0284C7', '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#DB2777', '#0891B2', '#4F46E5', '#65A30D', '#9333EA',
];

const PRESET_TEMPLATES: DeskTemplate[] = [
  {
    id: 'preset-reception',
    name: 'Reception Desk',
    color: '#0284C7',
    description: 'Ideal for front-desk staff managing walk-ins',
    layout: [
      { id: 'ct-1', type: 'CurrentTicketWidget', position: { colSpan: 1, rowSpan: 2 } },
      { id: 'qg-1', type: 'QueueGridWidget', position: { colSpan: 2, rowSpan: 1 } },
      { id: 'ch-1', type: 'CustomerHistoryWidget', position: { colSpan: 2, rowSpan: 1 } },
    ],
  },
  {
    id: 'preset-clinical',
    name: 'Clinical Station',
    color: '#059669',
    description: 'For doctors and clinical staff with notes + prescriptions',
    layout: [
      { id: 'ct-1', type: 'CurrentTicketWidget', position: { colSpan: 1, rowSpan: 2 } },
      { id: 'cn-1', type: 'ClinicalNotesWidget', position: { colSpan: 1, rowSpan: 1 } },
      { id: 'px-1', type: 'PrescriptionWidget', position: { colSpan: 1, rowSpan: 1 } },
      { id: 'ch-1', type: 'CustomerHistoryWidget', position: { colSpan: 1, rowSpan: 1 } },
    ],
  },
  {
    id: 'preset-simple',
    name: 'Simple Queue View',
    color: '#7C3AED',
    description: 'Minimal layout — just the queue grid and current ticket',
    layout: [
      { id: 'ct-1', type: 'CurrentTicketWidget', position: { colSpan: 1, rowSpan: 1 } },
      { id: 'qg-1', type: 'QueueGridWidget', position: { colSpan: 2, rowSpan: 1 } },
    ],
  },
];



// ─── Sub-components ───────────────────────────────────────────────────────────
function TemplateColorDot({ color }: { color: string }) {
  return <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

function WidgetChip({ widget, index, total, onMove, onRemove, onUpdateSpan }: {
  widget: WidgetConfig;
  index: number;
  total: number;
  onMove: (dir: 'up' | 'down') => void;
  onRemove: () => void;
  onUpdateSpan: (field: 'colSpan' | 'rowSpan', val: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-border dark:border-dark-border p-3.5 group">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={() => onMove('up')} disabled={index === 0}
          className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 disabled:opacity-25">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={() => onMove('down')} disabled={index === total - 1}
          className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-400 disabled:opacity-25">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          {widget.type.replace(/([A-Z])/g, ' $1').trim()}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{WIDGET_DESCRIPTIONS[widget.type] ?? ''}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Cols</span>
          <select value={widget.position.colSpan} onChange={e => onUpdateSpan('colSpan', +e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-700 border-0 rounded-lg px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200">
            <option value={1}>1 — 33%</option>
            <option value={2}>2 — 66%</option>
            <option value={3}>3 — 100%</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Rows</span>
          <select value={widget.position.rowSpan} onChange={e => onUpdateSpan('rowSpan', +e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-700 border-0 rounded-lg px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <button onClick={onRemove}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

let _idCounter = 0;
function makeId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StaffViewSettings() {
  const { refetch: refetchAuth } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [data, setData] = useState<StaffViewData>({ version: 2, templates: [], assignments: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [view, setView] = useState<'templates' | 'editor' | 'assign'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<DeskTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState(TEMPLATE_COLORS[0]);
  const [editLayout, setEditLayout] = useState<WidgetConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Assignment state
  const [assignTemplate, setAssignTemplate] = useState<DeskTemplate | null>(null);

  // ── Load tenant ──
  useEffect(() => {
    const load = async () => {
      try {
        const t = await fetchApi('/tenant/me');
        setTenantId(t.id);
        const raw = t.staffViewLayout;
        if (raw && raw.version === 2) {
          setData(raw as StaffViewData);
        } else if (Array.isArray(raw) && raw.length > 0) {
          // Migrate v1 legacy flat layout → single "Default" template
          setData({
            version: 2,
            templates: [{ id: 'migrated-default', name: 'Default Layout', color: '#0284C7', layout: raw }],
            assignments: {},
          });
        }
      } catch { toast.error('Failed to load settings'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Persist to backend ──
  const save = useCallback(async (payload: StaffViewData, silent = false) => {
    setSaving(true);
    try {
      await fetchApi(`/tenant/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ staffViewLayout: payload }),
      });
      setData(payload);
      if (!silent) toast.success('Saved!');
      await refetchAuth();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }, [tenantId, refetchAuth]);

  // ── Template CRUD ──
  const openNew = () => {
    const id = makeId('template');
    setEditingTemplate({ id, name: 'New Layout', color: TEMPLATE_COLORS[0], layout: [] });
    setEditName('New Layout');
    setEditDesc('');
    setEditColor(TEMPLATE_COLORS[0]);
    setEditLayout([]);
    setIsDirty(false);
    setView('editor');
  };

  const openEdit = (t: DeskTemplate) => {
    setEditingTemplate(t);
    setEditName(t.name);
    setEditDesc(t.description ?? '');
    setEditColor(t.color);
    setEditLayout(JSON.parse(JSON.stringify(t.layout))); // deep copy
    setIsDirty(false);
    setView('editor');
  };

  const openPreset = (preset: DeskTemplate) => {
    const id = makeId('template');
    const newT: DeskTemplate = { ...preset, id, layout: JSON.parse(JSON.stringify(preset.layout)) };
    setEditingTemplate(newT);
    setEditName(newT.name);
    setEditDesc(newT.description ?? '');
    setEditColor(newT.color);
    setEditLayout(newT.layout);
    setIsDirty(true);
    setView('editor');
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    const t: DeskTemplate = { id: editingTemplate.id, name: editName.trim() || 'Untitled', color: editColor, description: editDesc, layout: editLayout };
    const existing = data.templates.find(x => x.id === t.id);
    const templates = existing
      ? data.templates.map(x => x.id === t.id ? t : x)
      : [...data.templates, t];
    await save({ ...data, templates });
    setIsDirty(false);
    setView('templates');
  };

  const deleteTemplate = async (id: string) => {
    const templates = data.templates.filter(t => t.id !== id);
    const assignments = { ...data.assignments };
    Object.keys(assignments).forEach(uid => { if (assignments[uid] === id) delete assignments[uid]; });
    await save({ ...data, templates, assignments });
  };

  const duplicateTemplate = (t: DeskTemplate) => {
    const id = makeId('template');
    const newT: DeskTemplate = { ...t, id, name: `${t.name} (Copy)`, layout: JSON.parse(JSON.stringify(t.layout)) };
    setEditingTemplate(newT);
    setEditName(newT.name);
    setEditDesc(newT.description ?? '');
    setEditColor(newT.color);
    setEditLayout(newT.layout);
    setIsDirty(true);
    setView('editor');
  };

  // ── Widget editor helpers ──
  const addWidget = (type: string) => {
    const w: WidgetConfig = { id: makeId(type), type, position: { colSpan: 1, rowSpan: 1 } };
    setEditLayout(l => [...l, w]);
    setIsDirty(true);
  };

  const removeWidget = (i: number) => {
    setEditLayout(l => l.filter((_, idx) => idx !== i));
    setIsDirty(true);
  };

  const moveWidget = (i: number, dir: 'up' | 'down') => {
    const j = dir === 'up' ? i - 1 : i + 1;
    setEditLayout(l => {
      const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
    setIsDirty(true);
  };

  const updateSpan = (i: number, field: 'colSpan' | 'rowSpan', val: number) => {
    setEditLayout(l => l.map((w, idx) => idx === i ? { ...w, position: { ...w.position, [field]: val } } : w));
    setIsDirty(true);
  };

  // ── Assignment ──
  const { data: users = [] } = useQuery<SettingsUser[]>({
    queryKey: ['users-for-desk'],
    queryFn: () => fetchApi('/users') as Promise<SettingsUser[]>,
    enabled: view === 'assign',
  });

  const openAssign = (t: DeskTemplate) => { setAssignTemplate(t); setView('assign'); };

  const toggleAssignment = async (userId: string) => {
    if (!assignTemplate) return;
    const assignments = { ...data.assignments };
    if (assignments[userId] === assignTemplate.id) {
      delete assignments[userId];
    } else {
      assignments[userId] = assignTemplate.id;
    }
    await save({ ...data, assignments }, true);
    toast.success('Assignment updated');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Loading…</div>;

  // ── TEMPLATES LIST VIEW ──────────────────────────────────────────────────────
  if (view === 'templates') return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5 max-w-xl">
            Create named layout templates (like Journey Builder flows) and assign them to individual staff members. Each staff member&apos;s My Desk will show their assigned layout.
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 h-9 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shrink-0">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Preset starter templates */}
      {data.templates.length === 0 && (
        <div>
          <p className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Start with a preset
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRESET_TEMPLATES.map(preset => (
              <button key={preset.id} onClick={() => openPreset(preset)}
                className="text-left p-4 rounded-2xl border-2 border-dashed border-border dark:border-dark-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: preset.color + '22' }}>
                    <LayoutDashboard className="w-4 h-4" style={{ color: preset.color }} />
                  </div>
                  <span className="font-semibold text-sm text-on-surface dark:text-white group-hover:text-primary transition-colors">{preset.name}</span>
                </div>
                <p className="text-xs text-on-surface-variant dark:text-zinc-500">{preset.description}</p>
                <p className="text-xs text-zinc-400 mt-2">{preset.layout.length} widget{preset.layout.length !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved templates */}
      {data.templates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5" /> Your Templates
          </p>
          <div className="space-y-2">
            {data.templates.map(t => {
              const assignedCount = Object.values(data.assignments).filter(v => v === t.id).length;
              return (
                <div key={t.id}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800/60 rounded-2xl border border-border dark:border-dark-border hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                  {/* Color swatch + name */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.color + '22' }}>
                    <LayoutDashboard className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <TemplateColorDot color={t.color} />
                      <span className="font-semibold text-sm text-on-surface dark:text-white">{t.name}</span>
                      {assignedCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Users className="w-3 h-3" /> {assignedCount} assigned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t.description || `${t.layout.length} widget${t.layout.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openAssign(t)} title="Assign to staff"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border dark:border-dark-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors text-on-surface-variant dark:text-zinc-400">
                      <Users className="w-3.5 h-3.5" /> Assign
                    </button>
                    <button onClick={() => duplicateTemplate(t)} title="Duplicate"
                      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(t)} title="Edit layout"
                      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} title="Delete"
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border border-border dark:border-dark-border bg-zinc-50 dark:bg-zinc-800/30 p-5">
        <h3 className="text-sm font-bold text-on-surface dark:text-white mb-3 flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" /> How Staff View Templates Work
        </h3>
        <ol className="space-y-2 text-sm text-on-surface-variant dark:text-zinc-400 list-decimal list-inside">
          <li>Create a named template (e.g. &ldquo;Reception Desk&rdquo;, &ldquo;Doctor Station&rdquo;)</li>
          <li>Add widgets and arrange them (like a Journey Builder flow)</li>
          <li>Click <strong className="text-on-surface dark:text-zinc-300">Assign</strong> to assign the template to specific staff members</li>
          <li>That staff member&apos;s <strong className="text-on-surface dark:text-zinc-300">My Desk</strong> will use their assigned template</li>
        </ol>
      </div>
    </div>
  );

  // ── EDITOR VIEW ──────────────────────────────────────────────────────────────
  if (view === 'editor') return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={() => { if (isDirty && !confirm('Discard unsaved changes?')) return; setView('templates'); }}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant dark:text-zinc-400 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Templates
        </button>
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>}
          <button onClick={saveTemplate} disabled={saving}
            className="flex items-center gap-2 px-4 h-9 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Template meta */}
      <div className="bg-white dark:bg-zinc-800/60 rounded-2xl border border-border dark:border-dark-border p-5 space-y-4">
        <h2 className="text-base font-bold text-on-surface dark:text-white">Template Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Template Name *</label>
            <input value={editName} onChange={e => { setEditName(e.target.value); setIsDirty(true); }}
              placeholder="e.g. Reception Desk"
              className="w-full h-10 px-3 rounded-xl border border-border dark:border-dark-border bg-transparent text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Description (optional)</label>
            <input value={editDesc} onChange={e => { setEditDesc(e.target.value); setIsDirty(true); }}
              placeholder="Who is this layout for?"
              className="w-full h-10 px-3 rounded-xl border border-border dark:border-dark-border bg-transparent text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Colour</label>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATE_COLORS.map(c => (
              <button key={c} onClick={() => { setEditColor(c); setIsDirty(true); }}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: editColor === c ? '#fff' : 'transparent', boxShadow: editColor === c ? `0 0 0 2px ${c}` : 'none' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Layout editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget list (left 2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-zinc-800/60 rounded-2xl border border-border dark:border-dark-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-on-surface dark:text-white">
                Layout Widgets <span className="ml-1 text-xs text-zinc-400 font-normal">({editLayout.length})</span>
              </h3>
            </div>

            {editLayout.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border dark:border-dark-border rounded-xl text-center">
                <Grip className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No widgets yet</p>
                <p className="text-xs text-zinc-400 mt-1">Add widgets from the library →</p>
              </div>
            ) : (
              <div className="space-y-2">
                {editLayout.map((w, i) => (
                  <WidgetChip key={w.id} widget={w} index={i} total={editLayout.length}
                    onMove={dir => moveWidget(i, dir)}
                    onRemove={() => removeWidget(i)}
                    onUpdateSpan={(f, v) => updateSpan(i, f, v)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Widget library (right 1/3) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-800/60 rounded-2xl border border-border dark:border-dark-border p-5 sticky top-24">
            <h3 className="text-sm font-bold text-on-surface dark:text-white mb-1">Widget Library</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Click to add a widget to your layout</p>
            <div className="space-y-2">
              {AVAILABLE_WIDGETS.map(w => {
                const count = editLayout.filter(x => x.type === w.id).length;
                return (
                  <button key={w.id} onClick={() => addWidget(w.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border dark:border-dark-border bg-zinc-50 dark:bg-zinc-800 hover:bg-primary/5 hover:border-primary/40 transition-colors group text-left">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-on-surface dark:text-white group-hover:text-primary transition-colors truncate">{w.name}</p>
                      {count > 0 && <p className="text-[10px] text-zinc-400">×{count} in layout</p>}
                    </div>
                    <Plus className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── ASSIGN VIEW ──────────────────────────────────────────────────────────────
  if (view === 'assign' && assignTemplate) return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button onClick={() => setView('templates')}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant dark:text-zinc-400 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Templates
        </button>
      </div>

      {/* Template info */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800/60 rounded-2xl border border-border dark:border-dark-border">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: assignTemplate.color + '22' }}>
          <LayoutDashboard className="w-5 h-5" style={{ color: assignTemplate.color }} />
        </div>
        <div>
          <p className="font-bold text-sm text-on-surface dark:text-white">{assignTemplate.name}</p>
          <p className="text-xs text-zinc-500">{assignTemplate.layout.length} widgets · {assignTemplate.description || 'Custom layout'}</p>
        </div>
      </div>

      {/* Staff list */}
      <div>
        <p className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Staff Members — toggle to assign this template
        </p>
        {users.length === 0 ? (
          <div className="text-center py-10 text-sm text-zinc-400">No staff members found</div>
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const assigned = data.assignments[u.id] === assignTemplate.id;
              const otherTemplate = !assigned && data.assignments[u.id]
                ? data.templates.find(t => t.id === data.assignments[u.id])
                : null;
              return (
                <div key={u.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    assigned
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                      : 'border-border dark:border-dark-border bg-white dark:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                  onClick={() => toggleAssignment(u.id)}
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-600 dark:text-zinc-300 shrink-0">
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface dark:text-white">{u.name || u.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400">{u.role}</span>
                      {otherTemplate && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                          currently: <TemplateColorDot color={otherTemplate.color} />
                          <span>{otherTemplate.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    assigned ? 'bg-primary border-primary' : 'border-border dark:border-dark-border'
                  }`}>
                    {assigned && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400 text-center">
        Staff without an assignment will see the default layout from My Desk.
      </p>
    </div>
  );

  return null;
}

StaffViewSettings.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Staff View Builder" pageSubtitle="Create named desk layouts and assign them to individual staff members — like Journey Builder, but for My Desk.">
      {page}
    </SettingsLayout>
  );
};
