import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { TSESTree, TSESLint } from '@typescript-eslint/utils';
import * as util from '../util/from-eslint-typescript';
import {
  classIsItlyEventImplementation,
  getImplementedProperties,
  getInterfaceDeclarationFromProgram,
  getItlyPropertiesDeclaration,
  getProgram,
  isItlyFile,
  ItlyRuleMessageIds,
  ItlyRuleOptions,
} from '../util/itly';

// explicit typing to work around an apparent typescript compiler bug, please remove if it works for you
export const rule: TSESLint.RuleModule<ItlyRuleMessageIds, ItlyRuleOptions> =
  util.createRule<ItlyRuleOptions, ItlyRuleMessageIds>({
    name: 'require-itly-event-source',
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforces itly eventSource is set in Iteratively',
      },
      schema: [{} as any],
      messages: {
        invalidFile:
          'require-itly-event-source should only be enabled for the generated Itly library',
        missingRequiredItlyProperty: `{{ eventName }} is missing the Event Source property group, please update the Event at data.amplitude.com/snyk`,
      },
    },
    defaultOptions: [{}],
    create: function (context) {
      function propertiesDeclarationContainsEventSourceConstant(
        propertiesDeclaration: TSESTree.PropertyDefinition,
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
                    member.key.value === 'eventSource',
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
              property.key.value === 'eventSource',
          );
        }

        return false;
      }

      function getPropertiesInterfaceName(
        itlyPropertiesDeclaration: TSESTree.PropertyDefinition,
      ) {
        const implementedProperties = getImplementedProperties(
          itlyPropertiesDeclaration,
        );

        if (!implementedProperties) {
          return;
        }

        return implementedProperties.typeName.type === AST_NODE_TYPES.Identifier
          ? implementedProperties.typeName.name
          : undefined;
      }

      function propertiesInterfaceContainsEventSource(
        itlyPropertiesDeclaration: TSESTree.PropertyDefinition,
      ) {
        const interfaceName = getPropertiesInterfaceName(
          itlyPropertiesDeclaration,
        );

        if (!interfaceName) {
          return false;
        }
        const program = getProgram(itlyPropertiesDeclaration);

        if (!program) {
          return false;
        }
        const interfaceDeclaration = getInterfaceDeclarationFromProgram(
          program,
          interfaceName,
        );

        if (!interfaceDeclaration) {
          return false;
        }

        return interfaceDeclaration.body.body.some(
          (node) =>
            node.type === AST_NODE_TYPES.TSPropertySignature &&
            node.key.type === AST_NODE_TYPES.Identifier &&
            node.key.name === 'eventSource',
        );
      }

      function reportMissingItlyConstant(
        classDeclarationNode: TSESTree.ClassDeclaration,
      ) {
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

          // eventSource may show up as a constant (like itly: true)...
          if (
            propertiesDeclarationContainsEventSourceConstant(
              itlyPropertiesDeclaration,
            )
          ) {
            return;
          }

          // ...or it may be contained in the Event's properties interface
          if (
            propertiesInterfaceContainsEventSource(itlyPropertiesDeclaration)
          ) {
            return;
          }

          // eventSource was not found in any of the expected places
          reportMissingItlyConstant(classDeclarationNode);
        },
      };
    },
  });
