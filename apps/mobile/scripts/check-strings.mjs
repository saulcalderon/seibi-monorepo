#!/usr/bin/env node
/**
 * check-strings: fails when text a person sees or hears in the app doesn't
 * come from src/i18n/es.json through t(), so adding a language never misses a
 * string. It reads every .ts/.tsx file under src/ with the TypeScript parser
 * and reports:
 *
 * - JSX text: <Text>Hola</Text>, and literals in JSX children such as
 *   {'Hola'} or {ok ? 'Sí' : 'No'};
 * - literals in the props and options listed in SPOKEN_PROPS, as JSX
 *   attributes (title="…") or object keys ({ title: '…' });
 * - literal arguments of the calls listed in CALLS (Alert.alert…).
 *
 * Run it with `pnpm check` at the repo root (Turbo runs typecheck and lint
 * first), or alone with `node scripts/check-strings.mjs` in apps/mobile.
 *
 * Adapted from Paradero's scripts/check-strings.mjs, under its licence:
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

const APP = new URL('..', import.meta.url).pathname;
const SRC = join(APP, 'src');

// Not scanned: src/i18n holds the copy itself, and tests hold fixtures.
const SKIP = [/^src\/i18n\//, /\.d\.ts$/, /\.test\.tsx?$/, /\/__tests__\//];

// Props and option keys whose value is shown or spoken. Every other prop
// (testID, nativeID, accessibilityRole, style, name, href…) is not copy and
// is never checked.
const SPOKEN_PROPS = new Set([
  // Spoken by VoiceOver and TalkBack.
  'accessibilityLabel',
  'accessibilityHint',
  'aria-label',
  'aria-valuetext',
  // Shown: component props, Expo Router screen and tab options, @expo/ui
  // options, alert buttons ({ text }), local notifications ({ title, body }).
  'title',
  'subtitle',
  'label',
  'placeholder',
  'message',
  'description',
  'text',
  'body',
  'headerTitle',
  'headerBackTitle',
  'tabBarLabel',
]);

// Calls whose literal arguments are shown: the native alert, and toasts
// (sonner-native, once it is installed).
const CALLS = new Set(['Alert.alert', 'Alert.prompt', 'toast', 'toast.success', 'toast.error', 'toast.info', 'toast.warning', 'toast.message']);

// Text that is the same in every language, so it may be written in code.
// Keep this short: anything a translator might change belongs in es.json.
const SAME_EVERYWHERE = new Set([
  'Seibi', // the brand name
]);

// Two letters in a row: "km" counts, "·", "—", "+" and "12" don't.
const LETTERS = /\p{L}{2,}/u;

const wordy = (text) => LETTERS.test(text) && !SAME_EVERYWHERE.has(text.trim());

/** The literal text an expression can produce, without looking inside calls such as t('key'). */
function literals(node) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [{ node, text: node.text }];
  if (ts.isTemplateExpression(node)) {
    const text = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join('${…}');
    return [{ node, text }];
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literals(node.expression);
  if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)];
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return literals(node.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.PlusToken) {
      return [...literals(node.left), ...literals(node.right)];
    }
  }
  return [];
}

function propName(name, source) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return name.getText(source);
}

const files = readdirSync(SRC, { recursive: true })
  .map((name) => join(SRC, name))
  .filter((path) => /\.tsx?$/.test(path) && !SKIP.some((re) => re.test(relative(APP, path))))
  .sort();

if (files.length === 0) {
  console.error(`check-strings: found no .ts or .tsx files under ${relative(process.cwd(), SRC) || 'src'}; the script's paths are wrong.`);
  process.exit(1);
}

const problems = [];

for (const path of files) {
  const file = relative(APP, path);
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  const report = (node, where, text) => {
    if (!wordy(text)) return;
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    problems.push({ at: `${file}:${line + 1}:${character + 1}`, where, text: text.trim().replace(/\s+/g, ' ').slice(0, 60) });
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      report(node, 'JSX text', node.text);
    } else if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      for (const found of literals(node.expression)) report(found.node, 'JSX text', found.text);
    } else if (ts.isJsxAttribute(node) && SPOKEN_PROPS.has(propName(node.name, source))) {
      const value = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
      for (const found of literals(value)) report(found.node, `${propName(node.name, source)}=`, found.text);
    } else if (ts.isPropertyAssignment(node) && SPOKEN_PROPS.has(propName(node.name, source))) {
      for (const found of literals(node.initializer)) report(found.node, `${propName(node.name, source)}:`, found.text);
    } else if (ts.isCallExpression(node) && CALLS.has(node.expression.getText(source))) {
      for (const argument of node.arguments) {
        for (const found of literals(argument)) report(found.node, `${node.expression.getText(source)}()`, found.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (problems.length > 0) {
  const width = (key) => Math.max(...problems.map((p) => p[key].length));
  const rows = problems.map((p) => `  ${p.at.padEnd(width('at'))}  ${p.where.padEnd(width('where'))}  ${JSON.stringify(p.text)}`);
  console.error(
    [
      `check-strings: ${problems.length} ${problems.length === 1 ? 'string' : 'strings'} on screen in apps/mobile ${problems.length === 1 ? "doesn't" : "don't"} come from src/i18n/es.json:`,
      '',
      ...rows,
      '',
      'Fix each one:',
      '  1. Add the text to src/i18n/es.json, under its screen or feature: "start": { "greeting": "Hola" }.',
      "  2. Show it with t(): const { t } = useTranslation(); then <Text>{t('start.greeting')}</Text>.",
      "     Code outside React uses the default export of '@/i18n': i18n.t('start.greeting').",
      'A name that is the same in every language goes in SAME_EVERYWHERE in apps/mobile/scripts/check-strings.mjs.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`check-strings: every string on screen comes from src/i18n/es.json (${files.length} files in src/).`);
