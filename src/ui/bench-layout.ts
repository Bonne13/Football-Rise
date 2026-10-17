import type { StadiumProfile } from '../data/stadiums.js';

export function benchLayout(profile: StadiumProfile) {
  const seats=profile.size==='local'?7:profile.size==='regional'?9:12;
  const style=profile.size==='local'?(profile.seed%2?'wood':'canopy'):profile.facade==='glass'?'glass':'shelter';
  return { seats,style,covered:style!=='wood',length:seats*.72+1.2,x:-37.3,homeZ:44+(profile.seed%3-1)*2,awayZ:64+(profile.seed%3-1)*2 };
}
