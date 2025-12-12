import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config({ path: path.resolve(dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
});

async function resetDb() {
    console.log('🗑️  Resetting database...');
    try {
        const client = await pool.connect();
        try {
            // Drop schema public cascade wipes everything
            await client.query('DROP SCHEMA public CASCADE;');
            await client.query('CREATE SCHEMA public;');
            await client.query('GRANT ALL ON SCHEMA public TO public;'); // Restore access
            console.log('✅ Database reset complete.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Error resetting database:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

resetDb();
