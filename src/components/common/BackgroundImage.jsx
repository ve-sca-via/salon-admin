/**
 * BackgroundImage Component
 * 
 * Optimized background image component for hero sections and cards
 * Features lazy loading and proper image optimization
 * 
 * Usage:
 * <BackgroundImage 
 *   src={bgImage} 
 *   className="h-[600px]"
 *   overlay="gradient"
 * >
 *   <YourContent />
 * </BackgroundImage>
 */

import { useState, useEffect, useRef } from 'react';

const BackgroundImage = ({
  src,
  children,
  className = '',
  overlay = 'none', // 'none' | 'gradient' | 'dark' | 'light'
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState(priority ? src : null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setCurrentSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [src, priority]);

  useEffect(() => {
    if (!currentSrc) return;

    const img = new Image();
    img.src = currentSrc;
    img.onload = () => setIsLoaded(true);
  }, [currentSrc]);

  const getOverlayClass = () => {
    switch (overlay) {
      case 'gradient':
        return 'bg-gradient-to-r from-black/60 via-black/40 to-transparent';
      case 'dark':
        return 'bg-black/50';
      case 'light':
        return 'bg-white/50';
      default:
        return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Background Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: currentSrc ? `url(${currentSrc})` : 'none',
        }}
      />

      {/* Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300 animate-pulse" />
      )}

      {/* Overlay */}
      {overlay !== 'none' && (
        <div className={`absolute inset-0 ${getOverlayClass()}`} />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default BackgroundImage;
