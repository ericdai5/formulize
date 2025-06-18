import React, { useCallback, useEffect, useRef, useState } from "react";

import * as d3 from "d3";

import { IContext } from "../../../types/custom";
import { register } from "../registry";

interface BayesProbabilityChartProps {
  context: IContext;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hitRed: boolean;
  hitBlue: boolean;
  active: boolean;
  bounceCount: number; // Track number of bounces
}

interface Statistics {
  redOnly: number; // A ∩ ¬B
  blueOnly: number; // B ∩ ¬A
  both: number; // A ∩ B
  neither: number; // ¬A ∩ ¬B
  total: number;
}

// Move constants outside component to prevent recreation on every render
const CONFIG = {
  width: 675,
  height: 300,
  redShelfY: 100,
  blueShelfY: 200,
  shelfWidth: 300,
  shelfHeight: 6,
  redShelfX: 150,
  blueShelfX: 350,
  gravity: 0.05, // Much smaller gravity for slower acceleration
  ballSpawnRate: 0.15, // Increased from 0.02 to make it rain-like
  ballRadius: 4,
  speedMultiplier: 0.5, // Global speed modifier to slow everything down
};

// Color palette for consistent styling
const COLORS = {
  red: "#C03A2B",
  blue: "#2980B9",
  purple: "#9B59B6",
  gray: "#CCCCCC",
};

