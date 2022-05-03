import { join } from 'path';
import rule from '../../src/rules/unbounded-concurrency';
import { RuleTester } from '@typescript-eslint/utils/dist/eslint-utils';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: join(__dirname, '..'),
    project: './tsconfig.json',
  },
  parser: '@typescript-eslint/parser',
});

ruleTester.run('unbounded-concurrency', rule, {
  valid: [
    `import * as pMap from 'p-map';
     await pMap(unknownVar, async (v) => v, { concurrency: 2 });`,
    `await Promise.all([foo, bar]);`,
    // not handled
    `import * as pMap from 'p-map';
     await pMap(unknownVar, async (v) => v, { concurrency: UNKNOWN_CONST });`,
    // not handled
    `import * as pMap from 'p-map';
     await pMap(unknownVar, async (v) => v, { concurrency: Infinity });`,
  ],
  invalid: [
    {
      code: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v);`,
      output: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, { concurrency: 6 });`,
      errors: [
        {
          line: 3,
          messageId: 'unboundedPMap',
        },
      ],
    },
    {
      code: `
        import * as pMap from 'p-map';
        await Promise.all(unknownVar.map(async (v) => v));`,
      output: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, { concurrency: 6 });`,
      errors: [
        {
          line: 3,
          messageId: 'wrongPromiseAll',
        },
      ],
    },
    {
      code: `await Promise.all(unknownVar.map(async (v) => v));`,
      output: `import * as pMap from 'p-map';
await pMap(unknownVar, async (v) => v, { concurrency: 6 });`,
      errors: [
        {
          line: 1,
          messageId: 'wrongPromiseAll',
        },
      ],
    },
    {
      code: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, {});`,
      errors: [
        {
          line: 3,
          messageId: 'unboundedPMap',
        },
      ],
    },
    {
      code: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, { wiggled: true });`,
      errors: [
        {
          line: 3,
          messageId: 'unboundedPMap',
        },
      ],
    },
  ]
});
