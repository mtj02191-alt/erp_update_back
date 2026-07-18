import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableColumn,
    TableForeignKey,
  } from 'typeorm';
  
  export class CreateAddressTable1693934185528 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.createTable(
        new Table({
          name: 'address',
          columns: [
            {
              name: 'id',
              type: 'bigint',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'addressable_type',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'address1',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'address2',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'zip_code',
              type: 'varchar',
              length: '10',
              isNullable: false,
            },
            {
              name: 'city',
              type: 'varchar',
              length: '60',
              isNullable: false,
            },
            {
              name: 'state',
              type: 'varchar',
              length: '60',
              isNullable: false,
            },
            {
              name: 'country',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            {
              name: 'county',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'latitude',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: `'0'::numeric`,
            },
            {
              name: 'longitude',
              type: 'decimal',
              precision: 10,
              scale: 2,
              default: `'0'::numeric`,
            },
            {
              name: 'coordinates',
              type: 'point',
              isNullable: true,
            },
            {
              name: 'tenant_id',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              precision: 6,
              default: `('now'::text)::timestamp(6) with time zone`,
              isNullable: false,
            },
            {
              name: 'addressable_id',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'created_by',
              type: 'bigint',
              isNullable: false,
            },
          ],
        })
      );
  
      await queryRunner.createForeignKey(
        'address',
        new TableForeignKey({
          columnNames: ['created_by'],
          referencedColumnNames: ['id'],
          referencedTableName: 'user',
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        })
      );
  
      await queryRunner.createForeignKey(
        'address',
        new TableForeignKey({
          columnNames: ['tenant_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'tenant',
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION',
        })
      );
    }
  
    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropForeignKey('address', 'FK_created_by');
      await queryRunner.dropForeignKey('address', 'FK_tenant_id');
  
      await queryRunner.dropTable('address');
    }
  }
  