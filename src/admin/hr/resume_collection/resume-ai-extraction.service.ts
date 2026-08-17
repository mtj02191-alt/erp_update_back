import {
  HttpException,
  Injectable,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI, { toFile } from "openai";
import { Department } from "../../../users/user.entity";

export interface ExtractedResumeFields {
  applicant_name: string | null;
  phone: string | null;
  email: string | null;
  cnic: string | null;
  address: string | null;
  city: string | null;
  role: string | null;
  experience: string | null;
  education: string | null;
  department: string | null;
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const EMPTY_FIELDS: ExtractedResumeFields = {
  applicant_name: null,
  phone: null,
  email: null,
  cnic: null,
  address: null,
  city: null,
  role: null,
  experience: null,
  education: null,
  department: null,
};

@Injectable()
export class ResumeAiExtractionService {
  private readonly logger = new Logger(ResumeAiExtractionService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OpenAI {
    if (this.client) return this.client;

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey?.trim()) {
      throw new HttpException(
        "OpenAI is not configured. Set OPENAI_API_KEY in environment.",
        500,
      );
    }

    this.client = new OpenAI({ apiKey: apiKey.trim() });
    return this.client;
  }

  private getModel(): string {
    return this.config.get<string>("OPENAI_TEXT_MODEL") || "gpt-5-nano";
  }

  private resolveContentType(file: Express.Multer.File): string {
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_MIME.has(mime)) return mime;
    const ext = file.originalname?.split(".").pop()?.toLowerCase();
    if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
    return mime;
  }

  private buildPrompt(): string {
    const departments = Object.values(Department).join(", ");
    return `You are an HR assistant extracting applicant data from resumes/CVs for MTJ Foundation in Pakistan.

Extract fields from the document. Use null when a field is missing or uncertain.
Phone: prefer Pakistani mobile format 03XXXXXXXXX.
CNIC: prefer format XXXXX-XXXXXXX-X when digits are visible.
department: must be exactly one of these enum values or null: ${departments}

Return ONLY valid JSON with these keys:
applicant_name, phone, email, cnic, address, city, role, experience, education, department`;
  }

  private normalizeFields(
    parsed: Record<string, unknown>,
  ): ExtractedResumeFields {
    const str = (key: keyof ExtractedResumeFields): string | null => {
      const value = parsed[key];
      if (value == null) return null;
      const trimmed = String(value).trim();
      return trimmed === "" || trimmed.toLowerCase() === "null" ? null : trimmed;
    };

    const department = str("department");
    const validDepartment =
      department && Object.values(Department).includes(department as Department)
        ? department
        : null;

    return {
      applicant_name: str("applicant_name"),
      phone: str("phone"),
      email: str("email"),
      cnic: str("cnic"),
      address: str("address"),
      city: str("city"),
      role: str("role"),
      experience: str("experience"),
      education: str("education"),
      department: validDepartment,
    };
  }

  private parseResponse(raw?: string | null): ExtractedResumeFields {
    if (!raw?.trim()) {
      throw new HttpException("AI did not return extraction data", 502);
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return this.normalizeFields(parsed);
    } catch (err: any) {
      this.logger.error(`Failed to parse AI JSON: ${err?.message || err}`);
      throw new HttpException("AI returned invalid extraction data", 502);
    }
  }

  private isImageMime(mime: string): boolean {
    return mime.startsWith("image/");
  }

  private isPdfMime(mime: string): boolean {
    return mime === "application/pdf";
  }

  private async extractViaChatContent(
    content: OpenAI.Chat.Completions.ChatCompletionContentPart[],
  ): Promise<ExtractedResumeFields> {
    const client = this.getClient();
    const completion = await client.chat.completions.create({
      model: this.getModel(),
      messages: [{ role: "user", content }],
      temperature: 1,
      response_format: { type: "json_object" },
    });

    return this.parseResponse(completion.choices[0]?.message?.content);
  }

  private async extractViaUploadedFile(
    file: Express.Multer.File,
    prompt: string,
  ): Promise<ExtractedResumeFields> {
    const client = this.getClient();
    const uploaded = await client.files.create({
      file: await toFile(file.buffer, file.originalname || "resume"),
      purpose: "user_data",
    });

    try {
      const completion = await client.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "file",
                file: { file_id: uploaded.id },
              },
            ],
          },
        ],
        temperature: 1,
        response_format: { type: "json_object" },
      });

      return this.parseResponse(completion.choices[0]?.message?.content);
    } finally {
      await client.files.delete(uploaded.id).catch(() => undefined);
    }
  }

  async extractFields(file: Express.Multer.File): Promise<ExtractedResumeFields> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Resume file is required");
    }

    const mime = this.resolveContentType(file);
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(
        "AI extraction supports PDF, DOC, DOCX, JPEG, PNG, WebP, and GIF only",
      );
    }

    const prompt = this.buildPrompt();
    const base64 = file.buffer.toString("base64");

    try {
      if (this.isImageMime(mime)) {
        return this.extractViaChatContent([
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${base64}` },
          },
        ]);
      }

      if (this.isPdfMime(mime)) {
        return this.extractViaChatContent([
          { type: "text", text: prompt },
          {
            type: "file",
            file: {
              filename: file.originalname || "resume.pdf",
              file_data: `data:application/pdf;base64,${base64}`,
            },
          },
        ]);
      }

      return this.extractViaUploadedFile(file, prompt);
    } catch (err: any) {
      if (err instanceof HttpException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`OpenAI extraction failed: ${err?.message || err}`);
      throw new HttpException(
        err?.message || "Failed to extract data with AI",
        err?.status || 502,
      );
    }
  }
}

export { EMPTY_FIELDS };
