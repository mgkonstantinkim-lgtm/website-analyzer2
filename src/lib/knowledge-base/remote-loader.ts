import localKnowledgeBase from '@/data/knowledge_base.json';

export async function loadKnowledgeBase() {
  const url = process.env.KNOWLEDGE_BASE_URL;

  if (!url) {
    return localKnowledgeBase;
  }

  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return localKnowledgeBase;
    }

    return await res.json();
  } catch (e) {
    return localKnowledgeBase;
  }
}
