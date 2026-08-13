import React from 'react';
import { GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import MarketingLayout from '../../components/MarketingLayout';
import { MDXComponents } from '../../components/docs/MDXComponents';
import { getDocBySlug } from '../../lib/docs';

interface PolicyPageProps {
  title: string;
  source: MDXRemoteSerializeResult;
}

export default function SecurityPolicyPage({ title, source }: PolicyPageProps) {
  return (
    <MarketingLayout title={`Qmova | ${title}`}>
      <div className="pt-32 pb-20 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-invert prose-indigo max-w-none prose-headings:scroll-mt-24 prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10">
            <MDXRemote {...source} components={MDXComponents} />
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const doc = getDocBySlug(['legal', 'security-policy']);
  
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

  return {
    props: {
      title: doc.data.title || 'Security Policy',
      source: mdxSource,
    },
  };
};
