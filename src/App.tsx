import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile } from './types';
import Navbar from './components/Navbar';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import Orders from './pages/Orders';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      handleAuthChange(session?.user);
    });

    const handleAuthChange = async (supabaseUser: any) => {
      if (supabaseUser) {
        setUser(supabaseUser);
        
        // Fetch or create profile in Supabase
        const { data: supabaseProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (supabaseProfile) {
          setProfile(supabaseProfile as UserProfile);
        } else {
          const rawEmail = supabaseUser.email || '';
          const cleanIdentifier = rawEmail.replace('@aroid-mock.com', '');
          
          const newProfile: UserProfile = {
            uid: supabaseUser.id,
            email: cleanIdentifier,
            role: rawEmail === 'lantatsp@gmail.com' ? 'admin' : 'user'
          };
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: newProfile.uid,
              email: newProfile.email,
              role: newProfile.role
            }]);
          
          if (!insertError) {
            setProfile(newProfile);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Missing Configuration</h1>
          <p className="text-gray-600 mb-6">
            The application cannot start because the Supabase credentials are not configured.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg text-left text-sm mb-6 border border-gray-100">
            <p className="font-semibold text-gray-700 mb-2">Please follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 font-mono text-xs">
              <li>Create a <code className="bg-gray-200 px-1 py-0.5 rounded">.env</code> file</li>
              <li>Add <code className="bg-gray-200 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code></li>
              <li>Add <code className="bg-gray-200 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code></li>
            </ol>
          </div>
          <p className="text-xs text-gray-500">
            Check <code className="bg-gray-100 px-1 rounded">.env.example</code> for reference. Restart the development server after making changes.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-orange-50/30">
        <Navbar user={user} profile={profile} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Menu />} />
            <Route path="/menu" element={<Navigate to="/" replace />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={user ? <Orders /> : <Navigate to="/" />} />
            <Route 
              path="/admin/*" 
              element={profile?.role === 'admin' ? <Admin /> : <Navigate to="/" />} 
            />
          </Routes>
        </main>
        <Toaster position="top-center" />
      </div>
    </Router>
  );
}
