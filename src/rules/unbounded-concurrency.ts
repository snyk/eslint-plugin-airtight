import { TSESTree, TSESLint } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import { topLevel } from '../util';

type Options = [{ fixedFunction?: string[]; maxInlineElements?: number }];
type MessageIds = 'wrongPromiseAll' | 'unclearPromiseAll' | 'unboundedPMap' | 'asyncMap';

const PROMISE_COMBINATORS = new Set(['all', 'allSettled', 'race', 'any']);

export default util.createRule<Options, MessageIds>({
  name: 'unbounded-concurrency',
  meta: {
    docs: {
      description: '',
      requiresTypeChecking: false,
    },
    fixable: 'code',
    type: 'problem',
    messages: {
      wrongPromiseAll:
        '`Promise.*(foo.map(bar))` is discouraged due to unbounded concurrency',
      unclearPromiseAll:
        '`Promise.*(someExpression)` is discouraged,' +
        ' consider `pMap` or `Promise.all([literal, things])`',
      unboundedPMap: '`pMap` requires a `{ concurrency }` argument',
      asyncMap:
        '`arr.map(asyncFn)` with an inline async function creates unbounded concurrency; use `pMap(arr, asyncFn, { concurrency: N })` instead',
    },
    schema: [
      {
        type: 'object',
        properties: {
          fixedFunction: { type: 'array' },
          maxInlineElements: { type: 'number' },
        },
      },
    ],
  },
  defaultOptions: [{ fixedFunction: ['p-map', 'pMap'] }],

  create(context) {
    const imported = new Set<string>();

    const sourceCode = context.getSourceCode();

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value !== 'p-map') return;
        for (const spec of node.specifiers) {
          switch (spec.type) {
            case 'ImportNamespaceSpecifier':
            case 'ImportDefaultSpecifier':
              imported.add(spec.local.name);
              break;
          }
        }
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type !== 'TSExternalModuleReference') return;
        if (node.moduleReference.expression.type !== 'Literal') return;
        if (node.moduleReference.expression.value !== 'p-map') return;
        imported.add(node.id.name);
      },

      CallExpression(node: TSESTree.CallExpression) {
        switch (node.callee.type) {
          case 'MemberExpression': {
            if (node.callee.property.type !== 'Identifier') return;
            const methodName = node.callee.property.name;

            // arr.map(async fn) — catches stored-variable and spread forms
            if (methodName === 'map' && node.arguments.length === 1) {
              const mapper = node.arguments[0];
              if (
                (mapper.type === 'ArrowFunctionExpression' || mapper.type === 'FunctionExpression') &&
                mapper.async
              ) {
                // Exempt literal arrays with <= maxInlineElements elements (statically bounded)
                const target = node.callee.object;
                const maxInline = context.options[0]?.maxInlineElements ?? 10;
                if (target.type === 'ArrayExpression' && target.elements.length <= maxInline) {
                  return;
                }

                // When the parent is a Promise combinator, collapse it rather than leaving Promise.all(pMap(...))
                const parent = node.parent;
                const isInsidePromiseCombinator =
                  parent.type === 'CallExpression' &&
                  parent.callee.type === 'MemberExpression' &&
                  parent.callee.object.type === 'Identifier' &&
                  parent.callee.object.name === 'Promise' &&
                  parent.callee.property.type === 'Identifier' &&
                  PROMISE_COMBINATORS.has(parent.callee.property.name);
                const reportNode = isInsidePromiseCombinator ? parent : node;

                let func = imported.values().next().value;
                const obj = sourceCode.getText(node.callee.object);
                const mapperText = sourceCode.getText(mapper);
                context.report({
                  node: reportNode,
                  messageId: 'asyncMap',
                  fix: (fixer) => {
                    const fixes: TSESLint.RuleFix[] = [];
                    if (!func) {
                      func = 'pMap';
                      imported.add(func);
                      fixes.push(fixer.insertTextBefore(topLevel(node), `import * as pMap from 'p-map';\n`));
                    }
                    fixes.push(fixer.replaceText(reportNode, `${func}(${obj}, ${mapperText}, { concurrency: 6 })`));
                    return fixes;
                  },
                });
                return;
              }
            }

            // Promise.all / allSettled / race / any — all start every promise immediately
            if (1 !== node.arguments.length) return;
            if (node.callee.object.type !== 'Identifier') return;
            if (node.callee.object.name !== 'Promise') return;
            if (!PROMISE_COMBINATORS.has(methodName)) return;
            const arg = node.arguments[0];
            if (arg.type === 'ArrayExpression') return;
            if (arg.type !== 'CallExpression') {
              context.report({
                node: node.callee,
                messageId: 'unclearPromiseAll',
              });
              return;
            }
            if (arg.callee.type !== 'MemberExpression') return;
            if (arg.callee.property.type !== 'Identifier') return;
            if (arg.callee.property.name !== 'map') return;
            if (arg.arguments.length !== 1) return;

            // asyncMap already handles async mappers — avoid double-reporting
            const mapperArg = arg.arguments[0];
            if (
              (mapperArg.type === 'ArrowFunctionExpression' ||
                mapperArg.type === 'FunctionExpression') &&
              mapperArg.async
            ) {
              return;
            }

            let func = imported.values().next().value;
            const obj = sourceCode.getText(arg.callee.object);
            const mapper = sourceCode.getText(arg.arguments[0]);
            const fix: TSESLint.ReportDescriptor<MessageIds>['fix'] = (
              fixer,
            ) => {
              const fixes: TSESLint.RuleFix[] = [];
              if (!func) {
                func = 'pMap';
                imported.add(func);
                fixes.push(
                  fixer.insertTextBefore(
                    topLevel(node),
                    `import * as ${func} from 'p-map';\n`,
                  ),
                );
              }
              fixes.push(
                fixer.replaceText(
                  node,
                  `${func}(${obj}, ${mapper}, { concurrency: 6 })`,
                ),
              );
              return fixes;
            };

            context.report({
              node,
              messageId: 'wrongPromiseAll',
              fix,
            });
            break;
          }
          case 'Identifier': {
            if (!imported.has(node.callee.name)) return;

            if (2 === node.arguments.length) {
              const fix: TSESLint.ReportDescriptor<MessageIds>['fix'] = (
                fixer,
              ) =>
                fixer.insertTextAfter(
                  node.arguments[1],
                  ', { concurrency: 6 }',
                );
              context.report({
                node,
                messageId: 'unboundedPMap',
                fix,
              });
              return;
            }

            if (3 !== node.arguments.length) return;

            const opts = node.arguments[2];
            if (opts.type !== 'ObjectExpression') return;
            if (
              !opts.properties.some(
                (p) =>
                  p.type === 'Property' &&
                  p.key.type === 'Identifier' &&
                  p.key.name === 'concurrency',
              )
            ) {
              context.report({
                node,
                messageId: 'unboundedPMap',
              });
            }

            return;
          }
          default:
            return;
        }
      },
    };
  },
});
