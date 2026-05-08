import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Modal from '../components/elstar/Modal';
import SlideInPanel from '../components/elstar/SlideInPanel';
import Pagination from '../components/elstar/Pagination';
import ActionDropdown from '../components/elstar/ActionDropdown';
import { 
  Plus, Search, Loader2, Sparkles, Mail, Phone, Building2, 
  Trash2, Edit, RefreshCw, Upload, Download, FileSpreadsheet, Eye, UserCheck, 
  DollarSign, PhoneCall, MessageCircle, Globe, MapPin, Check
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  new: { label: 'New', class: 'elstar-badge-info' },
  contacted: { label: 'Contacted', class: 'elstar-badge-warning' },
  qualified: { label: 'Qualified', class: 'elstar-badge-success' },
  lost: { label: 'Lost', class: 'elstar-badge-danger' }
};

const pipelineStageConfig = {
  new: { label: 'New', class: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  contacted: { label: 'Contacted', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  no_answer: { label: 'No Answer', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  interested: { label: 'Interested', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  follow_up: { label: 'Follow Up', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  booked: { label: 'Booked', class: 'bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
  won: { label: 'Won', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  lost: { label: 'Lost', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
};

const getScoreClass = (score) => {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-medium';
  return 'score-low';
};

const initialFormData = {
  name: '', email: '', phone: '', company: '', title: '',
  linkedin: '', company_size: '', industry: '', source: '', notes: '',
  address: '', postcode: '', city: '', state: '', country: '', is_public: false, status: 'new',
  website: '', pic_name: '', office_number: '', fax_number: '', pipeline_status: 'new',
  ic_number: '', passport_number: '',
  date_of_birth: '', gender: '', race: ''
};

// Enhanced Form Fields Component matching Picture 5 spec
const LeadFormFields = memo(({ data, onChange, isEdit = false }) => (
  <div className="space-y-6">
    {/* CUSTOMER INFO Section */}
    <div>
      <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">CUSTOMER INFO</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Customer Name *</label>
          <input 
            className="elstar-input" 
            value={data.name || ''} 
            onChange={(e) => onChange('name', e.target.value)} 
            placeholder="e.g. Acme Sdn Bhd / John Doe" 
            data-testid="lead-name-input" 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Country *</label>
            <select 
              className="elstar-select" 
              value={data.country || 'Malaysia'} 
              onChange={(e) => onChange('country', e.target.value)} 
              data-testid="lead-country-select"
            >
              <option value="Malaysia">Malaysia</option>
              <option value="Singapore">Singapore</option>
              <option value="Indonesia">Indonesia</option>
              <option value="Thailand">Thailand</option>
              <option value="Philippines">Philippines</option>
              <option value="Vietnam">Vietnam</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State / Location *</label>
            <input 
              className="elstar-input" 
              value={data.state || ''} 
              onChange={(e) => onChange('state', e.target.value)} 
              placeholder="e.g. Selangor" 
              data-testid="lead-state-input" 
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input 
              className="elstar-input" 
              value={data.city || ''} 
              onChange={(e) => onChange('city', e.target.value)} 
              placeholder="e.g. Kuala Lumpur" 
              data-testid="lead-city-input" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Postcode</label>
            <input 
              className="elstar-input" 
              value={data.postcode || ''} 
              onChange={(e) => onChange('postcode', e.target.value)} 
              placeholder="e.g. 47500" 
              data-testid="lead-postcode-input" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company Size</label>
            <select 
              className="elstar-select" 
              value={data.company_size || ''} 
              onChange={(e) => onChange('company_size', e.target.value)} 
              data-testid="lead-company-size-select"
            >
              <option value="">Select size</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Full Address</label>
          <input 
            className="elstar-input" 
            value={data.address || ''} 
            onChange={(e) => onChange('address', e.target.value)} 
            placeholder="No. 123, Jalan SS15/4" 
            data-testid="lead-address-input" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <input 
            className="elstar-input" 
            value={data.website || ''} 
            onChange={(e) => onChange('website', e.target.value)} 
            placeholder="https://..." 
            data-testid="lead-website-input" 
          />
        </div>
      </div>
    </div>

    {/* PERSON IN CHARGE (PIC) Section */}
    <div>
      <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">PERSON IN CHARGE (PIC)</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">PIC Name *</label>
          <input 
            className="elstar-input" 
            value={data.pic_name || ''} 
            onChange={(e) => onChange('pic_name', e.target.value)} 
            placeholder="e.g. Dr. Ahmad Fauzi" 
            data-testid="lead-pic-name-input" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Job Title</label>
          <input 
            className="elstar-input" 
            value={data.title || ''} 
            onChange={(e) => onChange('title', e.target.value)} 
            placeholder="e.g. General Practitioner" 
            data-testid="lead-title-input" 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">IC Number</label>
            <input
              className="elstar-input"
              value={data.ic_number || ''}
              onChange={(e) => onChange('ic_number', e.target.value)}
              placeholder="e.g. 850101-08-1234"
              data-testid="lead-ic-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Passport Number</label>
            <input
              className="elstar-input"
              value={data.passport_number || ''}
              onChange={(e) => onChange('passport_number', e.target.value)}
              placeholder="e.g. A12345678"
              data-testid="lead-passport-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date of Birth</label>
            <input
              type="date"
              className="elstar-input"
              value={data.date_of_birth || ''}
              onChange={(e) => onChange('date_of_birth', e.target.value)}
              data-testid="lead-dob-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender</label>
            <select
              className="elstar-select"
              value={data.gender || ''}
              onChange={(e) => onChange('gender', e.target.value)}
              data-testid="lead-gender-select"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Race</label>
            <select
              className="elstar-select"
              value={data.race || ''}
              onChange={(e) => onChange('race', e.target.value)}
              data-testid="lead-race-select"
            >
              <option value="">Select</option>
              <option value="Malay">Malay</option>
              <option value="Chinese">Chinese</option>
              <option value="Indian">Indian</option>
              <option value="Bumiputera">Bumiputera</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    {/* CONTACT DETAILS Section */}
    <div>
      <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">CONTACT DETAILS</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mobile Number *</label>
            <input 
              className="elstar-input" 
              value={data.phone || ''} 
              onChange={(e) => onChange('phone', e.target.value)} 
              placeholder="012-XXXXXXX" 
              data-testid="lead-phone-input" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Office Number</label>
            <input 
              className="elstar-input" 
              value={data.office_number || ''} 
              onChange={(e) => onChange('office_number', e.target.value)} 
              placeholder="03-XXXXXXXX" 
              data-testid="lead-office-input" 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Fax Number</label>
            <input 
              className="elstar-input" 
              value={data.fax_number || ''} 
              onChange={(e) => onChange('fax_number', e.target.value)} 
              placeholder="03-XXXXXXXX" 
              data-testid="lead-fax-input" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input 
              className="elstar-input" 
              type="email" 
              value={data.email || ''} 
              onChange={(e) => onChange('email', e.target.value)} 
              placeholder="clinic@email.com" 
              data-testid="lead-email-input" 
            />
          </div>
        </div>
      </div>
    </div>

    {/* Pipeline Status & Source */}
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Pipeline Status</label>
        <select 
          className="elstar-select" 
          value={data.pipeline_status || 'new'} 
          onChange={(e) => onChange('pipeline_status', e.target.value)} 
          data-testid="lead-pipeline-status-select"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="no_answer">No Answer</option>
          <option value="interested">Interested</option>
          <option value="follow_up">Follow Up</option>
          <option value="booked">Booked</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Source</label>
        <select 
          className="elstar-select" 
          value={data.source || ''} 
          onChange={(e) => onChange('source', e.target.value)} 
          data-testid="lead-source-select"
        >
          <option value="">Select source</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="linkedin">LinkedIn</option>
          <option value="cold_outreach">Cold Outreach</option>
          <option value="event">Event</option>
          <option value="import">Excel Import</option>
        </select>
      </div>
    </div>

    {isEdit && (
      <div>
        <label className="block text-sm font-medium mb-2">Status</label>
        <select 
          className="elstar-select" 
          value={data.status || 'new'} 
          onChange={(e) => onChange('status', e.target.value)} 
          data-testid="edit-lead-status-select"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    )}
  </div>
));

LeadFormFields.displayName = 'LeadFormFields';

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function Leads() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [states, setStates] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [convertData, setConvertData] = useState({ services: [{ name: '', amount: '', status: 'active' }], notes: '' });
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  
  // Selection state for AI calling
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // AI Calling states
  const [aiCallModal, setAiCallModal] = useState(false);
  const [aiCallDealId, setAiCallDealId] = useState('');
  const [aiCallLoading, setAiCallLoading] = useState(false);
  const [aiAgents, setAiAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState(null);
  
  // Default agents if none configured
  const DEFAULT_AGENTS = [
    { id: 'sarah', name: 'Sarah', agent_id: 'default', description: 'Professional sales assistant' },
    { id: 'michael', name: 'Michael', agent_id: 'default', description: 'Technical product expert' },
    { id: 'emma', name: 'Emma', agent_id: 'default', description: 'Customer support specialist' }
  ];
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, stateFilter, currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchStates();
    fetchAiAgents();
    fetchDeals();
  }, []);

  const fetchAiAgents = async () => {
    try {
      const response = await fetch(`${API}/api/ai-agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const agents = data.agents || [];
        const agentsToUse = agents.length > 0 ? agents : DEFAULT_AGENTS;
        setAiAgents(agentsToUse);
        setSelectedAgent(agentsToUse[0]);
      } else {
        setAiAgents(DEFAULT_AGENTS);
        setSelectedAgent(DEFAULT_AGENTS[0]);
      }
    } catch (error) {
      setAiAgents(DEFAULT_AGENTS);
      setSelectedAgent(DEFAULT_AGENTS[0]);
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await fetch(`${API}/api/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDeals(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch deals');
    }
  };

  const openAiCallModal = (lead = null) => {
    setSelectedLeadForCall(lead);
    setAiCallDealId('');
    setAiCallModal(true);
  };

  const handleStartAiCall = async () => {
    if (!aiCallDealId) {
      toast.error('Please select a deal');
      return;
    }
    
    if (!selectedAgent) {
      toast.error('Please select an AI agent');
      return;
    }
    
    setAiCallLoading(true);
    try {
      // If single lead call
      if (selectedLeadForCall) {
        const response = await fetch(`${API}/api/ai-calls/initiate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            lead_id: selectedLeadForCall.id,
            deal_id: aiCallDealId,
            agent_name: selectedAgent.name,
            phone: selectedLeadForCall.phone
          })
        });
        
        if (response.ok) {
          toast.success(`AI Call initiated to ${selectedLeadForCall.name || selectedLeadForCall.company}`);
        } else {
          const error = await response.json();
          toast.error(error.detail || 'Failed to initiate AI call');
        }
      } else {
        // Batch call for selected leads
        const selectedLeadIds = Array.from(selectedLeads);
        let successCount = 0;
        let failCount = 0;
        
        for (const leadId of selectedLeadIds) {
          const lead = leads.find(l => l.id === leadId);
          if (lead && lead.phone) {
            try {
              const response = await fetch(`${API}/api/ai-calls/initiate`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                  lead_id: leadId,
                  deal_id: aiCallDealId,
                  agent_name: selectedAgent.name,
                  phone: lead.phone
                })
              });
              
              if (response.ok) {
                successCount++;
              } else {
                failCount++;
              }
            } catch {
              failCount++;
            }
          } else {
            failCount++;
          }
        }
        
        toast.success(`Batch AI Call: ${successCount} initiated, ${failCount} failed`);
        setSelectedLeads(new Set());
        setSelectAll(false);
      }
      
      setAiCallModal(false);
      setSelectedLeadForCall(null);
      setAiCallDealId('');
    } catch (error) {
      toast.error('Failed to initiate AI call');
    } finally {
      setAiCallLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await fetch(`${API}/api/lookup/states`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStates(data.states || []);
      }
    } catch (error) {
      console.error('Failed to fetch states:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', pageSize);
      if (statusFilter && statusFilter !== 'all') params.append('pipeline_status', statusFilter);
      if (stateFilter && stateFilter !== 'all') params.append('state', stateFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      const url = `${API}/api/leads?${params.toString()}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setLeads(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.total_pages || 0);
      }
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedLeads(new Set());
    setSelectAll(false);
  };
  
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
    setSelectedLeads(new Set());
    setSelectAll(false);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleStateFilterChange = (state) => {
    setStateFilter(state);
    setCurrentPage(1);
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectLead = (leadId) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
    setSelectAll(newSelected.size === leads.length);
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
    setSelectAll(false);
  };

  // AI Actions
  const handleStartAICalling = () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select leads first');
      return;
    }
    // Open the modal for batch calling
    setSelectedLeadForCall(null);
    setAiCallDealId('');
    setAiCallModal(true);
  };

  const handleStartAIWhatsapp = () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select leads first');
      return;
    }
    const firstSelectedId = Array.from(selectedLeads)[0];
    const selectedLead = leads.find(l => l.id === firstSelectedId);
    if (selectedLead) {
      navigate(`/admin/leads/${selectedLead.id}`);
    }
  };

  // Navigate to WhatsApp with a specific lead
  const openWhatsappWithLead = (lead) => {
    navigate(`/admin/leads/${lead.id}`);
  };

  // Stable callback to prevent re-renders
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Clinic Name is required'); return; }
    setFormLoading(true);
    try {
      const response = await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success('Lead created successfully');
        setIsCreateOpen(false);
        setFormData(initialFormData);
        fetchLeads();
        fetchStates();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to create lead');
      }
    } catch (error) {
      toast.error('Failed to create lead');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    setFormLoading(true);
    try {
      const response = await fetch(`${API}/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success('Lead updated');
        setIsEditOpen(false);
        setSelectedLead(null);
        setFormData(initialFormData);
        fetchLeads();
        fetchStates();
      }
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (leadId) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await fetch(`${API}/api/leads/${leadId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleRefreshScore = async (leadId) => {
    try {
      await fetch(`${API}/api/leads/${leadId}/refresh-score`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      toast.success('AI score refreshed');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to refresh score');
    }
  };

  const openEditDialog = (lead) => {
    setSelectedLead(lead);
    setFormData({ ...initialFormData, ...lead });
    setIsEditOpen(true);
  };

  const openConvertDialog = (lead) => {
    setSelectedLead(lead);
    setConvertData({ services: [{ name: '', amount: '', status: 'active' }], notes: '' });
    setIsConvertOpen(true);
  };

  const openCreateDialog = () => {
    setFormData(initialFormData);
    setIsCreateOpen(true);
  };

  const handleConvertAddService = () => {
    setConvertData(prev => ({
      ...prev,
      services: [...prev.services, { name: '', amount: '', status: 'active' }]
    }));
  };

  const handleConvertRemoveService = (index) => {
    setConvertData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const handleConvertServiceChange = (index, field, value) => {
    setConvertData(prev => ({
      ...prev,
      services: prev.services.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    
    const validServices = convertData.services.filter(s => s.name && s.amount);
    if (validServices.length === 0) {
      toast.error('Please add at least one service with name and amount');
      return;
    }
    
    setFormLoading(true);
    try {
      const response = await fetch(`${API}/api/leads/${selectedLead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          services: validServices.map(s => ({
            name: s.name,
            amount: parseFloat(s.amount),
            status: s.status
          })),
          notes: convertData.notes
        })
      });
      
      if (response.ok) {
        toast.success('Lead converted to client successfully');
        setIsConvertOpen(false);
        setSelectedLead(null);
        fetchLeads();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to convert lead');
      }
    } catch (error) {
      toast.error('Failed to convert lead');
    } finally {
      setFormLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }
    
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch(`${API}/api/leads/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully imported ${data.imported_count} leads`);
        setIsImportOpen(false);
        setImportFile(null);
        fetchLeads();
        fetchStates();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to import leads');
      }
    } catch (error) {
      toast.error('Failed to import leads');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden" data-testid="leads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage and track your sales leads</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportOpen(true)}
            className="elstar-btn-ghost flex items-center gap-2"
            data-testid="import-lead-btn"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import Excel</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => {
              const url = `${API}/api/leads/export/csv`;
              fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.blob() : Promise.reject(r))
                .then(blob => {
                  const a = document.createElement('a');
                  const u = URL.createObjectURL(blob);
                  a.href = u;
                  a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`;
                  document.body.appendChild(a); a.click(); a.remove();
                  setTimeout(() => URL.revokeObjectURL(u), 1000);
                  toast.success('CSV exported');
                })
                .catch(() => toast.error('Failed to export CSV'));
            }}
            className="elstar-btn-ghost flex items-center gap-2"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button 
            onClick={openCreateDialog} 
            className="elstar-btn-primary flex items-center gap-2" 
            data-testid="add-lead-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Selection Actions Bar */}
      {selectedLeads.size > 0 && (
        <div className="elstar-card p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm font-medium">
              <span className="text-primary font-bold">{selectedLeads.size}</span> leads selected ready for AI calling
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={clearSelection}
                className="elstar-btn-ghost text-sm"
                data-testid="clear-selection-btn"
              >
                Clear Selection
              </button>
              <button 
                onClick={handleStartAICalling}
                className="elstar-btn-primary flex items-center gap-2 text-sm"
                data-testid="start-ai-calling-btn"
              >
                <PhoneCall className="w-4 h-4" />
                Start AI Calling
              </button>
              <button 
                onClick={handleStartAIWhatsapp}
                className="elstar-btn-secondary flex items-center gap-2 text-sm"
                data-testid="start-ai-whatsapp-btn"
              >
                <MessageCircle className="w-4 h-4" />
                Start AI WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="elstar-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="elstar-input pl-10"
              data-testid="search-leads-input"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => handleStatusFilterChange(e.target.value)} 
            className="elstar-select w-full sm:w-40" 
            data-testid="status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="sales_closed">Sales Closed</option>
            <option value="lost">Lost</option>
          </select>
          <select 
            value={stateFilter} 
            onChange={(e) => handleStateFilterChange(e.target.value)} 
            className="elstar-select w-full sm:w-44" 
            data-testid="state-filter"
          >
            <option value="all">All States / Areas</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="elstar-card overflow-hidden max-w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <UsersIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No leads found</p>
            <p className="text-sm text-muted-foreground mb-4">Get started by adding your first lead or importing from Excel</p>
            <div className="flex gap-2">
              <button onClick={() => setIsImportOpen(true)} className="elstar-btn-ghost">
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </button>
              <button onClick={openCreateDialog} className="elstar-btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="elstar-table w-full min-w-[1700px]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '36px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '44px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="px-1">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-input"
                        data-testid="select-all-checkbox"
                      />
                    </th>
                    <th className="px-2 text-left whitespace-nowrap">NO</th>
                    <th className="px-2 text-left whitespace-nowrap">Customer Name</th>
                    <th className="px-2 text-left whitespace-nowrap">IC Number</th>
                    <th className="px-2 text-left whitespace-nowrap">Date of Birth</th>
                    <th className="px-2 text-left whitespace-nowrap">Gender</th>
                    <th className="px-2 text-left whitespace-nowrap">Race</th>
                    <th className="px-2 text-left whitespace-nowrap">Mobile</th>
                    <th className="px-2 text-left whitespace-nowrap">Phone</th>
                    <th className="px-2 text-left whitespace-nowrap">Email Address</th>
                    <th className="px-2 text-left whitespace-nowrap">City</th>
                    <th className="px-2 text-left whitespace-nowrap">Postcode</th>
                    <th className="px-2 text-left whitespace-nowrap">State</th>
                    <th className="px-2 text-left whitespace-nowrap">Country</th>
                    <th className="px-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, idx) => (
                    <tr 
                      key={lead.id} 
                      data-testid={`lead-row-${lead.id}`} 
                      className={`cursor-pointer hover:bg-primary/5 ${selectedLeads.has(lead.id) ? 'bg-primary/5' : ''}`}
                      onClick={(e) => {
                        if (e.target.type === 'checkbox' || e.target.closest('[data-dropdown]')) return;
                        navigate(`/admin/leads/${lead.id}`);
                      }}
                    >
                      <td className="px-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="w-4 h-4 rounded border-input"
                          data-testid={`select-lead-${lead.id}`}
                        />
                      </td>
                      <td className="px-2 text-sm text-muted-foreground tabular-nums">
                        {String(((currentPage - 1) * pageSize) + idx + 1).padStart(3, '0')}
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                          <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-sm truncate block">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground font-mono truncate block">{lead.ic_number || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">
                          {lead.date_of_birth ? new Date(lead.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.gender || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.race || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.phone || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.office_number || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.email || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.city || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.postcode || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.state || '-'}</span>
                      </td>
                      <td className="px-2 overflow-hidden">
                        <span className="text-sm text-muted-foreground truncate block">{lead.country || '-'}</span>
                      </td>
                      <td className="px-1" onClick={(e) => e.stopPropagation()}>
                        <ActionDropdown testId={`lead-actions-${lead.id}`}>
                          {(closeDropdown) => (
                            <>
                              <button onClick={() => { navigate(`/admin/leads/${lead.id}`); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2">
                                <Eye className="w-4 h-4" /> View Details
                              </button>
                              <button onClick={() => { openWhatsappWithLead(lead); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2 text-green-600">
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                              </button>
                              <button onClick={() => { openEditDialog(lead); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2">
                                <Edit className="w-4 h-4" /> Edit
                              </button>
                              <button onClick={() => { handleRefreshScore(lead.id); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Refresh Score
                              </button>
                              {!lead.converted_to_client && (
                                <button onClick={() => { openConvertDialog(lead); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2 text-primary">
                                  <UserCheck className="w-4 h-4" /> Convert to Customer
                                </button>
                              )}
                              <button onClick={() => { handleDelete(lead.id); closeDropdown(); }} className="elstar-dropdown-item w-full text-left flex items-center gap-2 text-red-500">
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </>
                          )}
                        </ActionDropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Create Lead Slide-in Panel */}
      <SlideInPanel isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Lead">
        <form onSubmit={handleCreate}>
          <LeadFormFields data={formData} onChange={handleInputChange} />
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button type="submit" disabled={formLoading} className="elstar-btn-primary flex-1" data-testid="save-lead-btn">
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Lead
            </button>
            <button type="button" onClick={() => setIsCreateOpen(false)} className="elstar-btn-ghost">Cancel</button>
          </div>
        </form>
      </SlideInPanel>

      {/* Edit Lead Slide-in Panel */}
      <SlideInPanel isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Lead">
        <form onSubmit={handleEdit}>
          <LeadFormFields data={formData} onChange={handleInputChange} isEdit />
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button type="submit" disabled={formLoading} className="elstar-btn-primary flex-1" data-testid="update-lead-btn">
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Lead
            </button>
            <button type="button" onClick={() => setIsEditOpen(false)} className="elstar-btn-ghost">Cancel</button>
          </div>
        </form>
      </SlideInPanel>

      {/* Import Modal */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Import Leads from Excel">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload an Excel file (.xlsx, .xls) with columns: Name, Email, Phone, Company, Title, Industry, etc.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="import-file"
            />
            <label htmlFor="import-file" className="elstar-btn-ghost cursor-pointer">
              {importFile ? importFile.name : 'Choose File'}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setIsImportOpen(false); setImportFile(null); }} className="elstar-btn-ghost">Cancel</button>
            <button 
              onClick={handleImport} 
              disabled={!importFile || importLoading} 
              className="elstar-btn-primary"
              data-testid="import-submit-btn"
            >
              {importLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import
            </button>
          </div>
        </div>
      </Modal>

      {/* Convert to Customer Modal */}
      <Modal isOpen={isConvertOpen} onClose={() => setIsConvertOpen(false)} title="Convert Lead to Client">
        <form onSubmit={handleConvertSubmit}>
          <div className="space-y-4">
            {selectedLead && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="font-medium">{selectedLead.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLead.company}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Services Purchased</label>
              {convertData.services.map((service, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    className="elstar-input flex-1"
                    value={service.name}
                    onChange={(e) => handleConvertServiceChange(index, 'name', e.target.value)}
                    placeholder="Service name"
                  />
                  <input
                    className="elstar-input w-32"
                    type="number"
                    value={service.amount}
                    onChange={(e) => handleConvertServiceChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                  />
                  <select
                    className="elstar-select w-28"
                    value={service.status}
                    onChange={(e) => handleConvertServiceChange(index, 'status', e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {convertData.services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleConvertRemoveService(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleConvertAddService}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add another service
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                className="elstar-input min-h-[80px]"
                value={convertData.notes}
                onChange={(e) => setConvertData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this conversion..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setIsConvertOpen(false)} className="elstar-btn-ghost">Cancel</button>
            <button type="submit" disabled={formLoading} className="elstar-btn-primary" data-testid="convert-lead-btn">
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <UserCheck className="w-4 h-4 mr-2" />
              Convert to Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Call Modal */}
      <Modal 
        isOpen={aiCallModal} 
        onClose={() => { setAiCallModal(false); setSelectedLeadForCall(null); }} 
        title={selectedLeadForCall ? "Start AI Calling" : `Start AI Calling (${selectedLeads.size} leads)`}
      >
        <div className="elstar-modal-body space-y-4">
          {/* Selected Lead Info (for single lead call) */}
          {selectedLeadForCall && (
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="font-medium">{selectedLeadForCall.name || selectedLeadForCall.company}</p>
              <p className="text-sm text-muted-foreground">{selectedLeadForCall.phone}</p>
            </div>
          )}

          {/* Batch Info (for multiple leads) */}
          {!selectedLeadForCall && selectedLeads.size > 0 && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-medium text-primary">{selectedLeads.size} leads selected</p>
              <p className="text-sm text-muted-foreground">AI will call each lead sequentially</p>
            </div>
          )}

          {/* AI Agent Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">AI Agent</label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {aiAgents.map((agent, index) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgent(agent)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedAgent?.id === agent.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    ['bg-pink-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500'][index % 5]
                  }`}>
                    {agent.name.charAt(0)}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.description || 'AI Voice Agent'}</p>
                  </div>
                  {selectedAgent?.id === agent.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
            {aiAgents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No agents configured. Add agents in Settings → AI Calling Agents
              </p>
            )}
          </div>

          {/* Deal Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Deal to Discuss <span className="text-red-500">*</span></label>
            <select
              value={aiCallDealId}
              onChange={(e) => setAiCallDealId(e.target.value)}
              className="elstar-select w-full"
              data-testid="ai-call-deal-select"
            >
              <option value="">Choose a deal...</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.title} - RM {(deal.value || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="elstar-modal-footer">
          <button 
            onClick={() => { setAiCallModal(false); setSelectedLeadForCall(null); }} 
            className="elstar-btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={handleStartAiCall} 
            disabled={aiCallLoading || !aiCallDealId}
            className="elstar-btn-primary flex items-center gap-2"
            data-testid="initiate-ai-call-btn"
          >
            {aiCallLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
            {selectedLeadForCall ? 'Start Call' : `Start Calling ${selectedLeads.size} Leads`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
