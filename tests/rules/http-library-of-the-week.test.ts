import { join } from 'path';
import rule from '../../src/rules/http-library-of-the-week';
import { RuleTester } from '@typescript-eslint/utils/dist/eslint-utils';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: join(__dirname, '..'),
    project: './tsconfig.json',
  },
  parser: '@typescript-eslint/parser',
});

ruleTester.run('http-library-of-the-week', rule, {
  valid: [],
  invalid: [
    {
      code: `import * as rp from 'request-promise-native';
await rp({ method: 'POST', uri, body: { stuff }, });`,
      output: `import got = require('got');
await got({ method: 'POST', url: uri, json: { stuff }, }).json();`,
      errors: [
        {
          line: 1,
          messageId: 'requestPromiseNative',
        },
      ],
    },
  ]
});
