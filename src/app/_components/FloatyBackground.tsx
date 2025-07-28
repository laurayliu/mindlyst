"use client";
import React, { useEffect, useRef } from "react";

const FloatyBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // set canvas size to fill window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // sizing and add event listener
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = [
      "rgba(182, 191, 249, 0.15)",  // light blue-purple
      "rgba(157, 225, 242, 0.15)",  // light blue
      "rgba(204, 180, 248, 0.15)",  // light purple
      "rgba(165, 219, 232, 0.15)",  // lighter blue
      "rgba(255, 204, 230, 0.15)",  // pink
    ];

    class Orb {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      angle: number;
      rotationSpeed: number;

      constructor(width: number, height: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 150 + 100;
        const colorIndex = Math.floor(Math.random() * colors.length);
        this.color = colors[colorIndex]!; // non null cuz colors guaranteed to have colors
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.005;
      }

      update(width: number, height: number) {
        // sinusoidal motionn
        this.x += this.speedX + Math.sin(this.angle) * 0.5;
        this.y += this.speedY + Math.cos(this.angle) * 0.5;
        this.angle += this.rotationSpeed;

        // wrap-around boundary check
        if (this.x > width + this.size) this.x = -this.size;
        else if (this.x < -this.size) this.x = width + this.size;
        if (this.y > height + this.size) this.y = -this.size;
        else if (this.y < -this.size) this.y = height + this.size;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save(); // save current canvas

        ctx.filter = `blur(${this.size * 0.2}px)`; //blur directly

        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.size
        );
        // regex for opacity to fade gradient
        gradient.addColorStop(0, this.color.replace(/(\d+\.\d+)\)/, '0.7)')); // strong center
        gradient.addColorStop(0.5, this.color.replace(/(\d+\.\d+)\)/, '0.3)'));
        gradient.addColorStop(1, this.color.replace(/(\d+\.\d+)\)/, '0.0)')); // transparent edge

        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'screen';

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
    const orbCount = Math.floor(Math.min(5, canvas.width / 400));
    const orbs: Orb[] = [];
    for (let i = 0; i < orbCount; i++) {
      orbs.push(new Orb(canvas.width, canvas.height));
    }
    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // get rid of slime trail

      orbs.forEach(orb => {
        orb.update(canvas.width, canvas.height);
        orb.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate(); // start animation loop

    // no memory leaks round here B)
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (ctx) ctx.filter = 'none'; // reset filter
    };
  }, []); // empty dependency array so effect runs once

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 w-full h-full pointer-events-none" // z-0: behind content but above main background
      aria-hidden="true" // just decorative
    />
  );
};
export default FloatyBackground;