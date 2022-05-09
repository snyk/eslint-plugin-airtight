## eslint-plugin-airtight

A collection of additional `eslint` rules, initially derived from
[eslint-plugin-sinful](https://github.com/FauxFaux/eslint-plugin-sinful).


## Rules

### export-inline

Stylistic. Tranforms "declare at top" exports into "inline" exports.

In:
```typescript
export { foo }; function foo(...
```

Out:
```typescript
export function foo(...
```


### param-types

Migration. Can be configured to add a type to any parameter by name,
e.g. to ensure all your `user` parameters are labelled with the `UserDTO`
type.

Config:
```json
{ "user": ["./lib/dtos", "UserDTO"] }
```

 In:
```typescript 
function foo(user, name: string) {`  
```

Out:
```typescript
import type { UserDTO } from '../../../lib/dtos';
function foo(user: User, name: string) {
```


### return-await

Bug finder. Finds worrying catch blocks without making your
code invalid, unlike upstream's version.

In:
```typescript
try { return fooAsync(); }
catch (err) { /* never called */ }
```

Out:
```typescript
try { return await fooAsync(); }
catch (err) { /* now called */ }
```

### sequelize-comment

Feature. Adds the path/function to sequelize calls, such
that some comment plugin could read them out and put them
into the query.

In:
```typescript
models.Potato.findOne({ where: { id } })
```

Out:
```typescript
models.Potato.findOne({
    comment: 'lib/potato/read.ts:getById',
    where: { id },
})
```


### unbounded-concurrency

Bug finder. Discourages the use of promise machinery which will
result in resource starvation for other requests.

In:
```typescript
return await Promise.all(longList.map((v) => someFunc(v)));
```

Out:
```typescript
import { pMap } from 'p-map';
return await pMap(longList, (v) => someFunc(v), { concurrency: 6 });
```
