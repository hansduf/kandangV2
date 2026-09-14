'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppProfile } from '@/types/database';
import { fetchProfiles, verifyOwnerPin as apiVerifyOwnerPin, updateProfile as apiUpdateProfile } from '@/lib/supabase';
import { pushLiveStateToWidgets } from '@/lib/widgetBridge';

interface ProfileContextType {
  profiles: AppProfile[];
  activeProfile: AppProfile | null;
  isOwner: boolean;
  isWorker: boolean;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  selectWorkerProfile: (profile: AppProfile) => void;
  loginOwnerWithPin: (pin: string) => Promise<boolean>;
  logoutToProfileSelect: () => void;
  refreshProfiles: () => Promise<void>;
  updateProfileName: (profileId: string, newName: string) => Promise<AppProfile>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<AppProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    try {
      const data = await fetchProfiles();
      setProfiles(data);
      return data;
    } catch (err) {
      console.error('Failed to load profiles:', err);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      const profileList = await loadProfiles();
      
      // Check saved active profile
      const saved = typeof window !== 'undefined' ? localStorage.getItem('kandang_active_profile') : null;
      if (saved) {
        try {
          const parsed: AppProfile = JSON.parse(saved);
          const found = profileList.find((p) => p.id === parsed.id && p.is_active);
          if (found) {
            setActiveProfile(found);
            pushLiveStateToWidgets(found);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // If no saved active profile, open profile selection modal
      setIsProfileModalOpen(true);
      setLoading(false);
    };

    init();
  }, []);

  const selectWorkerProfile = (profile: AppProfile) => {
    setActiveProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kandang_active_profile', JSON.stringify(profile));
    }
    pushLiveStateToWidgets(profile);
    setIsProfileModalOpen(false);
  };

  const loginOwnerWithPin = async (pin: string): Promise<boolean> => {
    const owner = profiles.find((p) => p.role === 'owner') || { id: 'owner-default', name: 'Pemilik', role: 'owner', avatar_color: '#00684a', is_active: true };
    const isValid = await apiVerifyOwnerPin(owner.id, pin);
    if (isValid) {
      setActiveProfile(owner);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kandang_active_profile', JSON.stringify(owner));
      }
      pushLiveStateToWidgets(owner);
      setIsProfileModalOpen(false);
      return true;
    }
    return false;
  };

  const logoutToProfileSelect = () => {
    setActiveProfile(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kandang_active_profile');
    }
    setIsProfileModalOpen(true);
  };

  const updateProfileName = async (profileId: string, newName: string): Promise<AppProfile> => {
    const updated = await apiUpdateProfile(profileId, { name: newName.trim() });
    if (activeProfile?.id === profileId) {
      const refreshedActive = { ...activeProfile, name: newName.trim() };
      setActiveProfile(refreshedActive);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kandang_active_profile', JSON.stringify(refreshedActive));
      }
    }
    await loadProfiles();
    return updated;
  };

  const isOwner = activeProfile?.role === 'owner';
  const isWorker = activeProfile?.role === 'worker';

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isOwner,
        isWorker,
        isProfileModalOpen,
        setIsProfileModalOpen,
        selectWorkerProfile,
        loginOwnerWithPin,
        logoutToProfileSelect,
        refreshProfiles: async () => {
          await loadProfiles();
        },
        updateProfileName,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
