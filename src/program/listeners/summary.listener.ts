import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EntityManager } from "typeorm";

@Injectable()
export class MISummaryListener {
  private readonly logger = new Logger(MISummaryListener.name);

  @OnEvent("expense.created")
  async handleReportCreated(payload: { dto: any; manager: EntityManager }) {
    const { dto, manager } = payload;

    try {
      await manager.query(
        `
        UPDATE mis_summary
        SET total_spent = total_spent + $1
        WHERE program_id = $2
        `,
        [dto.quantity, dto.areaId],
      );

      this.logger.log(
        `Dashboard summary updated successfully for area ${dto.areaId}, added ${dto.quantity}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update dashboard summary for area ${dto.areaId}`,
        error.stack,
      );
      // ❌ Important: rethrow so the transaction rolls back
      throw error;
    }
  }
}
