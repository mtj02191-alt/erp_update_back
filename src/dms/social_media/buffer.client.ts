import { HttpException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
}

export interface BufferCreatePostResult {
  postId: string;
  dueAt?: string;
}

export type BufferPostStatus =
  | "draft"
  | "needs_approval"
  | "scheduled"
  | "sending"
  | "sent"
  | "error";

export interface BufferPostDetails {
  id: string;
  status: BufferPostStatus;
  dueAt?: string | null;
  sentAt?: string | null;
  error?: { message: string } | null;
}

@Injectable()
export class BufferClient {
  private readonly logger = new Logger(BufferClient.name);
  private readonly apiUrl = "https://api.buffer.com";

  constructor(private readonly config: ConfigService) {}

  private getApiKey(): string {
    const key = this.config.get<string>("BUFFER_API_KEY");
    if (!key?.trim()) {
      throw new HttpException(
        "Buffer is not configured. Set BUFFER_API_KEY in environment.",
        500,
      );
    }
    return key.trim();
  }

  private async request<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json()) as {
      data?: T;
      errors?: { message: string }[];
    };

    if (!res.ok || json.errors?.length) {
      const msg = json.errors?.[0]?.message || `Buffer API error (${res.status})`;
      this.logger.warn(msg);
      throw new HttpException(msg, res.status >= 400 ? res.status : 502);
    }

    return json.data as T;
  }

  async getDefaultOrganizationId(): Promise<string> {
    const fromEnv = this.config.get<string>("BUFFER_ORGANIZATION_ID");
    if (fromEnv?.trim()) return fromEnv.trim();

    const data = await this.request<{
      account: { organizations: { id: string }[] };
    }>(`
      query {
        account {
          organizations { id }
        }
      }
    `);

    const id = data?.account?.organizations?.[0]?.id;
    if (!id) {
      throw new HttpException("No Buffer organization found on this account", 404);
    }
    return id;
  }

  async listChannels(organizationId?: string): Promise<BufferChannel[]> {
    const orgId = organizationId || (await this.getDefaultOrganizationId());
    const data = await this.request<{
      channels: BufferChannel[];
    }>(
      `
      query Channels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id
          name
          service
        }
      }
    `,
      { organizationId: orgId },
    );
    return data?.channels ?? [];
  }

  private resolveMetadataBlockForService(service?: string | null): string {
    const s = String(service || "").toLowerCase();
    // Buffer validation: Facebook channels require explicit metadata.facebook.type.
    // PostTypeFacebook enum values: post | story | reel
    if (s === "facebook") return `metadata: { facebook: { type: post } }`;
    return "";
  }

  async createPost(input: {
    channelId: string;
    text: string;
    imageUrl?: string | null;
    scheduledAt?: Date | null;
    channelService?: string | null;
  }): Promise<BufferCreatePostResult> {
    const hasSchedule =
      input.scheduledAt && input.scheduledAt.getTime() > Date.now() + 60_000;
    const escapeGqlString = (v: string) =>
      v
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");

    const channelId = escapeGqlString(input.channelId);
    const text = escapeGqlString(input.text);

    const assetsBlock = input.imageUrl?.trim()
      ? `assets: [{ image: { url: "${escapeGqlString(input.imageUrl.trim())}" } }]`
      : "";

    const scheduleBlock = hasSchedule
      ? `mode: customScheduled dueAt: "${input.scheduledAt!.toISOString()}"`
      : `mode: addToQueue`;

    const metadataBlock = this.resolveMetadataBlockForService(input.channelService);

    // Buffer GraphQL docs use inline input objects; this avoids guessing the input type name.
    const mutation = `
      mutation {
        createPost(input: {
          channelId: "${channelId}"
          text: "${text}"
          schedulingType: automatic
          ${metadataBlock}
          ${scheduleBlock}
          ${assetsBlock}
        }) {
          ... on PostActionSuccess {
            post { id dueAt }
          }
          ... on MutationError {
            message
          }
        }
      }
    `;

    const data = await this.request<{
      createPost:
        | { post: { id: string; dueAt?: string } }
        | { message: string };
    }>(mutation);

    const result = data?.createPost;
    if (!result || "post" in result === false) {
      const msg = (result as any)?.message || "Buffer failed to create post";
      throw new HttpException(msg, 400);
    }

    return {
      postId: result.post.id,
      dueAt: result.post.dueAt,
    };
  }

  async getPost(postId: string): Promise<BufferPostDetails> {
    const data = await this.request<{
      post: BufferPostDetails;
    }>(
      `
      query GetPost($id: PostId!) {
        post(input: { id: $id }) {
          id
          status
          dueAt
          sentAt
          error { message }
        }
      }
    `,
      { id: postId },
    );

    if (!data?.post?.id) {
      throw new HttpException(`Buffer post not found: ${postId}`, 404);
    }
    return data.post;
  }
}
