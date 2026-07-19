import { rankLiveSearchResults } from '../liveSearchRanking';

describe('rankLiveSearchResults', () => {
  it('ranks an exact title phrase ahead of partial metadata matches', () => {
    const results = rankLiveSearchResults([
      { title: 'Marsa Alam: Sea and Desert Horse Riding Tour', location: 'Marsa Alam Desert' },
      { title: 'Hurghada 6 Hour Jeep Desert Safari, Dinner, and Show', rating: 4.5 },
      { title: 'El Gouna Horse Ride Tour', tags: ['desert', 'safari'] },
    ], 'Desert Safari');
    expect(results[0].title).toBe('Hurghada 6 Hour Jeep Desert Safari, Dinner, and Show');
  });

  it('keeps the original order when relevance and popularity are tied', () => {
    const results = rankLiveSearchResults([{ title: 'Sharm Alpha' }, { title: 'Sharm Beta' }], 'sharm');
    expect(results.map(result => result.title)).toEqual(['Sharm Alpha', 'Sharm Beta']);
  });
});
