import { TSESTree } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import path from 'path';
import { importTarget } from '../util/node-imports';

interface MatchRequire {
  local?: string;
  path: string;
}

export type Options = [
  {
    requireToNamed?: MatchRequire[];
    wildNsToRequire?: MatchRequire[];
  },
];
type MessageIds = 'useRegularImport';

export default util.createRule<Options, MessageIds>({
  name: 'import-style',
  meta: {
    docs: {
      description: '',
      recommended: false,
      requiresTypeChecking: false,
    },
    fixable: 'code',
    type: 'problem',
    messages: {
      useRegularImport: 'Modern import style available',
    },
    schema: [{}],
  },
  defaultOptions: [{ requireToNamed: [] }],

  create(context, [options]) {
    const dir = path.resolve(path.dirname(context.getFilename()));

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (!options.wildNsToRequire) return;
        if (1 !== node.specifiers.length) return;
        const ns = node.specifiers[0];
        if ('ImportNamespaceSpecifier' !== ns.type) return;
        if (typeof node.source.value !== 'string') return;
        const target = importTarget(dir, node.source.value);
        // TODO: match target
        console.log(target);

        if (!ns.local) return;
        context.report({
          node,
          messageId: 'useRegularImport',
          fix: (fixer) =>
            fixer.replaceText(
              node,
              `import ${ns.local.name} = require(${node.source.raw});`,
            ),
        });
      },
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (!options.requireToNamed) return;
        if ('TSExternalModuleReference' !== node.moduleReference.type) return;
        const mre = node.moduleReference.expression;
        if ('Literal' !== mre.type) return;
        const from = mre.value;
        const local = node.id.name;
        // TODO: resolve path
        const matches = options.requireToNamed.some(
          (v) => v.local === local && v.path === from,
        );
        if (!matches) return;
        // TODO: more than one?
        context.report({
          node,
          messageId: 'useRegularImport',
          fix: (fixer) =>
            fixer.replaceText(node, `import { ${local} } from ${mre.raw};`),
        });
      },
    };
  },
});
