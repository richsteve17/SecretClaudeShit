import * as THREE from 'three';
import { Ball } from './Ball';
import { Player } from './Player';

export enum ShotType {
  GROUND = 'GROUND',
  CHIP = 'CHIP',
  LOB = 'LOB'
}

export interface ShotConfig {
  power: number; // 0-100
  direction: THREE.Vector3;
  shotType: ShotType;
  spin: THREE.Vector3; // Spin vector for Magnus effect
}

export class ShootingSystem {
  private chargeStartTime: number = 0;
  private isCharging: boolean = false;
  private maxChargeTime: number = 1500; // 1.5 seconds for full charge
  private minPower: number = 20;
  private maxPower: number = 50;

  public startCharging(): void {
    this.chargeStartTime = Date.now();
    this.isCharging = true;
  }

  public stopCharging(): number {
    if (!this.isCharging) return 0;

    this.isCharging = false;
    const chargeTime = Date.now() - this.chargeStartTime;
    return this.calculatePowerPercentage(chargeTime);
  }

  public getCurrentPower(): number {
    if (!this.isCharging) return 0;

    const chargeTime = Date.now() - this.chargeStartTime;
    return this.calculatePowerPercentage(chargeTime);
  }

  public getIsCharging(): boolean {
    return this.isCharging;
  }

  public cancelCharge(): void {
    this.isCharging = false;
  }

  private calculatePowerPercentage(chargeTime: number): number {
    return Math.min(100, (chargeTime / this.maxChargeTime) * 100);
  }

  public executeShotFromPlayer(
    player: Player,
    ball: Ball,
    powerPercent: number,
    joystickInput?: { x: number, z: number }
  ): boolean {
    const playerPos = player.getPosition();
    const ballPos = ball.getPosition();
    const distance = playerPos.distanceTo(ballPos);

    // Check if player is close enough to kick
    if (distance > 3) {
      return false;
    }

    // Calculate base direction (player facing direction)
    const playerFacing = new THREE.Vector3(
      Math.sin(player.mesh.rotation.y),
      0,
      Math.cos(player.mesh.rotation.y)
    ).normalize();

    // Apply joystick influence for direction adjustment
    let shootDirection = playerFacing.clone();
    if (joystickInput && (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.z) > 0.1)) {
      const joystickDir = new THREE.Vector3(joystickInput.x, 0, -joystickInput.z).normalize();
      // Blend player facing with joystick (30% joystick influence)
      shootDirection.lerp(joystickDir, 0.3).normalize();
    }

    // Apply accuracy cone based on power
    const accuracyCone = this.calculateAccuracyCone(powerPercent);
    shootDirection = this.applyAccuracySpread(shootDirection, accuracyCone);

    // Determine shot type based on power
    const shotType = this.determineShotType(powerPercent);

    // Calculate shot config
    const shotConfig: ShotConfig = {
      power: powerPercent,
      direction: shootDirection,
      shotType: shotType,
      spin: this.calculateSpin(shootDirection, powerPercent)
    };

    // Execute the shot
    this.applyShot(ball, shotConfig);

    return true;
  }

  private calculateAccuracyCone(powerPercent: number): number {
    // Lower power = more accurate (smaller cone)
    // 0-60% = very accurate (5 degrees)
    // 60-90% = moderate accuracy (8 degrees)
    // 90-100% = less accurate (15 degrees)
    if (powerPercent < 60) {
      return 5;
    } else if (powerPercent < 90) {
      return 8;
    } else {
      return 15;
    }
  }

  private applyAccuracySpread(direction: THREE.Vector3, coneDegrees: number): THREE.Vector3 {
    const coneRadians = (coneDegrees * Math.PI) / 180;
    const spreadX = (Math.random() - 0.5) * coneRadians;

    const rotatedDir = direction.clone();
    rotatedDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadX);

    return rotatedDir.normalize();
  }

  private determineShotType(powerPercent: number): ShotType {
    // Low power = ground shot
    // Medium power = chip shot
    // High power = could be lob or power shot
    if (powerPercent < 40) {
      return ShotType.GROUND;
    } else if (powerPercent < 75) {
      return ShotType.CHIP;
    } else {
      return ShotType.LOB;
    }
  }

  private calculateSpin(direction: THREE.Vector3, powerPercent: number): THREE.Vector3 {
    // Add some natural spin based on shot direction and power
    // More power = more spin potential
    const spinMultiplier = powerPercent / 100;
    const spinStrength = 3 + (spinMultiplier * 7); // 3-10 range

    // Cross product with up vector to get perpendicular spin
    const spin = new THREE.Vector3();
    spin.crossVectors(direction, new THREE.Vector3(0, 1, 0));
    spin.multiplyScalar(spinStrength * (Math.random() - 0.5) * 0.5);

    return spin;
  }

  private applyShot(ball: Ball, config: ShotConfig): void {
    // Calculate power multiplier (20-50 base power range)
    const powerMultiplier = this.minPower + (config.power / 100) * (this.maxPower - this.minPower);

    let verticalComponent = 0;

    switch (config.shotType) {
      case ShotType.GROUND:
        // Low trajectory, more horizontal power
        verticalComponent = 3 + (config.power / 100) * 2; // 3-5
        break;

      case ShotType.CHIP:
        // Medium trajectory
        verticalComponent = 5 + (config.power / 100) * 5; // 5-10
        break;

      case ShotType.LOB:
        // High trajectory
        verticalComponent = 10 + (config.power / 100) * 8; // 10-18
        break;
    }

    // Apply velocity to ball
    ball.body.velocity.set(
      config.direction.x * powerMultiplier,
      verticalComponent,
      config.direction.z * powerMultiplier
    );

    // Apply spin to the ball
    ball.applySpin(config.spin);
  }
}
