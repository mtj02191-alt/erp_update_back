import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateKanbanColumns1780465000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "kanban_columns",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255",
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50",
                        isUnique: true,
                    },
                    {
                        name: "type",
                        type: "enum",
                        enum: ["default", "custom"],
                        default: "'custom'",
                    },
                    {
                        name: "order",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "color",
                        type: "varchar",
                        length: "50",
                        isNullable: true,
                    },
                    {
                        name: "created_by_id",
                        type: "int",
                        isNullable: true,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        await queryRunner.createForeignKey(
            "kanban_columns",
            new TableForeignKey({
                columnNames: ["created_by_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "SET NULL",
            })
        );

        // Insert default columns
        await queryRunner.query(`
            INSERT INTO kanban_columns (name, status, type, "order", color) VALUES
            ('To Do', 'open', 'default', 0, '#9ca3af'),
            ('In Progress', 'in_progress', 'default', 1, '#3b82f6'),
            ('Pending Approval', 'pending_approval', 'default', 2, '#f59e0b'),
            ('Completed', 'completed', 'default', 3, '#10b981');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("kanban_columns", true);
    }
}
