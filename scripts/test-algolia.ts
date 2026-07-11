// Test Algolia connection with new credentials
import 'dotenv/config';
import { algoliasearch } from 'algoliasearch';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
};

const ALGOLIA_APP_ID = requireEnv('NEXT_PUBLIC_ALGOLIA_APP_ID');
const ALGOLIA_ADMIN_KEY = requireEnv('ALGOLIA_ADMIN_API_KEY');
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

async function testConnection() {
  try {
    console.log('🔍 Testing Algolia Connection...');
    console.log('App ID:', ALGOLIA_APP_ID);
    console.log('Index Name:', INDEX_NAME);

    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

    // List all indices
    console.log('\n📋 Listing all indices...');
    const { items: indices } = await client.listIndices();
    console.log('✅ Connection successful!');
    console.log(`Found ${indices.length} indices:`);
    indices.forEach((index: any) => {
      console.log(`  - ${index.name}: ${index.entries} entries`);
    });

    // Check if our index exists
    const ourIndex = indices.find((idx: any) => idx.name === INDEX_NAME);
    if (ourIndex) {
      console.log(`\n✅ Index "${INDEX_NAME}" exists with ${ourIndex.entries} entries`);
    } else {
      console.log(`\n❌ Index "${INDEX_NAME}" does not exist`);
    }

  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Status:', error.status);
  }
}

testConnection();
