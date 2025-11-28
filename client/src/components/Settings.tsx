import { Settings as SettingsIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface SettingsProps {
    responseStyle: string;
    onResponseStyleChange: (style: string) => void;
}

export function Settings({ responseStyle, onResponseStyleChange }: SettingsProps) {
    const [llmInfo, setLlmInfo] = useState<{ provider?: string; model?: string; anthropicInstalled?: boolean } | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/llm-info');
                if (!mounted) return;
                if (res.ok) {
                    const json = await res.json();
                    setLlmInfo(json);
                }
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, []);

    return (
        <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-4">
                <SettingsIcon className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold">Preferences</h2>
            </div>

            {llmInfo && (
                <div className="mb-3 text-sm text-muted-foreground">
                    <div><strong>Provider:</strong> {llmInfo.provider}</div>
                    <div><strong>Model:</strong> {llmInfo.model}</div>
                    <div className="text-xs opacity-75">Anthropic installed: {llmInfo.anthropicInstalled ? 'yes' : 'no'}</div>
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Response Style
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onResponseStyleChange('concise')}
                            className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${responseStyle === 'concise'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-muted border-border'
                                }`}
                        >
                            Concise
                        </button>
                        <button
                            onClick={() => onResponseStyleChange('balanced')}
                            className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${responseStyle === 'balanced'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-muted border-border'
                                }`}
                        >
                            Balanced
                        </button>
                        <button
                            onClick={() => onResponseStyleChange('detailed')}
                            className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${responseStyle === 'detailed'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background hover:bg-muted border-border'
                                }`}
                        >
                            Detailed
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
