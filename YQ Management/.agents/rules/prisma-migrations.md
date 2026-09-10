# Prisma Database Migration Policy

## CRITICAL RULE: NEVER USE `prisma db push`

**When making changes to `schema.prisma`**, you must NEVER use `npx prisma db push`. 
Using `db push` modifies the database directly without generating a migration file, leading to schema drift. When changes are pushed to production (which uses `prisma migrate deploy`), the database will lack the new tables or columns, causing 500 errors.

### Correct Workflow
Always generate a migration file for any structural database changes:

1. Modify `schema.prisma`.
2. Run `npx prisma migrate dev --name <descriptive_name>` (e.g., `npx prisma migrate dev --name add_date_selection_type`).
3. This command will:
   - Generate a new `.sql` migration file in `prisma/migrations/`.
   - Apply the migration to your local dev database.
   - Update the Prisma Client.
4. Commit the new `.sql` migration file along with your schema changes.
5. Push to the remote repository.

This guarantees that the production deployment can execute `npx prisma migrate deploy` successfully.
