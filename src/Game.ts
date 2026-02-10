import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Field } from './Field';
import { Player } from './Player';
import { Ball } from './Ball';
import { InputManager } from './InputManager';
import { AIController } from './AIController';
import { GameState } from './GameState';
import { ShootingSystem } from './ShootingSystem';
import { PowerMeter } from './PowerMeter';
import { AudioManager } from './AudioManager';
import { ParticleSystem } from './ParticleSystem';
import { KickImpactEffect } from './KickImpactEffect';
import { BallTrailEffect } from './BallTrailEffect';
import { GoalExplosion } from './GoalExplosion';
import { RunDustEffect } from './RunDustEffect';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: CANNON.World;

  private ball: Ball;
  private players: Player[] = [];
  private inputManager: InputManager;
  private aiController: AIController;
  private gameState: GameState;
  private shootingSystem: ShootingSystem;
  private powerMeter: PowerMeter;
  private audioManager: AudioManager;

  // Particle system and effects
  private particleSystem: ParticleSystem;
  private kickImpactEffect: KickImpactEffect;
  private ballTrailEffect: BallTrailEffect;
  private goalExplosion: GoalExplosion;
  private runDustEffect: RunDustEffect;

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

    this.setupLights();

    // Field automatically adds itself to scene
    new Field(this.scene, this.world);
    this.ball = new Ball(this.scene, this.world);

    this.createPlayers();

    this.inputManager = new InputManager();
    this.aiController = new AIController();
    this.gameState = new GameState();
    this.shootingSystem = new ShootingSystem();
    this.powerMeter = new PowerMeter();
    this.powerMeter.addStyles();

    // Initialize audio system
    this.audioManager = AudioManager.getInstance();
    this.audioManager.loadSettings();
    this.initializeAudio();

    // Initialize particle system and effects
    this.scene.userData.camera = this.camera; // Store camera for billboard effect
    this.particleSystem = new ParticleSystem(this.scene);
    this.kickImpactEffect = new KickImpactEffect(this.particleSystem);
    this.ballTrailEffect = new BallTrailEffect(this.particleSystem);
    this.goalExplosion = new GoalExplosion(this.particleSystem);
    this.runDustEffect = new RunDustEffect(this.particleSystem);

    // Set effects on ball
    this.ball.setBallTrailEffect(this.ballTrailEffect);

    // Set effects on players
    this.players.forEach(player => {
      player.setParticleEffects(this.kickImpactEffect, this.runDustEffect);
    });

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private async initializeAudio(): Promise<void> {
    await this.audioManager.initialize();
    this.audioManager.setCamera(this.camera);
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

  public async start(): Promise<void> {
    // Ensure audio is ready (handle mobile autoplay restrictions)
    await this.audioManager.ensureAudioContext();
    await this.audioManager.startAmbientSound();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    requestAnimationFrame(this.gameLoop);

    const deltaTime = this.clock.getDelta();
    const fixedTimeStep = 1 / 60;

    this.world.step(fixedTimeStep, deltaTime, 3);

    this.handleInput(deltaTime);
    this.updateAI(deltaTime);
    this.updateEntities(deltaTime);
    this.updateCamera();
    this.checkGameEvents();
    this.updateHUD();
    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  private handleInput(_deltaTime: number): void {
    const controlledPlayer = this.players[this.controlledPlayerIndex];
    const input = this.inputManager.getInput();

    if (input.switchPlayer && !this.prevInput.switchPlayer) {
      this.switchToNearestPlayer();
      // Play UI sound for player switch
      this.audioManager.playSound('ui_switch', 0.6);
    }

    const moveDirection = new CANNON.Vec3(input.horizontal, 0, -input.vertical);
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      const speed = input.sprint ? 25 : 15;
      controlledPlayer.move(moveDirection, speed);
    } else {
      controlledPlayer.applyFriction();
    }

    // Handle charging kick system
    this.handleKickInput(input, controlledPlayer);

    this.prevInput.kick = input.kick;
    this.prevInput.switchPlayer = input.switchPlayer;
  }

  private handleKickInput(input: any, controlledPlayer: Player): void {
    // Kick button pressed (start charging)
    if (input.kick && !this.prevInput.kick) {
      // Check if player is near ball before starting charge
      if (controlledPlayer.isNearBall(this.ball)) {
        this.shootingSystem.startCharging();
        controlledPlayer.startChargingKick();
        this.powerMeter.show();
      }
    }

    // Kick button held (update power meter)
    if (input.kick && this.shootingSystem.getIsCharging()) {
      const currentPower = this.shootingSystem.getCurrentPower();
      this.powerMeter.setPower(currentPower);
    }

    // Kick button released (execute shot)
    if (!input.kick && this.prevInput.kick) {
      if (this.shootingSystem.getIsCharging()) {
        const power = this.shootingSystem.stopCharging();
        controlledPlayer.stopChargingKick();
        this.powerMeter.hide();

        // Execute shot with the shooting system
        const joystickInput = {
          x: input.horizontal,
          z: input.vertical
        };

        const shotExecuted = this.shootingSystem.executeShotFromPlayer(
          controlledPlayer,
          this.ball,
          power,
          joystickInput
        );

        // If shot was executed successfully, play audio
        if (shotExecuted) {
          const kickPower = 20 + (power / 100) * 30; // Map power to kick strength
          this.audioManager.playKickSound(kickPower, this.ball.getPosition());
        }
      }
    }
  }

  private updateAI(deltaTime: number): void {
    this.players.forEach((player, index) => {
      if (index !== this.controlledPlayerIndex) {
        this.aiController.updatePlayer(player, this.ball, this.players, deltaTime, this.gameState.score);
      }
    });
  }

  public setAIDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.aiController.setDifficulty(difficulty);
  }

  private updateEntities(deltaTime: number): void {
    this.players.forEach(player => {
      player.constrainToBounds();
      player.update(deltaTime);
    });
    this.ball.update(deltaTime);
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
      let teamColor: number;

      if (ballPos.x > 0) {
        this.gameState.addScore(1);
        teamColor = 0x0044ff; // Team 1 blue
      } else {
        this.gameState.addScore(2);
        teamColor = 0xff4400; // Team 2 orange
      }

      // Play goal celebration sound
      this.audioManager.playSound('goal', 1.0);

      // Trigger goal explosion effect
      this.goalExplosion.trigger(ballPos, teamColor);

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

    this.players.forEach((player, _i) => {
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
