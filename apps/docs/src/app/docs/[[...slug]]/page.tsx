import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';

import { source } from '@/lib/source';

type Props = {
  params: Promise<{
    slug?: string[];
  }>;
};

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const page = source.getPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function Page({ params }: Props) {
  const { slug = [] } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const Mdx = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description ? <DocsDescription>{page.data.description}</DocsDescription> : null}
      <DocsBody>
        <Mdx
          components={{
            ...defaultMdxComponents,
            a: createRelativeLink(source, page),
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}
