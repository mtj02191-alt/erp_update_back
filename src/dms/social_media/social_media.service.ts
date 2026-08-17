import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import {
  SocialPost,
  SocialPostStatus,
} from "./entities/social-post.entity";
import { CreateSocialPostDto } from "./dto/create-social-post.dto";
import { UpdateSocialPostDto } from "./dto/update-social-post.dto";
import { BufferClient, BufferPostStatus } from "./buffer.client";

const SORTABLE = new Set([
  "id",
  "created_at",
  "updated_at",
  "scheduled_at",
  "status",
]);

@Injectable()
export class SocialMediaService {
  constructor(
    @InjectRepository(SocialPost)
    private readonly socialPostRepo: Repository<SocialPost>,
    private readonly bufferClient: BufferClient,
  ) {}

  async search(payload: Record<string, any>) {
    const pagination = payload.pagination || {};
    const page = Math.max(1, Number(pagination.page) || 1);
    let pageSize = Number(pagination.pageSize);
    if (!Number.isFinite(pageSize)) pageSize = 10;
    if (pagination.pageSize === 0) pageSize = 0;

    const sortField = SORTABLE.has(pagination.sortField)
      ? pagination.sortField
      : "created_at";
    const sortOrder =
      String(pagination.sortOrder || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const filters = payload.filters || payload;

    const qb = this.socialPostRepo
      .createQueryBuilder("sp")
      .where("sp.is_archived = false");

    if (filters.status) {
      qb.andWhere("sp.status = :status", { status: filters.status });
    }
    if (filters.campaign_id) {
      qb.andWhere("sp.campaign_id = :campaignId", {
        campaignId: Number(filters.campaign_id),
      });
    }
    if (filters.appeal_id) {
      qb.andWhere("sp.appeal_id = :appealId", {
        appealId: Number(filters.appeal_id),
      });
    }
    if (filters.search) {
      const term = `%${String(filters.search).trim()}%`;
      qb.andWhere(
        "(sp.post_text ILIKE :term OR sp.buffer_channel_name ILIKE :term)",
        { term },
      );
    }

    const total = await qb.clone().getCount();
    qb.orderBy(`sp.${sortField}`, sortOrder);
    if (pageSize > 0) {
      qb.skip((page - 1) * pageSize).take(pageSize);
    }

    const data = await qb.getMany();
    const totalPages =
      pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    return {
      data,
      pagination: { page, pageSize, total, totalPages },
    };
  }

  async findOne(id: number): Promise<SocialPost> {
    const row = await this.socialPostRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!row) {
      throw new NotFoundException("Social post not found");
    }
    return row;
  }

  async create(dto: CreateSocialPostDto): Promise<SocialPost> {
    if (!dto.post_text?.trim() && !dto.image_url) {
      throw new BadRequestException("Post text or image is required");
    }

    const row = this.socialPostRepo.create({
      campaign_id: dto.campaign_id ?? null,
      appeal_id: dto.appeal_id ?? null,
      buffer_channel_id: dto.buffer_channel_id ?? null,
      buffer_channel_name: dto.buffer_channel_name ?? null,
      post_text: dto.post_text?.trim() ?? null,
      image_url: dto.image_url ?? null,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      status: dto.status ?? SocialPostStatus.DRAFT,
    });

    const saved = await this.socialPostRepo.save(row);

    if (dto.publish_to_buffer) {
      return this.publishToBuffer(saved.id);
    }
    return saved;
  }

