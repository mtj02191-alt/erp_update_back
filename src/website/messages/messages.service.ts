import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { WebMessage } from "./entities/message.entity";

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(WebMessage)
    private readonly messageRepository: Repository<WebMessage>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<WebMessage> {
    const message = this.messageRepository.create(createMessageDto);
    return await this.messageRepository.save(message);
  }

  async findAll(): Promise<WebMessage[]> {
    return await this.messageRepository.find({
      where: { is_archived: false },
      order: { created_at: "DESC" },
    });
  }

  async findOne(id: number): Promise<WebMessage> {
    try {
      const message = await this.messageRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }
      return message;
    } catch (error) {
      console.log("error 2143ew", error);
    }
    const message = await this.messageRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }
    return message;
  }

  async update(
    id: number,
    updateMessageDto: UpdateMessageDto,
  ): Promise<WebMessage> {
    const message = await this.findOne(id);
    Object.assign(message, updateMessageDto);
    return await this.messageRepository.save(message);
  }

  async remove(id: number): Promise<void> {
    const message = await this.findOne(id);
    message.is_archived = true;
    await this.messageRepository.save(message);
  }
}
