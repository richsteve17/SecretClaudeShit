import * as THREE from 'three';
import { Player } from './Player';
import { Ball } from './Ball';
import { PlayerRole } from './FormationManager';

export type AIState = 'attacking' | 'defending' | 'transitioning_attack' | 'transitioning_defense';
export type AIAction = 'chase_ball' | 'intercept' | 'position' | 'support' | 'mark' | 'press' | 'shoot' | 'pass';

export interface AIDecision {
  action: AIAction;
  priority: number;
  target?: THREE.Vector3;
  targetPlayer?: Player;
}

export class AIDecisionTree {
  private state: AIState = 'defending';
  private stateTimer: number = 0;

  /**
   * Determine the current AI state based on ball position and possession
   * @param team Team number
   * @param ballPosition Current ball position
   * @param closestPlayerToBall Closest player to ball overall
   * @param closestTeammateToBall Closest teammate to ball
   * @returns Current AI state
   */
  public determineState(
    team: number,
    ballPosition: THREE.Vector3,
    closestPlayerToBall: Player | null,
    closestTeammateToBall: Player | null
  ): AIState {
    const teamSide = team === 1 ? -1 : 1;
    const ballInOwnHalf = (ballPosition.x * teamSide) < 0;

    // Check if team has possession (closest player to ball is on this team)
    const hasPossession = closestPlayerToBall?.team === team;
    const previousState = this.state;

    if (hasPossession) {
      // Team has the ball - attacking
      if (previousState === 'defending' || previousState === 'transitioning_defense') {
        this.state = 'transitioning_attack';
        this.stateTimer = 2.0; // 2 seconds to organize attack
      } else {
        this.state = 'attacking';
      }
    } else {
      // Opposition has the ball - defending
      if (previousState === 'attacking' || previousState === 'transitioning_attack') {
        this.state = 'transitioning_defense';
        this.stateTimer = 1.5; // 1.5 seconds to organize defense
      } else {
        this.state = 'defending';
      }
    }

    return this.state;
  }

