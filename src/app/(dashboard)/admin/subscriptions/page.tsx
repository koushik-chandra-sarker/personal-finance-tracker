import { redirect } from 'next/navigation';

export default async function AdminSubscriptionsPage() {
  redirect('/admin/subscriptions/packages');
}
