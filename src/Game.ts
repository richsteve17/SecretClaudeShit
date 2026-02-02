import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Field } from './Field';
import { Player } from './Player';
import { Ball } from './Ball';
import { InputManager } from './InputManager';
import { AIController } from './AIController';
import { GameState } from './GameState';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: CANNON.World;

  private field: Field;
  private ball: Ball;
  private players: Player[] = [];
  private inputManager: InputManager;
  private aiController: AIController;
  private gameState: GameState;

  private controlledPlayerIndex: number = 0;
  private clock: THREE.Clock;
  private prevInput: { kick: boolean; switchPlayer: boolean } = { kick: false, switchPlayer: false };

  constructor() {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;

    this.setupLights();

    this.field = new Field(this.scene, this.world);
    this.ball = new Ball(this.scene, this.world);

    this.createPlayers();

    this.inputManager = new InputManager();
    this.aiController = new AIController();
    this.gameState = new GameState();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  private createPlayers(): void {
    const team1Color = 0x0044ff;
    const team2Color = 0xff4400;

    const team1Positions = [
      new CANNON.Vec3(-30, 0, 0),
      new CANNON.Vec3(-20, 0, -15),
      new CANNON.Vec3(-20, 0, 15),
      new CANNON.Vec3(-10, 0, 0)
    ];

    const team2Positions = [
      new CANNON.Vec3(30, 0, 0),
      new CANNON.Vec3(20, 0, -15),
      new CANNON.Vec3(20, 0, 15),
      new CANNON.Vec3(10, 0, 0)
    ];

    team1Positions.forEach((pos, i) => {
      const player = new Player(this.scene, this.world, pos, team1Color, 1, i);
      this.players.push(player);
    });

    team2Positions.forEach((pos, i) => {
      const player = new Player(this.scene, this.world, pos, team2Color, 2, i);
      this.players.push(player);
    });
  }

  public start(): void {
    this.gameLoop();
  }

  private gameLoop = (): void => {
    requestAnimationFrame(this.gameLoop);

    const deltaTime = this.clock.getDelta();
    const fixedTimeStep = 1 / 60;

    this.world.step(fixedTimeStep, deltaTime, 3);

    this.handleInput(deltaTime);
    this.updateAI(deltaTime);
    this.updateEntities();
    this.updateCamera();
    this.checkGameEvents();
    this.updateHUD();

    this.renderer.render(this.scene, this.camera);
  };

  private handleInput(deltaTime: number): void {
    const controlledPlayer = this.players[this.controlledPlayerIndex];
    const input = this.inputManager.getInput();

    if (input.switchPlayer && !this.prevInput.switchPlayer) {
      this.switchToNearestPlayer();
    }

    const moveDirection = new CANNON.Vec3(input.horizontal, 0, -input.vertical);
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      const speed = input.sprint ? 25 : 15;
      controlledPlayer.move(moveDirection, speed);
    } else {
      controlledPlayer.applyFriction();
    }

    if (input.kick && !this.prevInput.kick) {
      controlledPlayer.kick(this.ball);
    }

    this.prevInput.kick = input.kick;
    this.prevInput.switchPlayer = input.switchPlayer;
  }

  private updateAI(deltaTime: number): void {
    this.players.forEach((player, index) => {
      if (index !== this.controlledPlayerIndex) {
        this.aiController.updatePlayer(player, this.ball, this.players, deltaTime);
      }
    });
  }

  private updateEntities(): void {
    this.players.forEach(player => player.update());
    this.ball.update();
  }

  private updateCamera(): void {
    const controlledPlayer = this.players[this.controlledPlayerIndex];
    const playerPos = controlledPlayer.getPosition();

    const cameraDistance = 35;
    const cameraHeight = 25;

    const targetCameraPos = new THREE.Vector3(
      playerPos.x,
      cameraHeight,
      playerPos.z + cameraDistance
    );

    this.camera.position.lerp(targetCameraPos, 0.1);
    this.camera.lookAt(playerPos.x, 0, playerPos.z - 10);
  }

  private switchToNearestPlayer(): void {
    const ballPos = this.ball.getPosition();
    let nearestIndex = this.controlledPlayerIndex;
    let nearestDist = Infinity;

    this.players.forEach((player, index) => {
      if (player.team === 1) {
        const playerPos = player.getPosition();
        const dist = ballPos.distanceTo(playerPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = index;
        }
      }
    });

    this.controlledPlayerIndex = nearestIndex;
  }

  private checkGameEvents(): void {
    const ballPos = this.ball.getPosition();

    if (Math.abs(ballPos.x) > 52 && Math.abs(ballPos.z) < 8) {
      if (ballPos.x > 0) {
        this.gameState.addScore(1);
      } else {
        this.gameState.addScore(2);
      }
      this.resetPositions();
    }

    if (Math.abs(ballPos.x) > 55 || Math.abs(ballPos.z) > 35) {
      this.ball.setPosition(new THREE.Vector3(ballPos.x * 0.9, 1, ballPos.z * 0.9));
    }
  }

  private resetPositions(): void {
    this.ball.setPosition(new THREE.Vector3(0, 1, 0));
    this.ball.body.velocity.set(0, 0, 0);
    this.ball.body.angularVelocity.set(0, 0, 0);

    const team1Positions = [
      new CANNON.Vec3(-30, 0, 0),
      new CANNON.Vec3(-20, 0, -15),
      new CANNON.Vec3(-20, 0, 15),
      new CANNON.Vec3(-10, 0, 0)
    ];

    const team2Positions = [
      new CANNON.Vec3(30, 0, 0),
      new CANNON.Vec3(20, 0, -15),
      new CANNON.Vec3(20, 0, 15),
      new CANNON.Vec3(10, 0, 0)
    ];

    this.players.forEach((player, i) => {
      if (player.team === 1) {
        player.setPosition(team1Positions[player.playerNumber]);
      } else {
        player.setPosition(team2Positions[player.playerNumber]);
      }
      player.body.velocity.set(0, 0, 0);
    });
  }

  private updateHUD(): void {
    const hudElement = document.getElementById('hud');
    if (hudElement) {
      hudElement.textContent = `${this.gameState.score.team1} - ${this.gameState.score.team2}`;
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
