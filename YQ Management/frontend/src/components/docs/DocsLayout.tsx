import React from 'react';
import Head from 'next/head';
import Sidebar from './Sidebar';
import TableOfContents from './TableOfContents';
import MarketingLayout from '../MarketingLayout';
import { SidebarSection } from '../../lib/docs';

interface DocsLayoutProps {
  children: React.ReactNode;
  sections: SidebarSection[];
  title: string;
  description?: string;
}

export default function DocsLayout({ children, sections, title, description }: DocsLayoutProps) {
  return (
    <MarketingLayout title={`${title} | Qmova Docs`} description={description}>
      <div className="max-w-8xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row">
          <Sidebar sections={sections} />
          
          <main className="flex-1 min-w-0 py-8 md:px-12">
            {children}
          </main>
          
          <TableOfContents />
        </div>
      </div>
    </MarketingLayout>
  );
}
