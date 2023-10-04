import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { TSESTree } from '@typescript-eslint/utils';

export type ItlyRuleOptions = [{}];
export type ItlyRuleMessageIds = 'invalidFile' | 'missingRequiredItlyProperty';

export function isItlyFile(
  context: Readonly<RuleContext<ItlyRuleMessageIds, ItlyRuleOptions>>,
) {
  return context.getFilename().endsWith('itly/index.ts');
}

export function classIsItlyEventImplementation(
  classDeclaration: TSESTree.ClassDeclaration,
) {
  return classDeclaration.implements?.find(
    (implementsNode) =>
      implementsNode.expression.type === AST_NODE_TYPES.Identifier &&
      implementsNode.expression.name === 'Event',
  );
}

export function getItlyPropertiesDeclaration(classBody: TSESTree.ClassBody) {
  return classBody.body.find(
    (classProperty) =>
      classProperty.type === AST_NODE_TYPES.PropertyDefinition &&
      classProperty.key.type === AST_NODE_TYPES.Identifier &&
      classProperty.key.name === 'properties',
  );
}

export function getImplementedProperties(
  classElement: TSESTree.PropertyDefinition,
): TSESTree.TSTypeReference | undefined {
  const typeAnnotation = classElement.typeAnnotation?.typeAnnotation;
  if (typeAnnotation?.type === AST_NODE_TYPES.TSIntersectionType) {
    return typeAnnotation.types.find(
      (type) => type.type === AST_NODE_TYPES.TSTypeReference,
    ) as TSESTree.TSTypeReference | undefined;
  }
  return;
}

export function getProgram(node: TSESTree.Node) {
  let parent = node.parent;
  while (parent && parent.type !== AST_NODE_TYPES.Program) {
    parent = parent.parent;
  }
  return parent;
}

export function getInterfaceDeclarationFromProgram(
  program: TSESTree.Program,
  name: string,
): TSESTree.TSInterfaceDeclaration | undefined {
  const declaration = program.body.find(
    (node) =>
      node.type === AST_NODE_TYPES.ExportNamedDeclaration &&
      node.declaration?.type === AST_NODE_TYPES.TSInterfaceDeclaration &&
      node.declaration.id.name === name,
  ) as TSESTree.ExportNamedDeclaration | undefined;
  return declaration?.declaration as
    | TSESTree.TSInterfaceDeclaration
    | undefined;
}
