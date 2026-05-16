/**
 * fn-tokens/no-default-utilities
 *
 * Bans Tailwind's default spacing/sizing/color/radius/shadow/font-size
 * utilities in `className` strings. Only `fn-*` utilities and a small
 * allow-list of layout/transition/positioning utilities are permitted.
 *
 * The rule walks every string literal inside a `className=` attribute
 * (raw Literals, TemplateElements, and string args inside `cn()` /
 * `clsx()` / `cva()` etc.), tokenizes by whitespace, strips Tailwind
 * variants (`hover:`, `md:`, `dark:`, `data-[…]:`, `&_*:`, etc.), and
 * tests each utility against the banned-pattern list.
 *
 * Escape hatch:
 *   // eslint-disable-next-line fn-tokens/no-default-utilities
 *   <div className="p-4" />   // genuinely required default utility
 *
 * Rationale and the full ban list live in
 *   packages/config/tailwind/extracted-tokens.md
 *   docs/prompts/CLAUDE_CODE_VISUAL_FIDELITY_ADDENDUM.md (after C.1).
 */

/** Tailwind variant prefix matcher — anything that precedes the last `:`. */
const VARIANT_RE = /^(?:[a-z0-9_-]+|\[[^\]]+\]|&[^:]*|data-\[[^\]]+\]|aria-\[[^\]]+\]):/i;

/** Strip every leading variant prefix from a utility token. */
function stripVariants(token) {
  let t = token;
  // Strip leading '!' (Tailwind important prefix).
  if (t.startsWith('!')) t = t.slice(1);
  // Strip leading '-' (negative).
  const neg = t.startsWith('-');
  if (neg) t = t.slice(1);
  while (VARIANT_RE.test(t)) {
    t = t.replace(VARIANT_RE, '');
  }
  return { base: t, negated: neg };
}

/**
 * Banned patterns. Each entry: { re: RegExp, name: string, hint: string }.
 *
 * IMPORTANT: matches are run against the *post-variant-strip* base, so
 * `hover:bg-blue-500` reduces to `bg-blue-500` and `md:dark:p-4` to `p-4`.
 *
 * The hint is shown in the error message and points the author at the
 * fn-* utility (or the catalog) they should be using.
 */
