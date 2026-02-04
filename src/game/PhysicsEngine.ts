import Matter from "matter-js";
import { FRUIT_TYPES } from "./fruits";
import type { FruitType } from "./fruits";

export class PhysicsEngine {
  engine: Matter.Engine;
  render: Matter.Render;
  runner: Matter.Runner;
  containerWidth: number;
  containerHeight: number;
  onScoreUpdate: (score: number) => void;
  onGameOver: () => void;
  isGameOver: boolean = false;

  constructor(
    element: HTMLElement,
    onScoreUpdate: (score: number) => void,
    onGameOver: () => void,
    width: number = 540,
    height: number = 780
  ) {
    this.containerWidth = width;
    this.containerHeight = height;
    this.engine = Matter.Engine.create();
    this.onScoreUpdate = onScoreUpdate;
    this.onGameOver = onGameOver;

    this.render = Matter.Render.create({
      element: element,
      engine: this.engine,
      options: {
        width: this.containerWidth,
        height: this.containerHeight,
        wireframes: false,
        background: "transparent",
      },
    });

    this.runner = Matter.Runner.create();
    this.setupWorld();
    this.setupCollision();
  }

  setupWorld() {
    const wallOptions = {
      isStatic: true,
      render: { fillStyle: "transparent" }
    };

    const ground = Matter.Bodies.rectangle(
      this.containerWidth / 2,
      this.containerHeight + 25,
      this.containerWidth,
      50,
      wallOptions
    );
    const leftWall = Matter.Bodies.rectangle(
      -25,
      this.containerHeight / 2,
      50,
      this.containerHeight,
      wallOptions
    );
    const rightWall = Matter.Bodies.rectangle(
      this.containerWidth + 25,
      this.containerHeight / 2,
      50,
      this.containerHeight,
      wallOptions
    );

    Matter.World.add(this.engine.world, [ground, leftWall, rightWall]);
  }

  setupCollision() {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        if (bodyA.label === bodyB.label && bodyA.label && bodyA.label.startsWith("fruit-")) {
          const fruitId = parseInt(bodyA.label.split("-")[1]);
          if (fruitId < FRUIT_TYPES.length - 1) {
            const nextFruit = FRUIT_TYPES[fruitId + 1];
            const midX = (bodyA.position.x + bodyB.position.x) / 2;
            const midY = (bodyA.position.y + bodyB.position.y) / 2;

            Matter.World.remove(this.engine.world, [bodyA, bodyB]);
            this.addFruit(midX, midY, nextFruit);
            this.onScoreUpdate(nextFruit.score);
          }
        }
      });
    });

    Matter.Events.on(this.engine, "afterUpdate", () => {
      if (this.isGameOver) return;

      const fruits = this.engine.world.bodies.filter(b => b.label && b.label.startsWith("fruit-"));
      for (const fruit of fruits) {
        // Line is now at y=120
        if (fruit.position.y < 120 && Math.abs(fruit.velocity.y) < 0.1 && (fruit as any).spawnTime && Date.now() - (fruit as any).spawnTime > 1500) {
           this.isGameOver = true;
           this.onGameOver();
           break;
        }
      }
    });
  }

  addFruit(x: number, y: number, fruitType: FruitType) {
    // Assets have some transparent padding.
    // We scale the image slightly larger than the physics body to compensate.
    const visualPaddingFactor = 1.18;
    const scale = (fruitType.radius * 2 * visualPaddingFactor) / 512;
    const fruit = Matter.Bodies.circle(x, y, fruitType.radius, {
      label: `fruit-${fruitType.id}`,
      restitution: 0.3,
      friction: 0.1,
      render: {
        sprite: {
          texture: fruitType.image,
          xScale: scale,
          yScale: scale,
        },
      },
    });
    (fruit as any).spawnTime = Date.now();
    Matter.World.add(this.engine.world, fruit);
    return fruit;
  }

  setGravity(x: number, y: number) {
    this.engine.gravity.x = x;
    this.engine.gravity.y = y;
  }

  start() {
    Matter.Render.run(this.render);
    Matter.Runner.run(this.runner, this.engine);
  }

  stop() {
    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
    Matter.Engine.clear(this.engine);
  }
}
