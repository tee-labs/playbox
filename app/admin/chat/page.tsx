'use client';

import { useState, useEffect, useRef } from 'react';
import { message as antdMessage, Spin, Alert, Button, Drawer } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';

import ChatMessage from '../../components/Chat/ChatMessage';
import ChatInput from '../../components/Chat/ChatInput';
import ChatHistorySidebar from '../../components/Chat/ChatHistorySidebar';
import FunctionBar from '../../components/Chat/FunctionBar';
import ApiKeyModal from '../../components/Chat/ApiKeyModal';

import type { Model, ChatMessage as ChatMessageType } from '../../lib/chat-api';
import { fetchModels, chatCompletion } from '../../lib/chat-api';
import {
  getApiKey,
  getSessions,
  saveSession,
  deleteSession,
  createSession,
  getSession,
  updateSessionTitle,
  type ChatSession,
} from '../../lib/storage';

export default function ChatTestPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const initApiKey = getApiKey();
    if (initApiKey) {
      setApiKey(initApiKey);
      loadModels(initApiKey);
    } else {
      setShowApiKeyModal(true);
    }

    const allSessions = getSessions();
    setSessions(allSessions);
    if (allSessions.length > 0) {
      loadSession(allSessions[0].id);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadModels = async (key: string) => {
    setLoadingModels(true);
    try {
      const fetchedModels = await fetchModels(key);
      setModels(fetchedModels);
      if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].id);
      }
    } catch (err) {
      antdMessage.error('Failed to load models: ' + (err as Error).message);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadSession = (sessionId: string) => {
    const session = getSession(sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  const handleCreateSession = () => {
    if (!selectedModel) {
      antdMessage.warning('Please select a model first');
      return;
    }
    const newSession = createSession(selectedModel);
    saveSession(newSession);
    const updatedSessions = getSessions();
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
    const remainingSessions = getSessions();
    setSessions(remainingSessions);

    if (currentSessionId === sessionId) {
      if (remainingSessions.length > 0) {
        loadSession(remainingSessions[0].id);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!apiKey || !selectedModel || !currentSessionId) {
      antdMessage.error('Please ensure you have API key set and a session selected');
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessageType = { role: 'user', content };
    const assistantMessageId = `assistant-${Date.now()}`;
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const currentSession = getSession(currentSessionId);
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        messages: updatedMessages,
      };
      saveSession(updatedSession);
      setSessions(getSessions());

      if (updatedMessages.filter((m) => m.role === 'user').length === 1) {
        updateSessionTitle(updatedSession);
        setSessions(getSessions());
      }
    }

    setMessages([...updatedMessages, { role: 'assistant', content: '', reasoning_content: '', id: assistantMessageId }]);

    try {
      await chatCompletion(
        apiKey,
        {
          model: selectedModel,
          messages: updatedMessages,
          stream: true,
        },
        (chunk) => {
          const delta = chunk.choices[0]?.delta;
          setMessages((prev) => {
            const newMessages = [...prev];
            const assistantIdx = newMessages.findIndex((m) => m.id === assistantMessageId);
            if (assistantIdx !== -1) {
              const msg = newMessages[assistantIdx];
              newMessages[assistantIdx] = {
                ...msg,
                content: msg.content + (delta?.content || ''),
                reasoning_content: (msg.reasoning_content || '') + (delta?.reasoning_content || ''),
              };
            }
            return newMessages;
          });
        }
      );
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      antdMessage.error(errorMsg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
      {!isMobile && (
        <ChatHistorySidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelect={loadSession}
          onCreate={handleCreateSession}
          onDelete={handleDeleteSession}
        />
      )}

      {isMobile && (
        <Drawer title="Chat History" placement="left" closable onClose={() => setDrawerOpen(false)} open={drawerOpen} width={280}>
          <ChatHistorySidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelect={(id) => {
              loadSession(id);
              setDrawerOpen(false);
            }}
            onCreate={() => {
              handleCreateSession();
              setDrawerOpen(false);
            }}
            onDelete={handleDeleteSession}
          />
        </Drawer>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuUnfoldOutlined />}
            onClick={() => setDrawerOpen(true)}
            style={{ alignSelf: 'flex-start', margin: 8 }}
          />
        )}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              closable
              style={{ margin: isMobile ? 12 : 16 }}
              onClose={() => setError(null)}
            />
          )}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: isMobile ? 12 : 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {isLoading && !messages.length && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" />
              </div>
            )}
            {messages.map((msg, index) => (
              <ChatMessage
                key={msg.id || `${msg.role}-${msg.content.slice(0, 20)}`}
                message={msg}
                onDelete={() => {
                  const newMessages = messages.filter((_, i) => i !== index);
                  setMessages(newMessages);
                  if (currentSessionId) {
                    const session = getSession(currentSessionId);
                    if (session) {
                      saveSession({ ...session, messages: newMessages });
                      setSessions(getSessions());
                    }
                  }
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
          <FunctionBar
            models={models}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            loadingModels={loadingModels}
            onApiKeyClick={() => setShowApiKeyModal(true)}
          />
          <ChatInput
            onSend={handleSendMessage}
            onStop={() => setIsLoading(false)}
            disabled={!apiKey || !selectedModel || isLoading}
            isLoading={isLoading}
          />
        </div>
      </div>

      <ApiKeyModal
        open={showApiKeyModal}
        onClose={() => {
          setShowApiKeyModal(false);
          const savedKey = getApiKey();
          if (savedKey) {
            setApiKey(savedKey);
            loadModels(savedKey);
          }
        }}
      />
    </div>
  );
}
