import {
  HttpException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { Appeal } from "../appeals/entities/appeal.entity";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { S3StorageService } from "../../utils/storage/s3-storage.service";
import { GenerateSocialPostAiDto } from "./dto/generate-social-post-ai.dto";

@Injectable()
export class SocialPostAiService {
  private readonly logger = new Logger(SocialPostAiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly s3Storage: S3StorageService,
    @InjectRepository(Appeal)
    private readonly appealRepo: Repository<Appeal>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
  ) {}

  private getOpenAiKey(): string {
    const key = this.config.get<string>("OPENAI_API_KEY");
    if (!key?.trim()) {
      throw new HttpException(
        "OpenAI is not configured. Set OPENAI_API_KEY in environment.",
        500,
      );
    }
    return key.trim();
  }

  private async loadContext(dto: GenerateSocialPostAiDto): Promise<string> {
    const parts: string[] = [];
    if (dto.appeal_id) {
      const appeal = await this.appealRepo.findOne({
        where: { id: dto.appeal_id, is_archived: false },
      });
      if (appeal) {
        parts.push(
          `Appeal: ${appeal.title}. ${appeal.short_description || ""} ${appeal.story?.slice(0, 500) || ""}`.trim(),
        );
      }
    }
    if (dto.campaign_id) {
      const campaign = await this.campaignRepo.findOne({
        where: { id: dto.campaign_id, is_archived: false },
      });
      if (campaign) {
        parts.push(
          `Campaign: ${campaign.title}. ${campaign.description?.slice(0, 500) || ""}`.trim(),
        );
      }
    }
    if (dto.context?.trim()) {
      parts.push(dto.context.trim());
    }
    return parts.join("\n\n") || "MTJ Foundation charity work in Pakistan.";
  }

  async generatePostText(dto: GenerateSocialPostAiDto): Promise<{ text: string }> {
    const context = await this.loadContext(dto);
    const tone = dto.tone || "warm, trustworthy, concise";
    const platform = dto.platform || "general social media";

    const system = `You write social media posts for MTJ Foundation, a Pakistani charity. 
Tone: ${tone}. Platform: ${platform}. 
Keep under 280 characters if platform is Twitter/X, otherwise under 500 characters.
Include 2-4 relevant hashtags. No markdown. Output only the post text.`;

    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: this.config.get("OPENAI_TEXT_MODEL") || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Write a post based on:\n${context}` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      },
      {
        headers: {
          Authorization: `Bearer ${this.getOpenAiKey()}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      },
    );

    const text = res.data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new HttpException("AI did not return post text", 502);
    }
    return { text };
  }

  async generatePostImage(
    dto: GenerateSocialPostAiDto,
  ): Promise<{ image_url: string; prompt_used: string }> {
    const context = await this.loadContext(dto);
    const prompt = `Professional charity social media image for MTJ Foundation Pakistan. 
${context.slice(0, 400)}. 
Hopeful, dignified, no text overlay, photorealistic, suitable for Instagram and Facebook.`;

    const res = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: this.config.get("OPENAI_IMAGE_MODEL") || "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      },
      {
        headers: {
          Authorization: `Bearer ${this.getOpenAiKey()}`,
          "Content-Type": "application/json",
        },
        timeout: 120_000,
      },
    );

    const tempUrl = res.data?.data?.[0]?.url;
    if (!tempUrl) {
      throw new HttpException("AI did not return an image URL", 502);
    }

    try {
      const imageRes = await axios.get(tempUrl, {
        responseType: "arraybuffer",
        timeout: 60_000,
      });
      const buffer = Buffer.from(imageRes.data);
      const file = {
        buffer,
        mimetype: "image/png",
        originalname: `ai-social-${Date.now()}.png`,
        size: buffer.length,
      } as Express.Multer.File;

      const uploaded = await this.s3Storage.uploadImage(
        "social_media",
        file,
        ["ai-generated"],
      );
      return { image_url: uploaded.url, prompt_used: prompt };
    } catch (err: any) {
      this.logger.error(`AI image upload failed: ${err?.message}`);
      throw new HttpException(
        "Generated image could not be saved to storage",
        500,
      );
    }
  }
}
