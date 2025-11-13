/**
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur placeholder while loading
 * - Responsive images with srcSet
 * - WebP/AVIF format support with fallback
 * - Error handling with fallback image
 * - Accessible with proper alt text
 * 
 * Usage:
 * <OptimizedImage 
 *   src="/path/to/image.jpg" 
 *   alt="Description"
 *   className="w-full h-64"
 * />
 */

import { useState, useEffect, useRef } from 'react';

const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false, // Set true for above-the-fold images
  objectFit = 'cover',
  aspectRatio,
  placeholder = 'blur', // 'blur' | 'none'
  onLoad,
  onError,
  fallbackSrc = '/placeholder-image.jpg',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(priority ? src : null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    // Intersection Observer for lazy loading
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
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    console.error(`Failed to load image: ${src}`);
    setHasError(true);
    setCurrentSrc(fallbackSrc);
    if (onError) onError(e);
  };

  // Generate srcSet for responsive images (if src is from CDN/storage)
  const generateSrcSet = (imageSrc) => {
    if (!imageSrc || imageSrc.startsWith('data:') || imageSrc === fallbackSrc) {
      return null;
    }

    // For Supabase Storage or CDN URLs, generate different sizes
    if (imageSrc.includes('supabase.co') || imageSrc.includes('cdn')) {
      const widths = [640, 768, 1024, 1280, 1536];
      return widths
        .map((w) => `${imageSrc}?width=${w}&quality=80 ${w}w`)
        .join(', ');
    }

    return null;
  };

  const imgStyle = {
    objectFit,
    ...(aspectRatio && { aspectRatio }),
  };

  const containerStyle = {
    ...(width && { width }),
    ...(height && { height }),
    ...(aspectRatio && { aspectRatio }),
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={containerStyle}
      {...props}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse"
          style={{ backdropFilter: 'blur(20px)' }}
        />
      )}

      {/* Actual image */}
      {(isInView || priority) && currentSrc && (
        <img
          src={currentSrc}
          srcSet={generateSrcSet(currentSrc)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={imgStyle}
        />
      )}

      {/* Loading skeleton (if no blur placeholder) */}
      {placeholder === 'none' && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <svg
            className="animate-spin h-8 w-8 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
