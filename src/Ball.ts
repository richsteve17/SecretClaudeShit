import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AudioManager } from './AudioManager';
import { BallTrailEffect } from './BallTrailEffect';

export class Ball {
  public mesh: THREE.Mesh;
  public body: CANNON.Body;
  private spin: THREE.Vector3;
  private airDensity: number = 1.225; // kg/m^3
  private dragCoefficient: number = 0.25;
  private crossSectionalArea: number = Math.PI * 0.5 * 0.5; // π * r^2
  private lastBounceTime: number = 0;
  private ballTrailEffect: BallTrailEffect | null = null;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    const ballGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1
    });
    this.mesh = new THREE.Mesh(ballGeometry, ballMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 0.45,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(0, 1, 0),
      linearDamping: 0.1, // Reduced for more realistic air resistance handling
      angularDamping: 0.2,
      material: new CANNON.Material({
        friction: 0.4, // Increased for better ground friction
        restitution: 0.6 // Slightly reduced bounce
      })
    });

    this.spin = new THREE.Vector3(0, 0, 0);
    world.addBody(this.body);
  }

  public update(deltaTime: number = 0): void {
    this.mesh.position.copy(this.body.position as any);
    this.mesh.quaternion.copy(this.body.quaternion as any);

    // Apply air resistance (drag force)
    this.applyAirResistance();

    // Apply Magnus effect (spin-induced curve)
    this.applyMagnusEffect();

    // Update ball trail effect
    if (this.ballTrailEffect && deltaTime > 0) {
      const velocity = new THREE.Vector3(
        this.body.velocity.x,
        this.body.velocity.y,
        this.body.velocity.z
      );
      this.ballTrailEffect.update(this.getPosition(), velocity, deltaTime);
    }

    // Ground collision and friction
    if (this.body.position.y < 0.5) {
      this.body.position.y = 0.5;

      // Bounce with energy loss
      const velocityY = this.body.velocity.y;
      if (Math.abs(velocityY) > 0.5) {
        this.body.velocity.y = Math.abs(velocityY) * 0.6;

        // Play bounce sound if impact is strong enough and enough time has passed
        const now = Date.now();
        if (Math.abs(velocityY) > 2 && now - this.lastBounceTime > 100) {
          const audioManager = AudioManager.getInstance();
          const volume = Math.min(1, Math.abs(velocityY) / 15);
          audioManager.playSound('bounce', volume, this.getPosition());
          this.lastBounceTime = now;
        }
      } else {
        this.body.velocity.y = 0;
      }

      // Apply rolling friction when on ground
      this.applyGroundFriction();

      // Reduce spin when ball is on ground
      this.spin.multiplyScalar(0.95);
    }

    // Decay spin over time (air resistance on spin)
    this.spin.multiplyScalar(0.98);
  }

  public getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  public setPosition(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y, position.z);
    this.mesh.position.copy(position);
  }

  public setBallTrailEffect(ballTrailEffect: BallTrailEffect): void {
    this.ballTrailEffect = ballTrailEffect;
  }

  public applySpin(spinVector: THREE.Vector3): void {
    this.spin.copy(spinVector);
    // Also apply angular velocity to the physics body for visual rotation
    this.body.angularVelocity.set(spinVector.x, spinVector.y, spinVector.z);
  }

  private applyAirResistance(): void {
    // Only apply air resistance when ball is in the air
    if (this.body.position.y > 0.6) {
      const velocity = new THREE.Vector3(
        this.body.velocity.x,
        this.body.velocity.y,
        this.body.velocity.z
      );

      const speed = velocity.length();

      if (speed > 0.1) {
        // Drag force: F = 0.5 * ρ * v² * Cd * A
        const dragForceMagnitude = 0.5 * this.airDensity * speed * speed * this.dragCoefficient * this.crossSectionalArea;

        // Drag force direction (opposite to velocity)
        const dragForce = velocity.normalize().multiplyScalar(-dragForceMagnitude);

        // Apply force: a = F / m
        const acceleration = dragForce.divideScalar(this.body.mass);

        // Apply acceleration (converted to velocity change)
        this.body.velocity.x += acceleration.x * 0.016; // Approximate fixed timestep
        this.body.velocity.y += acceleration.y * 0.016;
        this.body.velocity.z += acceleration.z * 0.016;
      }
    }
  }

  private applyMagnusEffect(): void {
    // Magnus effect only applies when ball is moving and spinning
    const velocity = new THREE.Vector3(
      this.body.velocity.x,
      this.body.velocity.y,
      this.body.velocity.z
    );

    const speed = velocity.length();

    if (speed > 1 && this.spin.length() > 0.1) {
      // Magnus force is perpendicular to both velocity and spin
      // F_magnus = S * (ω × v)
      // Where S is a coefficient depending on ball properties

      const magnusCoefficient = 0.003; // Tuned for soccer ball behavior

      // Calculate cross product: spin × velocity
      const magnusForce = new THREE.Vector3();
      magnusForce.crossVectors(this.spin, velocity);
      magnusForce.multiplyScalar(magnusCoefficient);

      // Apply the Magnus force
      this.body.velocity.x += magnusForce.x * 0.016;
      this.body.velocity.y += magnusForce.y * 0.016;
      this.body.velocity.z += magnusForce.z * 0.016;
    }
  }

  private applyGroundFriction(): void {
    // Apply rolling friction when ball is on the ground
    if (this.body.position.y <= 0.51) {
      const horizontalSpeed = Math.sqrt(
        this.body.velocity.x * this.body.velocity.x +
        this.body.velocity.z * this.body.velocity.z
      );

      if (horizontalSpeed > 0.1) {
        // Rolling resistance coefficient
        const rollingFriction = 0.92; // Higher = less friction
        this.body.velocity.x *= rollingFriction;
        this.body.velocity.z *= rollingFriction;
      } else if (horizontalSpeed > 0 && horizontalSpeed < 0.1) {
        // Stop completely when very slow
        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
      }
    }
  }

  public getSpin(): THREE.Vector3 {
    return this.spin.clone();
  }

  public resetSpin(): void {
    this.spin.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }
}
