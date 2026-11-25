(function (root) {
  const KEY = 'tape.v1';

  function emptyBook() {
    return { version: 1, items: [], refreshedAt: null, lastError: null };
  }

  function sdk() {
    return root.newmaxApp && root.newmaxApp.data ? root.newmaxApp : null;
  }

  async function load() {
    const api = sdk();
    if (!api) return { book: emptyBook(), available: false };
    const raw = await api.data.get(KEY);
    if (!raw || raw.version !== 1 || !Array.isArray(raw.items)) {
      return { book: emptyBook(), available: true };
    }
    return {
      book: {
        version: 1,
        items: raw.items.filter((item) => item && typeof item.code === 'string'),
        refreshedAt: typeof raw.refreshedAt === 'string' ? raw.refreshedAt : null,
        lastError: typeof raw.lastError === 'string' ? raw.lastError : null,
      },
      available: true,
    };
  }

  async function save(book) {
    const api = sdk();
    if (!api) throw new Error('当前环境不能保存关注列表');
    await api.data.set(KEY, book);
  }

  root.TapeStore = { KEY, emptyBook, load, save };
})(typeof globalThis !== 'undefined' ? globalThis : this);
