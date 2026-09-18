import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { EventBusService, type DomainEvent } from '../../core/events/event-bus.service';
import { BenefitsService } from './benefits.service';

@Injectable()
export class BenefitsEventSubscriber implements OnApplicationBootstrap {
  private readonly logger = new Logger(BenefitsEventSubscriber.name);

  constructor(
    private readonly bus: EventBusService,
    private readonly benefits: BenefitsService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.on('employee.created', (e) => void this.onEmployeeCreated(e));
  }

  private async onEmployeeCreated(event: DomainEvent<unknown>): Promise<void> {
    const employeeId = (event.payload as { employeeId?: string })?.employeeId;
    if (!employeeId) return;
    try {
      await this.benefits.ensureCurrentBalances(employeeId);
    } catch (err) {
      this.logger.warn(
        `Could not open benefit balances for ${employeeId}: ${(err as Error).message}`,
      );
    }
  }
}
