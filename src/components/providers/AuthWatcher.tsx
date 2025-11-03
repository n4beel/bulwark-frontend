'use client';

import useAuthWatcher from '@/shared/hooks/useAuthWatcher';
import { useGitHubAuth } from '@/shared/hooks/useGitHubAuth';

export default function AuthWatcher() {
  useAuthWatcher();
  useGitHubAuth();
  return null;
}
