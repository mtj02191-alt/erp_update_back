import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QrCode } from "./entities/qr_code.entity";
import { CreateQrCodeDto } from "./dto/create-qr_code.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class QrCodeService {
  // Put your donation frontend base URL in env
  // e.g. https://donation.mtjfoundation.org/donate
  private readonly donationBaseUrl: string;

  constructor(
    @InjectRepository(QrCode)
    private readonly repo: Repository<QrCode>,
    private readonly configService: ConfigService,
  ) {
    this.donationBaseUrl =
      this.configService.get<string>("DONATION_BASE_URL") ||
      "https://mtjfoundation.org/donate";
  }

  private buildTargetUrl(dto: CreateQrCodeDto): string {
    const url = new URL(this.donationBaseUrl);

    // tracking source fixed
    url.searchParams.set("source", "qr");

    if (dto.projectId) {
      url.searchParams.set("projectId", dto.projectId);
    }
    if (dto.campaign) {
      url.searchParams.set("ref", dto.campaign);
    }
    if (dto.label) {
      url.searchParams.set("qr", dto.label);
    }

    return url.toString();
  }

  async create(dto: CreateQrCodeDto) {
    const targetUrl = this.buildTargetUrl(dto);

    if (!targetUrl.startsWith("http")) {
      throw new BadRequestException("Invalid target URL generated.");
    }

    const record = this.repo.create({
      project_id: dto.projectId ?? null,
      campaign: dto.campaign ?? null,
      label: dto.label ?? null,
      target_url: targetUrl,
    });

    const saved = await this.repo.save(record);

    // image endpoint that frontend can use directly
    const apiBase =
      this.configService.get<string>("API_BASE_URL") ||
      this.configService.get<string>("BASE_API_URL") ||
      "http://localhost:3000";
    const imageUrl = `${apiBase}/qr-codes/${saved.id}/image`;

    return {
      id: saved.id,
      targetUrl: saved.target_url,
      imageUrl,
      projectId: saved.project_id,
      campaign: saved.campaign,
      label: saved.label,
      isActive: saved.is_active,
      createdAt: saved.created_at,
    };
  }

  async findOne(id: number): Promise<QrCode | null> {
    return this.repo.findOne({ where: { id } });
  }
}
