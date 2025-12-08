import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Sample initial data (empty by default)
const initialProducts = []

export const useProductStore = create(
  persist(
    (set, get) => ({
      products: initialProducts,
      categories: ['Makanan', 'Minuman', 'Snack', 'Sembako', 'Elektronik', 'Alat Tulis', 'Paket Bundling'],
      units: ['pcs', 'kg', 'box', 'pack', 'lusin', 'kodi', 'gross', 'paket'],
      isOnline: false,
      isSyncing: false,

      // Direct setters for realtime sync
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      setUnits: (units) => set({ units }),

      // Initialize realtime subscription
      initRealtime: async () => {
        if (!isSupabaseConfigured()) {
          console.log('Supabase not configured, using local storage only')
          return
        }

        try {
          // Fetch initial data
          await get().fetchProducts()
          await get().fetchCategories()
          await get().fetchUnits()
          
          set({ isOnline: true })

          // Subscribe to realtime changes
          supabase
            .channel('products-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
              console.log('Product change:', payload)
              if (payload.eventType === 'INSERT') {
                set((state) => ({ 
                  products: [...state.products.filter(p => p.id !== payload.new.id), transformProduct(payload.new)] 
                }))
              } else if (payload.eventType === 'UPDATE') {
                set((state) => ({
                  products: state.products.map((p) => p.id === payload.new.id ? transformProduct(payload.new) : p)
                }))
              } else if (payload.eventType === 'DELETE') {
                set((state) => ({
                  products: state.products.filter((p) => p.id !== payload.old.id)
                }))
              }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
              get().fetchCategories()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
              get().fetchUnits()
            })
            .subscribe()

        } catch (error) {
          console.error('Realtime init error:', error)
          set({ isOnline: false })
        }
      },

      // Fetch products from Supabase
      fetchProducts: async () => {
        if (!isSupabaseConfigured()) return
        
        set({ isSyncing: true })
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (!error && data) {
          set({ products: data.map(transformProduct), isSyncing: false })
        } else {
          set({ isSyncing: false })
        }
      },

      // Fetch categories from Supabase
      fetchCategories: async () => {
        if (!isSupabaseConfigured()) return
        
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .order('name')

        if (!error && data) {
          set({ categories: data.map(c => c.name) })
        }
      },

      // Fetch units from Supabase
      fetchUnits: async () => {
        if (!isSupabaseConfigured()) return
        
        const { data, error } = await supabase
          .from('units')
          .select('name')
          .order('name')

        if (!error && data) {
          set({ units: data.map(u => u.name) })
        }
      },
      
      addProduct: async (product) => {
        const newProduct = {
          ...product,
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          code: product.code || `PRD${String(get().products.length + 1).padStart(3, '0')}`
        }

        // Add locally first (optimistic update)
        set((state) => ({ products: [...state.products, newProduct] }))

        // Sync to Supabase if configured
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('products').insert({
            id: newProduct.id,
            code: newProduct.code,
            sku: newProduct.sku,
            barcode: newProduct.barcode,
            name: newProduct.name,
            description: newProduct.description,
            category: newProduct.category,
            unit: newProduct.unit,
            price: newProduct.price || 0,
            cost: newProduct.cost || 0,
            stock: newProduct.stock || 0,
            min_stock: newProduct.minStock || 0,
            max_stock: newProduct.maxStock || 0,
            image_url: newProduct.image,
            parent_id: newProduct.parentId,
            variant_name: newProduct.variantName
          })
          
          if (error) {
            console.error('Error adding product to Supabase:', error)
          }
        }
      },
      
      updateProduct: async (id, updatedProduct) => {
        // Update locally first
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updatedProduct } : p))
        }))

        // Sync to Supabase
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('products').update({
            code: updatedProduct.code,
            sku: updatedProduct.sku,
            barcode: updatedProduct.barcode,
            name: updatedProduct.name,
            description: updatedProduct.description,
            category: updatedProduct.category,
            unit: updatedProduct.unit,
            price: updatedProduct.price,
            cost: updatedProduct.cost,
            stock: updatedProduct.stock,
            min_stock: updatedProduct.minStock,
            max_stock: updatedProduct.maxStock,
            image_url: updatedProduct.image
          }).eq('id', id)
          
          if (error) console.error('Error updating product:', error)
        }
      },
      
      deleteProduct: async (id) => {
        // Delete locally first
        set((state) => ({
          products: state.products.filter((p) => p.id !== id)
        }))

        // Sync to Supabase (soft delete)
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('products')
            .update({ is_active: false })
            .eq('id', id)
          
          if (error) console.error('Error deleting product:', error)
        }
      },

      addCategory: async (category) => {
        set((state) => ({
          categories: [...state.categories, category]
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('categories').insert({ name: category })
        }
      },

      removeCategory: async (category) => {
        set((state) => ({
          categories: state.categories.filter((c) => c !== category)
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('categories').delete().eq('name', category)
        }
      },

      addUnit: async (unit) => {
        set((state) => ({
          units: [...state.units, unit]
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('units').insert({ name: unit })
        }
      },

      removeUnit: async (unit) => {
        set((state) => ({
          units: state.units.filter((u) => u !== unit)
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('units').delete().eq('name', unit)
        }
      },
      
      updateStock: async (id, quantity, type = 'set') => {
        const product = get().products.find(p => p.id === id)
        if (!product) return

        let newStock = product.stock
        if (type === 'add') newStock += quantity
        else if (type === 'subtract') newStock -= quantity
        else newStock = quantity
        
        newStock = Math.max(0, newStock)

        // Update locally
        set((state) => ({
          products: state.products.map((p) => p.id === id ? { ...p, stock: newStock } : p)
        }))

        // Sync to Supabase
        if (isSupabaseConfigured()) {
          await supabase.from('products').update({ stock: newStock }).eq('id', id)
        }
      },
      
      getProductByBarcode: (barcode) => {
        return get().products.find((p) => p.barcode === barcode)
      },
      
      getLowStockProducts: () => {
        return get().products.filter((p) => p.stock <= p.minStock)
      },

      // Import products from Shopee
      // Products with variants will create multiple rows (one per variant)
      // SKU yang sama tidak akan diimport ulang (filter duplikat)
      importShopeeProducts: (shopeeItems) => {
        const existingProducts = get().products;
        let imported = 0;
        let updated = 0;
        let skipped = 0;

        // Build a Set of existing SKUs for fast lookup (exclude empty SKUs)
        const existingSkus = new Set(
          existingProducts
            .filter(p => p.sku && p.sku.trim() !== '')
            .map(p => p.sku.trim().toLowerCase())
        );

        // Debug: log first item structure
        if (shopeeItems.length > 0) {
          console.log('ProductStore - First Shopee Item:', shopeeItems[0]);
          console.log('ProductStore - Existing SKUs count:', existingSkus.size);
        }

        shopeeItems.forEach(item => {
          // Check if product has variants/models
          const hasVariants = item.has_model && item.models && item.models.length > 1;
          
          if (hasVariants) {
            // Debug: log first model structure to see price fields
            if (imported === 0 && updated === 0) {
              console.log('Model Structure Debug:', JSON.stringify(item.models[0], null, 2));
            }
            
            // Create a product entry for each variant
            item.models.forEach((model, modelIndex) => {
              const variantId = `shopee_${item.item_id}_${model.model_id}`;
              const existingIndex = existingProducts.findIndex(p => p.id === variantId);

              // Get variant name (e.g., "34.4mm", "44.4mm")
              const variantName = model.model_name || 
                                  (model.tier_index && item.tier_variation ? 
                                    item.tier_variation.map((tv, i) => tv.option_list?.[model.tier_index?.[i]]?.option || '').filter(Boolean).join(' - ') : 
                                    '');
              
              // Get SKU for this variant
              const variantSku = (model.model_sku && model.model_sku.trim()) || '';
              
              // Skip if SKU already exists in OTHER products (not this one) - filter duplikat
              // Allow updates to existing Shopee products
              if (existingIndex < 0 && variantSku && existingSkus.has(variantSku.toLowerCase())) {
                console.log(`Skipping duplicate SKU: ${variantSku}`);
                skipped++;
                return; // Skip this variant
              }
              
              // Get price for this variant - try multiple sources
              // API now adds current_price directly to model
              const price = model.current_price || 
                           model.price_info?.current_price || 
                           model.price_info?.original_price ||
                           model.original_price ||
                           model.price ||
                           (Array.isArray(model.price_info) && model.price_info[0]?.current_price) ||
                           0;
              
              // Get stock for this variant - API adds stock directly to model
              const stock = model.stock ||
                           model.stock_info_v2?.seller_stock?.[0]?.stock || 
                           model.stock_info_v2?.summary_info?.total_available_stock ||
                           model.stock_info?.current_stock ||
                           model.normal_stock ||
                           0;
              
              // Get image - use model image if available, otherwise parent image
              const imageUrl = model.model_image_url || 
                              item.image?.image_url_list?.[0] || 
                              '';

              // Debug first variant
              if (imported === 0 && updated === 0 && modelIndex === 0) {
                console.log('Variant Debug:', { 
                  item_id: item.item_id,
                  model_id: model.model_id,
                  model_name: variantName,
                  model_sku: variantSku,
                  price: price,
                  stock: stock
                });
              }

              const productData = {
                id: variantId,
                shopeeItemId: item.item_id,
                shopeeModelId: model.model_id,
                shopeeShopId: item.shop_id,
                code: `SHP${String(item.item_id).slice(-4)}${String(model.model_id).slice(-2)}`,
                sku: variantSku || '',
                barcode: '',
                name: variantName ? `${item.item_name} - ${variantName}` : item.item_name,
                parentName: item.item_name,
                variantName: variantName,
                description: item.description || '',
                category: 'Shopee',
                categoryId: item.category_id,
                unit: 'pcs',
                price: price,
                originalPrice: model.price_info?.original_price || 0,
                cost: 0,
                stock: stock,
                minStock: 5,
                maxStock: 100,
                image: imageUrl,
                images: item.image?.image_url_list || [],
                source: 'shopee',
                shopeeStatus: item.item_status || 'NORMAL',
                hasModel: true,
                isVariant: true,
                parentItemId: item.item_id,
                condition: item.condition || 'NEW',
                weight: item.weight,
                dimension: item.dimension,
                brand: item.brand?.original_brand_name || '',
                createdTime: item.create_time ? new Date(item.create_time * 1000).toISOString() : null,
                updatedAt: new Date().toISOString()
              };

              if (existingIndex >= 0) {
                existingProducts[existingIndex] = { 
                  ...existingProducts[existingIndex], 
                  ...productData,
                  id: existingProducts[existingIndex].id,
                  source: 'shopee'
                };
                updated++;
              } else {
                existingProducts.push(productData);
                imported++;
                // Add this SKU to set to prevent duplicates within same import batch
                if (variantSku) {
                  existingSkus.add(variantSku.toLowerCase());
                }
              }
            });
          } else {
            // Single product without variants (original logic)
            const shopeeId = `shopee_${item.item_id}`;
            const existingIndex = existingProducts.findIndex(p => 
              p.shopeeItemId === item.item_id || p.id === shopeeId
            );

            // Get SKU
            const itemSku = (item.item_sku && item.item_sku.trim()) || 
                            (item.model_sku && item.model_sku.trim()) || 
                            (item.models && item.models.length > 0 && item.models[0]?.model_sku?.trim()) ||
                            '';
            
            // Skip if SKU already exists (filter duplikat) - only for new imports
            if (existingIndex < 0 && itemSku && existingSkus.has(itemSku.toLowerCase())) {
              console.log(`Skipping duplicate SKU: ${itemSku}`);
              skipped++;
              return; // Skip this item
            }
            
            // Get price
            const price = item.current_price || 
                         (Array.isArray(item.price_info) && item.price_info[0]?.current_price) ||
                         (item.price_info?.current_price) ||
                         (item.models && item.models.length > 0 && item.models[0]?.price_info?.current_price) ||
                         0;
            
            // Get stock
            const stock = item.current_stock ||
                         item.stock_info_v2?.summary_info?.total_available_stock ||
                         (item.models && item.models.length > 0 && item.models[0]?.stock_info_v2?.summary_info?.total_available_stock) ||
                         item.stock_info?.current_stock ||
                         0;
            
            // Get image
            const imageUrl = item.image?.image_url_list?.[0] || 
                            (typeof item.image === 'string' ? item.image : '') ||
                            '';

            const productData = {
              id: shopeeId,
              shopeeItemId: item.item_id,
              shopeeShopId: item.shop_id,
              code: `SHP${String(item.item_id).slice(-6)}`,
              sku: itemSku || '',
              barcode: '',
              name: item.item_name || `Shopee Product ${item.item_id}`,
              description: item.description || '',
              category: 'Shopee',
              categoryId: item.category_id,
              unit: 'pcs',
              price: price,
              originalPrice: Array.isArray(item.price_info) ? item.price_info[0]?.original_price : item.price_info?.original_price || 0,
              cost: 0,
              stock: stock,
              minStock: 5,
              maxStock: 100,
              image: imageUrl,
              images: item.image?.image_url_list || [],
              source: 'shopee',
              shopeeStatus: item.item_status || 'NORMAL',
              shopeeModelId: item.models?.[0]?.model_id,
              hasModel: item.has_model || false,
              isVariant: false,
              condition: item.condition || 'NEW',
              weight: item.weight,
              dimension: item.dimension,
              brand: item.brand?.original_brand_name || '',
              createdTime: item.create_time ? new Date(item.create_time * 1000).toISOString() : null,
              updatedAt: new Date().toISOString()
            };

            if (existingIndex >= 0) {
              existingProducts[existingIndex] = { 
                ...existingProducts[existingIndex], 
                ...productData,
                id: existingProducts[existingIndex].id,
                source: 'shopee'
              };
              updated++;
            } else {
              existingProducts.push(productData);
              imported++;
              // Add this SKU to set to prevent duplicates within same import batch
              if (itemSku) {
                existingSkus.add(itemSku.toLowerCase());
              }
            }
          }
        });

        set({ products: [...existingProducts] });
        
        // Add Shopee category if not exists
        const categories = get().categories;
        if (!categories.includes('Shopee')) {
          set({ categories: [...categories, 'Shopee'] });
        }

        return { imported, updated, skipped, total: shopeeItems.length };
      },

      // Clear all Shopee products before sync
      clearShopeeProducts: () => {
        const nonShopeeProducts = get().products.filter(p => p.source !== 'shopee');
        set({ products: nonShopeeProducts });
        return nonShopeeProducts.length;
      },

      // Get products by source
      getProductsBySource: (source) => {
        return get().products.filter(p => p.source === source);
      }
    }),
    {
      name: 'product-storage'
    }
  )
)

// Transform Supabase row to app format
function transformProduct(row) {
  return {
    id: row.id,
    code: row.code,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit,
    price: parseFloat(row.price) || 0,
    cost: parseFloat(row.cost) || 0,
    stock: row.stock || 0,
    minStock: row.min_stock || 0,
    maxStock: row.max_stock || 0,
    image: row.image_url,
    parentId: row.parent_id,
    variantName: row.variant_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
