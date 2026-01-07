import { useState } from 'react';

export const ImageViewer = ({ images, initialIndex = 0, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Normalize images to array format
  const imageArray = Array.isArray(images) ? images : [images];

  const openViewer = (index = initialIndex) => {
    setCurrentIndex(index);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeViewer = () => {
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % imageArray.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + imageArray.length) % imageArray.length);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrevious();
  };

  // Add keyboard listener
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  return (
    <>
      {/* Clickable trigger - pass onClick to children */}
      <div onClick={() => openViewer(initialIndex)} className="cursor-pointer">
        {children}
      </div>

      {/* Full-screen image viewer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Background overlay - click to close */}
          <div
            className="absolute inset-0 bg-black bg-opacity-95"
            onClick={closeViewer}
          />

          {/* Close button */}
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none z-20"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image counter */}
          {imageArray.length > 1 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full z-20">
              {currentIndex + 1} / {imageArray.length}
            </div>
          )}

          {/* Previous button */}
          {imageArray.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 text-white hover:text-gray-300 focus:outline-none bg-black bg-opacity-50 rounded-full p-3 z-20"
              aria-label="Previous"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="relative z-10 max-w-7xl max-h-[90vh] p-4">
            <img
              src={imageArray[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Next button */}
          {imageArray.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 text-white hover:text-gray-300 focus:outline-none bg-black bg-opacity-50 rounded-full p-3 z-20"
              aria-label="Next"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
};
