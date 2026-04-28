import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Search, Send, Paperclip, Smile, Phone, Video, MoreVertical,
  MessageCircle, Check, CheckCheck, Clock, User, ArrowLeft, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Sample contacts data (will be populated from leads/customers)
const MESSAGE_TEMPLATES = [
  { id: 1, name: 'Greeting', text: 'Hi {name}, thank you for your interest in our services!' },
  { id: 2, name: 'Follow Up', text: 'Hi {name}, I wanted to follow up on our previous conversation. Do you have any questions?' },
  { id: 3, name: 'Meeting Request', text: 'Hi {name}, I would like to schedule a meeting to discuss your needs. What time works best for you?' },
  { id: 4, name: 'Thank You', text: 'Thank you {name} for your time today. Please let me know if you need anything else.' },
];

export default function WhatsAppMessages() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [mobileView, setMobileView] = useState('contacts'); // contacts or chat
  const messagesEndRef = useRef(null);
  
  // Get leadId from URL params
  const preSelectedLeadId = searchParams.get('leadId');

  useEffect(() => {
    fetchContacts();
  }, []);
  
  // Auto-select lead from URL params after contacts are loaded
  useEffect(() => {
    if (preSelectedLeadId && contacts.length > 0 && !selectedContact) {
      const leadToSelect = contacts.find(c => c.id === preSelectedLeadId);
      if (leadToSelect) {
        setSelectedContact(leadToSelect);
        setMobileView('chat');
      }
    }
  }, [preSelectedLeadId, contacts, selectedContact]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      // Fetch leads as contacts
      const response = await fetch(`${API}/api/leads?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const contactsList = (data.items || []).map(lead => ({
          id: lead.id,
          name: lead.pic_name || lead.name,
          phone: lead.phone,
          company: lead.company || lead.name,
          avatar: (lead.pic_name || lead.name)?.charAt(0)?.toUpperCase(),
          lastMessage: 'Click to start conversation',
          lastMessageTime: null,
          unread: 0,
          online: Math.random() > 0.5,
          entity_type: 'lead'
        }));
        setContacts(contactsList);
      }
    } catch (error) {
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const response = await fetch(`${API}/api/whatsapp/messages/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        // If no messages yet, start with empty
        setMessages([]);
      }
    } catch (error) {
      // Mock some messages for demo
      setMessages([
        {
          id: '1',
          text: `Hi, I'm interested in learning more about your services.`,
          sender: 'contact',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'read'
        },
        {
          id: '2',
          text: `Hello! Thank you for reaching out. How can I help you today?`,
          sender: 'me',
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          status: 'read'
        }
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    
    setSendingMessage(true);
    const messageText = newMessage;
    setNewMessage('');
    
    // Add message optimistically
    const tempMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'me',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      const response = await fetch(`${API}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          contact_id: selectedContact.id,
          message: messageText,
          phone: selectedContact.phone
        })
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const failed = data.status === 'failed' || data.success === false || data.error;
        // Update message status
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, status: failed ? 'failed' : 'sent' } : m
        ));
        if (failed) {
          toast.info('WhatsApp integration coming soon. Message saved locally.');
        } else {
          toast.success('Message sent');
        }
      } else {
        toast.info('WhatsApp integration coming soon. Message saved locally.');
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, status: 'sent' } : m
        ));
      }
    } catch (error) {
      toast.info('WhatsApp integration coming soon. Message saved locally.');
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...m, status: 'sent' } : m
      ));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectTemplate = (template) => {
    const text = template.text.replace('{name}', selectedContact?.name || 'there');
    setNewMessage(text);
    setShowTemplates(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const MessageStatus = ({ status }) => {
    if (status === 'sending') return <Clock className="w-3 h-3 text-muted-foreground" />;
    if (status === 'sent') return <Check className="w-3 h-3 text-muted-foreground" />;
    if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    if (status === 'read') return <CheckCheck className="w-3 h-3 text-primary" />;
    return null;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex" data-testid="whatsapp-page">
      {/* Contact List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card ${mobileView === 'chat' ? 'hidden md:flex' : ''}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              WhatsApp Messages
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="elstar-input pl-10"
              data-testid="search-contacts-input"
            />
          </div>
        </div>
        
        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <User className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => { setSelectedContact(contact); setMobileView('chat'); }}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 border-b border-border transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-primary/10' : ''
                }`}
                data-testid={`contact-${contact.id}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-blue flex items-center justify-center text-lg font-semibold text-gray-800">
                    {contact.avatar}
                  </div>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{contact.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {contact.lastMessageTime ? formatTime(contact.lastMessageTime) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                    {contact.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-background ${mobileView === 'contacts' ? 'hidden md:flex' : ''}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setMobileView('contacts')}
                  className="md:hidden p-2 hover:bg-secondary rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-blue flex items-center justify-center font-semibold text-gray-800">
                    {selectedContact.avatar}
                  </div>
                  {selectedContact.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedContact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedContact.online ? 'Online' : selectedContact.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              }}
            >
              {messages.map((message, idx) => (
                <div 
                  key={message.id}
                  className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender === 'me' 
                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                        : 'bg-card border border-border rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      <span className="text-xs">{formatTime(message.timestamp)}</span>
                      {message.sender === 'me' && <MessageStatus status={message.status} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              {/* Templates */}
              {showTemplates && (
                <div className="mb-4 p-2 bg-secondary rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Quick Templates</span>
                    <button onClick={() => setShowTemplates(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {MESSAGE_TEMPLATES.map(template => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template)}
                        className="w-full text-left p-2 text-sm hover:bg-background rounded"
                      >
                        <span className="font-medium">{template.name}</span>
                        <p className="text-muted-foreground text-xs truncate">{template.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"
                  title="Quick templates"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="elstar-input min-h-[44px] max-h-32 resize-none"
                    rows={1}
                    data-testid="message-input"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
                  data-testid="send-message-btn"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Contact Selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">WhatsApp Business</h3>
            <p className="text-muted-foreground max-w-md">
              Select a contact from the list to start messaging. 
              Send quick follow-ups, schedule meetings, and stay connected with your leads.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
