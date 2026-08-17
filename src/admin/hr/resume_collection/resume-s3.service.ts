import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const MAX_FILE_MB = 5;

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

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

/**
 * HR-only S3 upload for resume files. Isolated from appeals/shared S3StorageService.
 */
@Injectable()
export class ResumeS3Service {
  private readonly logger = new Logger(ResumeS3Service.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): S3Client {
    if (this.client) return this.client;

    const accessKeyId = this.config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>("AWS_SECRET_ACCESS_KEY");
    const region =
      this.config.get<string>("AWS_REGION") ||
      this.config.get<string>("AWS_DEFAULT_REGION") ||
      "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        "AWS S3 is not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)",
      );
    }

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    return this.client;
  }

  private getBucket(): string {
    const bucket =
      this.config.get<string>("AWS_S3_HR_BUCKET") ||
      this.config.get<string>("AWS_S3_BUCKET");
    if (!bucket) {
      throw new InternalServerErrorException("AWS_S3_BUCKET is not configured");
    }
    return bucket;
  }

  private getPrefix(): string {
    const prefix =
      this.config.get<string>("AWS_S3_HR_PREFIX") || "hr";
    return String(prefix).replace(/^\/|\/$/g, "");
  }

  private buildPublicUrl(key: string): string {
    const publicBaseUrl = this.config.get<string>("AWS_S3_HR_PUBLIC_BASE_URL");
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    const bucket = this.getBucket();
    const region =
      this.config.get<string>("AWS_REGION") ||
      this.config.get<string>("AWS_DEFAULT_REGION") ||
      "us-east-1";
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private getMaxFileMb(): number {
    return Number(
      this.config.get("AWS_S3_HR_MAX_FILE_MB") ||
        this.config.get("AWS_S3_MAX_FILE_MB") ||
        MAX_FILE_MB,
    );
  }

  private getObjectAcl(): string | undefined {
    const acl =
      this.config.get<string>("AWS_S3_HR_OBJECT_ACL") ||
      this.config.get<string>("AWS_S3_OBJECT_ACL");
    return acl && acl !== "none" ? acl : undefined;
  }

  /** Windows/browsers often send application/octet-stream — resolve from extension. */
  private resolveContentType(file: Express.Multer.File): string {
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_MIME.has(mime)) {
      return mime;
    }
    const ext = file.originalname?.split(".").pop()?.toLowerCase();
    if (ext && EXT_TO_MIME[ext]) {
      return EXT_TO_MIME[ext];
    }
    return mime;
  }

  private validateResumeFile(
    file: Express.Multer.File,
    contentType: string,
  ): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No file uploaded");
    }
    if (!ALLOWED_MIME.has(contentType)) {
      throw new BadRequestException(
        "Only PDF, DOC, DOCX, JPEG, PNG, WebP, and GIF files are allowed",
      );
    }
    const limitMb = this.getMaxFileMb();
    if (file.size > limitMb * 1024 * 1024) {
      throw new BadRequestException(`File must be under ${limitMb}MB`);
    }
  }

  private isAclNotSupportedError(err: any): boolean {
    const code = err?.Code || err?.name || err?.code || "";
    const message = String(err?.message || "");
    return (
      code === "AccessControlListNotSupported" ||
      message.includes("AccessControlListNotSupported") ||
      message.includes("does not allow ACLs")
    );
  }

  async uploadResume(
    file: Express.Multer.File,
  ): Promise<{ url: string; key: string; bucket: string }> {
    const contentType = this.resolveContentType(file);
    this.validateResumeFile(file, contentType);

    const ext =
      EXT_BY_MIME[contentType] ||
      file.originalname?.split(".").pop()?.toLowerCase() ||
      "bin";
    const safeName = (file.originalname || `resume.${ext}`)
      .replace(/[^\w.-]/g, "_")
      .slice(0, 100);
    const filePart = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;

    const key = [this.getPrefix(), "resumes", filePart].filter(Boolean).join("/");
    const bucket = this.getBucket();

    const objectAcl = this.getObjectAcl();
    const putParams: {
      Bucket: string;
      Key: string;
      Body: Buffer;
      ContentType: string;
      ACL?: ObjectCannedACL;
    } = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: contentType,
    };
    if (objectAcl) {
      putParams.ACL = objectAcl as ObjectCannedACL;
    }

    try {
      await this.getClient().send(new PutObjectCommand(putParams));
    } catch (err: any) {
      if (putParams.ACL && this.isAclNotSupportedError(err)) {
        this.logger.warn(
          "HR resume upload: bucket does not allow ACLs, retrying without ACL",
        );
        const { ACL: _removed, ...withoutAcl } = putParams;
        await this.getClient().send(new PutObjectCommand(withoutAcl));
      } else {
        this.logger.error(
          `HR resume S3 upload failed [bucket=${bucket}, key=${key}]: ${err?.message || err}`,
        );
        throw new InternalServerErrorException(
          err?.message || "Failed to upload resume to storage",
        );
      }
    }

    return {
      url: this.buildPublicUrl(key),
      key,
      bucket,
    };
  }

  resolveKeyFromUrl(resumeUrl: string): string | null {
    if (!resumeUrl?.trim()) return null;
    try {
      const pathname = new URL(resumeUrl).pathname;
      return decodeURIComponent(pathname.replace(/^\//, "")) || null;
    } catch {
      return null;
    }
  }

  async getObjectBuffer(
    key: string,
    bucket?: string,
  ): Promise<{ buffer: Buffer; contentType?: string }> {
    const targetBucket = bucket || this.getBucket();
    try {
      const response = await this.getClient().send(
        new GetObjectCommand({ Bucket: targetBucket, Key: key }),
      );
      const body = response.Body;
      if (!body) {
        throw new InternalServerErrorException("Empty file from storage");
      }
      return {
        buffer: Buffer.from(await body.transformToByteArray()),
        contentType: response.ContentType,
      };
    } catch (err: any) {
      this.logger.error(
        `HR resume S3 read failed [bucket=${targetBucket}, key=${key}]: ${err?.message || err}`,
      );
      throw new InternalServerErrorException(
        "Failed to read file from storage",
      );
    }
  }
}
