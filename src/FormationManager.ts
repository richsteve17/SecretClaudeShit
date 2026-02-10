import * as THREE from 'three';
import { Player } from './Player';

export type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'striker';
export type FormationType = '2-2' | '3-1' | '1-3';
export type FormationShape = 'offensive' | 'defensive' | 'balanced';

interface FormationPosition {
  x: number;
  z: number;
  role: PlayerRole;
}

interface Formation {
  positions: FormationPosition[];
  shape: FormationShape;
}

export class FormationManager {
  private formations: Map<FormationType, Formation> = new Map();
  private currentFormation: FormationType = '2-2';
  private fieldLength: number = 100;
  private fieldWidth: number = 60;

  constructor() {
    this.initializeFormations();
  }

  private initializeFormations(): void {
    // 2-2 Balanced Formation (2 defenders, 2 strikers)
    this.formations.set('2-2', {
      positions: [
        { x: -0.65, z: 0, role: 'defender' },      // Center-back
        { x: -0.45, z: -0.5, role: 'defender' },   // Left-back
        { x: -0.45, z: 0.5, role: 'defender' },    // Right-back
        { x: -0.2, z: 0, role: 'striker' }         // Forward
      ],
      shape: 'balanced'
    });

    // 3-1 Attacking Formation (1 defender, 3 forwards)
    this.formations.set('3-1', {
      positions: [
        { x: -0.7, z: 0, role: 'defender' },       // Lone defender
        { x: -0.3, z: -0.4, role: 'midfielder' },  // Left midfielder
        { x: -0.3, z: 0.4, role: 'midfielder' },   // Right midfielder
        { x: -0.1, z: 0, role: 'striker' }         // Striker
      ],
      shape: 'offensive'
    });

    // 1-3 Defensive Formation (3 defenders, 1 striker)
    this.formations.set('1-3', {
      positions: [
        { x: -0.7, z: 0, role: 'defender' },       // Center-back
        { x: -0.55, z: -0.5, role: 'defender' },   // Left-back
        { x: -0.55, z: 0.5, role: 'defender' },    // Right-back
        { x: -0.25, z: 0, role: 'striker' }        // Lone striker
      ],
      shape: 'defensive'
    });
  }

  public setFormation(formation: FormationType): void {
    this.currentFormation = formation;
  }

  public getFormation(): FormationType {
    return this.currentFormation;
  }

  public getPlayerRole(playerNumber: number): PlayerRole {
    const formation = this.formations.get(this.currentFormation);
    if (!formation || playerNumber >= formation.positions.length) {
      return 'midfielder';
    }
    return formation.positions[playerNumber].role;
  }

  /**
   * Get the target position for a player based on current formation and game state
   * @param player The player to get position for
   * @param ballPosition Current ball position
   * @param isAttacking Whether the team is attacking
   * @param isTransitioning Whether the team is transitioning between attack/defense
   * @returns Target position for the player
   */
  public getFormationPosition(
    player: Player,
    ballPosition: THREE.Vector3,
    isAttacking: boolean,
    isTransitioning: boolean = false
  ): THREE.Vector3 {
    const formation = this.formations.get(this.currentFormation);
    if (!formation || player.playerNumber >= formation.positions.length) {
      return new THREE.Vector3(0, 0, 0);
    }

    const basePos = formation.positions[player.playerNumber];
    const teamSide = player.team === 1 ? -1 : 1;

    // Calculate base position relative to team's goal
    let targetX = basePos.x * (this.fieldLength / 2) * teamSide;
    let targetZ = basePos.z * (this.fieldWidth / 2);

    // Adjust position based on ball location and game phase
    const ballOffsetX = this.calculateBallOffsetX(ballPosition, player, isAttacking, teamSide);
    const ballOffsetZ = this.calculateBallOffsetZ(ballPosition, player, basePos.role);

    targetX += ballOffsetX;
    targetZ += ballOffsetZ;

    // Apply shape adjustments (push up when attacking, drop back when defending)
    if (isAttacking && formation.shape !== 'defensive') {
      targetX += 5 * teamSide;
    } else if (!isAttacking && formation.shape !== 'offensive') {
      targetX -= 5 * teamSide;
    }

    // Constrain to field bounds
    const maxX = 45;
    const maxZ = 25;
    targetX = Math.max(-maxX, Math.min(maxX, targetX));
    targetZ = Math.max(-maxZ, Math.min(maxZ, targetZ));

    return new THREE.Vector3(targetX, 0, targetZ);
  }

