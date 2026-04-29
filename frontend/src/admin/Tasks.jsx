import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useCurrency } from '../lib/currency';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SlideInPanel from '../components/elstar/SlideInPanel';
import Pagination from '../components/elstar/Pagination';
import ActionDropdown from '../components/elstar/ActionDropdown';
import Modal from '../components/elstar/Modal';
import { 
  Plus, Search, Loader2, 
  Trash2, Edit, CheckCircle, 
  CalendarPlus, Eye, ExternalLink
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  lead: { label: 'Lead', class: 'bg-blue-500/20 text-blue-400' },
  customer: { label: 'Customer', class: 'bg-green-500/20 text-green-400' },
  pending: { label: 'Pending', class: 'bg-amber-500/20 text-amber-400' },
  in_progress: { label: 'In Progress', class: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Completed', class: 'bg-green-500/20 text-green-400' }
};

const paymentStatusConfig = {
  paid: { label: 'Paid', class: 'bg-green-500/20 text-green-400' },
  partially_paid: { label: 'Partially Paid', class: 'bg-amber-500/20 text-amber-400' },
  unpaid: { label: 'Unpaid', class: 'bg-red-500/20 text-red-400' }
};

const initialFormData = {
  title: '',
  lead_id: '',
  deal_id: '',
  status: '',
  pic_name: '',
  assigned_to: '',
  payment_status: ''
};

export default function Tasks() {
  const { token } = useAuth();
  const { format: formatMoney } = useCurrency();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  
  // Preview panel state (changed from modal to slide-in panel)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLead, setPreviewLead] = useState(null);
  const [previewDeals, setPreviewDeals] = useState([]);
  
  // Data for dropdowns
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filter
  const [dealFilter, setDealFilter] = useState('');

  // Fix for iOS Safari scroll restoration issue - scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    // Also reset any body scroll issues
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchDropdownData();
  }, [currentPage, pageSize, dealFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', pageSize);
      if (dealFilter) params.append('deal_id', dealFilter);
      if (search) params.append('search', search);
      
      const response = await fetch(`${API}/api/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.total_pages || 0);
      }
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      // Fetch leads (companies)
      const leadsRes = await fetch(`${API}/api/leads?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.items || []);
      }
      
      // Fetch deals
      const dealsRes = await fetch(`${API}/api/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setDeals(data || []);
      }
      
      // Fetch users (sales persons)
      const usersRes = await fetch(`${API}/api/users?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  // When company is selected, auto-fill PIC Name
  const handleCompanyChange = (leadId) => {
    const selectedLead = leads.find(l => l.id === leadId);
    setFormData(prev => ({
      ...prev,
      lead_id: leadId,
      pic_name: selectedLead ? (selectedLead.pic_name || selectedLead.name || '') : '',
      title: selectedLead ? (selectedLead.company || selectedLead.name || '') : prev.title
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.lead_id) {
      toast.error('Please select a customer');
      return;
    }
    
    setFormLoading(true);
    try {
      const selectedLead = leads.find(l => l.id === formData.lead_id);
      const payload = {
        title: selectedLead?.company || selectedLead?.name || 'New Task',
        description: '',
        lead_id: formData.lead_id,
        deal_id: formData.deal_id || null,
        assigned_to: formData.assigned_to || null,
        status: formData.status || 'pending',
        payment_status: formData.payment_status || 'unpaid',
        priority: 'medium'
      };
      
      const response = await fetch(`${API}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        toast.success('Task created successfully');
        setIsPanelOpen(false);
        setFormData(initialFormData);
        fetchTasks();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to create task');
      }
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    setFormLoading(true);
    try {
      const selectedLead = leads.find(l => l.id === formData.lead_id);
      const payload = {
        title: selectedLead?.company || selectedLead?.name || formData.title,
        lead_id: formData.lead_id,
        deal_id: formData.deal_id || null,
        assigned_to: formData.assigned_to || null,
        status: formData.status || 'pending',
        payment_status: formData.payment_status || 'unpaid'
      };
      
      const response = await fetch(`${API}/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        toast.success('Task updated successfully');
        closePanel();
        fetchTasks();
      } else {
        toast.error('Failed to update task');
      }
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await fetch(`${API}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Task deleted');
        fetchTasks();
      } else {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const syncToCalendar = async (taskId, closeDropdown) => {
    try {
      const response = await fetch(`${API}/api/google-calendar/sync-task/${taskId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Task synced to Google Calendar');
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to sync task');
      }
    } catch (error) {
      toast.error('Failed to sync to calendar');
    }
    if (closeDropdown) closeDropdown();
  };

  // Fetch lead details for preview
  const openLeadPreview = async (leadId) => {
    if (!leadId) return;
    try {
      const response = await fetch(`${API}/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const lead = await response.json();
        setPreviewLead(lead);
        setIsPreviewOpen(true);
        // Fetch deals for this lead
        fetchLeadDeals(leadId);
      }
    } catch (error) {
      console.error('Failed to fetch lead details');
    }
  };

  // Fetch deals associated with a lead
  const fetchLeadDeals = async (leadId) => {
    try {
      const response = await fetch(`${API}/api/lead-deal-linkages?lead_id=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const linkages = await response.json();
        setPreviewDeals(linkages || []);
      }
    } catch (error) {
      console.error('Failed to fetch lead deals');
      setPreviewDeals([]);
    }
  };

  // Navigate to lead detail page
  const goToLeadDetail = (leadId) => {
    if (leadId) {
      navigate(`/admin/leads/${leadId}`);
    }
  };

  const openCreatePanel = () => {
    setFormData(initialFormData);
    setSelectedTask(null);
    setIsEditing(false);
    setIsPanelOpen(true);
  };

  const openEditPanel = (task, closeDropdown) => {
    setSelectedTask(task);
    setFormData({
      title: task.title || '',
      lead_id: task.lead_id || '',
      deal_id: task.deal_id || '',
      status: task.status || 'pending',
      pic_name: task.pic_name || task.lead_name || '',
      assigned_to: task.assigned_to || '',
      payment_status: task.payment_status || 'unpaid'
    });
    setIsEditing(true);
    setIsPanelOpen(true);
    if (closeDropdown) closeDropdown();
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelectedTask(null);
    setIsEditing(false);
    setFormData(initialFormData);
  };

  const getStatusDisplay = (task) => {
    // Use pipeline_status if available (from lead-deal linkage)
    if (task.pipeline_status) {
      const statusMap = {
        'lead': { label: 'Lead', class: 'bg-slate-500/20 text-slate-400' },
        'qualified': { label: 'Qualified', class: 'bg-amber-500/20 text-amber-400' },
        'proposal': { label: 'Proposal', class: 'bg-orange-500/20 text-orange-400' },
        'negotiation': { label: 'Negotiation', class: 'bg-red-500/20 text-red-400' },
        'sales_closed': { label: 'Sales Closed', class: 'bg-blue-500/20 text-blue-400' },
        'lost': { label: 'Lost', class: 'bg-gray-600/20 text-gray-400' }
      };
      return statusMap[task.pipeline_status] || { label: task.pipeline_status, class: 'bg-gray-500/20 text-gray-400' };
    }
    // Check if task is linked to a lead or customer
    if (task.client_id) {
      return { label: 'Customer', class: 'bg-green-500/20 text-green-400' };
    }
    if (task.lead_id) {
      return { label: 'Lead', class: 'bg-blue-500/20 text-blue-400' };
    }
    return statusConfig[task.status] || { label: task.status, class: 'bg-gray-500/20 text-gray-400' };
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTasks();
  };

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Your daily work list - all follow-ups and visits</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            data-testid="search-tasks-input"
          />
        </form>
        <select
          value={dealFilter}
          onChange={(e) => { setDealFilter(e.target.value); setCurrentPage(1); }}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          data-testid="deals-filter"
        >
          <option value="">All Deals</option>
          {deals.map(deal => (
            <option key={deal.id} value={deal.id}>{deal.title}</option>
          ))}
        </select>
        <button 
          onClick={openCreatePanel} 
          className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          data-testid="create-task-btn"
        >
          <Plus className="w-4 h-4" />
          + Add Task
        </button>
      </div>

      {/* Tasks Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first task to get started</p>
            <button 
              onClick={openCreatePanel}
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full table-fixed min-w-[960px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase w-12">NO.</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">CUSTOMER NAME</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase w-28">PIC</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase w-32">DEAL</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase w-24">STATUS</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase w-20">DATE</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground uppercase w-24">PAYMENT</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => {
                    const statusDisplay = getStatusDisplay(task);
                    const paymentDisplay = paymentStatusConfig[task.payment_status] || { label: task.payment_status || 'Unpaid', class: 'bg-gray-500/20 text-gray-400' };
                    return (
                      <tr key={task.id} className="border-b border-border hover:bg-secondary/30 transition-colors" data-testid={`task-row-${task.id}`}>
                        <td className="px-2 py-1.5 text-sm text-muted-foreground">
                          {String((currentPage - 1) * pageSize + index + 1).padStart(4, '0')}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => goToLeadDetail(task.lead_id)}
                                className="font-medium text-sm text-primary hover:underline cursor-pointer text-left truncate"
                              >
                                {task.company_name || task.title}
                              </button>
                              {task.lead_id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openLeadPreview(task.lead_id); }}
                                  className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-primary shrink-0"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-sm">
                          <span className="truncate block">{task.pic_name || '-'}</span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="text-sm text-primary truncate block">{task.deal_name || '-'}</span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusDisplay.class}`}>
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          {(task.due_date || task.updated_at) ? new Date(task.due_date || task.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentDisplay.class}`}>
                            {paymentDisplay.label}
                          </span>
                        </td>
                        <td className="px-1 py-2">
                          <ActionDropdown testId={`task-actions-${task.id}`}>
                            {(closeDropdown) => (
                              <>
                                <button onClick={() => openEditPanel(task, closeDropdown)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 rounded">
                                  <Edit className="w-4 h-4" /> Edit
                                </button>
                                <button onClick={() => syncToCalendar(task.id, closeDropdown)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 rounded">
                                  <CalendarPlus className="w-4 h-4" /> Sync to Calendar
                                </button>
                                <button onClick={() => { handleDelete(task.id); closeDropdown(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 rounded text-red-500">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </>
                            )}
                          </ActionDropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          </>
        )}
      </div>

      {/* Add/Edit Task Slide-In Panel */}
      <SlideInPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        title="Add New Task"
        width="w-[400px]"
      >
        <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-5">
          <div className="mb-6">
            <h3 className="text-primary font-semibold text-sm uppercase tracking-wider">TASK DETAILS</h3>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Customer Name *</label>
            <select
              value={formData.lead_id}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full bg-card border border-primary/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              data-testid="task-company-select"
            >
              <option value="">Select customer...</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>{lead.name || lead.company}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Task Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Follow up on proposal"
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              data-testid="task-title-input"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              data-testid="task-status-select"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Deal */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Deal *</label>
            <select
              value={formData.deal_id}
              onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              data-testid="task-deal-select"
            >
              <option value="">Select deal...</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>{deal.title} - {formatMoney(deal.value || 0, { decimals: 0 })}</option>
              ))}
            </select>
          </div>

          {/* PIC Name (Auto-filled) */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">PIC Name</label>
            <input
              type="text"
              value={formData.pic_name}
              readOnly
              placeholder="Auto-filled from company"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              data-testid="task-pic-input"
            />
          </div>

          {/* Sales Person */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Sales Person *</label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              data-testid="task-salesperson-select"
            >
              <option value="">Select sales person...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Payment *</label>
            <select
              value={formData.payment_status}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              data-testid="task-payment-select"
            >
              <option value="">Select payment status...</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              data-testid="submit-task-btn"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Update Task' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* Lead Preview Slide-In Panel */}
      <SlideInPanel
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setPreviewLead(null); }}
        title=""
        width="w-[420px]"
      >
        {previewLead && (
          <div className="flex flex-col h-full -m-6">
            {/* Green Header */}
            <div className="bg-emerald-700 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xl">
                  {(previewLead.company || previewLead.name || 'L').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{previewLead.company || previewLead.name}</h3>
                  <p className="text-emerald-200 text-sm">{previewLead.pic_name || previewLead.title || 'No PIC'}</p>
                  {previewLead.email && (
                    <a href={`mailto:${previewLead.email}`} className="text-primary text-sm hover:underline">{previewLead.email}</a>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* About This Lead */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">▾</span> ABOUT THIS LEAD
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    {previewLead.email ? (
                      <a href={`mailto:${previewLead.email}`} className="text-primary text-sm hover:underline">{previewLead.email}</a>
                    ) : (
                      <p className="text-sm font-medium">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Company name</p>
                    <p className="text-sm font-medium">{previewLead.company || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lead status</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      previewLead.status === 'customer' ? 'bg-green-500/20 text-green-400' : 
                      previewLead.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {previewLead.status || 'New'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="text-sm font-medium">{previewLead.industry || 'Healthcare'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone number</p>
                    <p className="text-sm font-medium">{previewLead.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PIC / Job Title</p>
                    <p className="text-sm font-medium">{previewLead.pic_name || previewLead.title || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">▾</span> ADDRESS
                </h4>
                <div className="space-y-2">
                  <p className="text-sm">
                    {[previewLead.address, previewLead.city, previewLead.state, previewLead.postcode, previewLead.country].filter(Boolean).join(', ') || 'No address information'}
                  </p>
                </div>
              </div>

              {/* Deals Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="text-muted-foreground">▾</span> DEALS
                  </h4>
                  <button
                    onClick={() => {
                      setIsPreviewOpen(false);
                      navigate(`/leads/${previewLead.id}`);
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    + Add Deal
                  </button>
                </div>
                {previewDeals.length > 0 ? (
                  <div className="space-y-3">
                    {previewDeals.map((deal) => {
                      const progress = deal.pipeline_status === 'sales_closed' ? 100 : 
                                       deal.pipeline_status === 'negotiation' ? 75 :
                                       deal.pipeline_status === 'proposal' ? 50 :
                                       deal.pipeline_status === 'qualified' ? 25 : 10;
                      return (
                        <div key={deal.id} className="bg-card border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{deal.deal_title || deal.deal_name || 'Untitled Deal'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatMoney(deal.deal_value || 0, { decimals: 0 })}
                                {deal.expected_close_date && ` · Close: ${new Date(deal.expected_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              {deal.pipeline_status?.replace('_', ' ') || 'lead'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No deals associated with this lead</p>
                )}
              </div>

              {/* AI Score Section */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">▾</span> AI SCORE
                </h4>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-amber-500">{previewLead.ai_score || 50}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${previewLead.ai_score || 50}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Lead Health Score</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  goToLeadDetail(previewLead.id);
                  setPreviewLead(null);
                }}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Open Full Profile
              </button>
              <button
                onClick={() => { setIsPreviewOpen(false); setPreviewLead(null); }}
                className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </SlideInPanel>
    </div>
  );
}
