// import { OnEvent } from '@nestjs/event-emitter';
// import { EntityManager } from 'typeorm';

// export class MisSummaryListener {
//   @OnEvent('expense.created')
//   async handleExpenseCreated(payload: { dto: any; manager: EntityManager }) {
//     console.log("Here 1234567u8i9......");
//     const { dto, manager } = payload;
//     // Use the same transaction manager
//     await manager.query(
//       `
//       UPDATE mis_summary
//       SET total_spent = total_spent + $1
//       WHERE program_id = $2
//       `,
//       [dto.amount, dto.programId]
//     );
//   }
// }
