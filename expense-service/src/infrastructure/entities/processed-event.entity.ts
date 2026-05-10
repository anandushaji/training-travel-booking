import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('processed_events')
export class ProcessedEventEntity {
  @PrimaryColumn()
  eventId!: string;

  @Column({ name: 'event_type' })
  eventType!: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;
}
