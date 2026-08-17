import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { DonorService } from "../donor/donor.service";
import { DonationsService } from "src/donations/donations.service";
import { DonationBoxDonationService } from "../donation_box/donation_box_donation/donation_box_donation.service";
import { CreateDonorDto } from "../donor/dto/create-donor.dto";
import { CreateDonationDto } from "src/donations/dto/create-donation.dto";
import { UpdateDonationDto } from "src/donations/dto/update-donation.dto";
import { CreateDonationBoxDonationDto } from "../donation_box/donation_box_donation/dto/create-donation_box_donation.dto";
import {
  OfflineSyncActionDto,
  OfflineSyncBatchDto,
} from "./dto/offline-sync.dto";

export interface OfflineSyncActionResult {
  queue_id: string;
  local_id: string;
  success: boolean;
  server_id?: number;
  error?: string;
}

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger(OfflineSyncService.name);

  constructor(
    private readonly donorService: DonorService,
    private readonly donationsService: DonationsService,
    private readonly donationBoxDonationService: DonationBoxDonationService,
  ) {}

  async processBatch(dto: OfflineSyncBatchDto, user: any) {
    if (!dto.actions?.length) {
      throw new BadRequestException("No sync actions provided");
    }

    const idMap: Record<string, number> = {};
    const results: OfflineSyncActionResult[] = [];

    for (const action of dto.actions) {
      const result = await this.processOne(action, idMap, user);
      results.push(result);
      if (result.success && result.server_id != null) {
        idMap[action.local_id] = result.server_id;
      }
    }

    const failed = results.filter((r) => !r.success).length;
    return {
      success: failed === 0,
      id_map: idMap,
      results,
      synced: results.filter((r) => r.success).length,
      failed,
    };
  }

  private resolveRef(
    value: unknown,
    idMap: Record<string, number>,
    fieldName: string,
  ): number | undefined {
    if (value == null || value === "") return undefined;
    const s = String(value);
    if (s.startsWith("local_") && idMap[s] != null) {
      return idMap[s];
    }
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    throw new BadRequestException(
      `Unresolved ${fieldName}: ${value} (sync parents first)`,
    );
  }

  private async processOne(
    action: OfflineSyncActionDto,
    idMap: Record<string, number>,
    user: any,
  ): Promise<OfflineSyncActionResult> {
    try {
      let serverId: number | undefined;

      switch (action.type) {
        case "CREATE_DONOR": {
          const payload = { ...action.payload } as CreateDonorDto;
          if (
            payload.assigned_to_user_id == null &&
            (payload as any).assigned_user_id
          ) {
            (payload as any).assigned_to_user_id = (
              payload as any
            ).assigned_user_id;
          }
          const donor = await this.donorService.register(payload, user);
          serverId = donor.id;
          break;
        }
        case "UPDATE_DONOR": {
          const donorId = this.resolveRef(
            action.payload.donor_id ?? action.local_id,
            idMap,
            "donor_id",
          );
          const patch = { ...action.payload };
          delete patch.donor_id;
          delete patch.local_id;
          const updated = await this.donorService.update(
            donorId!,
            patch as any,
            user,
          );
          serverId = updated.id;
          break;
        }
        case "CREATE_DONATION": {
          const payload = { ...action.payload } as Record<string, any>;
          if (payload.source && !payload.donation_source) {
            payload.donation_source = payload.source;
          }
          delete payload.source;
          delete payload.collection_center;

          const localDonor =
            payload.local_donor_id ?? payload.donor_id;
          if (localDonor != null) {
            payload.donor_id = this.resolveRef(
              localDonor,
              idMap,
              "donor_id",
            );
          }
          delete payload.local_donor_id;

          const { donationId } = await this.donationsService.create(
            payload as CreateDonationDto,
            user,
          );
          serverId = donationId;
          break;
        }
        case "UPDATE_DONATION": {
          const donationId = this.resolveRef(
            action.payload.donation_id ?? action.local_id,
            idMap,
            "donation_id",
          );
          const patch = { ...action.payload } as Record<string, any>;
          delete patch.donation_id;
          delete patch.local_id;
          delete patch.local_donor_id;
          delete patch.donor;
          delete patch.source;
          delete patch.collection_center;
          delete patch.in_kind_items;
          const updated = await this.donationsService.update(
            donationId!,
            patch as UpdateDonationDto,
            user,
          );
          serverId = updated.id;
          break;
        }
        case "CREATE_DONATION_BOX_DONATION": {
          const payload = {
            ...action.payload,
          } as CreateDonationBoxDonationDto;
          const created = await this.donationBoxDonationService.create(
            payload,
            user?.id,
          );
          serverId = created.id;
          break;
        }
        default:
          throw new BadRequestException(`Unknown action type: ${action.type}`);
      }

      return {
        queue_id: action.queue_id,
        local_id: action.local_id,
        success: true,
        server_id: serverId,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.logger.warn(
        `Offline sync failed ${action.type} ${action.local_id}: ${msg}`,
      );
      return {
        queue_id: action.queue_id,
        local_id: action.local_id,
        success: false,
        error: msg,
      };
    }
  }
}
