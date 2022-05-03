import * as ts from 'typescript';
import { unionTypeParts } from 'tsutils';
import {
  AST_NODE_TYPES,
  AST_TOKEN_TYPES,
  ESLintUtils,
  TSESTree,
} from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator((name) => name);

export function isAwaitExpression(
  node: TSESTree.Node | undefined | null,
): node is TSESTree.AwaitExpression {
  return node?.type === AST_NODE_TYPES.AwaitExpression;
}

export function isAwaitKeyword(
  node: TSESTree.Token | TSESTree.Comment | undefined | null,
): node is TSESTree.KeywordToken & { value: 'await' } {
  return node?.type === AST_TOKEN_TYPES.Identifier && node.value === 'await';
}

export function isTypeAnyType(type: ts.Type): boolean {
  return isTypeFlagSet(type, ts.TypeFlags.Any);
}

export function isTypeUnknownType(type: ts.Type): boolean {
  return isTypeFlagSet(type, ts.TypeFlags.Unknown);
}

export function isTypeFlagSet(
  type: ts.Type,
  flagsToCheck: ts.TypeFlags,
  isReceiver?: boolean,
): boolean {
  const flags = getTypeFlags(type);

  if (isReceiver && flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return true;
  }

  return (flags & flagsToCheck) !== 0;
}

/**
 * Gets all of the type flags in a type, iterating through unions automatically
 */
export function getTypeFlags(type: ts.Type): ts.TypeFlags {
  let flags: ts.TypeFlags = 0;
  for (const t of unionTypeParts(type)) {
    flags |= t.flags;
  }
  return flags;
}
