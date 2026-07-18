import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProgressWorkflowTemplate } from "./progress_workflow_template.entity";
import { ProgressWorkflowTemplateStep } from "./progress_workflow_template_step.entity";
import { ProgressWorkflowTemplatesService } from "./progress-workflow-templates.service";
import { ProgressWorkflowTemplatesController } from "./progress-workflow-templates.controller";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgressWorkflowTemplate,
      ProgressWorkflowTemplateStep,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ProgressWorkflowTemplatesController],
  providers: [ProgressWorkflowTemplatesService],
  exports: [ProgressWorkflowTemplatesService],
})
export class ProgressWorkflowTemplatesModule implements OnModuleInit {
  constructor(
    private readonly templatesService: ProgressWorkflowTemplatesService,
  ) {}

  async onModuleInit() {
    await this.templatesService.ensureSeedTemplates();
  }
}
