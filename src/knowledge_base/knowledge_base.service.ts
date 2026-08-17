import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { CreateKnowledgeBaseDto } from "./dto/create-knowledge_base.dto";

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getBotApiKey(): string {
    const key =
      this.config.get<string>("web_bot_api_key") ||
      this.config.get<string>("WEB_BOT_API_KEY") ||
      process.env.web_bot_api_key ||
      process.env.WEB_BOT_API_KEY ||
      "";

    if (!key.trim()) {
      throw new HttpException(
        "Web bot API key is not configured. Set web_bot_api_key or WEB_BOT_API_KEY.",
        500,
      );
    }

    return key.trim();
  }

  private getVectorStoreId(): string {
    const storeId =
      this.config.get<string>("mtj_bot_store_id") ||
      this.config.get<string>("MTJ_BOT_STORE_ID") ||
      process.env.mtj_bot_store_id ||
      process.env.MTJ_BOT_STORE_ID ||
      "";

    if (!storeId.trim()) {
      throw new HttpException(
        "Bot vector store is not configured. Set mtj_bot_store_id or MTJ_BOT_STORE_ID.",
        500,
      );
    }

    return storeId.trim();
  }

  private getModel(): string {
    return (
      this.config.get<string>("WEB_BOT_MODEL") ||
      this.config.get<string>("OPENAI_TEXT_MODEL") ||
      "gpt-5-nano"
    );
  }

  private getClient(): OpenAI {
    if (this.client) return this.client;
    this.client = new OpenAI({ apiKey: this.getBotApiKey() });
    return this.client;
  }

  private buildSystemPrompt(): string {
    return [
      "You are MTJ Foundation's website knowledge-base assistant.",
      "Answer from the attached file-search knowledge base whenever possible.",
      "If the answer is not present in the knowledge base, say you do not have that information yet.",
      "Do not invent policies, contacts, timings, or donation details.",
      "Keep answers concise, clear, and suitable for a website chatbot.",
    ].join(" ");
  }

  async getStatus() {
    const hasApiKey = !!(
      this.config.get<string>("web_bot_api_key") ||
      this.config.get<string>("WEB_BOT_API_KEY") ||
      process.env.web_bot_api_key ||
      process.env.WEB_BOT_API_KEY
    );
    const storeId =
      this.config.get<string>("mtj_bot_store_id") ||
      this.config.get<string>("MTJ_BOT_STORE_ID") ||
      process.env.mtj_bot_store_id ||
      process.env.MTJ_BOT_STORE_ID ||
      "";

    return {
      configured: hasApiKey && !!storeId.trim(),
      model: this.getModel(),
      has_api_key: hasApiKey,
      store_id_configured: !!storeId.trim(),
      store_id: storeId.trim() || null,
    };
  }

  async create(createKnowledgeBaseDto: CreateKnowledgeBaseDto) {
    const message = String(createKnowledgeBaseDto?.message || "").trim();
    if (!message) {
      throw new BadRequestException("message is required");
    }

    const client = this.getClient();
    const vectorStoreId = this.getVectorStoreId();

    try {
      const response = await client.responses.create({
        model: this.getModel(),
        instructions: this.buildSystemPrompt(),
        input: message,
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
          },
        ],
      });

      const answer =
        response.output_text?.trim() ||
        "I could not generate a response from the knowledge base.";

      return {
        success: true,
        message: "Knowledge-base response generated successfully",
        data: {
          answer,
          response_id: response.id,
          model: response.model,
          store_id: vectorStoreId,
        },
      };
    } catch (err: any) {
      this.logger.error(`Knowledge-base chat failed: ${err?.message || err}`);
      throw new HttpException(
        err?.message || "Failed to generate chatbot response",
        502,
      );
    }
  }
}