  private calculateBallOffsetX(
    ballPosition: THREE.Vector3,
    player: Player,
    isAttacking: boolean,
    teamSide: number
  ): number {
    const role = this.getPlayerRole(player.playerNumber);

    // Defenders stay closer to their goal
    if (role === 'defender') {
      return 0;
    }

    // Midfielders and strikers push forward when attacking
    if (isAttacking) {
      const ballX = ballPosition.x * teamSide;
      if (ballX > 0) {
        // Ball is in opponent's half, push forward
        return Math.min(10, ballX * 0.3) * teamSide;
      }
    }

    return 0;
  }

  private calculateBallOffsetZ(
    ballPosition: THREE.Vector3,
    player: Player,
    role: PlayerRole
  ): number {
    const playerPos = player.getPosition();
    const lateralDistance = Math.abs(playerPos.z - ballPosition.z);

    // Players shift laterally based on ball position
    if (lateralDistance > 10) {
      const shift = (ballPosition.z - playerPos.z) * 0.2;
      return Math.max(-8, Math.min(8, shift));
    }

    return 0;
  }

  /**
   * Get optimal supporting position for off-ball movement
   * @param player The player looking for a supporting position
   * @param ballPosition Current ball position
   * @param teammates All teammates
   * @returns Target support position
   */
  public getSupportPosition(
    player: Player,
    ballPosition: THREE.Vector3,
    teammates: Player[]
  ): THREE.Vector3 {
    const playerPos = player.getPosition();
    const role = this.getPlayerRole(player.playerNumber);
    const teamSide = player.team === 1 ? -1 : 1;

    // Find space away from teammates
    let targetPos = playerPos.clone();

    if (role === 'striker' || role === 'midfielder') {
      // Make forward runs if ball is behind
      if ((ballPosition.x - playerPos.x) * teamSide < 0) {
        targetPos.x += 10 * teamSide;
      } else {
        // Move to flanks for width
        const preferredZ = player.playerNumber % 2 === 0 ? 15 : -15;
        targetPos.z = preferredZ;
        targetPos.x = ballPosition.x + 8 * teamSide;
      }
    } else if (role === 'defender') {
      // Defenders provide support from behind
      targetPos.x = ballPosition.x - 10 * teamSide;
      targetPos.z = ballPosition.z * 0.5;
    }

    // Constrain to field bounds
    const maxX = 45;
    const maxZ = 25;
    targetPos.x = Math.max(-maxX, Math.min(maxX, targetPos.x));
    targetPos.z = Math.max(-maxZ, Math.min(maxZ, targetPos.z));

    return targetPos;
  }

  /**
   * Get defensive marking position
   * @param player The defending player
   * @param opponent The opponent to mark
   * @param ballPosition Current ball position
   * @returns Target marking position
   */
  public getMarkingPosition(
    player: Player,
    opponent: Player,
    ballPosition: THREE.Vector3
  ): THREE.Vector3 {
    const opponentPos = opponent.getPosition();
    const teamSide = player.team === 1 ? -1 : 1;

    // Position between opponent and own goal
    const goalX = teamSide * 50;
    const directionToGoal = new THREE.Vector3(goalX - opponentPos.x, 0, -opponentPos.z).normalize();

    // Stand 2-3 meters from opponent, between them and goal
    const markingPos = opponentPos.clone().add(directionToGoal.multiplyScalar(2.5));

    // Constrain to field bounds
    const maxX = 45;
    const maxZ = 25;
    markingPos.x = Math.max(-maxX, Math.min(maxX, markingPos.x));
    markingPos.z = Math.max(-maxZ, Math.min(maxZ, markingPos.z));

    return markingPos;
  }

  /**
   * Determine if team should switch formation based on game state
   * @param ballPosition Current ball position
   * @param team Team number (1 or 2)
   * @param scoreDifference Score difference (positive means winning)
   * @returns Recommended formation
   */
  public recommendFormation(
    ballPosition: THREE.Vector3,
    team: number,
    scoreDifference: number
  ): FormationType {
    const teamSide = team === 1 ? -1 : 1;
    const ballInOwnHalf = (ballPosition.x * teamSide) < 0;

    // If losing, play more attacking
    if (scoreDifference < -1) {
      return '3-1';
    }

    // If winning by 2+, play more defensive
    if (scoreDifference > 1) {
      return '1-3';
    }

    // Default to balanced
    return '2-2';
  }
}
