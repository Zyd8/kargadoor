import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_RADIUS_KM = 1;

/** Fetches `delivery_radius_meters` from APP_CONFIG and returns it in km. */
export function useDeliveryRadius(): number {
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);

  useEffect(() => {
    supabase
      .from('APP_CONFIG')
      .select('VALUE')
      .eq('KEY', 'delivery_radius_meters')
      .single()
      .then(({ data }) => {
        if (data?.VALUE) {
          const meters = parseFloat(data.VALUE);
          if (!isNaN(meters) && meters > 0) setRadiusKm(meters / 1000);
        }
      });
  }, []);

  return radiusKm;
}
