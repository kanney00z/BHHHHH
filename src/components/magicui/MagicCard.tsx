import React, { useState, useRef } from "react";

export const MagicCard = ({
  children,
  className = "",
  glowColor = "rgba(255, 45, 85, 0.4)", // YumDash accent glow
  glowSize = 250,
  style = {},
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}) => {
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: -1000, y: -1000 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        position: "relative",
        background: "var(--bg-glass)",
        backdropFilter: "blur(12px)",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        cursor: onClick ? "pointer" : "default",
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        ...style // Merge external style prop
      }}
      className={`magic-card ${className}`}
      onMouseOver={(e) => {
        if(onClick) e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        if(onClick) e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* The following div controls the Glow Effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(${glowSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 40%)`,
          opacity: 0.6,
          pointerEvents: "none",
          transition: "opacity 0.3s ease",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
};
