import type { Club } from '../career/state.js';
import type { CompetitionWorld, Tournament } from './world.js';
import { membershipFor } from '../../data/league-snapshots.js';
export const MOVEMENT_PATHS = [
 {country:'Inglaterra',upper:1,lower:2,upperSize:20,lowerSize:24,automatic:2,down:3},
 {country:'Inglaterra',upper:2,lower:3,upperSize:24,lowerSize:24,automatic:2,down:3},
 {country:'Inglaterra',upper:3,lower:4,upperSize:24,lowerSize:24,automatic:3,down:4},
 {country:'Brasil',upper:1,lower:2,upperSize:20,lowerSize:20,automatic:4,down:4}
] as const;
export const divisionKey=(country:string,division:number)=>`league${division===1?'':division}:${country}`;
export const promotionKey=(country:string,division:number)=>`promotion:${country}:${division}`;
export const movementEnabled=(t:Tournament)=>t.regulationId?.startsWith('rules-v3:')===true;
export const promotionRegulation=(id:string,key:string)=>id===`promotion-v1:${key}`&&MOVEMENT_PATHS.some(p=>p.country==='Inglaterra'&&promotionKey(p.country,p.lower)===key);
export function playoffPath(w:CompetitionWorld,t:Tournament){
 return MOVEMENT_PATHS.find(p=>p.country==='Inglaterra'&&t.key===divisionKey(p.country,p.lower)&&movementEnabled(t)&&t.participants.length===p.lowerSize&&w.tournaments.some(u=>u.key===divisionKey(p.country,p.upper)&&movementEnabled(u)&&u.participants.length===p.upperSize));
}
export interface ClubMovement {clubId:string;from:string;to:string;kind:'promoted'|'relegated'}
/** League participants persist divisional membership. Never reassign promoted clubs
 * from the historical import at the next rollover, or fabricate missing clubs. */
export function nextDivisions(clubs:readonly Club[],previous:CompetitionWorld|undefined,table:(t:Tournament)=>string[]){
 const allocations=new Map(clubs.map(c=>[c.id,membershipFor(c)?.key??`league:${c.country}`]));
 const present=new Set(clubs.map(c=>c.id));
 for(const t of previous?.tournaments??[])if(t.level==='senior'&&/^league\d*:/.test(t.key))for(const id of t.participants)if(present.has(id))allocations.set(id,t.key);
 const moves:ClubMovement[]=[];
 if(!previous)return {allocations,moves};
 for(const p of MOVEMENT_PATHS){
  const upper=previous.tournaments.find(t=>t.key===divisionKey(p.country,p.upper)),lower=previous.tournaments.find(t=>t.key===divisionKey(p.country,p.lower));
  if(!upper||!lower||!movementEnabled(upper)||!movementEnabled(lower)||upper.phase!=='complete'||lower.phase!=='complete'||upper.participants.length!==p.upperSize||lower.participants.length!==p.lowerSize)continue;
  let promoted=table(lower).slice(0,p.automatic);
  if(p.country==='Inglaterra'){
   const playoff=previous.tournaments.find(t=>t.key===promotionKey(p.country,p.lower));
   if(playoff?.phase!=='complete'||!playoff.champion||!table(lower).slice(p.automatic,p.automatic+4).includes(playoff.champion))continue;
   promoted.push(playoff.champion);
  }
  const relegated=table(upper).slice(-p.down);
  if([...promoted,...relegated].some(id=>!present.has(id)))continue;
  moves.push(...promoted.map(clubId=>({clubId,from:lower.key,to:upper.key,kind:'promoted' as const})),...relegated.map(clubId=>({clubId,from:upper.key,to:lower.key,kind:'relegated' as const})));
 }
 for(const move of moves)allocations.set(move.clubId,move.to);
 return {allocations,moves};
}
