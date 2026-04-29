import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../lib/auth';
import { useCurrency } from '../lib/currency';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SlideInPanel from '../components/elstar/SlideInPanel';
import ActionDropdown from '../components/elstar/ActionDropdown';
import Modal from '../components/elstar/Modal';
import { Plus, Loader2, DollarSign, Calendar, Trash2, Edit, Sparkles, Building2, Search, Eye, X, FileText, Upload, Bot, Shuffle, RotateCcw, User } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Pipeline stages matching Picture 1
const STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-slate-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-amber-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-red-500' },
  { id: 'sales_closed', label: 'Sales Closed', color: 'bg-blue-500' },
  { id: 'lost', label: 'Lost', color: 'bg-gray-600' }
];

const SELECTION_MODES = [
  { id: 'round_robin', label: 'Round Robin', icon: RotateCcw, description: 'Rotate through agents in order' },
  { id: 'random', label: 'Random', icon: Shuffle, description: 'Randomly select an agent each call' },
  { id: 'manual', label: 'Manual', icon: User, description: 'Always use the first selected agent' }
];

const getHealthClass = (score) => {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-medium';
  return 'score-low';
};

const initialFormData = {
  title: '', value: '', company: '', contact_name: '', stage: 'lead', expected_close_date: '', notes: '', linked_company_ids: [], assigned_agents: [], agent_selection_mode: 'round_robin'
};

