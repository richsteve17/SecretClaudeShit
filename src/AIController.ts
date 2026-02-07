import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Player } from './Player';
import { Ball } from './Ball';

export class AIController {
  private actionCooldowns: Map<Player, number> = new Map();

  public updatePlayer(player: Player, ball: Ball, allPlayers: Player[], deltaTime: number): void {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();

    let cooldown = this.actionCooldowns.get(player) || 0;
    if (cooldown > 0) {
      this.actionCooldowns.set(player, cooldown - deltaTime);
      return;
    }

    const distanceToBall = playerPos.distanceTo(ballPos);

    if (distanceToBall < 3) {
      const targetGoalX = player.team === 1 ? 52 : -52;
      const directionToGoal = new THREE.Vector3(
        targetGoalX - ballPos.x,
        0,
        -ballPos.z
      ).normalize();

      player.kick(ball);
      this.actionCooldowns.set(player, 0.5);
    } else if (distanceToBall < 20) {
      const direction = new THREE.Vector3(
        ballPos.x - playerPos.x,
        0,
        ballPos.z - playerPos.z
      ).normalize();

      const cannonDir = new CANNON.Vec3(direction.x, 0, direction.z);
      player.move(cannonDir, 15);
    } else {
      const homeX = player.team === 1 ? -25 : 25;
      const homeZ = (player.playerNumber - 1.5) * 10;

      const direction = new THREE.Vector3(
        homeX - playerPos.x,
        0,
        homeZ - playerPos.z
      );

      if (direction.length() > 2) {
        direction.normalize();
        const cannonDir = new CANNON.Vec3(direction.x, 0, direction.z);
        player.move(cannonDir, 10);
      } else {
        player.applyFriction();
      }
    }
  }
}
