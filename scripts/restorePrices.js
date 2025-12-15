// Script to restore prices from backup to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://naydyhkqodpphzwkctr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5heWR5aGtxb2RwcGh6d2tjdHIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0OTM0ODM3NywiZXhwIjoyMDY0OTI0Mzc3fQ.a4LKpAjnGdOL9xvjLG8KrdAtwu7ndNh5IlZ_PNXDQII';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restorePrices() {
  console.log('📂 Reading backup file...');
  
  const backupPath = 'D:\\BACKUP SJA\\backup-pos-2025-12-12.json';
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  const products = backupData.data.products;
  console.log(`📦 Found ${products.length} products in backup`);
  
  let updated = 0;
  let errors = 0;
  
  for (const product of products) {
    if (product.price > 0) {
      const { error } = await supabase
        .from('products')
        .update({ 
          price: product.price,
          cost: product.cost || 0
        })
        .eq('id', product.id);
      
      if (error) {
        // Try by shopee_item_id if id doesn't match
        if (product.shopeeItemId) {
          const { error: error2 } = await supabase
            .from('products')
            .update({ 
              price: product.price,
              cost: product.cost || 0
            })
            .eq('shopee_item_id', product.shopeeItemId);
          
          if (error2) {
            console.error(`❌ ${product.name}: ${error2.message}`);
            errors++;
          } else {
            updated++;
          }
        } else {
          console.error(`❌ ${product.name}: ${error.message}`);
          errors++;
        }
      } else {
        updated++;
      }
    }
  }
  
  console.log(`\n✅ Updated: ${updated} products`);
  console.log(`❌ Errors: ${errors}`);
}

restorePrices().catch(console.error);