  async update(id: number, dto: UpdateSocialPostDto): Promise<SocialPost> {
    const row = await this.findOne(id);
    if (
      row.status === SocialPostStatus.PUBLISHED &&
      dto.publish_to_buffer !== true
    ) {
      throw new BadRequestException(
        "Published posts cannot be edited. Create a new post instead.",
      );
    }

    if (dto.campaign_id !== undefined) row.campaign_id = dto.campaign_id ?? null;
    if (dto.appeal_id !== undefined) row.appeal_id = dto.appeal_id ?? null;
    if (dto.buffer_channel_id !== undefined) {
      row.buffer_channel_id = dto.buffer_channel_id ?? null;
    }
    if (dto.buffer_channel_name !== undefined) {
      row.buffer_channel_name = dto.buffer_channel_name ?? null;
    }
    if (dto.post_text !== undefined) row.post_text = dto.post_text?.trim() ?? null;
    if (dto.image_url !== undefined) row.image_url = dto.image_url ?? null;
    if (dto.scheduled_at !== undefined) {
      row.scheduled_at = dto.scheduled_at ? new Date(dto.scheduled_at) : null;
    }
    if (dto.status !== undefined) row.status = dto.status;

    const saved = await this.socialPostRepo.save(row);
    if (dto.publish_to_buffer) {
      return this.publishToBuffer(saved.id);
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    row.is_archived = true;
    row.status = SocialPostStatus.CANCELLED;
    await this.socialPostRepo.save(row);
  }

  async publishToBuffer(id: number): Promise<SocialPost> {
    const row = await this.findOne(id);

    if (!row.buffer_channel_id) {
      throw new BadRequestException("Buffer channel is required to publish");
    }
    if (!row.post_text?.trim()) {
      throw new BadRequestException("Post text is required to publish");
    }

    try {
      const channels = await this.bufferClient.listChannels();
      const channel = channels.find((c) => c.id === row.buffer_channel_id) || null;
      const result = await this.bufferClient.createPost({
        channelId: row.buffer_channel_id,
        text: row.post_text,
        imageUrl: row.image_url,
        scheduledAt: row.scheduled_at,
        channelService: channel?.service || null,
      });

      row.buffer_post_id = result.postId;
      row.status = SocialPostStatus.SCHEDULED;
      if (result.dueAt) {
        row.scheduled_at = new Date(result.dueAt);
      }
      row.last_error = null;
      return this.socialPostRepo.save(row);
    } catch (err: any) {
      row.status = SocialPostStatus.FAILED;
      row.last_error = err?.message || String(err);
      await this.socialPostRepo.save(row);
      throw err;
    }
  }

  listBufferChannels() {
    return this.bufferClient.listChannels();
  }

  private mapBufferStatusToLocal(
    bufferStatus: BufferPostStatus,
  ): SocialPostStatus {
    switch (bufferStatus) {
      case "sent":
        return SocialPostStatus.PUBLISHED;
      case "error":
        return SocialPostStatus.FAILED;
      case "draft":
      case "needs_approval":
        return SocialPostStatus.DRAFT;
      case "scheduled":
      case "sending":
      default:
        return SocialPostStatus.SCHEDULED;
    }
  }

  private async applyBufferPostToRow(row: SocialPost): Promise<{
    updated: boolean;
    oldStatus: SocialPostStatus;
    bufferStatus: BufferPostStatus;
  }> {
    if (!row.buffer_post_id?.trim()) {
      throw new BadRequestException(
        "Post has not been published to Buffer yet (no buffer_post_id)",
      );
    }

    const oldStatus = row.status;
    const bufferPost = await this.bufferClient.getPost(row.buffer_post_id.trim());
    const newStatus = this.mapBufferStatusToLocal(bufferPost.status);
    let hasChanges = newStatus !== row.status;

    if (bufferPost.dueAt) {
      const due = new Date(bufferPost.dueAt);
      if (
        !row.scheduled_at ||
        row.scheduled_at.getTime() !== due.getTime()
      ) {
        row.scheduled_at = due;
        hasChanges = true;
      }
    }

    if (bufferPost.status === "error" && bufferPost.error?.message) {
      if (row.last_error !== bufferPost.error.message) {
        row.last_error = bufferPost.error.message;
        hasChanges = true;
      }
    } else if (row.last_error) {
      row.last_error = null;
      hasChanges = true;
    }

    if (hasChanges) {
      row.status = newStatus;
      await this.socialPostRepo.save(row);
    }

    return {
      updated: hasChanges,
      oldStatus,
      bufferStatus: bufferPost.status,
    };
  }

  async syncBufferPostStatus(id: number): Promise<{
    updated: boolean;
    oldStatus: SocialPostStatus;
    newStatus: SocialPostStatus;
    bufferStatus: BufferPostStatus;
    post: SocialPost;
    message: string;
  }> {
    const row = await this.findOne(id);
    if (row.status === SocialPostStatus.CANCELLED) {
      throw new BadRequestException("Cancelled posts cannot be synced");
    }

    const result = await this.applyBufferPostToRow(row);
    const message = result.updated
      ? `Status updated from ${result.oldStatus} to ${row.status} (Buffer: ${result.bufferStatus})`
      : `Status is up to date (Buffer: ${result.bufferStatus})`;

    return {
      updated: result.updated,
      oldStatus: result.oldStatus,
      newStatus: row.status,
      bufferStatus: result.bufferStatus,
      post: row,
      message,
    };
  }

  /**
   * Sync local social_posts.status (and schedule/error fields) from Buffer
   * for every non-archived row that has buffer_post_id.
   */
  async syncBufferPostStatuses(): Promise<{
    total: number;
    updated: number;
    unchanged: number;
    failed: number;
    results: Array<{
      id: number;
      buffer_post_id: string;
      oldStatus: SocialPostStatus;
      newStatus?: SocialPostStatus;
      error?: string;
    }>;
  }> {
    const rows = await this.socialPostRepo.find({
      where: {
        is_archived: false,
        buffer_post_id: Not(IsNull()),
      },
    });

    const toSync = rows.filter((r) => r.status !== SocialPostStatus.CANCELLED);

    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const results: Array<{
      id: number;
      buffer_post_id: string;
      oldStatus: SocialPostStatus;
      newStatus?: SocialPostStatus;
      error?: string;
    }> = [];

    for (const row of toSync) {
      const bufferPostId = row.buffer_post_id as string;
      const oldStatus = row.status;

      try {
        const result = await this.applyBufferPostToRow(row);
        if (result.updated) {
          updated++;
          results.push({
            id: row.id,
            buffer_post_id: bufferPostId,
            oldStatus,
            newStatus: row.status,
          });
        } else {
          unchanged++;
          results.push({
            id: row.id,
            buffer_post_id: bufferPostId,
            oldStatus,
            newStatus: oldStatus,
          });
        }
      } catch (err: any) {
        failed++;
        results.push({
          id: row.id,
          buffer_post_id: bufferPostId,
          oldStatus,
          error: err?.message || String(err),
        });
      }
    }

    return {
      total: toSync.length,
      updated,
      unchanged,
      failed,
      results,
    };
  }
}
