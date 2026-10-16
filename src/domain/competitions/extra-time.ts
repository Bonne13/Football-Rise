import type { CompetitionWorld, Fixture, Tournament } from './world.js';
/** Older regulation IDs retain their original direct-penalty behaviour. */
export const aggregateRegulation=(t:Tournament)=>/^continental-v[12]:/.test(t.regulationId??'')||t.regulationId?.startsWith('promotion-v1:')===true;
export const hasExtraTime=(t:Tournament)=>t.regulationId?.startsWith('continental-v2:')===true||t.regulationId?.startsWith('promotion-v1:')===true||t.regulationId?.endsWith(':extra-time-v1')===true;
export function extraTimeAllowed(t:Tournament,f:Fixture,w?:CompetitionWorld){
 if(!hasExtraTime(t)||!['knockout','playoff','final','conference-semi','conference-final'].includes(f.stage))return false;
 if(t.key.startsWith('promotion:')||['champions','europa','conference','world-cup'].includes(t.key))return true;
 if(['libertadores','sudamericana','concacaf-champions'].includes(t.key))return !!w&&w.fixtures.filter(x=>x.competitionId===t.id&&x.round===f.round&&x.stage===f.stage).length===1;
 if(t.key.includes('Colômbia')||['central-american','caribbean'].includes(t.key))return false;
 if(t.key.includes('México')||t.key.includes('Argentina'))return f.stage==='final';
 return t.key==='league:Estados Unidos';
}
