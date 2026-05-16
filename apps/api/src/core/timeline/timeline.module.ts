import { Global, Module } from '@nestjs/common';
import { TimelineSubscriber } from './timeline.subscriber';

/**
 * Timeline plumbing. The subscriber inside listens for every domain
 * event under `employee.*` (and future modules' events as they land)
 * and projects them onto `TimelineEntry` rows attached to the affected
 * employee. The Employees module's profile-page Timeline tab reads
 * from there directly.
 */
@Global()
@Module({
  providers: [TimelineSubscriber],
  exports: [TimelineSubscriber],
})
export class TimelineModule {}