const BANS = [
  // ---- Spacing (p/m/gap/space/inset/size/width/height/min/max) ----
  {
    re: /^(?:p|m|gap|space)[xytrbl]?-(?:\d+(?:\.\d+)?|px|auto|full|screen|min|max|fit)$/,
    name: 'spacing',
    hint: 'use p-fn-* / m-fn-* / gap-fn-* (see fn-tokens.css §4.9)',
  },
  {
    re: /^-?(?:inset|top|right|bottom|left|start|end)-(?:\d+(?:\.\d+)?|px|auto|full)$/,
    name: 'inset',
    hint: 'use inset-fn-* / top-fn-* etc.',
  },
  {
    re: /^(?:w|h|min-w|min-h|max-w|max-h|size)-(?:\d+(?:\.\d+)?|px|full|screen|fit|min|max|auto)$/,
    name: 'sizing',
    hint: 'use w-fn-* / h-fn-* / size-fn-*',
  },
  // ---- Font size ----
  {
    re: /^text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
    name: 'font-size',
    hint: 'use text-fn-* (see fn-tokens.css §4.5)',
  },
  // ---- Font weight ----
  {
    re: /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    name: 'font-weight',
    hint: 'use font-fn-normal/medium/semibold/bold/extrabold',
  },
  // ---- Line height + tracking ----
  {
    re: /^leading-(?:\d+(?:\.\d+)?|none|tight|snug|normal|relaxed|loose)$/,
    name: 'line-height',
    hint: 'use leading-fn-*',
  },
  {
    re: /^tracking-(?:tighter|tight|normal|wide|wider|widest)$/,
    name: 'tracking',
    hint: 'use tracking-fn-*',
  },
  // ---- Radius ----
  {
    re: /^rounded(?:-[trblse]|-[xy])?-(?:none|sm|md|lg|xl|2xl|3xl|full|\d+)$/,
    name: 'radius',
    hint: 'use rounded-fn-* (see fn-tokens.css §4.2)',
  },
  // ---- Shadow ----
  {
    re: /^shadow-(?:none|sm|md|lg|xl|2xl|inner|\d+)$/,
    name: 'shadow',
    hint: 'use shadow-fn-* (see fn-tokens.css §4.3)',
  },
  // ---- Tailwind color palette (bg/text/border/ring/from/to/via/divide/decoration/outline) ----
  {
    re: /^(?:bg|text|border|ring|outline|from|to|via|divide|decoration|placeholder|accent|caret|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?$/,
    name: 'color',
    hint: 'use the fn-* color (bg-fn-accent, text-fn-fg, border-fn-border, …)',
  },
  // ---- Border width default keys (border, border-2, border-4 etc.) ----
  // Allowed: plain `border` for 1px is too embedded; only ban explicit numerics > 1px.
  {
    re: /^border(?:-[trblxyse])?-(?:[2-9]|\d{2,})$/,
    name: 'border-width',
    hint: 'use border-fn-* if a non-1px border is intentional',
  },
];

const meta = {
  type: 'problem',
  docs: {
    description:
      'Disallow Tailwind default utilities for properties that have fn-* tokens (spacing, sizing, color, radius, shadow, font-size, font-weight, line-height, tracking).',
    recommended: true,
  },
  messages: {
    banned:
      'Tailwind default utility "{{token}}" ({{name}}) is not allowed under the design-system lockdown. {{hint}}.',
  },
  schema: [
    {
      type: 'object',
      properties: {
        // Extra utility names to allow even if they match a banned pattern.
        allow: { type: 'array', items: { type: 'string' } },
        // Extra attribute names to scan besides `className` / `class`.
        attributes: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  ],
};

/** Walk a JSX attribute value or call expression argument, collecting strings to check. */
function collectStrings(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') out.push({ value: node.value, loc: node });
      return;
    case 'TemplateLiteral':
      for (const q of node.quasis) {
        out.push({ value: q.value.cooked ?? q.value.raw ?? '', loc: q });
      }
      return;
    case 'JSXExpressionContainer':
      collectStrings(node.expression, out);
      return;
    case 'CallExpression':
      // cn(...), clsx(...), cva(...), tw(...), classNames(...)
      for (const arg of node.arguments) collectStrings(arg, out);
      return;
    case 'ArrayExpression':
      for (const el of node.elements) collectStrings(el, out);
      return;
    case 'ObjectExpression':
      // { 'p-4 text-sm': condition }
      for (const prop of node.properties) {
        if (prop.type === 'Property') {
          // The KEY may be a string literal of class tokens.
          if (prop.key && (prop.key.type === 'Literal' || prop.key.type === 'TemplateLiteral')) {
            collectStrings(prop.key, out);
          }
        }
      }
      return;
    case 'ConditionalExpression':
      collectStrings(node.consequent, out);
      collectStrings(node.alternate, out);
      return;
    case 'LogicalExpression':
    case 'BinaryExpression':
      collectStrings(node.left, out);
      collectStrings(node.right, out);
      return;
    case 'SpreadElement':
      collectStrings(node.argument, out);
      return;
  }
}

const rule = {
  meta,
  create(context) {
    const opts = context.options[0] || {};
    const allow = new Set(opts.allow || []);
    const extraAttrs = new Set(opts.attributes || []);
    const checkedAttrs = new Set(['className', 'class', ...extraAttrs]);

    function scan(node, attrName) {
      const strings = [];
      collectStrings(node, strings);

      for (const { value, loc } of strings) {
        const tokens = value.split(/\s+/).filter(Boolean);
        for (const token of tokens) {
          if (allow.has(token)) continue;
          const { base } = stripVariants(token);
          if (!base || allow.has(base)) continue;
          for (const ban of BANS) {
            if (ban.re.test(base)) {
              context.report({
                node: loc,
                messageId: 'banned',
                data: { token, name: ban.name, hint: ban.hint },
              });
              break;
            }
          }
        }
        void attrName;
      }
    }

    return {
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return;
        if (!checkedAttrs.has(node.name.name)) return;
        scan(node.value, node.name.name);
      },
      // Also scan calls to common class-helper functions even when not inside JSX
      // (e.g. cva() definitions in components/ui/*.tsx).
      CallExpression(node) {
        if (!node.callee) return;
        const callee = node.callee.type === 'Identifier' ? node.callee.name : null;
        if (!callee) return;
        if (!['cn', 'clsx', 'classNames', 'cva', 'tv', 'tw', 'twMerge'].includes(callee)) return;
        for (const arg of node.arguments) scan(arg, callee);
      },
    };
  },
};

const plugin = {
  meta: { name: 'fn-tokens', version: '1.0.0' },
  rules: {
    'no-default-utilities': rule,
  },
};

export default plugin;
