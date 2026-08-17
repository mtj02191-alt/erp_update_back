import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { KnowledgeBaseService } from "./knowledge_base.service";
import { KnowledgeBaseController } from "./knowledge_base.controller";

@Module({
  imports: [ConfigModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
