import { WorkflowGuide } from './WorkflowGuide';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Workflow Engine — Developer Guide' };

export default function WorkflowGuidePage() {
  return <WorkflowGuide />;
}
