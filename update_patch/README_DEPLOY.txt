==============================
  Bookstore Update v1.3.1
  Patch Deployment Guide
==============================

=== Deployment Steps ===

1. Stop the Bookstore application.

2. Go to the application folder -> `resources`.

3. Replace the old `app.asar` with the new one.

4. Replace the old `app.asar.unpacked` folder with the new one
   (or merge/overwrite its contents).

5. Go back, open the `database` folder, and open `library.db`
   using "DB Browser for SQLite".

6. Go to "Execute SQL", paste the content of `DB_MIGRATION.sql`,
   and run it.

7. Click "Write Changes" and close DB Browser.

8. Restart the application.
