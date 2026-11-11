import { beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_MAX, makePreview, useHistoryStore } from '../src/state/history';

describe('history', () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.setState({ items: [] });
  });

  it('saves newest first, dedupes the newest, caps at 10', () => {
    const h = useHistoryStore.getState();
    for (let i = 0; i < 12; i++) h.save(`script ${i}`);
    expect(useHistoryStore.getState().items).toHaveLength(HISTORY_MAX);
    expect(useHistoryStore.getState().items[0]!.text).toBe('script 11');
    h.save('script 11');
    expect(useHistoryStore.getState().items[0]!.text).toBe('script 11');
    expect(useHistoryStore.getState().items.filter((i) => i.text === 'script 11')).toHaveLength(1);
  });

  it('seeds the demo only when empty and tags it', () => {
    useHistoryStore.getState().seedDemo('demo text');
    expect(useHistoryStore.getState().items[0]!.tag).toBe('demo');
    useHistoryStore.getState().seedDemo('again');
    expect(useHistoryStore.getState().items).toHaveLength(1);
  });

  it('builds previews and ISO dates, keeps the doc url', () => {
    expect(makePreview('a'.repeat(50))).toBe(`${'a'.repeat(40)}…`);
    expect(makePreview('short  text\nhere')).toBe('short text here');
    useHistoryStore.getState().save('x', 'https://docs.google.com/document/d/abc');
    const item = useHistoryStore.getState().items[0]!;
    expect(item.googleDocUrl).toContain('docs.google.com');
    expect(() => new Date(item.date).toISOString()).not.toThrow();
  });
});
