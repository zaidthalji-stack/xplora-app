// supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://srbbuxpndcpeanyzqxva.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyYmJ1eHBuZGNwZWFueXpxeHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDY3NzIsImV4cCI6MjA3NDE4Mjc3Mn0.0Hwl4qvt-Zo43VHwJV4dApb_FxYi4nrmN77d9uJzCYg';

console.log('🔗 Initializing Supabase client...');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseAnonKey ? '✓ Present' : '✗ Missing');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'realstate-app',
    },
  },
});

// Test connection and data availability
export const testSupabaseConnection = async () => {
  console.log('\n🧪 Testing Supabase Connection...');
  console.log('=====================================');
  
  try {
    // Test 1: Basic connection
    const { data: testData, error: testError } = await supabase
      .from('properties_data')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return { success: false, error: testError };
    }
    
    console.log('✅ Connection successful!');
    
    // Test 2: Get total count
    const { count, error: countError } = await supabase
      .from('properties_data')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count query failed:', countError);
      return { success: false, error: countError };
    }
    
    console.log(`📊 Total properties: ${count}`);
    
    // Test 3: Get sample property with coordinates
    const { data: sampleData, error: sampleError } = await supabase
      .from('properties_data')
      .select('Property_ID, Latitude, Longitude, Transaction_Type, Developer, Price')
      .not('Latitude', 'is', null)
      .not('Longitude', 'is', null)
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Sample query failed:', sampleError);
      return { success: false, error: sampleError };
    }
    
    if (sampleData && sampleData.length > 0) {
      console.log('✅ Sample property retrieved:');
      console.log('   Property_ID:', sampleData[0].Property_ID);
      console.log('   Latitude:', sampleData[0].Latitude);
      console.log('   Longitude:', sampleData[0].Longitude);
      console.log('   Transaction_Type:', sampleData[0].Transaction_Type);
      console.log('   Developer:', sampleData[0].Developer);
      console.log('   Price:', sampleData[0].Price);
    } else {
      console.warn('⚠️ No properties with coordinates found');
    }
    
    // Test 4: Count properties with coordinates
    const { count: coordCount, error: coordError } = await supabase
      .from('properties_data')
      .select('*', { count: 'exact', head: true })
      .not('Latitude', 'is', null)
      .not('Longitude', 'is', null);
    
    if (!coordError) {
      console.log(`📍 Properties with coordinates: ${coordCount}`);
    }
    
    // Test 5: Check Binghatti properties
    const { count: binghattiCount, error: binghattiError } = await supabase
      .from('properties_data')
      .select('*', { count: 'exact', head: true })
      .ilike('Developer', '%binghatti%');
    
    if (!binghattiError) {
      console.log(`🏢 Binghatti properties: ${binghattiCount}`);
    }
    
    console.log('=====================================');
    console.log('✅ All tests passed!\n');
    
    return { 
      success: true, 
      totalCount: count,
      coordCount,
      binghattiCount,
      sampleProperty: sampleData?.[0]
    };
    
  } catch (err) {
    console.error('❌ Unexpected error during connection test:', err);
    console.log('=====================================\n');
    return { success: false, error: err };
  }
};

// Helper to debug a specific query
export const debugQuery = async (queryBuilder: any, label: string) => {
  console.log(`\n🔍 Debug Query: ${label}`);
  const startTime = Date.now();
  
  try {
    const result = await queryBuilder;
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${label} completed in ${duration}ms`);
    console.log(`   Records: ${result.data?.length || 0}`);
    console.log(`   Error: ${result.error ? result.error.message : 'None'}`);
    
    return result;
  } catch (err) {
    console.error(`❌ ${label} failed:`, err);
    throw err;
  }
};