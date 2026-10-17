import { bounded } from '../../core/rules.js';
import type { Club } from '../career/state.js';
import { calculateOverall, type CareerPlayer } from '../player/player.js';
import { makeOffer } from '../transfers/contracts.js';

/** Initial placement is merit-based, deterministic and exclusively in youth teams. */
export function initialYouthClub(player: CareerPlayer, clubs: Club[], quality: number) {
  bounded(quality,0,100);
  const overall=calculateOverall(player.position,player.attributes),target=30+quality*.5;
  return clubs.filter(c=>c.minimumOverall<=overall&&c.minimumPotential<=player.perceivedPotential&&makeOffer(player,c,'youth'))
    .map(club=>({club,score:-Math.abs(club.reputation-target)*2+(club.country===player.nationality?15:0)+(club.needs.includes(player.position)?4:0)+club.facilities*.02}))
    .sort((a,b)=>b.score-a.score||a.club.id.localeCompare(b.club.id))[0]?.club??null;
}
