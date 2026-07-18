import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post("website_message")
  async create(@Body() createMessageDto: CreateMessageDto) {
    return await this.messagesService.create(createMessageDto);
  }

  @Get("website_messages")
  async findAll() {
    return await this.messagesService.findAll();
  }

  // @Get(':id')
  // async findOne(@Param('id') id: string) {
  //   return await this.messagesService.findOne(+id);
  // }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return await this.messagesService.update(+id, updateMessageDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.messagesService.remove(+id);
    return { message: "Message deleted successfully" };
  }
}
