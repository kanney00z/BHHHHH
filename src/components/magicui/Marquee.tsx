import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export const Marquee = ({
  items,
  speed = 30, // pixels per second
  className = "",
}: {
  items: React.ReactNode[];
  speed?: number;
  className?: string;
}) => {
  const [contentWidth, setContentWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setContentWidth(contentRef.current.offsetWidth);
    }
  }, [items]);

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100%",
        display: "flex",
        flexWrap: "nowrap",
        position: "relative",
        maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
        padding: "0",
        alignItems: "center"
      }}
      className={className}
    >
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: contentWidth > 0 ? (contentWidth * 2) / speed : 20,
        }}
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          width: "max-content",
        }}
      >
        <div ref={contentRef} style={{ display: "flex", gap: "2rem", paddingRight: "2rem", alignItems: "center" }}>
          {items.map((item, i) => (
            <div key={`item1-${i}`}>{item}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "2rem", paddingRight: "2rem", alignItems: "center" }}>
          {items.map((item, i) => (
            <div key={`item2-${i}`}>{item}</div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
