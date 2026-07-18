import { Test, TestingModule } from "@nestjs/testing";
import { QrCodeController } from "./qr_code.controller";
import { QrCodeService } from "./qr_code.service";

describe("QrCodeController", () => {
  let controller: QrCodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrCodeController],
      providers: [QrCodeService],
    }).compile();

    controller = module.get<QrCodeController>(QrCodeController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
