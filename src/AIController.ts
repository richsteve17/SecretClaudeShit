import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Player } from './Player';
import { Ball } from './Ball';
import { FormationManager } from './FormationManager';
import { AIDecisionTree, AIState, AIAction } from './AIDecisionTree';
import { DifficultyManager } from './DifficultyManager';
import { AudioManager } from './AudioManager';

export class AIController {
  private formationManager: FormationManager;
  private decisionTree: AIDecisionTree;
  private difficultyManager: DifficultyManager;
  private actionCooldowns: Map<Player, number> = new Map();
  private teamStates: Map<number, AIState> = new Map();

  constructor(difficultyManager?: DifficultyManager) {
    this.formationManager = new FormationManager();
    this.decisionTree = new AIDecisionTree();
    this.difficultyManager = difficultyManager || new DifficultyManager();
    this.teamStates.set(1, 'defending');
    this.teamStates.set(2, 'defending');
  }

  public setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.difficultyManager.setDifficulty(difficulty);
  }

  public setFormation(formation: '2-2' | '3-1' | '1-3'): void {
    this.formationManager.setFormation(formation);
  }

  public updatePlayer(player: Player, ball: Ball, allPlayers: Player[], deltaTime: number, score?: { team1: number; team2: number }): void {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();

    // Check reaction time based on difficulty
    const playerId = `${player.team}-${player.playerNumber}`;
    if (!this.difficultyManager.shouldReact(playerId, deltaTime)) {
      return;
    }

    // Check action cooldown
    let cooldown = this.actionCooldowns.get(player) || 0;
    if (cooldown > 0) {
      this.actionCooldowns.set(player, cooldown - deltaTime);
      return;
    }

    // Update team state
    this.updateTeamState(player.team, ball, allPlayers, deltaTime);

    // Get current team state
    const teamState = this.teamStates.get(player.team) || 'defending';
    const isAttacking = teamState === 'attacking' || teamState === 'transitioning_attack';

    // Get player role
    const role = this.formationManager.getPlayerRole(player.playerNumber);

    // Make AI decision
    const decision = this.decisionTree.makeDecision(player, role, ball, allPlayers, teamState);

    // Execute decision
    this.executeDecision(player, decision, ball, allPlayers, isAttacking, deltaTime);
  }

  private updateTeamState(team: number, ball: Ball, allPlayers: Player[], deltaTime: number): void {
    const ballPos = ball.getPosition();
    const teamPlayers = allPlayers.filter(p => p.team === team);

    // Find closest player to ball (overall and on this team)
    let closestPlayerToBall: Player | null = null;
    let closestTeammateToBall: Player | null = null;
    let minDistOverall = Infinity;
    let minDistTeam = Infinity;

    allPlayers.forEach(p => {
      const dist = p.getPosition().distanceTo(ballPos);
      if (dist < minDistOverall) {
        minDistOverall = dist;
        closestPlayerToBall = p;
      }
      if (p.team === team && dist < minDistTeam) {
        minDistTeam = dist;
        closestTeammateToBall = p;
      }
    });

    // Determine state
    const state = this.decisionTree.determineState(team, ballPos, closestPlayerToBall, closestTeammateToBall);
    this.teamStates.set(team, state);
    this.decisionTree.updateStateTimer(deltaTime);

    // Recommend formation based on game state
    if (this.difficultyManager.shouldUseAdvancedTactics()) {
      const scoreDiff = team === 1 ?
        (0 - 0) : // Will be updated when we have score
        (0 - 0);
      const recommendedFormation = this.formationManager.recommendFormation(ballPos, team, scoreDiff);
      this.formationManager.setFormation(recommendedFormation);
    }
  }

  private executeDecision(
    player: Player,
    decision: { action: AIAction; priority: number; target?: THREE.Vector3; targetPlayer?: Player },
    ball: Ball,
    allPlayers: Player[],
    isAttacking: boolean,
    deltaTime: number
  ): void {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();

    switch (decision.action) {
      case 'shoot':
        this.executeShoot(player, ball, decision.target!);
        break;

      case 'pass':
        this.executePass(player, ball, decision.targetPlayer!);
        break;

      case 'chase_ball':
      case 'intercept':
      case 'press':
        this.moveToBall(player, ball);
        break;

      case 'support':
        this.executeSupport(player, ball, allPlayers);
        break;

      case 'mark':
        if (decision.targetPlayer) {
          this.executeMark(player, decision.targetPlayer, ball);
        } else {
          this.moveToFormationPosition(player, ball, isAttacking);
        }
        break;

      case 'position':
      default:
        this.moveToFormationPosition(player, ball, isAttacking);
        break;
    }
  }

  private executeShoot(player: Player, ball: Ball, target: THREE.Vector3): void {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();
    const distanceToBall = playerPos.distanceTo(ballPos);

    if (distanceToBall < 3) {
      // Apply difficulty-based accuracy
      const adjustedTarget = this.difficultyManager.applyAccuracyError(target);
      const direction = new THREE.Vector3(
        adjustedTarget.x - ballPos.x,
        0,
        adjustedTarget.z - ballPos.z
      ).normalize();

      const adjustedDirection = this.difficultyManager.adjustShotDirection(direction);
      const basePower = 25;
      const power = this.difficultyManager.applyPowerVariation(basePower);

      ball.body.velocity.set(
        adjustedDirection.x * power,
        5,
        adjustedDirection.z * power
      );

      // Play kick sound
      const audioManager = AudioManager.getInstance();
      audioManager.playKickSound(power, ballPos);

      this.actionCooldowns.set(player, 0.5);
    }
  }

  private executePass(player: Player, ball: Ball, targetPlayer: Player): void {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();
    const distanceToBall = playerPos.distanceTo(ballPos);

    if (distanceToBall < 3) {
      const targetPos = targetPlayer.getPosition();

      // Lead the pass based on target's movement
      const targetVelocity = new THREE.Vector3(
        targetPlayer.body.velocity.x,
        0,
        targetPlayer.body.velocity.z
      );
      const leadTime = ballPos.distanceTo(targetPos) / 25; // Estimate time for ball to reach
      const leadPosition = targetPos.clone().add(targetVelocity.multiplyScalar(leadTime));

      // Apply accuracy
      const adjustedTarget = this.difficultyManager.applyAccuracyError(leadPosition);
      const direction = new THREE.Vector3(
        adjustedTarget.x - ballPos.x,
        0,
        adjustedTarget.z - ballPos.z
      ).normalize();

      const distance = ballPos.distanceTo(targetPos);
      const basePower = Math.min(25, 15 + distance * 0.3);
      const power = this.difficultyManager.applyPowerVariation(basePower);

      ball.body.velocity.set(
        direction.x * power,
        3,
        direction.z * power
      );

      // Play kick sound
      const audioManager = AudioManager.getInstance();
      audioManager.playKickSound(power, ballPos);

      this.actionCooldowns.set(player, 0.3);
    }
  }

  private moveToBall(player: Player, ball: Ball): void {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();

    const direction = new THREE.Vector3(
      ballPos.x - playerPos.x,
      0,
      ballPos.z - playerPos.z
    );

    if (direction.length() > 1) {
      direction.normalize();
      const cannonDir = new CANNON.Vec3(direction.x, 0, direction.z);
      const baseSpeed = 15;
      const adjustedSpeed = this.difficultyManager.getAdjustedSpeed(baseSpeed);
      player.move(cannonDir, adjustedSpeed);

      // Try to kick if very close
      if (playerPos.distanceTo(ball.getPosition()) < 3) {
        player.kick(ball);
        this.actionCooldowns.set(player, 0.3);
      }
    } else {
      player.applyFriction();
    }
  }

  private executeSupport(player: Player, ball: Ball, allPlayers: Player[]): void {
    const teammates = allPlayers.filter(p => p.team === player.team && p !== player);
    const supportPos = this.formationManager.getSupportPosition(player, ball.getPosition(), teammates);

    const playerPos = player.getPosition();
    const direction = new THREE.Vector3(
      supportPos.x - playerPos.x,
      0,
      supportPos.z - playerPos.z
    );

    if (direction.length() > 2) {
      direction.normalize();
      const cannonDir = new CANNON.Vec3(direction.x, 0, direction.z);
      const baseSpeed = 12;
      const adjustedSpeed = this.difficultyManager.getAdjustedSpeed(baseSpeed);
      player.move(cannonDir, adjustedSpeed);
    } else {
      player.applyFriction();
    }
  }

  private executeMark(player: Player, opponent: Player, ball: Ball): void {
    const markingPos = this.formationManager.getMarkingPosition(player, opponent, ball.getPosition());

    const playerPos = player.getPosition();
    const direction = new THREE.Vector3(
      markingPos.x - playerPos.x,
      0,
      markingPos.z - playerPos.z
    );

    if (direction.length() > 1.5) {
      direction.normalize();
      const cannonDir = new CANNON.Vec3(direction.x, 0, direction.z);
      const baseSpeed = 13;
      const adjustedSpeed = this.difficultyManager.getAdjustedSpeed(baseSpeed);
      player.move(cannonDir, adjustedSpeed);
    } else {
      player.applyFriction();
    }
  }

  private moveToFormationPosition(player: Player, ball: Ball, isAttacking: boolean): void {
    const formationPos = this.formationManager.getFormationPosition(
      player,
      ball.getPosition(),
      isAttacking
    );

    // Apply positioning error based on difficulty
    const adjustedPos = this.difficultyManager.applyPositioningError(formationPos);

    const playerPos = player.getPosition();
    const direction = new THREE.Vector3(
      adjustedPos.x - playerPos.x,
      0,
      adjustedPos.z - playerPos.z
    );

    if (direction.length() > 2) {
      direction.normalize();
      const cannonDir = new CANNON.Vec3(direction.x, 0, direction.z);
      const baseSpeed = 10;
      const adjustedSpeed = this.difficultyManager.getAdjustedSpeed(baseSpeed);
      player.move(cannonDir, adjustedSpeed);
    } else {
      player.applyFriction();
    }
  }

  public getDifficultyManager(): DifficultyManager {
    return this.difficultyManager;
  }

  public getFormationManager(): FormationManager {
    return this.formationManager;
  }
}
