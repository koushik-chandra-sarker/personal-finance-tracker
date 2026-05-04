import { redirect } from 'next/navigation';
import { isRecoveryBackdoorEnabled } from '@/lib/recovery-backdoor';
import RecoveryBackdoorClient from './RecoveryBackdoorClient';

export default function RecoveryBackdoorPage() {
  if (!isRecoveryBackdoorEnabled()) {
    redirect('/login');
  }

  return <RecoveryBackdoorClient />;
}
