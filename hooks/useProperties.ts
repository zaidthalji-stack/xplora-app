import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/supabase/client';
import { isBinghattiProperty } from '@/utils/developerLogos';

export const useProperties = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: fetchedProperties, error: fetchError } = await supabase
          .from('properties_data')
          .select('*')
          .not('Latitude', 'is', null)
          .not('Longitude', 'is', null);

        if (fetchError) {
          console.error('❌ Supabase error:', fetchError);
          if (isMounted) {
            setError(fetchError.message);
          }
          return;
        }

        if (isMounted) {
          setProperties(fetchedProperties || []);
          console.log('✅ Properties loaded:', fetchedProperties?.length || 0);
        }
      } catch (err) {
        console.error('❌ Fetch error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoized computed values
  const binghattiCount = useMemo(() => {
    return properties.filter(p => isBinghattiProperty(p.Developer)).length;
  }, [properties]);

  const openHouseCount = useMemo(() => {
    return properties.filter(p => p.open_house_status === 'active').length;
  }, [properties]);

  const featuredBinghattiCount = useMemo(() => {
    return properties.filter(p => 
      isBinghattiProperty(p.Developer) && p.featured_property === true
    ).length;
  }, [properties]);

  return {
    properties,
    isLoading,
    error,
    binghattiCount,
    openHouseCount,
    featuredBinghattiCount,
  };
};