import type { Metadata } from 'next';
import ProjectTrackerClient from './_page-client';

export const metadata: Metadata = {
  title: 'Project Status Tracker',
};

export default function ProjectTrackerPage() {
  return <ProjectTrackerClient />;
}
