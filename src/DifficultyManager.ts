import * as THREE from 'three';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
  reactionTime: number;        // Delay before AI reacts (seconds)
  movementSpeed: number;        // Speed multiplier for AI movement
  accuracy: number;             // Accuracy multiplier for shots/passes (0-1)
  visionRange: number;          // How far AI can "see" for decision making
  decisionQuality: number;      // Affects decision tree evaluation (0-1)
  positioningAccuracy: number;  // How well AI maintains formation (0-1)
  tacticAwareness: number;      // How well AI adapts tactics (0-1)
  passFrequency: number;        // Likelihood to pass vs shoot (0-1)
  errorMargin: number;          // Random error in actions
}

export class DifficultyManager {
  private currentDifficulty: DifficultyLevel = 'medium';
  private settings: Map<DifficultyLevel, DifficultySettings> = new Map();
  private playerReactionTimers: Map<string, number> = new Map();

  constructor() {
    this.initializeSettings();
  }

  private initializeSettings(): void {
    // Easy: Slow reactions, poor accuracy, basic tactics
    this.settings.set('easy', {
      reactionTime: 0.5,
      movementSpeed: 0.7,
      accuracy: 0.5,
      visionRange: 15,
      decisionQuality: 0.4,
      positioningAccuracy: 0.5,
      tacticAwareness: 0.3,
      passFrequency: 0.3,
      errorMargin: 5.0
    });

    // Medium: Balanced, uses formations, decent decision making
    this.settings.set('medium', {
      reactionTime: 0.2,
      movementSpeed: 0.9,
      accuracy: 0.75,
      visionRange: 25,
      decisionQuality: 0.7,
      positioningAccuracy: 0.75,
      tacticAwareness: 0.6,
      passFrequency: 0.5,
      errorMargin: 2.5
    });

    // Hard: Fast reactions, high accuracy, advanced positioning
    this.settings.set('hard', {
      reactionTime: 0.05,
      movementSpeed: 1.0,
      accuracy: 0.95,
      visionRange: 35,
      decisionQuality: 0.95,
      positioningAccuracy: 0.95,
      tacticAwareness: 0.9,
      passFrequency: 0.7,
      errorMargin: 0.5
    });
  }

  public setDifficulty(difficulty: DifficultyLevel): void {
    this.currentDifficulty = difficulty;
  }

  public getDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }

  public getSettings(): DifficultySettings {
    return this.settings.get(this.currentDifficulty)!;
  }

  /**
   * Check if AI should react based on reaction time
   * @param playerId Unique identifier for the player
   * @param deltaTime Time since last frame
   * @returns True if AI should act this frame
   */
  public shouldReact(playerId: string, deltaTime: number): boolean {
    const settings = this.getSettings();

    let timer = this.playerReactionTimers.get(playerId) || 0;
    timer -= deltaTime;

    if (timer <= 0) {
      // Reset timer with some randomness
      const variance = settings.reactionTime * 0.3;
      const newTimer = settings.reactionTime + (Math.random() - 0.5) * variance;
      this.playerReactionTimers.set(playerId, newTimer);
      return true;
    }

    this.playerReactionTimers.set(playerId, timer);
    return false;
  }

  /**
   * Apply accuracy error to a target position
   * @param targetPosition Original target position
   * @returns Modified target with accuracy error applied
   */
  public applyAccuracyError(targetPosition: THREE.Vector3): THREE.Vector3 {
    const settings = this.getSettings();
    const error = settings.errorMargin;

    // Apply random error based on difficulty
    const errorX = (Math.random() - 0.5) * error * (1 - settings.accuracy);
    const errorZ = (Math.random() - 0.5) * error * (1 - settings.accuracy);

    return new THREE.Vector3(
      targetPosition.x + errorX,
      targetPosition.y,
      targetPosition.z + errorZ
    );
  }

  /**
   * Get adjusted movement speed based on difficulty
   * @param baseSpeed Base movement speed
   * @returns Adjusted speed
   */
  public getAdjustedSpeed(baseSpeed: number): number {
    const settings = this.getSettings();
    return baseSpeed * settings.movementSpeed;
  }

  /**
   * Apply power variation to shots/passes based on difficulty
   * @param basePower Base power value
   * @returns Adjusted power with variation
   */
  public applyPowerVariation(basePower: number): number {
    const settings = this.getSettings();
    const variation = basePower * 0.2 * (1 - settings.accuracy);
    return basePower + (Math.random() - 0.5) * variation;
  }

  /**
   * Check if AI should use advanced tactics based on difficulty
   * @returns True if AI should use advanced tactics
   */
  public shouldUseAdvancedTactics(): boolean {
    const settings = this.getSettings();
    return Math.random() < settings.tacticAwareness;
  }

  /**
   * Check if AI should pass instead of shoot
   * @param baseChance Base probability of passing (0-1)
   * @returns True if AI should pass
   */
  public shouldPass(baseChance: number): boolean {
    const settings = this.getSettings();
    const adjustedChance = baseChance * settings.passFrequency;
    return Math.random() < adjustedChance;
  }

  /**
   * Get decision quality multiplier
   * @returns Quality multiplier for decision priorities
   */
  public getDecisionQualityMultiplier(): number {
    const settings = this.getSettings();
    return settings.decisionQuality;
  }

  /**
   * Check if target is within AI vision range
   * @param distance Distance to target
   * @returns True if within vision range
   */
  public isInVisionRange(distance: number): boolean {
    const settings = this.getSettings();
    return distance <= settings.visionRange;
  }

  /**
   * Get positioning error based on difficulty
   * @param targetPosition Target formation position
   * @returns Modified position with error
   */
  public applyPositioningError(targetPosition: THREE.Vector3): THREE.Vector3 {
    const settings = this.getSettings();
    const error = 5 * (1 - settings.positioningAccuracy);

    const errorX = (Math.random() - 0.5) * error;
    const errorZ = (Math.random() - 0.5) * error;

    return new THREE.Vector3(
      targetPosition.x + errorX,
      targetPosition.y,
      targetPosition.z + errorZ
    );
  }

  /**
   * Adjust shot accuracy based on difficulty
   * @param direction Original shot direction
   * @returns Modified direction with accuracy applied
   */
  public adjustShotDirection(direction: THREE.Vector3): THREE.Vector3 {
    const settings = this.getSettings();
    const error = 0.3 * (1 - settings.accuracy);

    const errorAngle = (Math.random() - 0.5) * error;
    const adjustedDirection = direction.clone();

    // Rotate direction by error angle
    const cos = Math.cos(errorAngle);
    const sin = Math.sin(errorAngle);
    const newX = adjustedDirection.x * cos - adjustedDirection.z * sin;
    const newZ = adjustedDirection.x * sin + adjustedDirection.z * cos;

    return new THREE.Vector3(newX, adjustedDirection.y, newZ).normalize();
  }

  /**
   * Get display name for difficulty level
   * @param difficulty Difficulty level
   * @returns Display name
   */
  public static getDifficultyName(difficulty: DifficultyLevel): string {
    switch (difficulty) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
      default:
        return 'Medium';
    }
  }

  /**
   * Get all available difficulties
   * @returns Array of difficulty levels
   */
  public static getAvailableDifficulties(): DifficultyLevel[] {
    return ['easy', 'medium', 'hard'];
  }
}
