import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';

const SYSTEM_PROMPT = `You are an expert operations consultant for Qmova, a SaaS platform that manages queueing, appointments, and multi-stage customer journeys (Service Execution Flows).

Your task is to take a natural language description of a business or service process and generate a structured JSON ServiceFlow with steps.

A ServiceFlow consists of:
- name: The name of the flow (e.g. "Vet Consultation Journey")
- description: A brief description.
- steps: An array of step objects.

Each step in the steps array MUST follow this JSON schema exactly:
{
  "stepOrder": number (starting from 1),
  "name": string (short name, e.g. "Reception Check-in"),
  "description": string (optional),
  "type": "SERVICE" | "CHECKPOINT" | "COLLECTION" | "WAITING_PERIOD" | "NOTIFICATION" | "PAYMENT" | "FORM",
  "trigger": "AUTOMATIC" | "MANUAL_STAFF" | "MANUAL_CUSTOMER" | "SCHEDULED" | "CONDITION",
  "isOptional": boolean (default false),
  "isRepeatable": boolean (default false),
  "requiresQrScan": boolean (true if customer must scan a QR code at this step),
  "requiresStaffAction": boolean (true if staff must perform an action to complete it),
  "customerInstruction": string (e.g. "Please proceed to Counter B"),
  "staffInstruction": string (optional, e.g. "Verify documents"),
  "locationDescription": string (optional, e.g. "Counter B"),
  "isPriceVariable": boolean (default false, if PAYMENT type),
  "deferredByMinutes": number (optional, for WAITING_PERIOD),
  "outcomeOptions": string[] (optional array of outcome buttons for staff, e.g. ["Vitals Normal", "Referred to Doctor"])
}

CRITICAL RULES:
1. ONLY return the raw JSON object. NO markdown formatting, NO \`\`\`json blocks. Just the literal JSON.
2. Ensure valid JSON format.
3. Keep the flows comprehensive but simple enough for small businesses.

Example Output:
{
  "name": "Barbershop Experience",
  "description": "Standard haircut flow",
  "steps": [
    {
      "stepOrder": 1,
      "name": "Check-in",
      "type": "CHECKPOINT",
      "trigger": "MANUAL_CUSTOMER",
      "requiresQrScan": true,
      "requiresStaffAction": false,
      "customerInstruction": "Scan the QR code at the entrance to check in.",
      "locationDescription": "Entrance"
    }
  ]
}
`;

@Injectable()
export class AiSetupService {
  private readonly logger = new Logger(AiSetupService.name);

  async generateServiceFlow(prompt: string) {
    if (!prompt) {
      throw new BadRequestException('Prompt is required');
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (geminiKey) {
      return this.callGemini(prompt, geminiKey);
    } else if (groqKey) {
      return this.callGroq(prompt, groqKey);
    } else {
      throw new InternalServerErrorException('No AI provider configured (Missing GEMINI_API_KEY or GROQ_API_KEY)');
    }
  }

  private async callGemini(prompt: string, apiKey: string) {
    this.logger.log('Calling Gemini API (gemini-1.5-flash)');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`Gemini API error: ${err}`);
        throw new Error('Failed to generate with Gemini');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return this.parseJSON(text);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('AI Generation Failed');
    }
  }

  private async callGroq(prompt: string, apiKey: string) {
    this.logger.log('Calling Groq API (llama3-8b-8192)');
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const body = {
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`Groq API error: ${err}`);
        throw new Error('Failed to generate with Groq');
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      return this.parseJSON(text);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('AI Generation Failed');
    }
  }

  private parseJSON(text: string) {
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      return JSON.parse(cleanText.trim());
    } catch (e) {
      this.logger.error(`Failed to parse AI response as JSON: ${text}`);
      throw new InternalServerErrorException('Invalid JSON from AI');
    }
  }
}
