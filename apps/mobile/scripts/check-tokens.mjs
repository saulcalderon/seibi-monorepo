#!/usr/bin/env node
/**
 * check-tokens: fails when a screen or component writes a raw colour or a raw
 * measurement instead of a theme token, so every screen follows
 * docs/DESIGN.md. It reads every .ts/.tsx file under src/ (except the theme
 * itself) with the TypeScript parser and reports:
 *
 * - colours: a string with a hex (#e85322) or rgb()/hsl() colour anywhere,
 *   and any literal colour (named ones too, like 'white') in a colour prop;
 * - measurements: a number other than 0 in a layout or type prop (padding,
 *   gap, width, borderRadius, fontSize… see LAYOUT), in any object: Unistyles'
 *   StyleSheet.create((theme) => …) and its variants, inline style={{…}},
 *   hitSlop; and in the size, width and height props of JSX elements.
 *
 * A value read from the theme (theme.space[6], theme.colors.ink) is never a
 * literal, so it passes. Each failure names the token to use, read from
 * src/theme/tokens.ts and src/theme/palettes.ts.
 *
 * Run it with `pnpm check` at the repo root (Turbo runs typecheck and lint
 * first), or alone with `node --no-warnings scripts/check-tokens.mjs` in
 * apps/mobile.
 *
 * Adapted from Paradero's scripts/check-tokens.mjs, under its licence:
 *
 * MIT License
 *
 * Copyright (c) 2026 Croma and the Paradero contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

import { light, night } from '../src/theme/palettes.ts';
import { radius, space, typeScale } from '../src/theme/tokens.ts';

const APP = new URL('..', import.meta.url).pathname;
const SRC = join(APP, 'src');

// Not scanned. Keep this short and say why each entry is here.
const SKIP = [
  /^src\/theme\//, // the theme: the one place raw values live
  /\.d\.ts$/,
  /\.test\.tsx?$/,
  /\/__tests__\//,
  // Vector art (the logo, body-type silhouettes) draws in its own
  // coordinates: add its file here, one line per file.
];

// Layout and type props whose numbers must come from tokens. 0 is allowed.
const LAYOUT =
  /^(width|height|minWidth|minHeight|maxWidth|maxHeight|flexBasis|gap|rowGap|columnGap|padding\w*|margin\w*|top|left|right|bottom|start|end|inset\w*|borderRadius|border\w+Radius|borderWidth|border\w+Width|fontSize|lineHeight|letterSpacing)$/;
// Props of JSX elements that take a size in points: <Icon size={20} />.
const SIZE_PROPS = new Set(['size', 'width', 'height']);
// Colour props, where even a named colour ('white') is raw.
const COLOR_PROP = /^(color|\w+Color|fill|stroke)$/;
// Literal colour values that aren't colours from a palette.
const NOT_A_COLOR = new Set(['transparent', 'currentColor', 'inherit', 'none']);
// A hex colour on its own or inside a value ('0 1px 2px #000'), not an id
// ('#add-vehicle'); rgb(), rgba(), hsl() and hsla() anywhere.
const COLOR_IN_STRING = /(^|[\s,(])#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})($|[\s,)])|\b(rgba?|hsla?)\(/i;

const files = readdirSync(SRC, { recursive: true })
  .map((name) => join(SRC, name))
  .filter((path) => /\.tsx?$/.test(path) && !SKIP.some((re) => re.test(relative(APP, path))))
  .sort();

if (files.length === 0) {
  console.error(`check-tokens: found no .ts or .tsx files under ${relative(process.cwd(), SRC) || 'src'}; the script's paths are wrong.`);
  process.exit(1);
}

/** The token for a raw number in `prop`, as code to paste. */
function tokenFor(prop, value) {
  const sign = value < 0 ? '-' : '';
  const size = Math.abs(value);
  const named = (map) => Object.keys(map).find((key) => map[key] === size);
  if (/Radius$/.test(prop)) {
    const key = named(radius);
    return key ? `${sign}theme.radius${/^\d/.test(key) ? `['${key}']` : `.${key}`}` : `a theme.radius value (${Object.entries(radius).map(([k, v]) => `${k} ${v}`).join(', ')})`;
  }
  if (/Width$/.test(prop) && /^border/.test(prop)) return 'StyleSheet.hairlineWidth';
  if (prop === 'fontSize' || prop === 'lineHeight') {
    const step = Object.keys(typeScale).find((key) => typeScale[key][prop] === size);
    if (step) return `...theme.type.${step}`;
    return `...theme.type.<step>, which sets fontSize and lineHeight together (${Object.entries(typeScale).map(([k, v]) => `${k} ${v.fontSize}/${v.lineHeight}`).join(', ')})`;
  }
  if (prop === 'letterSpacing') return 'theme.type.<step>.fontSize * theme.displayTracking (headings)';
  const key = named(space);
  return key ? `${sign}theme.space[${key}]` : `a theme.space value (space[n] is n × 4; ${size} has no step)`;
}

