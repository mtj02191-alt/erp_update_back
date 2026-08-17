import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const ALLOWED_MIME = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "text/csv",
  "application/csv",
]);

const EXT_BY_MIME: Record<string, string> = {
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "application/csv": "csv",
};

@Injectable()
export class ReconciliationS3Service {
  private readonly logger = new Logger(ReconciliationS3Service.name);
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
    const bucket = this.config.get<string>("AWS_S3_BUCKET");
    if (!bucket) {
      throw new InternalServerErrorException("AWS_S3_BUCKET is not configured");
    }
    return bucket;
  }

  private getPrefix(): string {
    const prefix =
      this.config.get<string>("AWS_S3_RECONCILIATION_PREFIX") || "reconciliation";
    return String(prefix).replace(/^\/|\/$/g, "");
  }

  validateStatementFile(file: Express.Multer.File, bankName?: string): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No file uploaded");
    }
    const mime = (file.mimetype || "").toLowerCase();
    const ext = (file.originalname || "").split(".").pop()?.toLowerCase();
    const bank = String(bankName || "").toLowerCase();
    const allowedExt =
      bank === "meezan"
        ? ext === "csv"
        : ext === "xls" || ext === "xlsx" || ext === "csv";
    if (!ALLOWED_MIME.has(mime) && !allowedExt) {
      throw new BadRequestException(
        bank === "meezan"
          ? "Only .csv statement files are allowed for Meezan"
          : "Only .xls, .xlsx, or .csv statement files are allowed",
      );
    }
    const maxMb = Number(this.config.get("AWS_S3_RECONCILIATION_MAX_FILE_MB") || 15);
    if (file.size > maxMb * 1024 * 1024) {
      throw new BadRequestException(`Statement file must be under ${maxMb}MB`);
    }
  }

  async uploadStatement(
    file: Express.Multer.File,
    bankName: string,
  ): Promise<{ url: string; key: string }> {
    this.validateStatementFile(file, bankName);

    const mime = (file.mimetype || "").toLowerCase();
    const ext =
      EXT_BY_MIME[mime] ||
      file.originalname?.split(".").pop()?.toLowerCase() ||
      "xls";

    const safeBank = bankName.replace(/[^\w.-]/g, "_").toLowerCase();
    const safeName = (file.originalname || `statement.${ext}`)
      .replace(/[^\w.-]/g, "_")
      .slice(0, 80);
    const key = `${this.getPrefix()}/${safeBank}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;

    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype || "application/vnd.ms-excel",
        }),
      );
    } catch (err: any) {
      this.logger.error(`Reconciliation S3 upload failed: ${err?.message || err}`);
      throw new InternalServerErrorException("Failed to upload statement to storage");
    }

    const publicBase = this.config.get<string>("AWS_S3_PUBLIC_BASE_URL");
    const region =
      this.config.get<string>("AWS_REGION") ||
      this.config.get<string>("AWS_DEFAULT_REGION") ||
      "us-east-1";
    const url = publicBase
      ? `${publicBase.replace(/\/$/, "")}/${key}`
      : `https://${this.getBucket()}.s3.${region}.amazonaws.com/${key}`;

    return { url, key };
  }
}
