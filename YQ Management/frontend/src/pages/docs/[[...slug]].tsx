import React from 'react';
import { GetStaticProps, GetStaticPaths } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

import DocsLayout from '../../components/docs/DocsLayout';
import { MDXComponents } from '../../components/docs/MDXComponents';
import Breadcrumbs from '../../components/docs/Breadcrumbs';
import PrevNext from '../../components/docs/PrevNext';
import { 
  getAllDocs, 
  getDocBySlug, 
  getSidebar, 
  getPrevNext,
  DocData,
  SidebarSection,
  SidebarItem
} from '../../lib/docs';

interface DocPageProps {
  doc: DocData;
  source: MDXRemoteSerializeResult;
  sections: SidebarSection[];
  prevNext: {
    prev: SidebarItem | null;
    next: SidebarItem | null;
  };
}

export default function DocPage({ doc, source, sections, prevNext }: DocPageProps) {
  return (
    <DocsLayout 
      sections={sections} 
      title={doc.title} 
      description={doc.description}
    >
      <Breadcrumbs slugs={doc.slugAsParams} />
      
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          {doc.title}
        </h1>
        {doc.description && (
          <p className="text-xl text-zinc-400">
            {doc.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 mt-6">
          {doc.version && (
            <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-300 border border-white/10">
              Version {doc.version}
            </span>
          )}
          {doc.status && (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border
              ${doc.status === 'Published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                doc.status === 'Draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {doc.status}
            </span>
          )}
          {doc.lastUpdated && (
            <span className="text-xs text-zinc-500">
              Updated: {doc.lastUpdated}
            </span>
          )}
        </div>
      </div>
      
      <div className="prose prose-invert prose-indigo max-w-none prose-headings:scroll-mt-24 prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10">
        <MDXRemote {...source} components={MDXComponents} />
      </div>

      <PrevNext prev={prevNext.prev} next={prevNext.next} />
    </DocsLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = getAllDocs();
  
  return {
    paths: docs.map((doc) => ({
      params: {
        slug: doc.slugAsParams,
      },
    })),
    fallback: false, // Return 404 for missing docs
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slugArray = (params?.slug as string[]) || [];
  
  // Handle root /docs redirecting to product/getting-started or something
  // For now, if no slug, redirect to /docs/product
  if (slugArray.length === 0) {
    return {
      redirect: {
        destination: '/docs/product',
        permanent: false,
      },
    };
  }

  const doc = getDocBySlug(slugArray);
  if (!doc) {
    return { notFound: true };
  }

  const mdxSource = await serialize(doc.content, {
    mdxOptions: {
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      ],
    },
  });

  const slugString = slugArray.join('/');
  
  return {
    props: {
      doc: {
        ...doc.data,
        slug: slugString,
        slugAsParams: slugArray,
      },
      source: mdxSource,
      sections: getSidebar(),
      prevNext: getPrevNext(slugString),
    },
  };
};
