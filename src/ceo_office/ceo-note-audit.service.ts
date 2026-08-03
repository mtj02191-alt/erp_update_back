import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { CeoNoteAudit } from "./entities/ceo-note-audit.entity";
import { CeoNote } from "./entities/ceo-note.entity";
import { User } from "../users/user.entity";

@Injectable()
export class CeoNoteAuditService {
  constructor(
    @InjectRepository(CeoNoteAudit)
    private readonly ceoNoteAuditRepository: Repository<CeoNoteAudit>,
  ) {}

  async log(
    note: CeoNote,
    user: User,
    action: string,
    oldValue?: any,
    newValue?: any,
    manager?: EntityManager,
  ): Promise<CeoNoteAudit> {
    const repository = manager ? manager.getRepository(CeoNoteAudit) : this.ceoNoteAuditRepository;
    const audit = repository.create({
      note_id: note.id,
      user_id: user?.id || null,
      action,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
    return repository.save(audit);
  }
}
