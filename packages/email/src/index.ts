import { createElement } from 'react';
import { render } from '@react-email/render';
import { NotificationEmail, type NotificationEmailProps } from './notification-email';

export { NotificationEmail };
export type { NotificationEmailProps };

/**
 * Renders the notification email to HTML + a plain-text fallback.
 *
 * The plain-text version is auto-derived from the rendered HTML
 * (`render(..., { plainText: true })`) rather than hand-written — one
 * fewer copy of the copy to keep in sync compared to the old
 * hand-written renderHtml()/textFallback() pair in EmailChannel.
 */
export async function renderNotificationEmail(
  props: NotificationEmailProps,
): Promise<{ html: string; text: string }> {
  const element = createElement(NotificationEmail, props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}
