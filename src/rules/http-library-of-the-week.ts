import { TSESTree } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import type { ReportDescriptor } from '@typescript-eslint/utils/dist/ts-eslint';

type Options = [{}];
type MessageIds = 'requestPromiseNative';

export default util.createRule<Options, MessageIds>({
  name: 'http-library-of-the-week',
  meta: {
    docs: {
      description: '',
      recommended: false,
      requiresTypeChecking: false,
    },
    fixable: 'code',
    type: 'problem',
    messages: {
      requestPromiseNative: 'request-promise-native is out of fashion',
    },
    schema: [],
  },
  defaultOptions: [{}],

  create(context, []) {
    const imported = new Set<string>();

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value !== 'request-promise-native') return;
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
        if (node.moduleReference.expression.value !== 'request-promise-native')
          return;
        imported.add(node.id.name);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        if (!imported.has(node.callee.name)) return;
        if (1 !== node.arguments.length) return;
        const opts = node.arguments[0];
        if (opts.type !== 'ObjectExpression') return;

        const props: Record<string, any> = {};
        for (const prop of opts.properties) {
          // vs. e.g. a member definition; { foo() {} }.
          if (prop.type !== 'Property') return;
          if (prop.computed) return;
          if (prop.key.type !== 'Identifier') return;
          props[prop.key.name] = prop;
        }

        const fix: ReportDescriptor<MessageIds>['fix'] = undefined;

        context.report({
          node,
          messageId: 'requestPromiseNative',
          fix,
        });
      },
    };
  },
});
