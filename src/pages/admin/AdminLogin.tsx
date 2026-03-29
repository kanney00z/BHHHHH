import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate('/admin');
    }
  }, [session, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMsg(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setErrorMsg(error.message);
      else setErrorMsg('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
    }
    
    setIsSubmitting(false);
  };

  if (loading) return null;

  return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ background: 'var(--surface)', padding: 40, borderRadius: 24, border: '1px solid var(--border)', width: '100%', maxWidth: 400 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-glass)', padding: 16, borderRadius: '50%', marginBottom: 16, border: '1px solid var(--bg-glass-border)' }}>
            <Lock size={32} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)' }}>{isLogin ? 'เข้าสู่ระบบร้าน' : 'สร้างบัญชีแอดมิน'}</h2>
          <p style={{ color: 'var(--text-muted)' }}>สำหรับผู้ดูแลระบบร้านอาหาร</p>
        </div>

        {errorMsg && (
          <div style={{ background: 'var(--bg-lighter)', color: 'var(--text-primary)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', border: '1px solid var(--border)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>อีเมล</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{ paddingLeft: 44, width: '100%' }}
                placeholder="admin@yumdash.com"
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>รหัสผ่าน</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 16, top: 16, color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ paddingLeft: 44, width: '100%' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ height: 48, marginTop: 8 }} disabled={isSubmitting}>
            {isSubmitting ? 'กำลังดำเนินการ...' : isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {isLogin ? 'ต้องการสร้างบัญชีแอดมินใหม่? สมัครสมาชิก' : 'กลับไปหน้าเข้าสู่ระบบ'}
          </button>
        </div>

      </div>
    </div>
  );
}
