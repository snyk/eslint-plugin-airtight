import { join } from 'path';
import rule from '../../src/rules/sequelize-comment';
import { RuleTester } from '@typescript-eslint/utils/dist/eslint-utils';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: join(__dirname, '..'),
    project: './tsconfig.json',
  },
  parser: '@typescript-eslint/parser',
});

ruleTester.run('sequelize-comment', rule, {
  valid: [
    `findAll({})`,
    `foo.findAll(2)`,
    `foo.findAll({ comment: 'hello' })`,
  ],
  invalid: [
    {
      code: `function night() { return foo.findAll({ where: {} }) }`,
      output: `function night() { return foo.findAll({ comment: 'eslint-plugin-airtight/tests/file.ts:night', where: {} }) }`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    },
    {
      code: `foo.findAll({ where: {} })`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    },
    {
      code: `function noon() { foo.findAll({}) }`,
      output: `function noon() { foo.findAll({comment: 'eslint-plugin-airtight/tests/file.ts:noon', }) }`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    },
    {
      code: `function noon() { foo.findOne({ /* whatevs */}) }`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    },
    {
      code: `class Motley { fool() { foo.findAll({}) } }`,
      output: `class Motley { fool() { foo.findAll({comment: 'eslint-plugin-airtight/tests/file.ts:fool', }) } }`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    },
    {
      code: `router.get('/:foo', async () => { foo.findAll({}) });`,
      output: `router.get('/:foo', async () => { foo.findAll({comment: 'eslint-plugin-airtight/tests/file.ts:get:/:foo', }) });`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    },
    {
      code: `const day = () => foo.findAll({ where: {} })`,
      output: `const day = () => foo.findAll({ comment: 'eslint-plugin-airtight/tests/file.ts:day', where: {} })`,
      errors: [
        {
          line: 1,
          messageId: 'requiresComment',
        },
      ],
    }
  ]
});
