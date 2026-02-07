import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class GoalExplosion {
  private particleSystem: ParticleSystem;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  public trigger(position: THREE.Vector3, teamColor: number): void {
    const particleCount = 40;
    const baseColor = new THREE.Color(teamColor);

    // Create main burst
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI * 0.5;
      const speed = 8 + Math.random() * 6;

      const velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 5,
        Math.sin(angle) * Math.cos(elevation) * speed
      );

      // Vary the color slightly
      const color = baseColor.clone();
      color.offsetHSL(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );

      this.particleSystem.emit({
        position: position.clone(),
        positionRandomness: new THREE.Vector3(0.5, 0.5, 0.5),
        velocity: velocity,
        velocityRandomness: new THREE.Vector3(2, 2, 2),
        gravity: new THREE.Vector3(0, -8, 0),
        lifetime: 1.0 + Math.random() * 0.5,
        startSize: 0.5 + Math.random() * 0.3,
        endSize: 0.1,
        startOpacity: 1.0,
        endOpacity: 0,
        color: color
      });
    }

    // Create secondary sparkle burst
    const sparkleCount = 20;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const speed = 12 + Math.random() * 8;

      const velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 8,
        Math.sin(angle) * Math.cos(elevation) * speed
      );

      // Bright white sparkles
      const color = new THREE.Color(0xffffff);

      this.particleSystem.emit({
        position: position.clone(),
        positionRandomness: new THREE.Vector3(0.2, 0.2, 0.2),
        velocity: velocity,
        velocityRandomness: new THREE.Vector3(3, 3, 3),
        gravity: new THREE.Vector3(0, -10, 0),
        lifetime: 0.6 + Math.random() * 0.4,
        startSize: 0.3 + Math.random() * 0.2,
        endSize: 0.05,
        startOpacity: 1.0,
        endOpacity: 0,
        color: color
      });
    }

    // Create upward stream
    const streamCount = 15;
    for (let i = 0; i < streamCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      const speed = 10 + Math.random() * 5;

      const velocity = new THREE.Vector3(
        Math.cos(angle) * radius,
        speed,
        Math.sin(angle) * radius
      );

      const color = baseColor.clone();
      color.offsetHSL(0, 0, 0.3); // Brighter version

      this.particleSystem.emit({
        position: position.clone(),
        positionRandomness: new THREE.Vector3(1, 0.5, 1),
        velocity: velocity,
        velocityRandomness: new THREE.Vector3(1, 2, 1),
        gravity: new THREE.Vector3(0, -6, 0),
        lifetime: 1.2 + Math.random() * 0.5,
        startSize: 0.4 + Math.random() * 0.2,
        endSize: 0.15,
        startOpacity: 0.9,
        endOpacity: 0,
        color: color
      });
    }
  }
}
