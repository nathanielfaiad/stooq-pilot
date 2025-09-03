# Getting Started

## Development

- Run Drizzle CLI to generate

  ```bash
  npx drizzle-kit generate
  npx drizzle-kit push
  ```

- Test SQL

```bash
 npx ts-node -r tsconfig-paths/register src/db/data_loader.ts
```

- Test Scan (Daily Swing Candidates)

```bash
 npx ts-node -r tsconfig-paths/register src/service/tests/scan.test.ts
```
