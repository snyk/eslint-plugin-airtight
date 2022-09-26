import { TSESTree } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import { RuleContext } from '@typescript-eslint/utils/dist/ts-eslint';

type Options = [{}];
type MessageIds = 'mustBeInline' | 'unnecessaryEmptyExport';

export default util.createRule<Options, MessageIds>({
  name: 'param-types',
  meta: {
    docs: {
      description: '',
      recommended: false,
      requiresTypeChecking: false,
    },
    fixable: 'code',
    type: 'problem',
    messages: {
      mustBeInline: 'Prefer `export function func(` over `export { func }`',
      unnecessaryEmptyExport:
        '`export {}` is not necessary if there are other imports/exports',
    },
    schema: [{}],
  },
  defaultOptions: [{}],

  create(context) {
    return {
      Program(node: TSESTree.Program) {
        const exports: { [name: string]: TSESTree.ExportSpecifier } = {};

        const decls = node.body.filter(isExportNamedDecl);
        for (const decl of decls) {
          for (const spec of decl.specifiers) {
            if (
              isIdent(spec.local) &&
              isIdent(spec.exported) &&
              spec.local.name === spec.exported.name
            ) {
              exports[spec.local.name] = spec;
            }
          }
        }

        const funcs = node.body.filter(isFuncDecl);
        for (const func of funcs) {
          if (!func.id) continue;
          const spec = exports[func.id.name];
          if (!spec) continue;
          report(context, func, spec);
        }

        const vars = node.body.filter(isVarDecl);
        for (const stat of vars) {
          // export let is poorly defined
          if (stat.kind !== 'const') continue;
          if (stat.declarations.length !== 1) continue;
          const decl = stat.declarations[0];
          // not sure what syntax this even would be
          if (decl.id.type !== 'Identifier') continue;
          const spec = exports[decl.id.name];
          if (!spec) continue;
          report(context, stat, spec);
        }

        for (const stat of node.body.filter(isEnumDecl)) {
          const spec = exports[stat.id.name];
          if (!spec) continue;
          report(context, stat, spec);
        }

        const interfaces = node.body.filter(isTypeDecl);
        for (const stat of interfaces) {
          const spec = exports[stat.id.name];
          if (!spec) continue;
          report(context, stat, spec);
        }

        const anyRegulars = node.body.some(
          (node) =>
            (isExportNamedDecl(node) && node.declaration) ||
            node.type === 'ImportDeclaration' ||
            node.type === 'TSImportEqualsDeclaration',
        );
        if (!anyRegulars) return;

        for (const decl of decls) {
          if (decl.declaration) continue;
          if (decl.source) continue;
          if (decl.specifiers.length) continue;

          context.report({
            node: decl,
            messageId: 'unnecessaryEmptyExport',
            fix: (fixer) => fixer.remove(decl),
          });
        }
      },
    };
  },
});

function report(
  context: RuleContext<MessageIds, Options>,
  nodeOrToken: TSESTree.Node,
  spec: TSESTree.ExportSpecifier,
): void {
  context.report({
    node: spec,
    messageId: 'mustBeInline',
    fix: (fixer) => {
      const fixes = [
        fixer.remove(spec),
        fixer.insertTextBefore(nodeOrToken, 'export '),
      ];

      const follower = context.getSourceCode().getTokenAfter(spec);
      if (isComma(follower)) {
        fixes.unshift(fixer.remove(follower));
      }
      return fixes;
    },
  });
}

function isExportNamedDecl(
  node: TSESTree.Statement,
): node is TSESTree.ExportNamedDeclaration {
  return node.type === 'ExportNamedDeclaration';
}

function isFuncDecl(
  node: TSESTree.Statement,
): node is TSESTree.Statement & Pick<TSESTree.FunctionDeclaration, 'id'> {
  return node.type === 'FunctionDeclaration';
}

function isEnumDecl(
  node: TSESTree.Statement,
): node is TSESTree.TSEnumDeclaration {
  return node.type === 'TSEnumDeclaration';
}

function isVarDecl(
  node: TSESTree.Statement,
): node is TSESTree.VariableDeclaration {
  return node.type === 'VariableDeclaration';
}

function isTypeDecl(
  node: TSESTree.Statement,
): node is TSESTree.TSInterfaceDeclaration | TSESTree.TSTypeAliasDeclaration {
  return (
    node.type === 'TSInterfaceDeclaration' ||
    node.type === 'TSTypeAliasDeclaration'
  );
}

function isIdent(node: TSESTree.Node): node is TSESTree.Identifier {
  return node.type === 'Identifier';
}

function isPunctuator(
  token: TSESTree.Token,
): token is TSESTree.PunctuatorToken {
  return token.type === 'Punctuator';
}

function isComma(
  token: TSESTree.Token | null,
): token is TSESTree.PunctuatorToken {
  return token !== null && isPunctuator(token) && token.value === ',';
}
