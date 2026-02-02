export interface Score {
  team1: number;
  team2: number;
}

export class GameState {
  public score: Score;
  public gameTime: number;
  public isPaused: boolean;

  constructor() {
    this.score = { team1: 0, team2: 0 };
    this.gameTime = 0;
    this.isPaused = false;
  }

  public addScore(team: number): void {
    if (team === 1) {
      this.score.team1++;
    } else if (team === 2) {
      this.score.team2++;
    }
  }

  public resetScore(): void {
    this.score = { team1: 0, team2: 0 };
  }

  public updateTime(deltaTime: number): void {
    if (!this.isPaused) {
      this.gameTime += deltaTime;
    }
  }
}
