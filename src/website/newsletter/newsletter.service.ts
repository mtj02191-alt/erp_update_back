import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateNewsletterDto } from "./dto/create-newsletter.dto";
import { UpdateNewsletterDto } from "./dto/update-newsletter.dto";
import { NewsletterSubscriber } from "./entities/newsletter.entity";

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly newsletterRepository: Repository<NewsletterSubscriber>,
  ) {}

  async create(
    createNewsletterDto: CreateNewsletterDto,
  ): Promise<NewsletterSubscriber> {
    const subscriber = this.newsletterRepository.create(createNewsletterDto);
    return await this.newsletterRepository.save(subscriber);
  }

  async findAll(): Promise<NewsletterSubscriber[]> {
    return await this.newsletterRepository.find({
      where: { is_archived: false },
      order: { created_at: "DESC" },
    });
  }

  async findOne(id: number): Promise<NewsletterSubscriber> {
    const subscriber = await this.newsletterRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!subscriber) {
      throw new NotFoundException(
        `Newsletter subscriber with ID ${id} not found`,
      );
    }
    return subscriber;
  }

  async update(
    id: number,
    updateNewsletterDto: UpdateNewsletterDto,
  ): Promise<NewsletterSubscriber> {
    const subscriber = await this.findOne(id);
    Object.assign(subscriber, updateNewsletterDto);
    return await this.newsletterRepository.save(subscriber);
  }

  async remove(id: number): Promise<void> {
    const subscriber = await this.findOne(id);
    subscriber.is_archived = true;
    await this.newsletterRepository.save(subscriber);
  }
}
