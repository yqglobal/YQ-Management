import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'dummy_key',
    });
  }

  async getAiResponse(
    tenantId: string,
    customerPhone: string,
    message: string,
    tools: any[] = [],
    systemInstruction: string = '',
    previousInteractionId?: string,
  ): Promise<{ responseText: string | null; interactionId: string; toolCalls: any[] }> {
    try {
      const interaction = await this.client.interactions.create({
        model: 'gemini-3.6-flash',
        input: message,
        tools: tools.length > 0 ? tools : undefined,
        system_instruction: systemInstruction,
        previous_interaction_id: previousInteractionId,
        store: true,
      });

      // Extract tool calls from the steps
      const toolCalls = [];
      const steps = (interaction as any).steps || [];
      for (const step of steps) {
        if (step.type === 'function_call') {
          toolCalls.push(step);
        }
      }

      return {
        responseText: interaction.output_text || null,
        interactionId: interaction.id,
        toolCalls,
      };
    } catch (err) {
      this.logger.error(`AI interaction failed: ${err.message}`, err.stack);
      return { responseText: "I'm having trouble connecting right now. Let me connect you to a human operator.", interactionId: '', toolCalls: [] };
    }
  }

  async returnToolResult(
    interactionId: string,
    toolCallId: string,
    toolName: string,
    result: any,
  ): Promise<{ responseText: string | null; toolCalls: any[] }> {
    try {
      // NOTE: Using the API to provide function_result back to an ongoing interaction
      const interaction = await this.client.interactions.create({
        model: 'gemini-3.6-flash',
        previous_interaction_id: interactionId,
        input: [
          {
            functionResponse: {
              name: toolName,
              response: { result },
            }
          }
        ] as any, // Temporary cast, mapping standard gemini tool response
        store: true,
      });

      const toolCalls = [];
      const steps = (interaction as any).steps || [];
      for (const step of steps) {
        if (step.type === 'function_call') {
          toolCalls.push(step);
        }
      }

      return {
        responseText: interaction.output_text || null,
        toolCalls,
      };
    } catch (err) {
      this.logger.error(`AI tool result failed: ${err.message}`, err.stack);
      return { responseText: "Sorry, I ran into an error processing that request.", toolCalls: [] };
    }
  }
}
