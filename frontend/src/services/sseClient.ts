type SSEEventHandler = (payload: any) => void;

class SSEClient {
    private eventSource: EventSource | null = null;
    private listeners: Map<string, Set<SSEEventHandler>> = new Map();
    private reconnectTimeout: number | null = null;
    private userId: string | null = null;

    public connect(userId: string) {
        if (this.eventSource) {
            this.disconnect();
        }

        this.userId = userId;
        this.eventSource = new EventSource(`/api/sse/subscribe?userId=${userId}`);

        this.eventSource.onopen = () => {
            console.log('[SSE] Connected');
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };

        this.eventSource.onerror = (err) => {
            console.error('[SSE] Connection error, reconnecting...', err);
            this.eventSource?.close();
            
            // Auto reconnect with backoff
            if (!this.reconnectTimeout) {
                this.reconnectTimeout = window.setTimeout(() => {
                    this.reconnectTimeout = null;
                    if (this.userId) {
                        this.connect(this.userId);
                    }
                }, 5000);
            }
        };

        // Listen for all configured domain events
        const events = [
            'collaboration.requested',
            'collaboration.approved',
            'collaboration.rejected',
            'ticket.claimed',
            'ticket.transferred',
            'ticket.reopened',
            'ticket.status_updated',
            'note.added',
            'attachment.uploaded',
            'notification.created'
        ];

        for (const event of events) {
            this.eventSource.addEventListener(event, (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    this.dispatch(event, data);
                } catch (err) {
                    console.error(`[SSE] Failed to parse event ${event}:`, err);
                }
            });
        }
    }

    public disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.userId = null;
    }

    public on(event: string, handler: SSEEventHandler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    public off(event: string, handler: SSEEventHandler) {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(handler);
        }
    }

    private dispatch(event: string, payload: any) {
        if (this.listeners.has(event)) {
            for (const handler of this.listeners.get(event)!) {
                try {
                    handler(payload);
                } catch (e) {
                    console.error(`[SSE] Error in handler for ${event}`, e);
                }
            }
        }
    }
}

export const sseClient = new SSEClient();
