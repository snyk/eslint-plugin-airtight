import { TSESTree } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import type {
  ReportDescriptor,
  RuleFix,
} from '@typescript-eslint/utils/dist/ts-eslint';
import { topLevel } from '../util';

type Options = [{}];
type MessageIds = 'wrongPromiseAll' | 'unclearPromiseAll' | 'unboundedPMap';

export default util.createRule<Options, MessageIds>({
  name: 'unbounded-concurrency',
  meta: {
    docs: {
      description: '',
      recommended: false,
      requiresTypeChecking: false,
    },
    fixable: 'code',
    type: 'problem',
    messages: {
      wrongPromiseAll:
        '`Promise.all(foo.map(bar))` is discouraged due to unbounded concurrency',
      unclearPromiseAll:
        '`Promise.all(someExpression)` is discouraged,' +
        ' consider `pMap` or `Promise.all([literal, things])`',
      unboundedPMap: '`pMap` requires a `{ concurrency }` argument',
    },
    schema: [
      {
        type: 'object',
        properties: {
          fixedFunction: { type: 'array' },
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
            if (1 !== node.arguments.length) return;
            if (node.callee.object.type !== 'Identifier') return;
            if (node.callee.object.name !== 'Promise') return;
            if (node.callee.property.type !== 'Identifier') return;
            if (node.callee.property.name !== 'all') return;
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

            let func = imported.values().next().value;
            const obj = sourceCode.getText(arg.callee.object);
            const mapper = sourceCode.getText(arg.arguments[0]);
            const fix: ReportDescriptor<MessageIds>['fix'] = (fixer) => {
              const fixes: RuleFix[] = [];
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
              const fix: ReportDescriptor<MessageIds>['fix'] = (fixer) =>
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
