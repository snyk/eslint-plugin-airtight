import { TSESLint } from '@typescript-eslint/utils';

import exportInline from './rules/export-inline';
import { rule as importStyle } from './rules/import-style';
import paramTypes from './rules/param-types';
import returnAwait from './rules/return-await';
import sequelizeComment from './rules/sequelize-comment';
import unboundedConcurrency from './rules/unbounded-concurrency';
import { rule as requireItlyConstant } from './rules/require-itly-constant';
import { rule as requireItlyEventSource } from './rules/require-itly-event-source';

export const rules: Record<
  string,
  TSESLint.RuleModule<string, unknown[], any>
> = {
  'export-inline': exportInline,
  'import-style': importStyle,
  'param-types': paramTypes,
  'return-await': returnAwait,
  'sequelize-comment': sequelizeComment,
  'unbounded-concurrency': unboundedConcurrency,
  'require-itly-constant': requireItlyConstant,
  'require-itly-event-source': requireItlyEventSource,
};

export * as util from './util';
