import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '../../lib/format';
import { renderOg } from '../../lib/og';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !(import.meta.env.PROD && data.draft));
  return [
    {
      params: { slug: 'default' },
      props: {
        title: 'Read your script. Keep your eyes on the lens.',
        subtitle: 'A teleprompter that follows your voice',
      },
    },
    ...posts.map((p) => ({
      params: { slug: `blog/${p.id}` },
      props: { title: p.data.title, subtitle: `blog · ${formatDate(p.data.date)}` },
    })),
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg({ title: props.title as string, subtitle: props.subtitle as string });
  return new Response(png.buffer as ArrayBuffer, { headers: { 'Content-Type': 'image/png' } });
};
