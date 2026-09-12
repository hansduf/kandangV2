'use client';

import React, { useState } from 'react';
import { useProfile } from '@/context/ProfileContext';
import { AppProfile } from '@/types/database';
import { Shield, HardHat, Crown, Lock, X, Check, ArrowLeft, KeyRound } from 'lucide-react';

export const ProfileSwitcherModal: React.FC = () => {
  const {
    profiles,
    activeProfile,
    isProfileModalOpen,
    setIsProfileModalOpen,
    selectWorkerProfile,
    loginOwnerWithPin,
  } = useProfile();

  const [pinTargetProfile, setPinTargetProfile] = useState<AppProfile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isProfileModalOpen) return null;

  const handleSelectProfile = (profile: AppProfile) => {
    if (profile.role === 'owner') {
      setPinTargetProfile(profile);
      setPin('');
      setPinError('');
    } else {
      selectWorkerProfile(profile);
    }
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) return;

    setIsVerifying(true);
    setPinError('');

    try {
      const success = await loginOwnerWithPin(pin);
      if (success) {
        setPinTargetProfile(null);
        setPin('');
      } else {
        setPinError('PIN salah! Silakan coba lagi.');
      }
    } catch (err) {
      setPinError('Gagal memverifikasi PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNumClick = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        // Auto-verify on 4th digit
        setIsVerifying(true);
        loginOwnerWithPin(nextPin).then((success) => {
          setIsVerifying(false);
          if (success) {
            setPinTargetProfile(null);
            setPin('');
          } else {
            setPinError('PIN salah! Silakan periksa kembali.');
          }
        });
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setPinError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-black tracking-widest text-[#00684a] uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              KandangKu Profile
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {pinTargetProfile ? 'Verifikasi PIN Pemilik' : 'Pilih Siapa yang Mengakses'}
            </h3>
          </div>

          {/* Close button only if an active profile already exists */}
          {activeProfile && (
            <button
              onClick={() => {
                setPinTargetProfile(null);
                setIsProfileModalOpen(false);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 bg-slate-100 border border-slate-200 transition-colors"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* VIEW 1: PIN VERIFICATION FOR OWNER */}
        {pinTargetProfile ? (
          <div className="space-y-4 py-2 animate-in fade-in duration-150">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00684a] border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <p className="text-xs font-bold text-slate-600">
                Masukkan PIN untuk mengakses akun <strong className="text-slate-900">{pinTargetProfile.name}</strong>
              </p>
              <p className="text-[10px] text-slate-400 font-semibold">
                (PIN bawaan awal: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">1234</code>)
              </p>
            </div>

            {/* PIN Indicator Dots */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    pin.length > idx
                      ? 'bg-[#00684a] border-[#00684a] scale-110 shadow-xs'
                      : 'bg-slate-100 border-slate-300'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-center text-xs font-black text-rose-600 animate-shake">
                {pinError}
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumClick(digit)}
                  className="w-16 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-lg border border-slate-200 shadow-2xs transition-all mx-auto flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinTargetProfile(null)}
                className="w-16 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 font-bold text-xs border border-slate-200 transition-all mx-auto flex items-center justify-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleNumClick('0')}
                className="w-16 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-900 font-black text-lg border border-slate-200 shadow-2xs transition-all mx-auto flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="w-16 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-bold text-xs border border-slate-200 transition-all mx-auto flex items-center justify-center"
              >
                Hapus
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: PROFILE CARDS SELECTION (NETFLIX/MCP STYLE) */
          <div className="space-y-3 py-1">
            <p className="text-xs text-slate-500 font-semibold text-center">
              Pilih profil pengguna untuk menyesuaikan tampilan tugas & menu
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {profiles.map((p) => {
                const isCurrent = activeProfile?.id === p.id;
                const isOwnerRole = p.role === 'owner';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProfile(p)}
                    className={`p-3.5 rounded-3xl border text-center transition-all relative flex flex-col items-center justify-center gap-2 active:scale-95 group ${
                      isOwnerRole
                        ? 'bg-gradient-to-b from-emerald-50/70 to-emerald-100/40 border-emerald-200 hover:border-[#00684a]'
                        : 'bg-gradient-to-b from-slate-50 to-blue-50/40 border-slate-200 hover:border-blue-400'
                    } ${isCurrent ? 'ring-2 ring-[#00684a] shadow-md' : 'shadow-xs'}`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-[#00684a] text-white rounded-full flex items-center justify-center text-[10px] font-black">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}

                    {/* Avatar Icon */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm text-white font-black text-base transition-transform group-hover:scale-105 ${
                        isOwnerRole
                          ? 'bg-gradient-to-br from-[#00684a] to-emerald-800'
                          : 'bg-gradient-to-br from-blue-600 to-indigo-800'
                      }`}
                    >
                      {isOwnerRole ? <Crown className="w-6 h-6 text-amber-300" /> : <HardHat className="w-6 h-6 text-amber-300" />}
                    </div>

                    <div>
                      <span className="text-xs font-black text-slate-900 block truncate max-w-[110px]">
                        {p.name}
                      </span>
                      <span
                        className={`inline-block text-[9.5px] font-extrabold px-2 py-0.5 rounded-full mt-0.5 border ${
                          isOwnerRole
                            ? 'bg-emerald-100 text-[#00684a] border-emerald-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isOwnerRole ? '👑 Pemilik (PIN)' : '👷 Pekerja'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center mt-2">
              <p className="text-[10px] text-slate-500 font-semibold">
                💡 <strong className="text-slate-700">Pekerja:</strong> Sekali klik langsung masuk untuk mencatat telur & tugas harian.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
