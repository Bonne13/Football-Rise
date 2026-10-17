import type { Club } from '../domain/career/state.js';
import type { Kit } from './kits.js';

export interface CoachProfile {
  id: string;
  clubId: string;
  team: 'youth' | 'senior';
  label: string;
  source: string;
  simulated: true;
  appearanceSeed: number;
  style: 'polo' | 'tracksuit' | 'casual';
  kit: Kit;
}
/** Deterministic staff per club/category; never pass invented identities off as current real staff. */
export function coachFor(club: Pick<Club,'id'|'name'|'country'> | undefined, colors: Kit, team: CoachProfile['team']='youth'): CoachProfile {
  const clubId=club?.id??'academy',id=`${clubId}:${team}:coach`;
  let seed=2166136261;for(const char of id)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  const style=(['polo','tracksuit','casual'] as const)[seed%3]!;
  return {id,clubId,team,label:`Treinador ${team==='youth'?'da base':'do principal'} · ${club?.name??'Academia'}`,style,
    source:'Comissão técnica simulada; identidade real atual não confirmada.',simulated:true,appearanceSeed:seed,
    kit:{name:style==='polo'?'Polo':style==='casual'?'Casual':'Agasalho',shirt:['#263440','#ede7dc','#41474c','#16212c'][Math.floor(seed/3)%4]!,secondary:colors.secondary,ink:colors.shirt,shorts:'#18232e',socks:'#18232e',pattern:'plain'}};
}
