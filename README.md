# schemas-script

Database schema definitions using Drizzle ORM for PostgreSQL, MySQL, and SQLite.

## Installation

```bash
bun install
```

## Export SQL Schemas

Generate SQL CREATE TABLE statements for each database:

```bash
# PostgreSQL
bun run export:postgres

# MySQL
bun run export:mysql

# SQLite
bun run export:sqlite
```

The output will be printed to stdout. To save to a file:

```bash
bun run export:postgres > schema.sql
```

## Schema Files

- `schema/postgres.ts` - PostgreSQL schema
- `schema/mysql.ts` - MySQL schema
- `schema/sqlite.ts` - SQLite schema
