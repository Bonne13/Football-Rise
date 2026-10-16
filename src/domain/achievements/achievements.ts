import type { CareerState } from '../career/state.js';
export interface Achievement { id: string; title: string; description: string; progress: number; target: number; unlocked: boolean }
/** Derived from persisted facts, never grants a title merely for joining a club. */
export function careerAchievements(s: CareerState): Achievement[] {
  const milestones: [string, string, string, number, number][] = [
    ['assessment', 'Primeiro passo', 'Conclua a avaliação da base.', Number(!!s.assessment), 1],
    ['training', 'Trabalho diário', 'Conclua dez sessões de treinamento.', s.trainingSessions, 10],
    ['contract', 'Uma nova casa', 'Assine seu primeiro contrato.', Number(!!s.contract), 1],
    ['debut', 'Entrou em campo', 'Dispute sua primeira partida.', s.development.appearances, 1],
    ['goal', 'Rede balançando', 'Marque seu primeiro gol em partida.', s.development.goals, 1],
    ['assist', 'Visão de jogo', 'Dê sua primeira assistência em partida.', s.development.assists, 1],
    ['veteran', 'Nome na escalação', 'Dispute 25 partidas.', s.development.appearances, 25],
    ['trophy', 'Galeria de troféus', 'Receba uma premiação individual ou um título com participação.', s.world.awards.filter(a => a.playerId === s.player.id).length, 1],
  ];
  return milestones.map(([id, title, description, value, target]) => ({ id, title, description, progress: Math.min(target, Math.max(0, value)), target, unlocked: value >= target }));
}
