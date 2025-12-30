import { supabase } from '@/supabase/client';  // ← CORRECT
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
}

export class LocationService {
  private static instance: LocationService;
  private subscriptions: (() => void)[] = [];
  private anonymousId: string | null = null;
  private lastUpdate: number = 0;
  private updateCount: number = 0;
  private readonly rateLimit: RateLimitConfig = {
    maxRequests: 10,
    timeWindow: 1000,
  };

  private constructor() {
    // Remove automatic initialization to prevent SSR issues
  }

  private generateRandomId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async ensureAnonymousIdInitialized(): Promise<void> {
    if (this.anonymousId) {
      return; // Already initialized
    }

    try {
      let storedId = await AsyncStorage.getItem('anonymousId');
      if (!storedId) {
        storedId = `anon-${this.generateRandomId()}`;
        await AsyncStorage.setItem('anonymousId', storedId);
      }
      this.anonymousId = storedId;
      
      // Log anonymous ID initialization
      console.log('Anonymous ID initialized:', {
        anonymous_id: storedId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error initializing anonymous ID:', error);
      this.anonymousId = `anon-${this.generateRandomId()}`;
    }
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && 
      latitude <= 90 && 
      longitude >= -180 && 
      longitude <= 180
    );
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    if (now - this.lastUpdate > this.rateLimit.timeWindow) {
      this.updateCount = 0;
      this.lastUpdate = now;
      return false;
    }
    return this.updateCount >= this.rateLimit.maxRequests;
  }

  private async logError(error: any, context: string) {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.message || String(error),
        context,
        anonymousId: this.anonymousId,
      };

      const existingLogs = await AsyncStorage.getItem('locationErrorLogs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorLog);
      
      const trimmedLogs = logs.slice(-100);
      await AsyncStorage.setItem('locationErrorLogs', JSON.stringify(trimmedLogs));

      console.error(`LocationService Error (${context}):`, error);
    } catch (logError) {
      console.error('Error logging location error:', logError);
    }
  }

  async updateUserLocation(location: LocationUpdate): Promise<void> {
    try {
      if (this.isRateLimited()) {
        throw new Error('Rate limit exceeded');
      }
      this.updateCount++;

      if (!this.validateCoordinates(location.latitude, location.longitude)) {
        throw new Error('Invalid coordinates');
      }

      // Get session and determine user status
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      const isAnonymous = !user;
      const userId = isAnonymous ? this.anonymousId : user.id;

      // Log authentication status
      console.log('Authentication Status:', {
        user_id: userId,
        is_anonymous: isAnonymous,
        has_session: !!session,
        timestamp: new Date().toISOString()
      });

      if (!userId) {
        throw new Error('No valid user ID available');
      }

      // If anonymous, set the anonymous_id in Supabase first
      if (isAnonymous) {
        const { error: setAnonymousIdError } = await supabase.rpc('set_anonymous_id', {
          anonymous_id: userId
        });

        if (setAnonymousIdError) {
          console.error('Error setting anonymous ID:', setAnonymousIdError);
          throw setAnonymousIdError;
        }
      }

      const locationData = {
        user_id: userId,
        is_anonymous: isAnonymous,
        location: `POINT(${location.longitude} ${location.latitude})`,
        heading: location.heading,
        timestamp: new Date().toISOString()
      };

      // Log the data being sent to Supabase
      console.log('Sending to Supabase:', {
        ...locationData,
        location: `POINT(${location.longitude} ${location.latitude})`
      });

      const { error: upsertError } = await supabase
        .from('user_locations')
        .upsert(locationData);

      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
        await this.logError(upsertError, 'upsertLocation');
        throw upsertError;
      }

      // Log successful update
      console.log('Location update successful:', {
        user_id: userId,
        is_anonymous: isAnonymous,
        timestamp: new Date().toISOString()
      });

      this.notifyLocationUpdate(locationData);

    } catch (error) {
      await this.logError(error, 'updateUserLocation');
      throw error;
    }
  }

  private notifyLocationUpdate(locationData: any) {
    const channel = supabase.channel('location_updates');
    channel.send({
      type: 'broadcast',
      event: 'location_update',
      payload: locationData,
    });
  }

  subscribeToLocationUpdates(callback: (locations: any[]) => void): () => void {
    const channel = supabase
      .channel('location_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
        },
        () => {
          this.getAllLocations().then(callback);
        }
      )
      .on(
        'broadcast',
        { event: 'location_update' },
        ({ payload }) => {
          this.getAllLocations().then(callback);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      channel.unsubscribe();
    };

    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  async getAllLocations(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        await this.logError(error, 'getAllLocations');
        return [];
      }

      return data || [];
    } catch (error) {
      await this.logError(error, 'getAllLocations');
      return [];
    }
  }

  async getErrorLogs(): Promise<any[]> {
    try {
      const logs = await AsyncStorage.getItem('locationErrorLogs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error retrieving error logs:', error);
      return [];
    }
  }

  cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }
}

export const locationService = LocationService.getInstance();