  public updateStateTimer(deltaTime: number): void {
    if (this.stateTimer > 0) {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        // Transition complete
        if (this.state === 'transitioning_attack') {
          this.state = 'attacking';
        } else if (this.state === 'transitioning_defense') {
          this.state = 'defending';
        }
      }
    }
  }

  public getState(): AIState {
    return this.state;
  }

  /**
   * Make an AI decision based on context and role
   * @param player The AI-controlled player
   * @param role Player's role in formation
   * @param ball The ball
   * @param allPlayers All players in the game
   * @param state Current AI state
   * @returns AI decision with action and priority
   */
  public makeDecision(
    player: Player,
    role: PlayerRole,
    ball: Ball,
    allPlayers: Player[],
    state: AIState
  ): AIDecision {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();
    const distanceToBall = playerPos.distanceTo(ballPos);

    const teammates = allPlayers.filter(p => p.team === player.team && p !== player);
    const opponents = allPlayers.filter(p => p.team !== player.team);

    const closestOpponent = this.findClosestPlayer(playerPos, opponents);
    const closestOpponentToBall = this.findClosestPlayer(ballPos, opponents);

    // Priority system: higher priority actions take precedence
    const decisions: AIDecision[] = [];

    // 1. Check if player can intercept ball (highest priority when ball is loose)
    if (distanceToBall < 10) {
      const interceptPriority = this.calculateInterceptPriority(
        player,
        ball,
        distanceToBall,
        closestOpponentToBall
      );
      if (interceptPriority > 0) {
        decisions.push({
          action: 'intercept',
          priority: interceptPriority,
          target: ballPos
        });
      }
    }

    // 2. Check if player should shoot or pass (when close to ball)
    if (distanceToBall < 3 && state === 'attacking') {
      const shootDecision = this.evaluateShot(player, ballPos);
      const passDecision = this.evaluatePass(player, ballPos, teammates, opponents);

      if (shootDecision.priority > 0) {
        decisions.push(shootDecision);
      }
      if (passDecision.priority > 0) {
        decisions.push(passDecision);
      }
    }

    // 3. Role-based behavior
    switch (state) {
      case 'attacking':
      case 'transitioning_attack':
        decisions.push(...this.getAttackingDecisions(player, role, ball, teammates, opponents));
        break;

      case 'defending':
      case 'transitioning_defense':
        decisions.push(...this.getDefendingDecisions(player, role, ball, teammates, opponents));
        break;
    }

    // 4. Default: position according to formation
    decisions.push({
      action: 'position',
      priority: 1
    });

    // Sort by priority and return highest
    decisions.sort((a, b) => b.priority - a.priority);
    return decisions[0];
  }

  private getAttackingDecisions(
    player: Player,
    role: PlayerRole,
    ball: Ball,
    teammates: Player[],
    opponents: Player[]
  ): AIDecision[] {
    const decisions: AIDecision[] = [];
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();
    const distanceToBall = playerPos.distanceTo(ballPos);

    // Strikers and midfielders should chase ball more aggressively
    if (role === 'striker' || role === 'midfielder') {
      if (distanceToBall < 20) {
        decisions.push({
          action: 'chase_ball',
          priority: 6,
          target: ballPos
        });
      } else {
        // Make supporting runs
        decisions.push({
          action: 'support',
          priority: 4
        });
      }
    } else if (role === 'defender') {
      // Defenders provide support from behind
      if (distanceToBall < 15) {
        decisions.push({
          action: 'support',
          priority: 5
        });
      } else {
        decisions.push({
          action: 'position',
          priority: 3
        });
      }
    }

    return decisions;
  }

  private getDefendingDecisions(
    player: Player,
    role: PlayerRole,
    ball: Ball,
    teammates: Player[],
    opponents: Player[]
  ): AIDecision[] {
    const decisions: AIDecision[] = [];
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();
    const distanceToBall = playerPos.distanceTo(ballPos);

    const closestOpponent = this.findClosestPlayer(playerPos, opponents);
    const opponentWithBall = this.findClosestPlayer(ballPos, opponents);

    // Check if ball is dangerous (in own half)
    const teamSide = player.team === 1 ? -1 : 1;
    const ballInOwnHalf = (ballPos.x * teamSide) < 0;
    const dangerLevel = ballInOwnHalf ? 2 : 1;

    // Closest player should press the ball
    const closestTeammateToBall = this.findClosestPlayer(ballPos, teammates);
    const isClosestToBall = !closestTeammateToBall ||
      distanceToBall < playerPos.distanceTo(closestTeammateToBall.getPosition());

    if (isClosestToBall && distanceToBall < 15) {
      decisions.push({
        action: 'press',
        priority: 7 * dangerLevel,
        target: ballPos
      });
    } else {
      // Mark nearest opponent
      if (closestOpponent) {
        const opponentDistance = playerPos.distanceTo(closestOpponent.getPosition());
        if (opponentDistance < 20) {
          decisions.push({
            action: 'mark',
            priority: 5 * dangerLevel,
            targetPlayer: closestOpponent
          });
        }
      }

      // Defenders should prioritize defensive positioning
      if (role === 'defender') {
        decisions.push({
          action: 'position',
          priority: 6
        });
      } else {
        decisions.push({
          action: 'position',
          priority: 4
        });
      }
    }

    return decisions;
  }

  private calculateInterceptPriority(
    player: Player,
    ball: Ball,
    distanceToBall: number,
    closestOpponent: Player | null
  ): number {
    if (distanceToBall > 10) return 0;

    let priority = 10 - distanceToBall; // Closer = higher priority

    // Boost priority if opponent is far
    if (closestOpponent) {
      const opponentDist = closestOpponent.getPosition().distanceTo(ball.getPosition());
      if (distanceToBall < opponentDist) {
        priority += 5;
      }
    }

    return Math.max(0, Math.min(10, priority));
  }

  private evaluateShot(player: Player, ballPos: THREE.Vector3): AIDecision {
    const teamSide = player.team === 1 ? -1 : 1;
    const goalX = teamSide * 52;
    const goalZ = 0;

    const distanceToGoal = Math.sqrt(
      Math.pow(goalX - ballPos.x, 2) + Math.pow(goalZ - ballPos.z, 2)
    );

    const angleToGoal = Math.abs(Math.atan2(ballPos.z, Math.abs(goalX - ballPos.x)));

    // Good shooting opportunity if:
    // - Close to goal (< 25m)
    // - Good angle (< 45 degrees)
    if (distanceToGoal < 25 && angleToGoal < Math.PI / 4) {
      const priority = 10 - (distanceToGoal / 5) + (1 - angleToGoal / (Math.PI / 4)) * 3;
      return {
        action: 'shoot',
        priority: Math.max(0, Math.min(10, priority)),
        target: new THREE.Vector3(goalX, 0, goalZ)
      };
    }

    return { action: 'shoot', priority: 0 };
  }

  private evaluatePass(
    player: Player,
    ballPos: THREE.Vector3,
    teammates: Player[],
    opponents: Player[]
  ): AIDecision {
    const playerPos = player.getPosition();
    const teamSide = player.team === 1 ? -1 : 1;

    let bestPassTarget: Player | null = null;
    let bestPassPriority = 0;

    for (const teammate of teammates) {
      const teammatePos = teammate.getPosition();
      const distanceToTeammate = ballPos.distanceTo(teammatePos);

      // Skip if too close or too far
      if (distanceToTeammate < 5 || distanceToTeammate > 30) continue;

      // Check if teammate is ahead
      const isAhead = (teammatePos.x - ballPos.x) * teamSide > 0;

      // Check if pass lane is clear
      const passBlocked = this.isPassBlocked(ballPos, teammatePos, opponents);

      if (!passBlocked) {
        let passPriority = 5;

        // Prefer forward passes
        if (isAhead) {
          passPriority += 3;
        }

        // Prefer passes to open space
        const closestOpponentToTeammate = this.findClosestPlayer(teammatePos, opponents);
        if (closestOpponentToTeammate) {
          const opponentDistance = teammatePos.distanceTo(closestOpponentToTeammate.getPosition());
          if (opponentDistance > 8) {
            passPriority += 2;
          }
        }

        if (passPriority > bestPassPriority) {
          bestPassPriority = passPriority;
          bestPassTarget = teammate;
        }
      }
    }

    if (bestPassTarget) {
      return {
        action: 'pass',
        priority: bestPassPriority,
        targetPlayer: bestPassTarget
      };
    }

    return { action: 'pass', priority: 0 };
  }

  private isPassBlocked(
    from: THREE.Vector3,
    to: THREE.Vector3,
    opponents: Player[]
  ): boolean {
    const passDirection = new THREE.Vector3().subVectors(to, from).normalize();
    const passDistance = from.distanceTo(to);

    for (const opponent of opponents) {
      const opponentPos = opponent.getPosition();
      const toOpponent = new THREE.Vector3().subVectors(opponentPos, from);
      const projectionLength = toOpponent.dot(passDirection);

      // Check if opponent is along the pass lane
      if (projectionLength > 0 && projectionLength < passDistance) {
        const closestPoint = from.clone().add(passDirection.clone().multiplyScalar(projectionLength));
        const distanceToLane = opponentPos.distanceTo(closestPoint);

        if (distanceToLane < 3) {
          return true; // Pass is blocked
        }
      }
    }

    return false;
  }

  private findClosestPlayer(position: THREE.Vector3, players: Player[]): Player | null {
    if (players.length === 0) return null;

    let closest = players[0];
    let minDist = position.distanceTo(closest.getPosition());

    for (let i = 1; i < players.length; i++) {
      const dist = position.distanceTo(players[i].getPosition());
      if (dist < minDist) {
        minDist = dist;
        closest = players[i];
      }
    }

    return closest;
  }
}
