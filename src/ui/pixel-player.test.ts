import test from 'node:test';
import assert from 'node:assert/strict';
import { spriteFrame, spriteFacing, playerAnimationFrame, PLAYER_ANIMATIONS, SPRITE_SIZE } from './pixel-player.js';
test('pixel athlete shows front, back and both sides relative to the camera', () => {
  assert.equal(spriteFacing(0, 0), 1); assert.equal(spriteFacing(0, Math.PI), 0);
  assert.equal(spriteFacing(Math.PI / 2, 0), 3); assert.equal(spriteFacing(-Math.PI / 2, 0), 2);
  assert.equal(spriteFacing(Math.PI * 2, 0), 1);
});
test('pixel animation cycles four running poses, preserves idle and recovers after kicks', () => {
  assert.equal(spriteFrame(10, false), 0);
  assert.deepEqual([0, 1 / 9, 2 / 9, 3 / 9, 4 / 9].map(t => spriteFrame(t, true)), [1, 2, 3, 4, 1]);
  assert.equal(spriteFrame(1, true, .1), 5); assert.equal(spriteFrame(1, false, .3), 6);
  assert.equal(spriteFrame(1, false, .3, true), 7); assert.equal(spriteFrame(1, false, .8), 0);
});

test('requested actions stay inside their own atlas range; cards and injury hold their last pose', () => {
  for (const action of Object.keys(PLAYER_ANIMATIONS) as (keyof typeof PLAYER_ANIMATIONS)[]) {
    const config = PLAYER_ANIMATIONS[action];
    assert.equal(playerAnimationFrame(action, 0), config.start);
    for (const time of [-1, .2, .7, 2, 100]) {
      const frame = playerAnimationFrame(action, time); assert.ok(frame >= config.start && frame < config.start + config.count); assert.ok(frame < SPRITE_SIZE.frames);
    }
  }
  assert.equal(playerAnimationFrame('yellow-card', 100), 31);
  assert.equal(playerAnimationFrame('red-card', 100), 35);
  assert.equal(playerAnimationFrame('injury', 100), 41);
});
