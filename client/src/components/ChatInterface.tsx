import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    provider?: string;
}

interface ChatInterfaceProps {
    highlightedText?: string;
    responseStyle?: string;
}

export function ChatInterface({ highlightedText, responseStyle = 'balanced' }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentSentiment, setCurrentSentiment] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastRequest, setLastRequest] = useState<any | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [persistCommands, setPersistCommands] = useState<{ powershell?: string; sh?: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const doSend = async (reqBody: { message: string; highlightedText?: string; responseStyle?: string }, attempt = 0) => {
        if (attempt > 0) setRetryCount(attempt);
        setLastError(null);
        try {
            const response = await axios.post('http://localhost:3000/api/chat', reqBody);

            if (response.data.sentiment) {
                setCurrentSentiment(response.data.sentiment.sentiment);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response, provider: response.data.provider }]);
            setLastRequest(null);
            setRetryCount(0);
        } catch (error: any) {
            console.error('Chat send error:', error);
            const status = error?.response?.status;
            const serverMessage = error?.response?.data?.details || error?.response?.data?.error || error?.message;

            // If quota/rate-limit (503 returned by server), surface UI that allows retry or switching providers
            if (status === 503 || /quota|rate limit|429|exceeded/i.test(String(serverMessage))) {
                setLastError(String(serverMessage || 'LLM provider quota or rate limit exceeded.'));
                setLastRequest(reqBody);
            } else {
                const userMessage = serverMessage ? `Error: ${serverMessage}` : 'Sorry, I encountered an error.';
                setMessages(prev => [...prev, { role: 'assistant', content: userMessage }]);
            }
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        const reqBody = { message: userMessage, highlightedText: highlightedText, responseStyle: responseStyle };
        setLastRequest(reqBody);
        await doSend(reqBody, 0);
        setLoading(false);
    };

    const retryLast = async () => {
        if (!lastRequest) return;
        const nextAttempt = (retryCount || 0) + 1;
        // simple backoff
        const delayMs = Math.min(3000 * nextAttempt, 10000);
        setLoading(true);
        await new Promise(r => setTimeout(r, delayMs));
        await doSend(lastRequest, nextAttempt);
        setLoading(false);
    };

    const switchProviderAndRetry = async () => {
        try {
            // confirm with user before switching
            const info = await fetch('/api/llm-info').then(r => r.json()).catch(() => null);
            const current = info?.provider || 'openai';
            const alt = current.toLowerCase().startsWith('anthropic') ? 'openai' : 'anthropic';

            const ok = window.confirm(`Switch provider from ${current} to ${alt} and retry the request? This change is runtime-only (not persisted).`);
            if (!ok) return;

            // Call admin endpoint to change provider at runtime (non-persistent)
            await fetch('/api/admin/provider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: alt, persist: false }) });

            // Retry the last request after a short delay
            await new Promise(r => setTimeout(r, 500));
            await retryLast();
        } catch (e) {
            console.error('Switch provider failed:', e);
        }
    };

    const fetchPersistenceCommands = async () => {
        try {
            const info = await fetch('/api/llm-info').then(r => r.json()).catch(() => null);
            const current = info?.provider || 'openai';
            const alt = current.toLowerCase().startsWith('anthropic') ? 'openai' : 'anthropic';

            const res = await fetch('/api/admin/provider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: alt, persist: true }) });
            const json = await res.json();
            if (json && json.persistenceCommands) {
                setPersistCommands(json.persistenceCommands);
            }
        } catch (e) {
            console.error('Failed to fetch persistence commands', e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
            {currentSentiment && currentSentiment !== 'neutral' && (
                <div className={`px-4 py-2 text-xs flex items-center gap-2 ${currentSentiment === 'confused' || currentSentiment === 'frustrated'
                        ? 'bg-orange-50 text-orange-800 border-b border-orange-100'
                        : currentSentiment === 'negative'
                            ? 'bg-red-50 text-red-800 border-b border-red-100'
                            : 'bg-blue-50 text-blue-800 border-b border-blue-100'
                    }`}>
                    <span className="font-semibold">Detected tone:</span>
                    <span className="capitalize">{currentSentiment}</span>
                    <span className="text-xs opacity-75">(Adjusting response accordingly)</span>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Bot className="h-12 w-12 mb-2 opacity-20" />
                        <p>Upload a document and start chatting!</p>
                    </div>
                )}
                {lastError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-800">
                        <div className="font-semibold">LLM Error</div>
                        <div className="mt-1 text-xs">{lastError}</div>
                        <div className="mt-2 flex gap-2">
                            <button onClick={retryLast} disabled={loading} className="px-2 py-1 bg-primary text-white rounded-md text-xs">Retry</button>
                            <button onClick={switchProviderAndRetry} disabled={loading} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">Switch Provider & Retry</button>
                            <button onClick={fetchPersistenceCommands} disabled={loading} className="px-2 py-1 bg-gray-50 text-gray-700 rounded-md text-xs border">Show Persistence Commands</button>
                        </div>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex w-full",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                                msg.role === 'user'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                            )}
                        >
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                            {msg.provider && msg.role === 'assistant' && (
                                <div className="mt-2 flex justify-end">
                                    <span className="inline-block text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{msg.provider}</span>
                                </div>
                            )}
                            {persistCommands && (
                                <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                                    <div className="font-semibold">Persistence Commands</div>
                                    <div className="mt-1 text-[11px]">
                                        <div className="font-medium">PowerShell:</div>
                                        <pre className="text-xs overflow-auto whitespace-pre-wrap">{persistCommands.powershell}</pre>
                                        <div className="font-medium mt-2">sh:</div>
                                        <pre className="text-xs overflow-auto whitespace-pre-wrap">{persistCommands.sh}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    </div>
                )}
                {highlightedText && (
                    <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-xs text-yellow-800 flex items-center gap-2">
                        <span className="font-semibold">Focusing on:</span>
                        <span className="truncate max-w-[300px]">{highlightedText}</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask a question about the document..."
                        className="flex-1 px-3 py-2 text-sm rounded-md border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
