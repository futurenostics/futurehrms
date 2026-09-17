import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components';

export interface NotificationEmailProps {
  recipientName: string;
  title: string;
  body: string;
  link: string | null;
}

/**
 * The one shared layout for every notification type. Ported 1:1 from
 * the hand-written HTML string that used to live in EmailChannel —
 * same colors, same spacing, same copy. No new visual design here;
 * this only changes how the HTML gets built, not what it looks like.
 * See docs/DECISIONS.md if per-type templates get scoped later.
 */
export function NotificationEmail({ recipientName, title, body, link }: NotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.greeting}>Hi {recipientName},</Text>
          <Heading style={styles.heading}>{title}</Heading>
          <Text style={styles.paragraph}>{renderLines(body)}</Text>
          {link ? (
            <Button href={link} style={styles.button}>
              Open in Futurenostics
            </Button>
          ) : null}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>Futurenostics HRMS · automated notification</Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Turns `\n` line breaks in the body text into real <br/> elements. */
function renderLines(body: string) {
  const lines = body.split('\n');
  return lines.flatMap((line, i) => (i === 0 ? [line] : [<br key={i} />, line]));
}

const styles = {
  body: {
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    backgroundColor: '#f5f5f8',
    padding: '32px',
    color: '#1a1a23',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: '#fff',
    border: '1px solid #e5e5ee',
    borderRadius: '12px',
    padding: '32px',
  },
  greeting: {
    margin: '0 0 8px',
    color: '#6b6b78',
    fontSize: '13px',
  },
  heading: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a23',
    letterSpacing: '-0.01em',
  },
  paragraph: {
    margin: '0',
    fontSize: '14px',
    lineHeight: '1.55',
    color: '#3d3d4a',
  },
  button: {
    display: 'inline-block',
    marginTop: '24px',
    padding: '10px 18px',
    backgroundColor: '#5b53f5',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
  },
  hr: {
    margin: '32px 0 16px',
    border: 'none',
    borderTop: '1px solid #e5e5ee',
  },
  footer: {
    margin: '0',
    color: '#9a9aab',
    fontSize: '11px',
  },
} as const;
