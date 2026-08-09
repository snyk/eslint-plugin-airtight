import { join } from 'path';
import rule from '../../src/rules/unbounded-concurrency';
import { RuleTester } from '@typescript-eslint/rule-tester';

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
    // pMap with concurrency — fine
    `import * as pMap from 'p-map';
     await pMap(unknownVar, async (v) => v, { concurrency: 2 });`,
    // Promise.all with literal array — fine
    `await Promise.all([foo, bar]);`,
    // pMap with non-numeric concurrency — not handled
    `import * as pMap from 'p-map';
     await pMap(unknownVar, async (v) => v, { concurrency: UNKNOWN_CONST });`,
    `import * as pMap from 'p-map';
     await pMap(unknownVar, async (v) => v, { concurrency: Infinity });`,
    // asyncMap: non-async mapper — fine
    `arr.map((x) => x * 2)`,
    // asyncMap: literal array with <= 10 elements (default maxInlineElements) — fine
    `[a, b, c].map(async (x) => doSomething(x))`,
    `[a, b, c, d, e, f, g, h, i].map(async (x) => doSomething(x))`,
    `[a, b, c, d, e, f, g, h, i, j].map(async (x) => doSomething(x))`,
    // asyncMap: custom maxInlineElements — literal at or under threshold fine
    {
      code: `[a, b].map(async (x) => doSomething(x))`,
      options: [{ maxInlineElements: 3 }],
    },
    {
      code: `[a, b, c].map(async (x) => doSomething(x))`,
      options: [{ maxInlineElements: 3 }],
    },
  ],
  invalid: [
    // pMap missing concurrency argument
    {
      code: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v);`,
      output: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, { concurrency: 6 });`,
      errors: [{ line: 3, messageId: 'unboundedPMap' }],
    },
    // wrongPromiseAll: sync mapper inside Promise.all — asyncMap does not intercept
    {
      code: `
        import * as pMap from 'p-map';
        await Promise.all(unknownVar.map(syncFn));`,
      output: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, syncFn, { concurrency: 6 });`,
      errors: [{ line: 3, messageId: 'wrongPromiseAll' }],
    },
    {
      code: `await Promise.all(unknownVar.map(syncFn));`,
      output: `import * as pMap from 'p-map';\nawait pMap(unknownVar, syncFn, { concurrency: 6 });`,
      errors: [{ line: 1, messageId: 'wrongPromiseAll' }],
    },
    {
      code: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, {});`,
      errors: [{ line: 3, messageId: 'unboundedPMap' }],
    },
    {
      code: `
        import * as pMap from 'p-map';
        await pMap(unknownVar, async (v) => v, { wiggled: true });`,
      errors: [{ line: 3, messageId: 'unboundedPMap' }],
    },
    // asyncMap: dynamic array with async mapper — flagged regardless of consumption
    {
      code: `const promises = arr.map(async (item) => processItem(item));`,
      output: `import * as pMap from 'p-map';\nconst promises = pMap(arr, async (item) => processItem(item), { concurrency: 6 });`,
      errors: [{ line: 1, messageId: 'asyncMap' }],
    },
    // asyncMap: async function expression (not arrow)
    {
      code: `arr.map(async function(item) { return processItem(item); })`,
      output: `import * as pMap from 'p-map';\npMap(arr, async function(item) { return processItem(item); }, { concurrency: 6 })`,
      errors: [{ line: 1, messageId: 'asyncMap' }],
    },
    // asyncMap: literal array above maxInlineElements threshold — flagged
    {
      code: `[a, b, c, d, e, f, g, h, i, j, k].map(async (x) => doSomething(x))`,
      output: `import * as pMap from 'p-map';\npMap([a, b, c, d, e, f, g, h, i, j, k], async (x) => doSomething(x), { concurrency: 6 })`,
      errors: [{ line: 1, messageId: 'asyncMap' }],
    },
    // asyncMap: custom maxInlineElements — literal above threshold flagged
    {
      code: `[a, b, c, d].map(async (x) => doSomething(x))`,
      options: [{ maxInlineElements: 3 }],
      output: `import * as pMap from 'p-map';\npMap([a, b, c, d], async (x) => doSomething(x), { concurrency: 6 })`,
      errors: [{ line: 1, messageId: 'asyncMap' }],
    },
    // asyncMap: async mapper inside Promise.all — collapses outer Promise.all entirely
    {
      code: `await Promise.all(unknownVar.map(async (v) => v));`,
      output: `import * as pMap from 'p-map';\nawait pMap(unknownVar, async (v) => v, { concurrency: 6 });`,
      errors: [{ line: 1, messageId: 'asyncMap' }],
    },
    // wrongPromiseAll: allSettled / race / any with sync mapper — all caught
    {
      code: `await Promise.allSettled(unknownVar.map(syncFn));`,
      output: `import * as pMap from 'p-map';\nawait pMap(unknownVar, syncFn, { concurrency: 6 });`,
      errors: [{ line: 1, messageId: 'wrongPromiseAll' }],
    },
    {
      code: `await Promise.race(unknownVar.map(syncFn));`,
      output: `import * as pMap from 'p-map';\nawait pMap(unknownVar, syncFn, { concurrency: 6 });`,
      errors: [{ line: 1, messageId: 'wrongPromiseAll' }],
    },
    {
      code: `await Promise.any(unknownVar.map(syncFn));`,
      output: `import * as pMap from 'p-map';\nawait pMap(unknownVar, syncFn, { concurrency: 6 });`,
      errors: [{ line: 1, messageId: 'wrongPromiseAll' }],
    },
  ],
});
