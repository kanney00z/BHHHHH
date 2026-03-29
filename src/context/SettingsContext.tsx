import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { StoreSettings } from '../types';

interface SettingsContextType {
  settings: StoreSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<StoreSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();

    const channelName = `settings-channel-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings();
      })
      .subscribe((status, err) => {
        if (err) console.error('Settings Realtime Error', err);
        console.log('Settings channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (settings?.restaurant_name) {
      document.title = `${settings.restaurant_name} | สั่งอาหารออนไลน์`;
    }
  }, [settings?.restaurant_name]);

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error) {
      console.error('Error fetching settings:', error);
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    const { error } = await supabase.from('settings').update(updates).eq('id', 1);
    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    } else {
      setSettings(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
