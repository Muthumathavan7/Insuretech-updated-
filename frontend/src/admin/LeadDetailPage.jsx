import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useCurrency } from '../lib/currency';
import { toast } from 'sonner';
import Modal from '../components/elstar/Modal';
import SlideInPanel from '../components/elstar/SlideInPanel';
import { 
  ArrowLeft, Edit, UserCheck, Phone, Mail, MessageCircle, Calendar,
  Building2, MapPin, Globe, Sparkles, Clock, CheckSquare, Send,
  PhoneCall, Video, FileText, Plus, Loader2, X, User, Activity, Check,
  Download, Play, Pause, Volume2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PIPELINE_STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'closed', label: 'Sales Closed' },
  { id: 'lost', label: 'Lost' }
];

const LOG_ACTIVITY_TYPES = [
  { id: 'task', label: 'Task', icon: CheckSquare, color: 'text-blue-500' },
  { id: 'call', label: 'Call', icon: PhoneCall, color: 'text-green-500' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-amber-500' },
  { id: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-purple-500' }
];

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { format: formatMoney } = useCurrency();
  const fmt = (v) => formatMoney(parseFloat(v || 0), { decimals: 0 });
  const chatEndRef = useRef(null);
  
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pipelineStatus, setPipelineStatus] = useState('lead');
  const [remark, setRemark] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [activities, setActivities] = useState([]);
  const [deals, setDeals] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  
  // Activity modal states
  const [activityModal, setActivityModal] = useState({ isOpen: false, type: null });
  const [activityForm, setActivityForm] = useState({ 
    title: '', 
    description: '', 
    notes: '', 
    scheduled_at: '',
    duration: '30'
  });

  // WhatsApp Chat states
  const [showWhatsAppChat, setShowWhatsAppChat] = useState(false);
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // AI Calling states
  const [aiCallModal, setAiCallModal] = useState(false);
  const [aiCallDealId, setAiCallDealId] = useState('');
  const [useDynamicAgent, setUseDynamicAgent] = useState(false);
  const [dealAgentConfig, setDealAgentConfig] = useState({ agents: [], selection_mode: 'manual' });
  const [aiCallLoading, setAiCallLoading] = useState(false);
  const [callDetailsModal, setCallDetailsModal] = useState({ isOpen: false, call: null });
  const [aiCalls, setAiCalls] = useState([]);

  // AI Agents - fetched from settings
  const [aiAgents, setAiAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Audio player state for call recordings
  const [audioState, setAudioState] = useState({
    isLoading: false,
    blobUrl: null,
    isPlaying: false,
    error: null
  });
  const audioRef = useRef(null);

  // Meeting scheduling states
  const [meetingModal, setMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    meeting_type: 'online',
    date: '',
    start_time: '10:00',
    duration_minutes: 30,
    location: '',
    send_invite: true
  });
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [meetings, setMeetings] = useState([]);

  // Default agents if none configured
  const DEFAULT_AGENTS = [
    { id: 'sarah', name: 'Sarah', agent_id: 'default', description: 'Professional sales assistant' },
    { id: 'michael', name: 'Michael', agent_id: 'default', description: 'Technical product expert' },
    { id: 'emma', name: 'Emma', agent_id: 'default', description: 'Customer support specialist' }
  ];

  useEffect(() => {
    fetchLead();
    fetchActivities();
    fetchDeals();
    fetchAllDeals();
    fetchAiCalls();
    fetchAiAgents();
    fetchMeetings();
  }, [id]);

  useEffect(() => {
    if (showWhatsAppChat) {
      fetchWhatsAppMessages();
    }
  }, [showWhatsAppChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [whatsappMessages]);

  const fetchLead = async () => {
    try {
      const response = await fetch(`${API}/api/leads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLead(data);
        // Map 'new' to 'lead' for consistency
        const status = data.pipeline_status || data.status || 'lead';
        setPipelineStatus(status === 'new' ? 'lead' : status);
        // Check if lead is already converted to customer
        setIsCustomer(data.converted_to_customer === true || data.status === 'customer');
      } else {
        toast.error('Lead not found');
        navigate('/admin/leads');
      }
    } catch (error) {
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDeals = async () => {
    try {
      const response = await fetch(`${API}/api/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllDeals(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch all deals');
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API}/api/leads/${id}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities');
    }
  };

  const fetchDeals = async () => {
    try {
      // Fetch lead-deal linkages for this lead
      const linkagesResponse = await fetch(`${API}/api/lead-deal-linkages?lead_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (linkagesResponse.ok) {
        const linkagesData = await linkagesResponse.json();
        // Transform linkages to deal-like objects for display
        const linkedDeals = (linkagesData || []).map(linkage => ({
          id: linkage.deal_id,
          linkage_id: linkage.id,
          title: linkage.deal_title,
          value: linkage.deal_value,
          stage: linkage.pipeline_status, // Use the linkage-specific status
          expected_close_date: linkage.deal_expected_close_date,
          lead_id: linkage.lead_id
        }));
        setDeals(linkedDeals);
      }
    } catch (error) {
      console.error('Failed to fetch deals');
    }
  };

  const fetchWhatsAppMessages = async () => {
    try {
      const response = await fetch(`${API}/api/whatsapp/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWhatsappMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp messages');
    }
  };

  const fetchAiCalls = async () => {
    try {
      const response = await fetch(`${API}/api/ai-calls/lead/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAiCalls(data.calls || []);
      }
    } catch (error) {
      console.error('Failed to fetch AI calls');
    }
  };

  const fetchAiAgents = async () => {
    try {
      const response = await fetch(`${API}/api/ai-agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const agents = data.agents || [];
        // Use configured agents or fall back to defaults
        const agentsToUse = agents.length > 0 ? agents : DEFAULT_AGENTS;
        setAiAgents(agentsToUse);
        setSelectedAgent(agentsToUse[0]);
      } else {
        setAiAgents(DEFAULT_AGENTS);
        setSelectedAgent(DEFAULT_AGENTS[0]);
      }
    } catch (error) {
      console.error('Failed to fetch AI agents');
      setAiAgents(DEFAULT_AGENTS);
      setSelectedAgent(DEFAULT_AGENTS[0]);
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`${API}/api/meetings/lead/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch meetings');
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.date || !meetingForm.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSchedulingMeeting(true);
    try {
      const response = await fetch(`${API}/api/meetings/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: id,
          ...meetingForm
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.invite_sent) {
          toast.success(`Meeting scheduled! Invite sent to ${data.invite_sent_to}`);
        } else {
          toast.success('Meeting scheduled successfully');
        }
        setMeetingModal(false);
        setMeetingForm({
          title: '',
          description: '',
          meeting_type: 'online',
          date: '',
          start_time: '10:00',
          duration_minutes: 30,
          location: '',
          send_invite: true
        });
        fetchMeetings();
        fetchActivities();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to schedule meeting');
      }
    } catch (error) {
      toast.error('Failed to schedule meeting');
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const openScheduleMeetingModal = () => {
    // Pre-fill with default values
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    setMeetingForm({
      title: `Meeting with ${lead?.pic_name || lead?.name || 'Client'}`,
      description: '',
      meeting_type: 'online',
      date: dateStr,
      start_time: '10:00',
      duration_minutes: 30,
      location: '',
      send_invite: true
    });
    setMeetingModal(true);
  };

  // Load audio with authentication when modal opens with a call that has recording
  const loadAudioWithAuth = async (recordingUrl) => {
    if (!recordingUrl) return;
    
    setAudioState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(recordingUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load audio');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setAudioState(prev => ({ ...prev, isLoading: false, blobUrl, error: null }));
    } catch (error) {
      console.error('Failed to load audio:', error);
      setAudioState(prev => ({ ...prev, isLoading: false, error: 'Failed to load recording' }));
    }
  };

  // Reset audio state when modal closes
  useEffect(() => {
    if (!callDetailsModal.isOpen) {
      // Clean up blob URL to prevent memory leaks
      if (audioState.blobUrl) {
        URL.revokeObjectURL(audioState.blobUrl);
      }
      setAudioState({ isLoading: false, blobUrl: null, isPlaying: false, error: null });
    } else if (callDetailsModal.call?.recording_url) {
      // Load audio when modal opens
      loadAudioWithAuth(callDetailsModal.call.recording_url);
    }
  }, [callDetailsModal.isOpen, callDetailsModal.call?.recording_url]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (audioState.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  };

  const handleStartAiCall = async () => {
    if (!aiCallDealId) {
      toast.error('Please select a deal');
      return;
    }
    
    setAiCallLoading(true);
    try {
      const response = await fetch(`${API}/api/ai-calls/initiate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          lead_id: id,
          deal_id: aiCallDealId,
          agent_name: useDynamicAgent ? null : selectedAgent?.name,
          agent_id: useDynamicAgent ? null : selectedAgent?.id,
          phone: lead?.phone,
          use_dynamic_selection: useDynamicAgent
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const agentUsed = data.call?.agent_name || selectedAgent?.name || 'AI Agent';
        toast.success(`AI Call initiated with ${agentUsed}`);
        setAiCallModal(false);
        setAiCallDealId('');
        setUseDynamicAgent(false);
        fetchAiCalls();
        fetchActivities();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to initiate AI call');
      }
    } catch (error) {
      toast.error('Failed to initiate AI call');
    } finally {
      setAiCallLoading(false);
    }
  };

  // Fetch deal agent configuration when deal is selected
  const fetchDealAgentConfig = async (dealId) => {
    if (!dealId) {
      setDealAgentConfig({ agents: [], selection_mode: 'manual' });
      return;
    }
    try {
      const response = await fetch(`${API}/api/deals/${dealId}/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDealAgentConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch deal agent config');
    }
  };

  // Effect to fetch deal agents when deal selection changes
  useEffect(() => {
    if (aiCallDealId) {
      fetchDealAgentConfig(aiCallDealId);
    }
  }, [aiCallDealId]);

  const handleSendWhatsAppMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      const response = await fetch(`${API}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          contact_id: id,
          message: newMessage,
          phone: lead?.phone
        })
      });
      
      if (response.ok) {
        setNewMessage('');
        toast.success('Message sent');
        fetchWhatsAppMessages();
        fetchActivities();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async () => {
    // Validate deal selection is mandatory
    if (!selectedDealId) {
      toast.error('Please select a deal before saving');
      return;
    }
    
    setSaving(true);
    try {
      // Update lead status
      const response = await fetch(`${API}/api/leads/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          ...lead,
          pipeline_status: pipelineStatus,
          status: pipelineStatus === 'closed' ? 'qualified' : (pipelineStatus === 'lead' ? 'new' : 'contacted')
        })
      });
      
      if (response.ok) {
        // Log activity
        const activityDescription = `Status updated to ${PIPELINE_STAGES.find(s => s.id === pipelineStatus)?.label}`;
        const selectedDeal = allDeals.find(d => d.id === selectedDealId);
        
        await fetch(`${API}/api/leads/${id}/activities`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            type: 'status_update',
            description: selectedDeal ? `${activityDescription} - Deal: ${selectedDeal.title}` : activityDescription,
            notes: remark || ''
          })
        });

        // Create or update the lead-deal linkage with this lead's specific pipeline status
        if (selectedDeal) {
          const newStage = pipelineStatus === 'closed' ? 'sales_closed' : (pipelineStatus === 'lost' ? 'lost' : pipelineStatus);
          
          // Create/update linkage with this lead's pipeline status (ONLY this lead's status)
          await fetch(`${API}/api/lead-deal-linkages`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({
              lead_id: id,
              deal_id: selectedDealId,
              pipeline_status: newStage,
              notes: remark || ''
            })
          });
          
          // Add to deal's linked_company_ids if not already there (but DON'T update deal.stage)
          const existingLinkedIds = selectedDeal.linked_company_ids || [];
          if (!existingLinkedIds.includes(id)) {
            await fetch(`${API}/api/deals/${selectedDealId}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ 
                linked_company_ids: [...existingLinkedIds, id]
                // Note: NOT updating deal.stage - each lead has its own status via linkages
              })
            });
          }
          
          // Auto-create task for this lead-deal linkage
          await fetch(`${API}/api/tasks`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({
              title: lead.company || lead.name,
              description: remark || `Follow up for ${selectedDeal.title}`,
              lead_id: id,
              deal_id: selectedDealId,
              status: 'pending',
              priority: 'medium',
              payment_status: 'unpaid',
              pipeline_status: newStage
            })
          });
          toast.success('Task created for this deal');
        }
        
        toast.success('Pipeline status updated');
        setRemark('');
        setSelectedDealId('');
        fetchLead();
        fetchActivities();
        fetchDeals();
        fetchAllDeals();
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleLogActivity = (type) => {
    if (type === 'whatsapp') {
      setShowWhatsAppChat(true);
      return;
    }
    
    if (type === 'meeting') {
      openScheduleMeetingModal();
      return;
    }
    
    setActivityForm({ 
      title: '', 
      description: '', 
      notes: '', 
      scheduled_at: new Date().toISOString().slice(0, 16),
      duration: '30'
    });
    setActivityModal({ isOpen: true, type });
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const activityType = activityModal.type;
    const activityLabel = LOG_ACTIVITY_TYPES.find(t => t.id === activityType)?.label;
    
    try {
      const response = await fetch(`${API}/api/leads/${id}/activities`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: activityType,
          description: activityForm.title || `${activityLabel} logged`,
          notes: activityForm.notes,
          scheduled_at: activityForm.scheduled_at
        })
      });
      
      if (response.ok) {
        toast.success(`${activityLabel} logged successfully`);
        setActivityModal({ isOpen: false, type: null });
        fetchActivities();
      } else {
        toast.error('Failed to log activity');
      }
    } catch (error) {
      toast.error('Failed to log activity');
    } finally {
      setSaving(false);
    }
  };

  // Edit modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  const handleConvertToCustomer = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/leads/${id}/convert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ services: [], notes: `Converted from lead: ${lead.name}` })
      });
      
      if (response.ok) {
        toast.success('Lead converted to customer');
        fetchLead();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to convert lead');
      }
    } catch (error) {
      toast.error('Failed to convert lead');
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = () => {
    setEditForm({ ...lead });
    setIsEditOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/leads/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        toast.success('Lead updated successfully');
        setIsEditOpen(false);
        fetchLead();
      } else {
        toast.error('Failed to update lead');
      }
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'status_update': return { icon: '●', color: 'text-amber-500' };
      case 'email': return { icon: '■', color: 'text-blue-500' };
      case 'call': return { icon: '●', color: 'text-blue-400' };
      case 'ai_call': return { icon: '●', color: 'text-blue-400' };
      case 'whatsapp': return { icon: '●', color: 'text-green-500' };
      case 'task': return { icon: '●', color: 'text-purple-500' };
      case 'meeting': return { icon: '●', color: 'text-orange-500' };
      case 'import': return { icon: '◐', color: 'text-gray-400' };
      default: return { icon: '●', color: 'text-gray-400' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  // Group activities by date
  const groupActivitiesByDate = (activities) => {
    const groups = {};
    const today = new Date().toDateString();
    
    activities.forEach(activity => {
      const actDate = new Date(activity.created_at);
      const dateKey = actDate.toDateString();
      const displayDate = dateKey === today ? 'TODAY' : formatDate(activity.created_at).toUpperCase();
      
      if (!groups[displayDate]) {
        groups[displayDate] = [];
      }
      groups[displayDate].push(activity);
    });
    
    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);
  const aiCallsCount = activities.filter(a => a.type === 'ai_call' || a.type === 'call').length;

  return (
    <div className="space-y-0" data-testid="lead-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/admin/leads')}
            className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">{lead.pic_name || lead.name}</h1>
            {lead.pic_name && lead.name && lead.pic_name !== lead.name && (
              <p className="text-xs text-muted-foreground truncate">{lead.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button 
            onClick={openEditForm}
            className="elstar-btn-ghost flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4"
            data-testid="edit-lead-btn"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden xs:inline">Edit</span>
          </button>
          <button 
            onClick={() => setAiCallModal(true)}
            className="elstar-btn-ghost flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4 text-blue-500 border-blue-500 hover:bg-blue-500/10"
            data-testid="start-ai-call-btn"
          >
            <PhoneCall className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Start AI Calling</span>
          </button>
          <button 
            onClick={openScheduleMeetingModal}
            className="elstar-btn-ghost flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4 text-purple-500 border-purple-500 hover:bg-purple-500/10"
            data-testid="schedule-meeting-btn"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Schedule Meeting</span>
          </button>
          {isCustomer ? (
            <span className="px-2 sm:px-4 py-2 rounded-lg bg-green-500/20 text-green-500 font-medium flex items-center gap-1 sm:gap-2 text-sm">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Customer</span>
            </span>
          ) : (
            <button 
              onClick={handleConvertToCustomer}
              disabled={saving}
              className="elstar-btn-primary flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4"
              data-testid="convert-customer-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span className="hidden sm:inline">Convert to Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Contact Info (matching Image 4 layout) */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Contact Information Card */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">PIC Name</p>
                  <p className="text-sm font-medium break-words">{lead.pic_name || lead.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Customer Name</p>
                  <p className="text-sm font-medium break-words">{lead.name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">IC Number</p>
                  <p className="text-sm font-medium font-mono break-words">{lead.ic_number || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Passport Number</p>
                  <p className="text-sm font-medium font-mono break-words">{lead.passport_number || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium break-words">{lead.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium break-words">{lead.phone || '-'}</p>
                </div>
              </div>
              {lead.office_number && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Office Number</p>
                    <p className="text-sm font-medium break-words">{lead.office_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full Address Card */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">Address</h3>
            <div className="space-y-3">
              {lead.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm break-words">{lead.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {lead.postcode && (
                  <div>
                    <p className="text-xs text-muted-foreground">Postcode</p>
                    <p className="font-medium">{lead.postcode}</p>
                  </div>
                )}
                {lead.city && (
                  <div>
                    <p className="text-xs text-muted-foreground">City</p>
                    <p className="font-medium">{lead.city}</p>
                  </div>
                )}
                {lead.state && (
                  <div>
                    <p className="text-xs text-muted-foreground">State</p>
                    <p className="font-medium">{lead.state}</p>
                  </div>
                )}
                {lead.country && (
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="font-medium">{lead.country}</p>
                  </div>
                )}
              </div>
              {!lead.address && !lead.city && !lead.state && !lead.country && (
                <p className="text-sm text-muted-foreground">No address information</p>
              )}
            </div>
          </div>

          {/* Additional Info Card */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">Additional Details</h3>
            <div className="space-y-3 text-sm">
              {lead.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{lead.source}</p>
                </div>
              )}
              {lead.industry && (
                <div>
                  <p className="text-xs text-muted-foreground">Industry</p>
                  <p className="font-medium">{lead.industry}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">AI Score</p>
                <p className="font-medium text-amber-600">{lead.ai_score || 0}/100</p>
              </div>
              {lead.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm break-words">{lead.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Ownership Card */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">Ownership</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                {(lead.owner_name || user?.full_name || 'U')?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{lead.owner_name || user?.full_name || 'Unassigned'}</p>
                <p className="text-xs text-muted-foreground">Owner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Activity & Pipeline Update */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          {/* Log Activity Section */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <p className="text-sm text-muted-foreground mb-3">Log Activity</p>
            <div className="flex gap-2 flex-wrap">
              {LOG_ACTIVITY_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleLogActivity(type.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm"
                  data-testid={`log-${type.id}-btn`}
                >
                  <type.icon className={`w-4 h-4 ${type.color}`} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Update Pipeline Status Section */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border space-y-4">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Update Pipeline Status</h3>
            
            <div className="flex gap-2 flex-wrap">
              {PIPELINE_STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => setPipelineStatus(stage.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pipelineStatus === stage.id
                      ? stage.id === 'lost' ? 'bg-gray-600 text-white' : 'bg-amber-500 text-black'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  }`}
                  data-testid={`stage-${stage.id}`}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            {/* Deal Selection - Mandatory */}
            <div>
              <label className="block text-sm font-medium mb-2">Associate with Deal <span className="text-red-500">*</span></label>
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className={`elstar-select w-full ${!selectedDealId ? 'border-red-300' : ''}`}
                data-testid="deal-select"
                required
              >
                <option value="">Select a deal (required)</option>
                {allDeals.map(deal => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title} - {fmt(deal.value)}
                  </option>
                ))}
              </select>
              {!selectedDealId && <p className="text-xs text-red-500 mt-1">Please select a deal to continue</p>}
            </div>

            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add comment..."
              className="elstar-input min-h-[80px] w-full"
              data-testid="remark-input"
            />

            <div className="flex justify-end">
              <button
                onClick={handleUpdateStatus}
                disabled={saving}
                className="elstar-btn-primary"
                data-testid="save-update-btn"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Update
              </button>
            </div>
          </div>

          {/* WhatsApp Chat Interface (Embedded) */}
          {showWhatsAppChat && (
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    {(lead.pic_name || lead.name)?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{lead.pic_name || lead.name}</p>
                    <p className="text-xs text-white/70">{lead.phone || 'No phone'}</p>
                  </div>
                </div>
                <button onClick={() => setShowWhatsAppChat(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-100 dark:bg-secondary/30">
                {whatsappMessages.length > 0 ? (
                  whatsappMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-lg text-sm ${
                        msg.sender === 'me' 
                          ? 'bg-green-500 text-white rounded-br-none' 
                          : 'bg-white dark:bg-card rounded-bl-none'
                      }`}>
                        <p>{msg.text || msg.content || msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {formatTime(msg.timestamp || msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Message Input */}
              <form onSubmit={handleSendWhatsAppMessage} className="flex gap-2 p-3 border-t border-border">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 elstar-input"
                  data-testid="whatsapp-message-input"
                />
                <button 
                  type="submit" 
                  disabled={sendingMessage || !newMessage.trim()}
                  className="elstar-btn-primary px-4"
                  data-testid="send-whatsapp-btn"
                >
                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">Activity Timeline</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {Object.keys(groupedActivities).length > 0 ? (
                Object.entries(groupedActivities).map(([date, dateActivities]) => (
                  <div key={date}>
                    <p className="text-xs text-muted-foreground mb-3">{date}</p>
                    <div className="space-y-3">
                      {dateActivities.map((activity, idx) => {
                        const { icon, color } = getActivityIcon(activity.type);
                        const isAiCall = activity.type === 'ai_call' || activity.action === 'ai_call';
                        return (
                          <div 
                            key={activity.id || idx} 
                            className={`flex gap-3 ${isAiCall ? 'cursor-pointer hover:bg-secondary/50 p-2 -m-2 rounded-lg transition-colors' : ''}`}
                            onClick={async () => {
                              if (isAiCall && activity.call_id) {
                                // Fetch full call details from API
                                try {
                                  const response = await fetch(`${API}/api/ai-calls/${activity.call_id}/details`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    const call = {
                                      ...data.call,
                                      transcript: data.call?.transcript || data.elevenlabs_details?.transcript,
                                      recording_url: data.audio_url ? `${API}${data.audio_url}` : null,
                                      has_audio: data.has_audio,
                                      has_transcript: data.has_transcript,
                                      duration: data.call?.duration || data.elevenlabs_details?.duration_seconds
                                    };
                                    setCallDetailsModal({ isOpen: true, call });
                                  } else {
                                    // Fallback to local data
                                    const call = aiCalls.find(c => c.id === activity.call_id) || {
                                      id: activity.call_id,
                                      agent_name: activity.metadata?.agent_name || 'AI Agent',
                                      created_at: activity.created_at,
                                      direction: 'outbound',
                                      source: 'AI Call',
                                      summary: activity.description,
                                      deal_title: activity.metadata?.deal_title
                                    };
                                    setCallDetailsModal({ isOpen: true, call });
                                  }
                                } catch (error) {
                                  console.error('Error fetching call details:', error);
                                  // Fallback to local data
                                  const call = aiCalls.find(c => c.id === activity.call_id) || {
                                    id: activity.call_id,
                                    agent_name: activity.metadata?.agent_name || 'AI Agent',
                                    created_at: activity.created_at,
                                    direction: 'outbound',
                                    source: 'AI Call',
                                    summary: activity.description,
                                    deal_title: activity.metadata?.deal_title
                                  };
                                  setCallDetailsModal({ isOpen: true, call });
                                }
                              }
                            }}
                          >
                            <span className={`text-lg ${color}`}>{icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{activity.description}</p>
                                {isAiCall && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">
                                    AI Call
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {activity.user_name || 'System'} · {formatTime(activity.created_at)}
                              </p>
                              {activity.notes && (
                                <div className={`mt-2 p-2 rounded-lg text-xs ${
                                  activity.type === 'whatsapp' 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-100' 
                                    : isAiCall
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100'
                                    : 'bg-gray-100 dark:bg-secondary'
                                }`}>
                                  {activity.notes}
                                </div>
                              )}
                              {isAiCall && (
                                <p className="text-xs text-primary mt-1">Click to view call details →</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Activity Summary & Deals */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Activity Summary Section - Replacing Company */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Activity Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{activities.length}</p>
                <p className="text-xs text-muted-foreground">Total Activities</p>
              </div>
              <div className="bg-gray-50 dark:bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{aiCallsCount}</p>
                <p className="text-xs text-muted-foreground">AI Calls</p>
              </div>
              <div className="bg-gray-50 dark:bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{whatsappMessages.length}</p>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
              </div>
              <div className="bg-gray-50 dark:bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{lead.ai_score || 0}</p>
                <p className="text-xs text-muted-foreground">AI Score</p>
              </div>
            </div>
          </div>

          {/* Deals Section - Shows deals auto-created from status updates - NO ADD BUTTON */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Deals ({deals.length})</h3>
              {deals.length > 0 && (
                <p className="text-sm font-bold text-green-600">
                  Total: {fmt(deals.reduce((sum, d) => sum + (d.value || 0), 0))}
                </p>
              )}
            </div>
            {deals.length > 0 ? (
              <div className="space-y-3">
                {deals.map(deal => (
                  <div key={deal.id} className="p-3 bg-gray-50 dark:bg-secondary rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{deal.title}</p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {fmt(deal.value)}
                        </p>
                      </div>
                      <span className="shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-600">
                        {PIPELINE_STAGES.find(s => s.id === deal.stage || s.id === deal.stage?.replace('sales_', ''))?.label || deal.stage}
                      </span>
                    </div>
                    {deal.expected_close_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Expected Close: {formatDate(deal.expected_close_date)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No deals yet. Update status to create a deal automatically.
              </p>
            )}
          </div>

          {/* AI Score Section */}
          <div className="bg-white dark:bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-4">AI Score</h3>
            <div className="text-center">
              <p className="text-4xl font-bold text-amber-500">{lead.ai_score || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">Lead Health Score</p>
              <div className="mt-3 h-2 bg-gray-100 dark:bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${lead.ai_score || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Modal - Fixed with proper styling */}
      <Modal 
        isOpen={activityModal.isOpen} 
        onClose={() => setActivityModal({ isOpen: false, type: null })} 
        title={`Log ${LOG_ACTIVITY_TYPES.find(t => t.id === activityModal.type)?.label || 'Activity'}`}
      >
        <div className="elstar-modal-body">
          <form onSubmit={handleSubmitActivity} className="space-y-4">
            {activityModal.type === 'task' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Task Title *</label>
                  <input
                    className="elstar-input w-full"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Follow up call"
                    required
                    data-testid="activity-title-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Due Date</label>
                  <input
                    type="datetime-local"
                    className="elstar-input w-full"
                    value={activityForm.scheduled_at}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    data-testid="activity-date-input"
                  />
                </div>
              </>
            )}
            
            {activityModal.type === 'call' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Call Summary *</label>
                  <input
                    className="elstar-input w-full"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Discussed pricing"
                    required
                    data-testid="activity-title-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Call Duration</label>
                  <select
                    className="elstar-select w-full"
                    value={activityForm.duration}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, duration: e.target.value }))}
                    data-testid="activity-duration-select"
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
              </>
            )}
            
            {activityModal.type === 'email' && (
              <div>
                <label className="block text-sm font-medium mb-2">Email Subject *</label>
                <input
                  className="elstar-input w-full"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Proposal sent"
                  required
                  data-testid="activity-title-input"
                />
              </div>
            )}
            
            {activityModal.type === 'meeting' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Meeting Title *</label>
                  <input
                    className="elstar-input w-full"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Product demo"
                    required
                    data-testid="activity-title-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meeting Date & Time</label>
                  <input
                    type="datetime-local"
                    className="elstar-input w-full"
                    value={activityForm.scheduled_at}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    data-testid="activity-date-input"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                className="elstar-input min-h-[100px] w-full"
                value={activityForm.notes}
                onChange={(e) => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this activity..."
                data-testid="activity-notes-input"
              />
            </div>
          </form>
        </div>
        <div className="elstar-modal-footer">
          <button 
            type="button" 
            onClick={() => setActivityModal({ isOpen: false, type: null })} 
            className="elstar-btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmitActivity}
            disabled={saving}
            className="elstar-btn-primary"
            data-testid="submit-activity-btn"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Log {LOG_ACTIVITY_TYPES.find(t => t.id === activityModal.type)?.label}
          </button>
        </div>
      </Modal>

      {/* Edit Lead Slide-in Panel */}
      <SlideInPanel isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Lead">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Customer Name</label>
            <input
              className="elstar-input w-full"
              value={editForm.name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value, company: e.target.value }))}
              placeholder="Customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">PIC Name</label>
            <input
              className="elstar-input w-full"
              value={editForm.pic_name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, pic_name: e.target.value }))}
              placeholder="Person in charge"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Job Title</label>
            <input
              className="elstar-input w-full"
              value={editForm.title || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Job title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">IC Number</label>
              <input
                className="elstar-input w-full"
                value={editForm.ic_number || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, ic_number: e.target.value }))}
                placeholder="850101-08-1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Passport Number</label>
              <input
                className="elstar-input w-full"
                value={editForm.passport_number || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, passport_number: e.target.value }))}
                placeholder="A12345678"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Mobile</label>
              <input
                className="elstar-input w-full"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Office</label>
              <input
                className="elstar-input w-full"
                value={editForm.office_number || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, office_number: e.target.value }))}
                placeholder="Office number"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="elstar-input w-full"
              value={editForm.email || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              className="elstar-input w-full"
              value={editForm.website || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
              placeholder="Website URL"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                className="elstar-input w-full"
                value={editForm.city || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <input
                className="elstar-input w-full"
                value={editForm.state || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                placeholder="State"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Country</label>
            <select
              className="elstar-select w-full"
              value={editForm.country || 'Malaysia'}
              onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
            >
              <option value="Malaysia">Malaysia</option>
              <option value="Singapore">Singapore</option>
              <option value="Indonesia">Indonesia</option>
              <option value="Thailand">Thailand</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button type="submit" disabled={saving} className="elstar-btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </button>
            <button type="button" onClick={() => setIsEditOpen(false)} className="elstar-btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* AI Call Modal */}
      <Modal
        isOpen={aiCallModal}
        onClose={() => setAiCallModal(false)}
        title="Start AI Calling"
        size="lg"
      >
        <div className="elstar-modal-body space-y-4">
          {/* Deal Selection - First so we can show deal's agent config */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Deal to Discuss <span className="text-red-500">*</span></label>
            <select
              value={aiCallDealId}
              onChange={(e) => setAiCallDealId(e.target.value)}
              className="elstar-select w-full"
              data-testid="ai-call-deal-select"
            >
              <option value="">Choose a deal...</option>
              {allDeals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.title} - {fmt(deal.value)}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Agent Selection Toggle - Show only if deal has agents configured */}
          {aiCallDealId && dealAgentConfig.agents.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDynamicAgent}
                  onChange={(e) => setUseDynamicAgent(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-500">Use Deal's Auto-Selection</p>
                  <p className="text-xs text-muted-foreground">
                    {dealAgentConfig.selection_mode === 'round_robin' && 'Rotate through assigned agents in order'}
                    {dealAgentConfig.selection_mode === 'random' && 'Randomly select from assigned agents'}
                    {dealAgentConfig.selection_mode === 'manual' && 'Use the first assigned agent'}
                    {' '}({dealAgentConfig.agents.length} agent{dealAgentConfig.agents.length > 1 ? 's' : ''} configured)
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* AI Agent Selection - Show if not using dynamic selection */}
          {!useDynamicAgent && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Select AI Agent
                {aiCallDealId && dealAgentConfig.agents.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">(or enable auto-selection above)</span>
                )}
              </label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {aiAgents.map((agent, index) => {
                  const isAssignedToDeal = dealAgentConfig.agents.some(a => a.id === agent.id);
                  return (
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
                        <p className="text-xs text-muted-foreground">{agent.description}</p>
                      </div>
                      {isAssignedToDeal && aiCallDealId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                          Assigned
                        </span>
                      )}
                      {selectedAgent?.id === agent.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              {aiAgents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No agents configured. Add agents in Settings → AI Calling Agents
                </p>
              )}
            </div>
          )}

          {/* Lead Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="text"
              value={lead?.phone || ''}
              className="elstar-input w-full bg-secondary/50"
              readOnly
            />
            <p className="text-xs text-muted-foreground mt-1">The AI will call this number</p>
          </div>
        </div>

        <div className="elstar-modal-footer">
          <button onClick={() => setAiCallModal(false)} className="elstar-btn-ghost">
            Cancel
          </button>
          <button 
            onClick={handleStartAiCall} 
            disabled={aiCallLoading || !aiCallDealId || (!useDynamicAgent && !selectedAgent)}
            className="elstar-btn-primary flex items-center gap-2"
            data-testid="initiate-ai-call-btn"
          >
            {aiCallLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
            {useDynamicAgent ? 'Start Call (Auto-Select Agent)' : 'Start Call'}
          </button>
        </div>
      </Modal>

      {/* Call Details Modal */}
      <Modal
        isOpen={callDetailsModal.isOpen}
        onClose={() => setCallDetailsModal({ isOpen: false, call: null })}
        title="Call Details"
        size="lg"
      >
        {callDetailsModal.call && (
          <>
            <div className="elstar-modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Agent Name</p>
                  <p className="font-medium">{callDetailsModal.call.agent_name || 'AI Agent'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{callDetailsModal.call.source || 'AI Call'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(callDetailsModal.call.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium">{formatTime(callDetailsModal.call.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direction</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    callDetailsModal.call.direction === 'outbound' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {callDetailsModal.call.direction === 'outbound' ? 'Outbound' : 'Inbound'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {callDetailsModal.call.duration 
                      ? typeof callDetailsModal.call.duration === 'number' 
                        ? `${Math.floor(callDetailsModal.call.duration / 60)}:${String(callDetailsModal.call.duration % 60).padStart(2, '0')}`
                        : callDetailsModal.call.duration
                      : 'N/A'}
                  </p>
                </div>
                {callDetailsModal.call.call_status && (
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      callDetailsModal.call.call_status === 'done' ? 'bg-green-500/20 text-green-500' : 
                      callDetailsModal.call.call_status === 'failed' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {callDetailsModal.call.call_status}
                    </span>
                  </div>
                )}
                {callDetailsModal.call.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{callDetailsModal.call.phone}</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Summary</p>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm">{callDetailsModal.call.summary || 'No summary available'}</p>
                </div>
              </div>

              {/* Transcript */}
              {callDetailsModal.call.transcript && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Call Transcript</p>
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border max-h-60 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">{callDetailsModal.call.transcript}</pre>
                  </div>
                </div>
              )}

              {/* Recording */}
              {callDetailsModal.call.recording_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Call Recording</p>
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                    {audioState.isLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading recording...</span>
                      </div>
                    ) : audioState.error ? (
                      <div className="flex items-center justify-center py-4 text-red-500 text-sm">
                        {audioState.error}
                      </div>
                    ) : audioState.blobUrl ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayPause}
                          className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-colors"
                          data-testid="audio-play-btn"
                        >
                          {audioState.isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <audio 
                            ref={audioRef}
                            src={audioState.blobUrl}
                            onEnded={() => setAudioState(prev => ({ ...prev, isPlaying: false }))}
                            onPause={() => setAudioState(prev => ({ ...prev, isPlaying: false }))}
                            onPlay={() => setAudioState(prev => ({ ...prev, isPlaying: true }))}
                            className="w-full h-8"
                            controls
                            controlsList="nodownload"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4">
                        <button
                          onClick={() => loadAudioWithAuth(callDetailsModal.call.recording_url)}
                          className="text-sm text-primary hover:underline"
                        >
                          Click to load recording
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No recording available message */}
              {!callDetailsModal.call.recording_url && callDetailsModal.call.has_audio === false && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm">
                  Recording not available for this call.
                </div>
              )}

              {/* Client Interest Level */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Client Interest Level</p>
                <div className="flex flex-wrap gap-2">
                  {['interested', 'not_interested', 'maybe', 'follow_up_needed'].map((level) => {
                    const isSelected = callDetailsModal.call.interest_level === level;
                    const config = {
                      interested: { label: 'Interested', class: 'bg-green-500/20 text-green-500 border-green-500/30' },
                      not_interested: { label: 'Not Interested', class: 'bg-red-500/20 text-red-500 border-red-500/30' },
                      maybe: { label: 'Maybe', class: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
                      follow_up_needed: { label: 'Follow-up Needed', class: 'bg-blue-500/20 text-blue-500 border-blue-500/30' }
                    };
                    return (
                      <button
                        key={level}
                        onClick={async () => {
                          try {
                            const response = await fetch(`${API}/api/ai-calls/${callDetailsModal.call.id}/interest`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ interest_level: level })
                            });
                            if (response.ok) {
                              setCallDetailsModal(prev => ({
                                ...prev,
                                call: { ...prev.call, interest_level: level }
                              }));
                            }
                          } catch (err) {
                            console.error('Failed to update interest:', err);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected 
                            ? config[level].class + ' ring-2 ring-offset-1 ring-offset-background' 
                            : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                        }`}
                      >
                        {config[level].label}
                      </button>
                    );
                  })}
                </div>
                {callDetailsModal.call.interest_level && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Current status: <span className="font-medium text-foreground">{callDetailsModal.call.interest_level.replace('_', ' ')}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="elstar-modal-footer">
              <button 
                onClick={() => setCallDetailsModal({ isOpen: false, call: null })}
                className="elstar-btn-primary"
              >
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={meetingModal}
        onClose={() => setMeetingModal(false)}
        title="Schedule Meeting"
        size="lg"
      >
        <form onSubmit={handleScheduleMeeting}>
          <div className="elstar-modal-body space-y-4">
            {/* Meeting Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Meeting Title *</label>
              <input
                type="text"
                className="elstar-input w-full"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Product Demo with Client"
                required
                data-testid="meeting-title-input"
              />
            </div>

            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Meeting Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMeetingForm(prev => ({ ...prev, meeting_type: 'online', location: '' }))}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    meetingForm.meeting_type === 'online'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-medium">Online</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingForm(prev => ({ ...prev, meeting_type: 'offline' }))}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    meetingForm.meeting_type === 'offline'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">In-Person</span>
                </button>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date *</label>
                <input
                  type="date"
                  className="elstar-input w-full"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  data-testid="meeting-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time *</label>
                <input
                  type="time"
                  className="elstar-input w-full"
                  value={meetingForm.start_time}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                  data-testid="meeting-time-input"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <select
                className="elstar-select w-full"
                value={meetingForm.duration_minutes}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                data-testid="meeting-duration-select"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Location (for offline meetings) */}
            {meetingForm.meeting_type === 'offline' && (
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  className="elstar-input w-full"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Office address, Room number"
                  data-testid="meeting-location-input"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description / Agenda</label>
              <textarea
                className="elstar-input w-full min-h-[80px]"
                value={meetingForm.description}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Meeting agenda or notes..."
                data-testid="meeting-description-input"
              />
            </div>

            {/* Send Invite Checkbox */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <input
                type="checkbox"
                id="send-invite"
                className="w-4 h-4 rounded border-border"
                checked={meetingForm.send_invite}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, send_invite: e.target.checked }))}
              />
              <label htmlFor="send-invite" className="flex-1">
                <p className="text-sm font-medium">Send calendar invite to client</p>
                <p className="text-xs text-muted-foreground">
                  {lead?.email 
                    ? `Invite will be sent to ${lead.email}` 
                    : 'No email address on file - invite will not be sent'}
                </p>
              </label>
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>

            {meetingForm.meeting_type === 'online' && meetingForm.send_invite && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Video className="w-3 h-3" />
                <span>A Google Meet link will be automatically generated and included in the invite</span>
              </div>
            )}
          </div>

          <div className="elstar-modal-footer">
            <button
              type="button"
              onClick={() => setMeetingModal(false)}
              className="elstar-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={schedulingMeeting || !meetingForm.title || !meetingForm.date}
              className="elstar-btn-primary flex items-center gap-2"
              data-testid="schedule-meeting-submit-btn"
            >
              {schedulingMeeting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Schedule Meeting
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
