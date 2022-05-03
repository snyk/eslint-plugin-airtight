import { AST_NODE_TYPES } from '@typescript-eslint/types';
import {
  ClassDeclaration,
  PropertyDefinition,
} from '@typescript-eslint/types/dist/generated/ast-spec';
import * as util from '../util/from-eslint-typescript';
import {
  classIsItlyEventImplementation,
  getItlyPropertiesDeclaration,
  isItlyFile,
  ItlyRuleMessageIds,
  ItlyRuleOptions,
} from '../util/itly';

export default util.createRule<ItlyRuleOptions, ItlyRuleMessageIds>({
  name: 'require-itly-constant',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforces itly constant is set in Iteratively',
      recommended: false,
    },
    schema: [{}],
    messages: {
      invalidFile:
        'require-itly-constant should only be enabled for the generated Itly library',
      missingRequiredItlyProperty: `{{ eventName }} is missing the Iteratively property group`,
    },
  },
  defaultOptions: [{}],
  create: function (context) {
    function propertiesDeclarationContainsItlyConstant(
      propertiesDeclaration: PropertyDefinition,
    ) {
      if (
        propertiesDeclaration.typeAnnotation?.typeAnnotation.type ===
        AST_NODE_TYPES.TSIntersectionType
      ) {
        const containsItlyLiteral =
          propertiesDeclaration.typeAnnotation.typeAnnotation.types?.some(
            (type) =>
              type.type === AST_NODE_TYPES.TSTypeLiteral &&
              type.members.some(
                (member) =>
                  member.type === AST_NODE_TYPES.TSPropertySignature &&
                  member.key.type === AST_NODE_TYPES.Literal &&
                  member.key.value === 'itly',
              ),
          );
        return containsItlyLiteral;
      }

      if (
        propertiesDeclaration.value?.type === AST_NODE_TYPES.ObjectExpression
      ) {
        return propertiesDeclaration.value.properties.some(
          (property) =>
            property.type === AST_NODE_TYPES.Property &&
            property.key.type === AST_NODE_TYPES.Literal &&
            property.key.value === 'itly',
        );
      }

      return false;
    }

    function reportMissingItlyConstant(classDeclarationNode: ClassDeclaration) {
      context.report({
        node: classDeclarationNode,
        messageId: 'missingRequiredItlyProperty',
        data: { eventName: classDeclarationNode.id?.name },
      });
    }

    return {
      ClassDeclaration(classDeclarationNode) {
        if (!isItlyFile(context)) {
          context.report({
            node: classDeclarationNode,
            messageId: 'invalidFile',
          });
          return;
        }

        if (!classIsItlyEventImplementation(classDeclarationNode)) {
          return;
        }

        const itlyPropertiesDeclaration = getItlyPropertiesDeclaration(
          classDeclarationNode.body,
        );

        if (
          !itlyPropertiesDeclaration ||
          itlyPropertiesDeclaration.type !== AST_NODE_TYPES.PropertyDefinition
        ) {
          reportMissingItlyConstant(classDeclarationNode);
          return;
        }

        if (
          propertiesDeclarationContainsItlyConstant(itlyPropertiesDeclaration)
        ) {
          return;
        }

        reportMissingItlyConstant(classDeclarationNode);
      },
    };
  },
});
