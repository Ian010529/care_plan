import { Response } from "express";

interface SSEClient {
  id: string;
  res: Response;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, res: Response) {
    this.clients.set(id, { id, res });
    console.log(`✅ SSE client connected: ${id} (total: ${this.clients.size})`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(
      `❌ SSE client disconnected: ${id} (total: ${this.clients.size})`,
    );
  }

  broadcast(event: string, data: any) {
    const payload = JSON.stringify(data);
    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client) => {
      try {
        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${payload}\n\n`);
        successCount++;
      } catch (error) {
        console.error(`Failed to send to client ${client.id}:`, error);
        this.removeClient(client.id);
        failCount++;
      }
    });

    if (successCount > 0 || failCount > 0) {
      console.log(
        `📡 Broadcast "${event}" to ${successCount} clients (${failCount} failed)`,
      );
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
