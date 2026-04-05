import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banner } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerCarouselProps {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const slideNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  }, [banners.length]);

  const slidePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isHovered) return;
    
    // Auto slide every 5 seconds
    const timer = setInterval(() => {
      slideNext();
    }, 5000);
    
    return () => clearInterval(timer);
  }, [banners.length, isHovered, slideNext]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      };
    }
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        paddingBottom: '43.75%', // Fallback for 16:7
        backgroundColor: '#eaeaea'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence initial={true} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -10000) {
              slideNext();
            } else if (swipe > 10000) {
              slidePrev();
            }
          }}
          style={{ 
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: 'grab',
            zIndex: 1
          }}
          onClick={() => {
             if (currentBanner.link_url) {
                window.open(currentBanner.link_url, '_blank');
             }
          }}
        >
          <img 
            src={currentBanner.image_url} 
            alt="Banner" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              pointerEvents: 'none' // Prevent img dragging overriding framer-motion grab
            }} 
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlays to make it pop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent, transparent)',
        pointerEvents: 'none',
        zIndex: 2
      }} />

      {/* Navigation Buttons (visible on hover/desktop) */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); slidePrev(); }}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.3s, background 0.3s',
              zIndex: 10,
              cursor: 'pointer',
              border: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          >
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); slideNext(); }}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.3s, background 0.3s',
              zIndex: 10,
              cursor: 'pointer',
              border: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Indicators */}
      {banners.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 10
        }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                 e.stopPropagation();
                 setDirection(i > currentIndex ? 1 : -1);
                 setCurrentIndex(i);
              }}
              style={{
                height: '6px',
                borderRadius: '8px',
                transition: 'all 0.3s',
                background: 'white',
                border: 'none',
                cursor: 'pointer',
                opacity: i === currentIndex ? 1 : 0.5,
                width: i === currentIndex ? '24px' : '8px'
              }}
            />
          ))}
        </div>
      )}
      
      {/* Progress Bar */}
      {banners.length > 1 && !isHovered && (
        <motion.div 
          key={currentIndex + '-progress'}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '4px',
            background: 'rgba(255,255,255,0.4)',
            zIndex: 10
          }}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear' }}
        />
      )}
    </div>
  );
}