/** The palette roles whose light or night value is this colour. */
function rolesFor(color, prop) {
  if (prop === 'boxShadow') return 'theme.shadow.card or theme.shadow.float';
  // #fff is #ffffff, the way the palettes write it.
  const wanted = color
    .trim()
    .toLowerCase()
    .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
  const roles = new Set();
  for (const palette of [light, night]) {
    for (const [role, value] of Object.entries(palette)) if (value.toLowerCase() === wanted) roles.add(role);
  }
  return roles.size > 0 ? [...roles].slice(0, 3).map((role) => `theme.colors.${role}`).join(' or ') : 'a theme.colors role';
}

/** The literal numbers an expression can produce: 8, -4, and the branches of `a ? 8 : 12`. */
function numbers(node) {
  if (!node) return [];
  if (ts.isNumericLiteral(node)) return [{ node, value: Number(node.text) }];
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return [{ node, value: -Number(node.operand.text) }];
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return numbers(node.expression);
  if (ts.isConditionalExpression(node)) return [...numbers(node.whenTrue), ...numbers(node.whenFalse)];
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) return [...numbers(node.left), ...numbers(node.right)];
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return numbers(node.right);
  }
  return [];
}

/** The literal strings an expression can produce. */
function strings(node) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [{ node, text: node.text }];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return strings(node.expression);
  if (ts.isConditionalExpression(node)) return [...strings(node.whenTrue), ...strings(node.whenFalse)];
  if (ts.isBinaryExpression(node)) return [...strings(node.left), ...strings(node.right)];
  return [];
}

function propName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name) ? name.text : null;
}

const problems = [];

for (const path of files) {
  const file = relative(APP, path);
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const seen = new Set();

  const report = (node, prop, value, fix) => {
    if (seen.has(node.pos)) return;
    seen.add(node.pos);
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    problems.push({ at: `${file}:${line + 1}:${character + 1}`, prop, value: value.length > 40 ? `${value.slice(0, 39)}…` : value, fix });
  };

  const checkNumbers = (prop, value) => {
    for (const found of numbers(value)) if (found.value !== 0) report(found.node, prop, String(found.value), tokenFor(prop, found.value));
  };

  const visit = (node) => {
    if (ts.isPropertyAssignment(node)) {
      const prop = propName(node.name);
      if (prop && LAYOUT.test(prop)) checkNumbers(prop, node.initializer);
      if (prop && COLOR_PROP.test(prop)) {
        for (const found of strings(node.initializer)) {
          if (!NOT_A_COLOR.has(found.text)) report(found.node, prop, JSON.stringify(found.text), rolesFor(found.text, prop));
        }
      }
    } else if (ts.isJsxAttribute(node)) {
      const prop = propName(node.name);
      const value = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (prop && SIZE_PROPS.has(prop)) checkNumbers(prop, value);
      if (prop && COLOR_PROP.test(prop)) {
        for (const found of strings(value)) {
          if (!NOT_A_COLOR.has(found.text)) report(found.node, prop, JSON.stringify(found.text), rolesFor(found.text, prop));
        }
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && COLOR_IN_STRING.test(node.text)) {
      const parent = ts.isPropertyAssignment(node.parent) || ts.isJsxAttribute(node.parent) ? propName(node.parent.name) : null;
      report(node, parent ?? 'colour', JSON.stringify(node.text), rolesFor(node.text, parent));
    } else if (ts.isTemplateExpression(node)) {
      const text = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
      if (COLOR_IN_STRING.test(text)) report(node, 'colour', JSON.stringify(text), 'a theme.colors role');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (problems.length > 0) {
  const width = (key) => Math.max(...problems.map((p) => p[key].length));
  const rows = problems.map((p) => `  ${p.at.padEnd(width('at'))}  ${p.prop.padEnd(width('prop'))}  ${p.value.padEnd(width('value'))}  → ${p.fix}`);
  console.error(
    [
      `check-tokens: ${problems.length} raw ${problems.length === 1 ? 'value' : 'values'} in apps/mobile screens and components. Use the theme's tokens instead:`,
      '',
      ...rows,
      '',
      "Read tokens in StyleSheet.create((theme) => ({ … })) from 'react-native-unistyles' (theme.colors, theme.space,",
      'theme.radius, theme.type, theme.fonts), or with useUnistyles() for props outside styles (an icon size, a tint).',
      "A value the theme doesn't have yet goes in src/theme/ and docs/DESIGN.md first, with a role name.",
      'Vector art that draws in its own coordinates goes in SKIP in apps/mobile/scripts/check-tokens.mjs.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`check-tokens: every colour and measurement comes from the theme (${files.length} files in src/, src/theme/ excluded).`);
