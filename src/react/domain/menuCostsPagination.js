export const MENU_COSTS_PAGE_SIZE = 50;

const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeCollectionItemKey = item =>
  String(item?.id || item?.['@id'] || item?.filePath || '').trim();

export const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  return [];
};

export const hasHydraNext = response => Boolean(response?.['hydra:view']?.next);

export const fetchAllPagedItems = async ({
  actions,
  params = {},
  maxPages = 8,
  getKey = normalizeCollectionItemKey,
} = {}) => {
  if (!actions?.getItems) return [];

  const items = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await actions.getItems({
      ...params,
      page,
    });
    const batch = extractCollectionItems(response);

    safeArray(batch).forEach(item => {
      const key = String(getKey(item) || '').trim();
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      items.push(item);
    });

    if (!hasHydraNext(response) || batch.length === 0) {
      break;
    }
  }

  return items;
};
