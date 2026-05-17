import { redirect } from 'next/navigation';

export default function NewMeetingPage() {
  redirect('/meetings?new=1');
}
