import * as path from 'path';
import { TSESTree } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import type {
  ReportDescriptor,
  RuleFix,
} from '@typescript-eslint/utils/dist/ts-eslint';
import { topLevel } from '../util';

type Regex = string;
type ImportPath = string;
type TypeName = string;

type Options = [
  {
    required: Regex[];
    excluded?: Regex[];
    fixes?: { [paramRegex: string]: [ImportPath, TypeName] };
  },
];
type MessageIds = 'mustBeTyped';

function regexp(input: string): RegExp {
  return new RegExp(`^(?:${input})$`);
}

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
      mustBeTyped:
        'Explicitly specifying a type is required for this parameter.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          required: { type: 'array' },
          excluded: { type: 'array' },
        },
      },
    ],
  },
  defaultOptions: [{ required: ['.*'] }],

  create(context, [options]) {
    const required: RegExp[] = options.required.map(regexp);
    const excluded = options.excluded?.map(regexp) ?? [];
    const dir = path.resolve(path.dirname(context.getFilename()));

    const fixes = Object.entries(options.fixes ?? {}).map(
      ([paramName, [wantedImport, type]]) => {
        const resolvedImport = wantedImport.startsWith('.')
          ? path.relative(dir, path.resolve(wantedImport))
          : wantedImport;
        return [regexp(paramName), [resolvedImport, type]] as const;
      },
    );

    const imported = new Set<string>();

    return {
      ImportSpecifier(node: TSESTree.ImportSpecifier) {
        imported.add(node.imported.name);
      },

      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        for (const param of node.params) {
          if (param.type !== 'Identifier') continue;

          if ('typeAnnotation' in param) {
            continue;
          }

          if (!required.some((r) => param.name.match(r))) continue;
          if (excluded.some((r) => param.name.match(r))) continue;

          const fixObj = fixes.find(([r]) => param.name.match(r));

          let fix: ReportDescriptor<MessageIds>['fix'];
          if (fixObj) {
            const [, [importFrom, type]] = fixObj;
            const importText = `import type { ${type} } from '${importFrom}';\n`;
            fix = (fixer) => {
              const fixes: RuleFix[] = [];
              if (!imported.has(type)) {
                imported.add(type);
                fixes.push(fixer.insertTextBefore(topLevel(node), importText));
              }
              fixes.push(fixer.insertTextAfter(param, `: ${type}`));
              return fixes;
            };
          }

          context.report({
            node,
            messageId: 'mustBeTyped',
            fix,
          });
        }
      },
    };
  },
});