const BayesProbabilityChart: React.FC<BayesProbabilityChartProps> = ({
  context,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();
  const ballIdRef = useRef(0);

  const [isRunning, setIsRunning] = useState(true); // Start automatically
  const [balls, setBalls] = useState<Ball[]>([]);
  const [dropFrequency, setDropFrequency] = useState(0.15); // Controllable drop frequency
  const [stats, setStats] = useState<Statistics>({
    redOnly: 0,
    blueOnly: 0,
    both: 0,
    neither: 0,
    total: 0,
  });

  // Get probabilities from context variables
  const getContextProbabilities = () => {
    const pA = context.getVariable("P(A)");
    const pB = context.getVariable("P(B)");
    const pAandB = context.getVariable("P(A \\cap B)");
    const pBGivenA = context.getVariable("P(B \\mid A)");
    const pAGivenB = context.getVariable("P(A \\mid B)");
    const pAandNotB = context.getVariable("P(A \\cap \\neg B)");
    const pBandNotA = context.getVariable("P(B \\cap \\neg A)");
    const pNotAandNotB = context.getVariable("P(\\\\neg A \\\\cap \\\\neg B)");
    return {
      pA,
      pB,
      pAandB,
      pBGivenA,
      pAGivenB,
      pAandNotB,
      pBandNotA,
      pNotAandNotB,
    };
  };

  // Calculate expected proportions from context variables
  const contextProbs = getContextProbabilities();

  const expectedProportions = {
    redOnly: contextProbs.pAandNotB, // P(A ∩ ¬B)
    blueOnly: contextProbs.pBandNotA, // P(B ∩ ¬A)
    both: contextProbs.pAandB, // P(A ∩ B)
    neither: contextProbs.pNotAandNotB, // P(¬A ∩ ¬B)
  };

  // Calculate actual proportions
  const actualProportions = {
    redOnly: stats.total > 0 ? stats.redOnly / stats.total : 0,
    blueOnly: stats.total > 0 ? stats.blueOnly / stats.total : 0,
    both: stats.total > 0 ? stats.both / stats.total : 0,
    neither: stats.total > 0 ? stats.neither / stats.total : 0,
  };

  // Calculate dynamic shelf positions and widths based on probability variables
  const getDynamicShelfLayout = () => {
    const contextProbs = getContextProbabilities();
    const pA = contextProbs.pA;
    const pB = contextProbs.pB;
    const pAandB = contextProbs.pAandB;

    // Ball spawn area (where balls can fall)
    const ballSpawnWidth = CONFIG.width - 100; // Balls spawn from x=50 to x=CONFIG.width-50
    const ballSpawnStart = 50;

    // Calculate shelf widths to match exact probabilities
    const redWidth = Math.max(pA * ballSpawnWidth, 20); // Minimum 20px for visibility
    const blueWidth = Math.max(pB * ballSpawnWidth, 20);
    const overlapWidth = Math.max(pAandB * ballSpawnWidth, 0);

    // Calculate total system width (red + blue - overlap)
    const totalSystemWidth = redWidth + blueWidth - overlapWidth;

    // Center the entire shelf system within the ball spawn area
    const systemStartX =
      ballSpawnStart + (ballSpawnWidth - totalSystemWidth) / 2;

    // Position shelves within the centered system
    const redShelfX = systemStartX;
    const blueShelfX = redShelfX + redWidth - overlapWidth;

    // Recalculate actual overlap
    const actualOverlapWidth = Math.max(0, redShelfX + redWidth - blueShelfX);

    return {
      redShelfX,
      redWidth,
      blueShelfX,
      blueWidth,
      overlapWidth: actualOverlapWidth,
      ballSpawnStart,
      ballSpawnWidth,
    };
  };

  const {
    redShelfX,
    redWidth,
    blueShelfX,
    blueWidth,
    overlapWidth,
    ballSpawnStart,
    ballSpawnWidth,
  } = getDynamicShelfLayout();

  // Animation loop
  const animate = useCallback(() => {
    if (!isRunning) return;

    setBalls((currentBalls) => {
      let newBalls = [...currentBalls];
      // Spawn multiple balls per frame for rain effect
      const spawnCount =
        Math.random() < dropFrequency ? Math.floor(Math.random() * 3) + 1 : 0; // 1-3 balls when spawning

      for (let i = 0; i < spawnCount; i++) {
        const newBall: Ball = {
          id: ballIdRef.current++,
          x: ballSpawnStart + Math.random() * ballSpawnWidth,
          y: -20,
          vx: 0,
          vy: Math.random() * 0.5,
          radius: CONFIG.ballRadius,
          hitRed: false,
          hitBlue: false,
          active: true,
          bounceCount: 0,
        };
        newBalls.push(newBall);
      }

      // Update physics for all balls
      newBalls = newBalls.map((ball) => {
        if (!ball.active) return ball;

        // Apply gravity and movement with speed multiplier
        ball.vy += CONFIG.gravity * CONFIG.speedMultiplier;
        ball.x += ball.vx * CONFIG.speedMultiplier;
        ball.y += ball.vy * CONFIG.speedMultiplier;

        // Check collision with red shelf
        if (
          !ball.hitRed &&
          ball.x + ball.radius > redShelfX &&
          ball.x - ball.radius < redShelfX + redWidth &&
          ball.y + ball.radius > CONFIG.redShelfY &&
          ball.y - ball.radius < CONFIG.redShelfY + CONFIG.shelfHeight
        ) {
          ball.hitRed = true;
          // Bounce off shelf with energy loss but keep falling
          ball.y = CONFIG.redShelfY - ball.radius; // Position above shelf
          ball.vy = -Math.abs(ball.vy) * 0.4; // Bounce up with reduced energy
          ball.vx = 0; // Ensure no horizontal deviation
        }

        // Check collision with blue shelf
        if (
          !ball.hitBlue &&
          ball.x + ball.radius > blueShelfX &&
          ball.x - ball.radius < blueShelfX + blueWidth &&
          ball.y + ball.radius > CONFIG.blueShelfY &&
          ball.y - ball.radius < CONFIG.blueShelfY + CONFIG.shelfHeight
        ) {
          ball.hitBlue = true;
          // Bounce off shelf with energy loss but keep falling
          ball.y = CONFIG.blueShelfY - ball.radius; // Position above shelf
          ball.vy = -Math.abs(ball.vy) * 0.4; // Bounce up with reduced energy
          ball.vx = 0; // Ensure no horizontal deviation
        }

        // Check collision with bottom - add bouncing behavior
        if (ball.y + ball.radius > CONFIG.height) {
          if (ball.bounceCount < 4 && Math.abs(ball.vy) > 0.2) {
            // Bounce with energy loss
            ball.y = CONFIG.height - ball.radius; // Keep ball above bottom
            ball.vy = -ball.vy * 0.35; // Reverse and reduce velocity (65% energy loss)
            ball.vx = 0; // Ensure no horizontal deviation
            ball.bounceCount++;
          } else {
            // Mark ball as ready for counting and removal
            ball.active = false;
          }
        }

        // Remove balls that are way off screen or have very low energy
        if (
          ball.y > CONFIG.height + 100 ||
          (ball.bounceCount >= 4 && Math.abs(ball.vy) < 0.1)
        ) {
          ball.active = false;
        }

        return ball;
      });

      // Count statistics for balls that just became inactive (before filtering)
      const inactiveBalls = newBalls.filter((ball) => !ball.active);

      if (inactiveBalls.length > 0) {
        setStats((prevStats) => {
          const newStats = { ...prevStats };
          inactiveBalls.forEach((ball) => {
            if (ball.hitRed && ball.hitBlue) {
              newStats.both++;
            } else if (ball.hitRed && !ball.hitBlue) {
              newStats.redOnly++;
            } else if (!ball.hitRed && ball.hitBlue) {
              newStats.blueOnly++;
            } else {
              newStats.neither++;
            }
            newStats.total++;
          });
          return newStats;
        });
      }

      // Filter out inactive balls after counting
      newBalls = newBalls.filter((ball) => ball.active);

      return newBalls;
    });
  }, [
    isRunning,
    dropFrequency,
    redShelfX,
    redWidth,
    blueShelfX,
    blueWidth,
    ballSpawnStart,
    ballSpawnWidth,
  ]);

  // Start/stop animation
  useEffect(() => {
    if (isRunning) {
      const animateLoop = () => {
        animate();
        animationRef.current = requestAnimationFrame(animateLoop);
      };
      animationRef.current = requestAnimationFrame(animateLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  // D3 rendering - simplified and more reliable
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Only clear and redraw static elements once
    let g = svg.select<SVGGElement>("g.main-group");
    if (g.empty()) {
      svg.selectAll("*").remove();
      g = svg.append("g").attr("class", "main-group");
    }

    // Always update shelf elements (remove and redraw to reflect width changes)
    g.selectAll(
      ".red-shelf, .blue-shelf, .red-label, .blue-label, .overlap-indicator, .overlap-label"
    ).remove();

    // Draw red shelf (Event A)
    g.append("rect")
      .attr("class", "red-shelf")
      .attr("x", redShelfX)
      .attr("y", CONFIG.redShelfY)
      .attr("width", redWidth)
      .attr("height", CONFIG.shelfHeight)
      .attr("fill", COLORS.red);

    // Draw blue shelf (Event B)
    g.append("rect")
      .attr("class", "blue-shelf")
      .attr("x", blueShelfX)
      .attr("y", CONFIG.blueShelfY)
      .attr("width", blueWidth)
      .attr("height", CONFIG.shelfHeight)
      .attr("fill", COLORS.blue);

    // Add shelf labels
    g.append("text")
      .attr("class", "red-label")
      .attr("x", redShelfX + redWidth / 2)
      .attr("y", CONFIG.redShelfY - 10)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.red)
      .attr("font-size", "16px")
      .text("A");

    g.append("text")
      .attr("class", "blue-label")
      .attr("x", blueShelfX + blueWidth / 2)
      .attr("y", CONFIG.blueShelfY - 10)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.blue)
      .attr("font-size", "16px")
      .text("B");

    // Update balls with proper data binding
    const ballsSelection = g
      .selectAll<SVGCircleElement, Ball>("circle.ball")
      .data(balls, (d: Ball) => d.id.toString());

    // Enter new balls
    ballsSelection
      .enter()
      .append("circle")
      .attr("class", "ball")
      .attr("r", (d: Ball) => d.radius);

    // Update all balls (both existing and new)
    g.selectAll<SVGCircleElement, Ball>("circle.ball")
      .attr("cx", (d: Ball) => d.x)
      .attr("cy", (d: Ball) => d.y)
      .attr("fill", (d: Ball) => {
        if (d.hitRed && d.hitBlue) return COLORS.purple; // Purple for both
        if (d.hitRed) return COLORS.red; // Red
        if (d.hitBlue) return COLORS.blue; // Blue
        return COLORS.gray; // Gray for neither
      });

    // Remove exited balls
    ballsSelection.exit().remove();
  }, [
    balls,
    redShelfX,
    redWidth,
    blueShelfX,
    blueWidth,
    overlapWidth,
    ballSpawnStart,
    ballSpawnWidth,
  ]);

  const toggleAnimation = () => {
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setBalls([]);
    setDropFrequency(0.15); // Reset to default
    setStats({
      redOnly: 0,
      blueOnly: 0,
      both: 0,
      neither: 0,
      total: 0,
    });
    ballIdRef.current = 0;
  };

  // Component for a single proportion bar
  const ProportionBar = ({
    label,
    proportions,
    barWidth = 600,
    barHeight = 10,
  }: {
    label: string;
    proportions: {
      redOnly: number;
      blueOnly: number;
      both: number;
      neither: number;
    };
    barWidth?: number;
    barHeight?: number;
  }) => (
    <div className="mb-6">
      <div className="text-sm font-medium mb-2 text-gray-700">{label}</div>
      <div className="relative">
        <svg width={barWidth} height={barHeight} className="border rounded">
          {/* Background */}
          <rect width={barWidth} height={barHeight} fill="#f3f4f6" />
          {/* Segments */}
          <rect
            x={0}
            y={0}
            width={proportions.redOnly * barWidth}
            height={barHeight}
            fill={COLORS.red}
          />
          <rect
            x={proportions.redOnly * barWidth}
            y={0}
            width={proportions.blueOnly * barWidth}
            height={barHeight}
            fill={COLORS.blue}
          />
          <rect
            x={(proportions.redOnly + proportions.blueOnly) * barWidth}
            y={0}
            width={proportions.both * barWidth}
            height={barHeight}
            fill={COLORS.purple}
          />
          <rect
            x={
              (proportions.redOnly + proportions.blueOnly + proportions.both) *
              barWidth
            }
            y={0}
            width={proportions.neither * barWidth}
            height={barHeight}
            fill={COLORS.gray}
          />
        </svg>
      </div>
    </div>
  );

  // Component for stacked proportion bars
  const StackedProportionBars = () => (
    <div className="mb-4">
      <ProportionBar label="Expected" proportions={expectedProportions} />
      <ProportionBar label="Actual" proportions={actualProportions} />
    </div>
  );

  return (
    <div className="bayes-probability-chart w-full h-full p-4 bg-slate-50 flex flex-col overflow-auto gap-3">
      {/* Drop Frequency Slider */}
      <div className="p-4 bg-white rounded-lg border">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Drop Frequency: {(dropFrequency * 60).toFixed(0)} balls/sec
        </label>
        <input
          type="range"
          min="0.05"
          max="0.5"
          step="0.05"
          value={dropFrequency}
          onChange={(e) => setDropFrequency(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 items-center">
        <button
          onClick={toggleAnimation}
          className={`px-4 py-2 rounded-xl font-medium ${
            isRunning
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isRunning ? "Pause" : "Start"} Simulation
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium"
        >
          Reset
        </button>
        <div className="text-sm text-gray-600">Total balls: {stats.total}</div>
      </div>
      {/* Visualization */}
      <div className="flex-1">
        <svg
          ref={svgRef}
          width={CONFIG.width}
          height={CONFIG.height}
          className="border border-gray-300 bg-white rounded-lg"
          viewBox={`0 0 ${CONFIG.width} ${CONFIG.height}`}
        />
      </div>

      {/* Stacked Proportion Bars */}
      <div className="bg-white p-4 rounded-lg border">
        <StackedProportionBars />
      </div>

      {/* Counts Display */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS.red }}
            />
            <span className="font-medium">count(A ∩ ¬B):</span>
            <span className="font-mono text-lg text-gray-700 ml-auto">
              {stats.redOnly}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS.blue }}
            />
            <span className="font-medium">count(B ∩ ¬A):</span>
            <span className="font-mono text-lg text-gray-700 ml-auto">
              {stats.blueOnly}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS.purple }}
            />
            <span className="font-medium">count(A ∩ B):</span>
            <span className="font-mono text-lg text-gray-700 ml-auto">
              {stats.both}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS.gray }}
            />
            <span className="font-medium">count(¬A ∩ ¬B):</span>
            <span className="font-mono text-lg text-gray-700 ml-auto">
              {stats.neither}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Self-register this component when the module is imported
register("BayesProbabilityChart", BayesProbabilityChart);

export default BayesProbabilityChart;
