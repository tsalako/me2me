# me2me starter

A starter app for me2me using Express, EJS, Prisma, Postgres, Google Sign-In, and server-side sessions.

## Setup

1. Create a new Postgres database named `me2me` in your existing Cloud SQL instance.
2. Copy `.env.example` to `.env` and fill in the values.
3. Make sure your Google OAuth client allows these JavaScript origins:
   - `http://localhost:3000`
   - `https://me2me.onrender.com`
4. Enable the `citext` extension in the me2me database:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

5. Install dependencies:

```bash
npm install
```

6. Create the migration and apply it locally:

```bash
npx prisma migrate dev --name init
```

7. Start the app:

```bash
npm start
```

## Notes

- This starter uses `user_sessions` for the session store table.
- Topic URLs use `id-slug` format, but only the id is used for lookup.
- Only topic owners can post.
- Shared viewers can only see public entries.
- Timestamps are rendered in `America/Los_Angeles` by default.
