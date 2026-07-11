// Check Algolia index status
import dotenv from 'dotenv';
dotenv.config();

import { algoliasearch } from 'algoliasearch';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

async function checkStatus() {
  try {
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
      throw new Error(
        'NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY must be configured.',
      );
    }

    console.log('🔍 Checking Algolia Status...');
    console.log('App ID:', ALGOLIA_APP_ID);
    console.log('Index Name:', INDEX_NAME);

    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

    // List all indices
    console.log('\n📋 Listing all indices...');
    const { items: indices } = await client.listIndices();
    console.log('Found indices:', indices.length);
    indices.forEach((index: any) => {
      console.log(`  - ${index.name}: ${index.entries} entries`);
    });

    // Check specific index
    console.log(`\n🔎 Checking index "${INDEX_NAME}"...`);
    try {
      const indexExists = indices.some((idx: any) => idx.name === INDEX_NAME);
      if (indexExists) {
        const index = indices.find((idx: any) => idx.name === INDEX_NAME);
        console.log('✅ Index exists!');
        console.log('   Entries:', index?.entries);
      } else {
        console.log('❌ Index does not exist!');
        console.log('   Creating index...');
        await client.saveObjects({
          indexName: INDEX_NAME,
          objects: [{ objectID: 'test', test: true }]
        });
        console.log('✅ Index created');
      }
    } catch (error) {
      console.error('Error checking index:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkStatus();
