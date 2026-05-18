export async function resolveResourceTitles(admin: any, ids: string[]): Promise<Record<string, string>> {
  if (!ids || ids.length === 0) return {};

  const validIds = Array.from(new Set(ids.filter(id => id && id.startsWith('gid://shopify/'))));
  if (validIds.length === 0) return {};

  const CHUNK_SIZE = 250;
  const result: Record<string, string> = {};

  for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
    const chunk = validIds.slice(i, i + CHUNK_SIZE);
    
    try {
      const response = await admin.graphql(
        `#graphql
        query resolveTitles($ids: [ID!]!) {
          nodes(ids: $ids) {
            id
            ... on Product { title }
            ... on Collection { title }
            ... on ProductVariant {
              title
              product { title }
            }
          }
        }`,
        { variables: { ids: chunk } }
      );

      const data = await response.json();
      if (data.data?.nodes) {
        for (const node of data.data.nodes) {
          if (node) {
            if (node.product) {
              result[node.id] = `${node.product.title} - ${node.title}`;
            } else if (node.title) {
              result[node.id] = node.title;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to resolve resource titles", e);
    }
  }

  return result;
}