// Deal Form Fields - MOVED OUTSIDE to prevent re-renders
const DealFormFields = memo(({ data, onChange, isEdit = false, companies = [], companySearch, setCompanySearch, knowledgeBaseFile, setKnowledgeBaseFile, aiAgents = [] }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium mb-2">Deal Title *</label>
      <input 
        className="elstar-input" 
        value={data.title || ''} 
        onChange={(e) => onChange('title', e.target.value)} 
        placeholder="e.g. GLOCO Cloud EMR" 
        data-testid="deal-title-input"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Deal Value (RM) *</label>
        <input 
          className="elstar-input" 
          type="number" 
          value={data.value || ''} 
          onChange={(e) => onChange('value', e.target.value)} 
          placeholder="8800"
          data-testid="deal-value-input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Expected Close Date *</label>
        <input 
          className="elstar-input cursor-pointer" 
          type="date" 
          value={data.expected_close_date || ''} 
          onChange={(e) => onChange('expected_close_date', e.target.value)}
          onClick={(e) => e.target.showPicker && e.target.showPicker()}
          data-testid="deal-close-date-input"
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Pipeline Stage</label>
      <select 
        className="elstar-select" 
        value={data.stage || 'lead'} 
        onChange={(e) => onChange('stage', e.target.value)}
      >
        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>

    {/* Knowledge Base Upload - for AI Training */}
    <div>
      <label className="block text-sm font-medium mb-2">
        Knowledge Base (Optional)
        <span className="text-xs text-muted-foreground ml-2">- Train AI to speak about this deal</span>
      </label>
      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
        <input 
          type="file" 
          accept=".pdf,.doc,.docx,.txt"
          className="hidden" 
          id="knowledge-base-upload"
          onChange={(e) => setKnowledgeBaseFile && setKnowledgeBaseFile(e.target.files[0])}
        />
        <label htmlFor="knowledge-base-upload" className="cursor-pointer">
          {knowledgeBaseFile ? (
            <div className="flex items-center justify-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              <span className="font-medium">{knowledgeBaseFile.name}</span>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setKnowledgeBaseFile && setKnowledgeBaseFile(null); }}
                className="text-muted-foreground hover:text-destructive ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload product info, pricing, or brochure</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, TXT (Max 10MB)</p>
            </>
          )}
        </label>
      </div>
    </div>
    
    {/* LINK COMPANIES Section - matching Picture 2 */}
    <div>
      <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">LINK COMPANIES</h3>
      <div className="relative mb-3">
        <input
          type="text"
          value={companySearch || ''}
          onChange={(e) => setCompanySearch(e.target.value)}
          className="elstar-input"
          placeholder="Search companies..."
        />
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {companies.filter(c => 
          !companySearch || 
          c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
          c.pic_name?.toLowerCase().includes(companySearch.toLowerCase())
        ).map(company => (
          <label key={company.id} className="flex items-center gap-3 p-3 hover:bg-secondary cursor-pointer rounded-lg border border-border">
            <input
              type="checkbox"
              checked={(data.linked_company_ids || []).includes(company.id)}
              onChange={(e) => {
                const newIds = e.target.checked 
                  ? [...(data.linked_company_ids || []), company.id]
                  : (data.linked_company_ids || []).filter(id => id !== company.id);
                onChange('linked_company_ids', newIds);
              }}
              className="w-4 h-4 rounded border-2 border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{company.name} — {company.pic_name || 'No PIC'}</p>
            </div>
          </label>
        ))}
        {companies.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground text-center">No companies available. Add leads first.</p>
        )}
      </div>
    </div>

    {/* AI AGENTS Section */}
    {aiAgents.length > 0 && (
      <div>
        <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          AI CALLING AGENTS
        </h3>
        
        {/* Selection Mode */}
        <div className="mb-4">
          <label className="block text-xs text-muted-foreground mb-2">Agent Selection Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {SELECTION_MODES.map(mode => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChange('agent_selection_mode', mode.id)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    data.agent_selection_mode === mode.id 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-xs font-medium">{mode.label}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {SELECTION_MODES.find(m => m.id === data.agent_selection_mode)?.description}
          </p>
        </div>

        {/* Agent Selection */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {aiAgents.map(agent => (
            <label key={agent.id} className="flex items-center gap-3 p-3 hover:bg-secondary cursor-pointer rounded-lg border border-border">
              <input
                type="checkbox"
                checked={(data.assigned_agents || []).includes(agent.id)}
                onChange={(e) => {
                  const newIds = e.target.checked 
                    ? [...(data.assigned_agents || []), agent.id]
                    : (data.assigned_agents || []).filter(id => id !== agent.id);
                  onChange('assigned_agents', newIds);
                }}
                className="w-4 h-4 rounded border-2 border-border"
              />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {agent.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{agent.name}</p>
                {agent.description && (
                  <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
        {(data.assigned_agents || []).length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            No agents selected. All configured agents will be used.
          </p>
        )}
        {(data.assigned_agents || []).length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {(data.assigned_agents || []).length} agent(s) selected for this deal
          </p>
        )}
      </div>
    )}
  </div>
));

DealFormFields.displayName = 'DealFormFields';

export default function Pipeline() {
  const { token } = useAuth();
  const { format: formatMoney } = useCurrency();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [linkages, setLinkages] = useState([]); // Lead-deal linkages for the Kanban
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDealDetailOpen, setIsDealDetailOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [draggedLinkage, setDraggedLinkage] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [companies, setCompanies] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [knowledgeBaseFile, setKnowledgeBaseFile] = useState(null);
  
  // Linkage edit modal state
  const [isLinkageEditOpen, setIsLinkageEditOpen] = useState(false);
  const [selectedLinkage, setSelectedLinkage] = useState(null);
  const [linkageEditStatus, setLinkageEditStatus] = useState('lead');
  
  // AI Agents state
  const [aiAgents, setAiAgents] = useState([]);

  // Manage Deals state - for combined view/edit/create panel
  const [manageDealMode, setManageDealMode] = useState('new'); // 'new' or 'edit'
  const [selectedExistingDeal, setSelectedExistingDeal] = useState(null);

  // Pipeline date filter - filter deals by when they were last updated
  const [pipelineFilter, setPipelineFilter] = useState('all'); // '5', '10', '20', '30', 'all'

  useEffect(() => { fetchDeals(); fetchLinkages(); fetchCompanies(); fetchAiAgents(); }, []);

  const fetchDeals = async () => {
    try {
      const response = await fetch(`${API}/api/deals`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setDeals(await response.json());
    } catch (error) { toast.error('Failed to fetch deals'); }
    finally { setLoading(false); }
  };

  const fetchLinkages = async () => {
    try {
      const response = await fetch(`${API}/api/lead-deal-linkages`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setLinkages(await response.json());
    } catch (error) { console.error('Failed to fetch linkages'); }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API}/api/lookup/companies`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) { console.error('Failed to fetch companies:', error); }
  };

  const fetchAiAgents = async () => {
    try {
      const response = await fetch(`${API}/api/ai-agents`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setAiAgents(data.agents || []);
      }
    } catch (error) { console.error('Failed to fetch AI agents:', error); }
  };

  // Stable callback to prevent re-renders
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.value) { toast.error('Title and value are required'); return; }
    setFormLoading(true);
    try {
      const response = await fetch(`${API}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, value: parseFloat(formData.value) })
      });
      if (response.ok) {
        const newDeal = await response.json();
        
        // Upload knowledge base file if provided
        if (knowledgeBaseFile && newDeal.id) {
          const kbFormData = new FormData();
          kbFormData.append('file', knowledgeBaseFile);
          await fetch(`${API}/api/deals/${newDeal.id}/knowledge-base/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: kbFormData
          });
        }
        
        toast.success('Deal created');
        setIsCreateOpen(false);
        setFormData(initialFormData);
        setKnowledgeBaseFile(null);
        setManageDealMode('new');
        setSelectedExistingDeal(null);
        fetchDeals();
      }
    } catch (error) { toast.error('Failed to create deal'); }
    finally { setFormLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    // Use selectedExistingDeal for the manage panel, or selectedDeal for the old edit panel
    const dealToEdit = selectedExistingDeal || selectedDeal;
    if (!dealToEdit) return;
    setFormLoading(true);
    try {
      const response = await fetch(`${API}/api/deals/${dealToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, value: parseFloat(formData.value) })
      });
      
      if (response.ok) {
        // If this was opened from a specific linkage, also update that linkage's pipeline_status
        if (dealToEdit._linkage_id && formData.stage) {
          await fetch(`${API}/api/lead-deal-linkages/${dealToEdit._linkage_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ pipeline_status: formData.stage })
          });
        }
        
        // Upload knowledge base file if provided
        if (knowledgeBaseFile) {
          const kbFormData = new FormData();
          kbFormData.append('file', knowledgeBaseFile);
          await fetch(`${API}/api/deals/${dealToEdit.id}/knowledge-base/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: kbFormData
          });
        }
        
        toast.success('Deal updated'); 
        setIsEditOpen(false);
        setIsCreateOpen(false);
        setSelectedDeal(null);
        setSelectedExistingDeal(null);
        setManageDealMode('new');
        setFormData(initialFormData);
        setKnowledgeBaseFile(null);
        fetchDeals();
        fetchLinkages();
      }
    } catch (error) { toast.error('Failed to update deal'); }
    finally { setFormLoading(false); }
  };

  const handleDeleteDeal = async (dealId) => {
    try {
      const response = await fetch(`${API}/api/deals/${dealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Deal deleted');
        setIsCreateOpen(false);
        setSelectedExistingDeal(null);
        setManageDealMode('new');
        setFormData(initialFormData);
        fetchDeals();
        fetchLinkages();
      } else {
        toast.error('Failed to delete deal');
      }
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const handleDelete = async (dealId) => {
    if (!window.confirm('Delete this deal?')) return;
    try { await fetch(`${API}/api/deals/${dealId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); toast.success('Deal deleted'); fetchDeals(); }
    catch (error) { toast.error('Failed to delete deal'); }
  };

  const handleDragStart = (e, deal) => { setDraggedDeal(deal); };
  const handleLinkageDragStart = (e, linkage) => { setDraggedLinkage(linkage); };
  const handleDragOver = (e) => { e.preventDefault(); };
  
  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    
    // Handle linkage drag (individual lead-deal combination)
    if (draggedLinkage) {
      if (draggedLinkage.pipeline_status === newStage) { setDraggedLinkage(null); return; }
      
      // Optimistic update
      setLinkages(prev => prev.map(l => l.id === draggedLinkage.id ? {...l, pipeline_status: newStage} : l));
      
      try {
        // Only update this specific linkage's status
        await fetch(`${API}/api/lead-deal-linkages/${draggedLinkage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pipeline_status: newStage })
        });
        toast.success(`Moved to ${STAGES.find(s => s.id === newStage)?.label || newStage}`);
        fetchLinkages();
      } catch (error) { 
        fetchLinkages(); 
        toast.error('Failed to update'); 
      }
      setDraggedLinkage(null);
      return;
    }
    
    setDraggedDeal(null);
  };

  // Open linkage detail side panel
  const openLinkageDetail = async (linkage) => {
    // Create a deal-like object from linkage for the side panel
    const deal = deals.find(d => d.id === linkage.deal_id);
    if (deal) {
      // Create a custom view with linkage-specific stage
      setSelectedDeal({
        ...deal,
        stage: linkage.pipeline_status, // Use linkage's status, not deal's
        _linkage_id: linkage.id,
        _lead_id: linkage.lead_id,
        _lead_name: linkage.lead_company || linkage.lead_name
      });
      setIsDealDetailOpen(true);
    } else {
      // If deal not found, navigate to lead
      navigate(`/admin/leads/${linkage.lead_id}`);
    }
  };

  const openEditDialog = (deal) => {
    setSelectedDeal(deal);
    setFormData({ ...deal, value: deal.value?.toString() || '', linked_company_ids: deal.linked_company_ids || [] });
    setIsEditOpen(true);
  };

  const openDealDetail = async (deal) => {
    try {
      const response = await fetch(`${API}/api/deals/${deal.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const fullDeal = await response.json();
        setSelectedDeal(fullDeal);
        setIsDealDetailOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load deal details');
    }
  };

  // Linkage edit/delete functions
  const openLinkageEditDialog = (linkage) => {
    setSelectedLinkage(linkage);
    setLinkageEditStatus(linkage.pipeline_status);
    setIsLinkageEditOpen(true);
  };

  const handleLinkageEditSave = async () => {
    if (!selectedLinkage) return;
    try {
      await fetch(`${API}/api/lead-deal-linkages/${selectedLinkage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pipeline_status: linkageEditStatus })
      });
      toast.success('Status updated');
      setIsLinkageEditOpen(false);
      setSelectedLinkage(null);
      fetchLinkages();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteLinkage = async (linkageId) => {
    if (!confirm('Remove this lead from the deal?')) return;
    try {
      await fetch(`${API}/api/lead-deal-linkages/${linkageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Removed from deal');
      fetchLinkages();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  // Get linkages by pipeline_status (each lead-deal combination as individual tile)
  // Apply date filter to ALL stages based on pipelineFilter
  const getLinkagesByStage = (stageId) => {
    let stageLinkages = linkages.filter(l => l.pipeline_status === stageId);
    
    // Apply date filter to all stages
    if (pipelineFilter !== 'all') {
      const daysFilter = parseInt(pipelineFilter, 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
      
      stageLinkages = stageLinkages.filter(l => {
        // Use updated_at as the date when the deal was last modified
        const updatedDate = l.updated_at ? new Date(l.updated_at) : new Date(l.created_at);
        return updatedDate >= cutoffDate;
      });
    }
    
    return stageLinkages;
  };
  const getLinkageStageValue = (stageId) => getLinkagesByStage(stageId).reduce((sum, l) => sum + (l.deal_value || 0), 0);
  
  const formatCurrency = (value) => formatMoney(parseFloat(value || 0), { decimals: 0 });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" data-testid="pipeline-page" data-page="pipeline">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Drag and drop to update stages</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Pipeline Date Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Show:</label>
            <select
              value={pipelineFilter}
              onChange={(e) => setPipelineFilter(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              data-testid="pipeline-date-filter"
            >
              <option value="5">Last 5 days</option>
              <option value="10">Last 10 days</option>
              <option value="20">Last 20 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <button onClick={() => { setFormData(initialFormData); setIsCreateOpen(true); }} className="elstar-btn-primary flex items-center gap-2" data-testid="add-deal-btn">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board - Shows individual lead-deal linkages */}
      <div className="pipeline-board overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className="elstar-kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              data-testid={`pipeline-column-${stage.id}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <span className="font-medium text-sm">{stage.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {getLinkagesByStage(stage.id).length}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-4">{formatCurrency(getLinkageStageValue(stage.id))}</p>

              {/* Cards - Each card is a lead-deal linkage (individual clinic) */}
              <div className="space-y-3 min-h-[300px]">
                {getLinkagesByStage(stage.id).map((linkage) => (
                  <div
                    key={linkage.id}
                    draggable
                    onDragStart={(e) => handleLinkageDragStart(e, linkage)}
                    onClick={() => openLinkageDetail(linkage)}
                    className={`elstar-kanban-card cursor-pointer hover:border-primary/50 transition-colors ${draggedLinkage?.id === linkage.id ? 'opacity-50' : ''}`}
                    data-testid={`linkage-card-${linkage.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2 pr-2">{linkage.deal_title}</h4>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ActionDropdown testId={`linkage-actions-${linkage.id}`}>
                          {(closeDropdown) => (
                            <>
                              <button onClick={() => { openLinkageDetail(linkage); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2">
                                <Eye className="w-4 h-4" /> View Details
                              </button>
                              <button onClick={() => { navigate(`/admin/leads/${linkage.lead_id}`); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> View Lead
                              </button>
                              <button onClick={() => { handleDeleteLinkage(linkage.id); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2 text-red-500">
                                <Trash2 className="w-4 h-4" /> Remove
                              </button>
                            </>
                          )}
                        </ActionDropdown>
                      </div>
                    </div>
                    
                    {/* Lead/Clinic Info - Each card shows ONE clinic */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-emerald-500" />
                      </div>
                      <div className="text-xs">
                        <span className="text-foreground font-medium">{linkage.lead_company || linkage.lead_name}</span>
                        {linkage.lead_state && (
                          <span className="text-muted-foreground ml-1">• {linkage.lead_state}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="font-mono font-medium text-foreground">{formatCurrency(linkage.deal_value || 0)}</span>
                      </div>
                      {linkage.deal_expected_close_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{linkage.deal_expected_close_date}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Health Score</span>
                      <div className="flex items-center gap-1">
                        <Sparkles className={`w-3.5 h-3.5 ${getHealthClass(70)}`} />
                        <span className={`font-mono text-xs font-bold ${getHealthClass(70)}`}>+70</span>
                      </div>
                    </div>
                  </div>
                ))}
                {getLinkagesByStage(stage.id).length === 0 && (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground">
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manage Deals Slide-in Panel - View/Edit existing or Create new */}
      <SlideInPanel isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setManageDealMode('new'); setSelectedExistingDeal(null); }} title="Manage Deals">
        <div className="space-y-4">
          {/* Deal Selector - Choose existing or create new */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Deal</label>
            <select
              className="elstar-select w-full"
              value={selectedExistingDeal?.id || 'new'}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  setManageDealMode('new');
                  setSelectedExistingDeal(null);
                  setFormData(initialFormData);
                  setKnowledgeBaseFile(null);
                } else {
                  const deal = deals.find(d => d.id === e.target.value);
                  if (deal) {
                    setManageDealMode('edit');
                    setSelectedExistingDeal(deal);
                    setFormData({
                      title: deal.title || '',
                      value: deal.value || '',
                      stage: deal.stage || 'lead',
                      expected_close_date: deal.expected_close_date || '',
                      notes: deal.notes || '',
                      linked_company_ids: deal.linked_company_ids || [],
                      assigned_agents: deal.assigned_agents || [],
                      agent_selection_mode: deal.agent_selection_mode || 'round_robin'
                    });
                    setKnowledgeBaseFile(null);
                  }
                }
              }}
              data-testid="deal-selector"
            >
              <option value="new">➕ Create New Deal</option>
              <optgroup label="Existing Deals">
                {deals.map(deal => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title} - {formatCurrency(deal.value || 0)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Show existing deal summary when selected */}
          {manageDealMode === 'edit' && selectedExistingDeal && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-primary">Deal Summary</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedExistingDeal.stage === 'sales_closed' ? 'bg-green-500/20 text-green-500' :
                  selectedExistingDeal.stage === 'lost' ? 'bg-red-500/20 text-red-500' :
                  'bg-amber-500/20 text-amber-500'
                }`}>
                  {STAGES.find(s => s.id === selectedExistingDeal.stage)?.label || selectedExistingDeal.stage}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="font-medium">{formatCurrency(selectedExistingDeal.value || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Close</p>
                  <p className="font-medium">{selectedExistingDeal.expected_close_date || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{selectedExistingDeal.created_at ? new Date(selectedExistingDeal.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Linked Companies</p>
                  <p className="font-medium">{(selectedExistingDeal.linked_company_ids || []).length} companies</p>
                </div>
              </div>
              {/* Knowledge Base Status */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Knowledge Base</p>
                {selectedExistingDeal.knowledge_base_content ? (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">✓ Uploaded ({selectedExistingDeal.knowledge_base_content.length} characters)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">No knowledge base uploaded</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-3">
              {manageDealMode === 'new' ? '📝 New Deal Details' : '✏️ Edit Deal Details'}
            </h4>
          </div>

          {/* Deal Form */}
          <form onSubmit={manageDealMode === 'new' ? handleCreate : handleEdit}>
            <DealFormFields 
              data={formData} 
              onChange={handleInputChange} 
              isEdit={manageDealMode === 'edit'}
              companies={companies} 
              companySearch={companySearch} 
              setCompanySearch={setCompanySearch} 
              knowledgeBaseFile={knowledgeBaseFile} 
              setKnowledgeBaseFile={setKnowledgeBaseFile} 
              aiAgents={aiAgents} 
            />
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              {manageDealMode === 'new' ? (
                <button type="submit" disabled={formLoading} className="elstar-btn-primary flex-1 flex items-center justify-center gap-2" data-testid="submit-deal-btn">
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Create Deal
                </button>
              ) : (
                <>
                  <button type="submit" disabled={formLoading} className="elstar-btn-primary flex-1 flex items-center justify-center gap-2">
                    {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Edit className="w-4 h-4" /> Update Deal
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this deal?')) {
                        handleDeleteDeal(selectedExistingDeal.id);
                      }
                    }}
                    className="elstar-btn-ghost text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setIsCreateOpen(false); setManageDealMode('new'); setSelectedExistingDeal(null); }} className="elstar-btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      </SlideInPanel>

      {/* Edit Deal Slide-in Panel */}
      <SlideInPanel isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Deal">
        <form onSubmit={handleEdit}>
          <DealFormFields data={formData} onChange={handleInputChange} isEdit companies={companies} companySearch={companySearch} setCompanySearch={setCompanySearch} knowledgeBaseFile={knowledgeBaseFile} setKnowledgeBaseFile={setKnowledgeBaseFile} aiAgents={aiAgents} />
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button type="submit" disabled={formLoading} className="elstar-btn-primary flex-1 flex items-center justify-center gap-2">
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />} Update Deal
            </button>
            <button type="button" onClick={() => setIsEditOpen(false)} className="elstar-btn-ghost">Cancel</button>
          </div>
        </form>
      </SlideInPanel>

      {/* Deal Detail Slide-in Panel - matching Picture 3 */}
      <SlideInPanel isOpen={isDealDetailOpen} onClose={() => setIsDealDetailOpen(false)} title={selectedDeal?.title || 'Deal Details'} width="w-[520px]">
        {selectedDeal && (
          <div className="space-y-6">
            {/* Deal Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase">DEAL TITLE</p>
                <p className="font-semibold">{selectedDeal.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">DEAL VALUE</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedDeal.value)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">EXPECTED CLOSE</p>
                  <p className="font-medium">{selectedDeal.expected_close_date || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Current Lead Info - shown when opened from linkage card */}
            {selectedDeal._lead_name && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
                <p className="text-xs text-primary uppercase font-medium">Currently Viewing</p>
                <p className="font-semibold">{selectedDeal._lead_name}</p>
              </div>
            )}

            {/* Pipeline Stage - matching Picture 3 */}
            <div>
              <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">PIPELINE STAGE</h3>
              <div className="flex gap-2 flex-wrap">
                {STAGES.map(stage => (
                  <button
                    key={stage.id}
                    onClick={async () => {
                      if (selectedDeal.stage === stage.id) return;
                      try {
                        // If this is a linkage-specific view, only update this linkage
                        if (selectedDeal._linkage_id) {
                          await fetch(`${API}/api/lead-deal-linkages/${selectedDeal._linkage_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ pipeline_status: stage.id })
                          });
                          toast.success(`${selectedDeal._lead_name} moved to ${stage.label}`);
                        } else {
                          // Otherwise update the deal and all linkages
                          await fetch(`${API}/api/deals/${selectedDeal.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ stage: stage.id })
                          });
                          
                          const linkedLinkages = linkages.filter(l => l.deal_id === selectedDeal.id);
                          for (const linkage of linkedLinkages) {
                            await fetch(`${API}/api/lead-deal-linkages/${linkage.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ pipeline_status: stage.id })
                            });
                          }
                          toast.success(`Stage updated to ${stage.label}`);
                        }
                        
                        setSelectedDeal(prev => ({ ...prev, stage: stage.id }));
                        fetchDeals();
                        fetchLinkages();
                      } catch (error) {
                        toast.error('Failed to update stage');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedDeal.stage === stage.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Linked Companies - matching Picture 3 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">LINKED COMPANIES</h3>
                <span className="text-xs text-muted-foreground">
                  {selectedDeal.linked_companies?.length || 0} companies
                </span>
              </div>
              
              {selectedDeal.linked_companies && selectedDeal.linked_companies.length > 0 ? (
                <div className="space-y-3">
                  {selectedDeal.linked_companies.map((company, idx) => (
                    <div key={idx} className="p-4 bg-secondary/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        {/* Avatar with initials */}
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {company.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{company.name}</p>
                          <p className="text-xs text-muted-foreground">Healthcare - {company.country || 'Malaysia'}</p>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                            <div>
                              <p className="text-muted-foreground uppercase">PIC</p>
                              <p className="font-medium">{company.pic_name || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground uppercase">MOBILE</p>
                              <p className="font-medium">{company.mobile || company.phone || '-'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground uppercase">LOCATION</p>
                              <p className="font-medium">{company.city || company.location || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(`/admin/leads/${company.id}`)}
                          className="px-3 py-1 bg-amber-500 text-black text-xs font-medium rounded hover:bg-amber-400 transition-colors flex-shrink-0"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No companies linked to this deal</p>
              )}
            </div>

            {/* Health Score */}
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <span className="text-sm">Health Score</span>
              <div className="flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${getHealthClass(selectedDeal.ai_health_score)}`} />
                <span className={`text-xl font-bold ${getHealthClass(selectedDeal.ai_health_score)}`}>
                  +{selectedDeal.ai_health_score || 0}
                </span>
              </div>
            </div>

            {/* Notes */}
            {selectedDeal.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-2">NOTES</p>
                <p className="text-sm">{selectedDeal.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <button 
                onClick={() => { setIsDealDetailOpen(false); openEditDialog(selectedDeal); }} 
                className="elstar-btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" /> Edit Deal
              </button>
              <button onClick={() => setIsDealDetailOpen(false)} className="elstar-btn-ghost">Close</button>
            </div>
          </div>
        )}
      </SlideInPanel>

      {/* Linkage Edit Modal */}
      <Modal isOpen={isLinkageEditOpen} onClose={() => setIsLinkageEditOpen(false)} title="Edit Pipeline Status">
        <div className="elstar-modal-body space-y-4">
          {selectedLinkage && (
            <>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="font-medium">{selectedLinkage.deal_title}</p>
                <p className="text-sm text-muted-foreground">{selectedLinkage.lead_company || selectedLinkage.lead_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Pipeline Status</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(stage => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => setLinkageEditStatus(stage.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        linkageEditStatus === stage.id
                          ? 'bg-primary text-white border-primary'
                          : 'border-border hover:bg-secondary'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="elstar-modal-footer">
          <button onClick={() => setIsLinkageEditOpen(false)} className="elstar-btn-ghost">Cancel</button>
          <button onClick={handleLinkageEditSave} className="elstar-btn-primary">
            Save Changes
          </button>
        </div>
      </Modal>
    </div>
  );
}
