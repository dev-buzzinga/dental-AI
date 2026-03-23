import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tableQueries } from './table.js';
import { rlsQueries } from './RLS_permission.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the root backend .env file
dotenv.config({ path: join(__dirname, '../../.env') });

const { Client } = pg;

async function seedDatabase() {
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ Error: SUPABASE_DB_URL is not set in your .env file.');
    console.error('Please add SUPABASE_DB_URL to your backend/.env file.');
    console.error('Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres');
    console.error('You can find this in your Supabase Dashboard under Settings > Database > Connection string > URI.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to the database...');
    await client.connect();

    console.log('🚧 Creating tables...');
    await client.query(tableQueries);
    console.log('✅ Tables created successfully!');

    console.log('🚧 Setting up Row Level Security (RLS) policies...');
    await client.query(rlsQueries);
    console.log('✅ RLS policies logic ran successfully!');

    console.log('🎉 Database seeding completed! You are ready to go.');
  } catch (error) {
    console.error('❌ Error during database seeding:');
    console.error(error.message);
  } finally {
    await client.end();
  }
}

seedDatabase();
