import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ball } from './Ball';

export class Player {
  public mesh: THREE.Group;
  public body: CANNON.Body;
  public team: number;
  public playerNumber: number;

  private speed: number = 15;
  private sprintSpeed: number = 25;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    position: CANNON.Vec3,
    color: number,
    team: number,
    playerNumber: number
  ) {
    this.team = team;
    this.playerNumber = playerNumber;

    this.mesh = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 1;
    bodyMesh.castShadow = true;
    this.mesh.add(bodyMesh);

    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 2.4;
    headMesh.castShadow = true;
    this.mesh.add(headMesh);

    this.mesh.position.set(position.x, position.y, position.z);
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 80,
      shape: new CANNON.Cylinder(0.5, 0.5, 2, 8),
      position: position,
      linearDamping: 0.9,
      angularDamping: 0.9
    });

    this.body.fixedRotation = true;
    this.body.updateMassProperties();
    world.addBody(this.body);
  }

  public move(direction: CANNON.Vec3, speed: number): void {
    this.body.velocity.x = direction.x * speed;
    this.body.velocity.z = direction.z * speed;

    if (direction.length() > 0) {
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }

  public applyFriction(): void {
    this.body.velocity.x *= 0.8;
    this.body.velocity.z *= 0.8;
  }

  public constrainToBounds(): void {
    const maxX = 48;
    const maxZ = 28;

    if (this.body.position.x > maxX) {
      this.body.position.x = maxX;
      this.body.velocity.x = 0;
    } else if (this.body.position.x < -maxX) {
      this.body.position.x = -maxX;
      this.body.velocity.x = 0;
    }

    if (this.body.position.z > maxZ) {
      this.body.position.z = maxZ;
      this.body.velocity.z = 0;
    } else if (this.body.position.z < -maxZ) {
      this.body.position.z = -maxZ;
      this.body.velocity.z = 0;
    }
  }

  public kick(ball: Ball): void {
    const playerPos = this.getPosition();
    const ballPos = ball.getPosition();
    const distance = playerPos.distanceTo(ballPos);

    if (distance < 3) {
      const direction = new THREE.Vector3(
        ballPos.x - playerPos.x,
        0,
        ballPos.z - playerPos.z
      ).normalize();

      const kickPower = 25;
      ball.body.velocity.set(
        direction.x * kickPower,
        5,
        direction.z * kickPower
      );
    }
  }

  public update(): void {
    this.mesh.position.copy(this.body.position as any);
    this.mesh.quaternion.copy(this.body.quaternion as any);
  }

  public getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  public setPosition(position: CANNON.Vec3): void {
    this.body.position.copy(position);
    this.mesh.position.set(position.x, position.y, position.z);
  }
}
