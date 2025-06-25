'use client';
import { useState, useEffect } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { walletAtom, viviStateAtom } from '@/lib/atoms';
import { useSetAtom } from 'jotai';

export default function Home() {
  const [mode, setMode] = useState<'none' | 'login' | 'signup'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const setWallet = useSetAtom(walletAtom);
  const setViviState = useSetAtom(viviStateAtom);
  const router = useRouter();

  useEffect(() => {
    if (mode !== 'none') {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [mode]);

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode }),
      });
      const data = await res.json();
      setWallet(data.wallet);
      
      if (data.success) {
        // For existing users (login), load vivi state
        if (mode === 'login' && data.wallet && data.user) {
          try {
            const viviRes = await fetch(`/api/vivi?uid=${data.user.id}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            const viviData = await viviRes.json();
            if (viviData.success) {
              setViviState(viviData.vivi);
            }
          } catch (viviError) {
            console.error('Failed to load vivi state:', viviError);
            // Continue with login even if vivi state loading fails
          }
        }
        router.push('/game');
      } else {
        setError(data.error || 'Auth failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const closePopup = () => {
    setMode('none');
    setError('');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#000',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(193,18,31,0.1) 0%, rgba(0,0,0,1) 70%)',
        animation: 'rotate 20s linear infinite',
        zIndex: 0
      }}></div>
      
      <h1 className="viving-logo" style={{ 
        fontSize: 100, 
        marginBottom: 48, 
        letterSpacing: 2,
        position: 'relative',
        zIndex: 1,
        textShadow: '0 0 10px rgba(193,18,31,0.5)'
      }}>VIVING</h1>
      
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        position: 'relative',
        zIndex: 1
      }}>
        <button 
          style={{ 
            background: '#c1121f', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 8, 
            padding: '16px 48px', 
            fontSize: 22, 
            fontWeight: 400, 
            cursor: 'pointer',
            transition: 'transform 0.3s, box-shadow 0.3s',
            boxShadow: '0 4px 15px rgba(193,18,31,0.4)'
          }} 
          onClick={() => setMode('signup')}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          Sign up
        </button>
        
        <button 
          style={{ 
            background: '#fff', 
            color: '#000', 
            border: 'none', 
            borderRadius: 8, 
            padding: '16px 48px', 
            fontSize: 22, 
            fontWeight: 400, 
            cursor: 'pointer',
            transition: 'transform 0.3s, box-shadow 0.3s',
            boxShadow: '0 4px 15px rgba(255,255,255,0.4)'
          }} 
          onClick={() => setMode('login')}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          Continue
        </button>
      </div>

      {/* Popup Overlay */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {/* Popup Content */}
          <div style={{
            background: 'linear-gradient(145deg, #181818, #222)',
            padding: 40,
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            transform: 'scale(0.95)',
            animation: 'scaleIn 0.3s ease-out forwards'
          }}>
            <button 
              onClick={closePopup}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
            >
              ×
            </button>
            
            <h2 style={{
              color: '#fff',
              fontSize: 28,
              marginBottom: 30,
              textAlign: 'center',
              fontWeight: 600
            }}>
              {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h2>
            
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <input 
                  name="email" 
                  type="email" 
                  placeholder="Email" 
                  style={{ 
                    padding: 14, 
                    width: '100%',
                    borderRadius: 8, 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontSize: 16,
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    transition: 'border-color 0.3s'
                  }} 
                  required 
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(193,18,31,0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                />
              </div>
              
              <div>
                <input 
                  name="password" 
                  type="password" 
                  placeholder="Password" 
                  style={{ 
                    padding: 14, 
                    width: '100%',
                    borderRadius: 8, 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontSize: 16,
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    transition: 'border-color 0.3s'
                  }} 
                  required 
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(193,18,31,0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                />
              </div>
              
              <button 
                type="submit" 
                style={{ 
                  background: '#c1121f', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: 16, 
                  fontSize: 18, 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  marginTop: 10,
                  transition: 'transform 0.2s, background 0.2s',
                  boxShadow: '0 4px 15px rgba(193,18,31,0.4)'
                }} 
                disabled={loading}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? (
                  <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                  </span>
                ) : mode === 'signup' ? 'Sign up' : 'Login'}
              </button>
              
              {error && (
                <div style={{ 
                  color: '#c1121f', 
                  padding: 12,
                  borderRadius: 6,
                  background: 'rgba(193,18,31,0.1)',
                  border: '1px solid rgba(193,18,31,0.3)',
                  textAlign: 'center',
                  marginTop: 10
                }}>
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
