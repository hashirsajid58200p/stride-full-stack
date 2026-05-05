import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './CustomScrollbar.module.css';

const CustomScrollbar = ({ children, className = "" }) => {
  const contentRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollThumbRef = useRef(null);
  const observer = useRef(null);

  const [thumbHeight, setThumbHeight] = useState(20);
  const [scrollPos, setScrollPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScrollTop, setStartScrollTop] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);

  const handleResize = useCallback(() => {
    if (contentRef.current) {
      const { clientHeight, scrollHeight } = contentRef.current;
      const height = Math.max((clientHeight / scrollHeight) * clientHeight, 20);
      setThumbHeight(height);
      setIsScrollable(scrollHeight > clientHeight);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const trackHeight = clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      if (maxScrollTop <= 0) {
        setScrollPos(0);
        return;
      }
      const newPos = (scrollTop / maxScrollTop) * (trackHeight - thumbHeight);
      setScrollPos(newPos);
    }
  }, [thumbHeight]);

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      handleResize();
      content.addEventListener('scroll', handleScroll);
      
      // Observe content changes to update thumb height
      observer.current = new ResizeObserver(handleResize);
      observer.current.observe(content);
      Array.from(content.children).forEach(child => observer.current.observe(child));
    }
    return () => {
      if (content) content.removeEventListener('scroll', handleScroll);
      if (observer.current) observer.current.disconnect();
    };
  }, [handleScroll, handleResize]);

  // Dragging logic
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartScrollTop(contentRef.current.scrollTop);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const { clientHeight, scrollHeight } = contentRef.current;
    const scrollFactor = scrollHeight / clientHeight;
    contentRef.current.scrollTop = startScrollTop + deltaY * scrollFactor;
  }, [isDragging, startY, startScrollTop]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={`${styles.container} ${className}`}>
      <div 
        className={styles.scrollableArea} 
        ref={contentRef}
      >
        {children}
      </div>
      {isScrollable && (
        <div className={styles.track} ref={scrollTrackRef}>
          <div 
            className={styles.thumb} 
            ref={scrollThumbRef}
            style={{ 
              height: `${thumbHeight}px`,
              transform: `translateY(${scrollPos}px)`
            }}
            onMouseDown={handleMouseDown}
          />
        </div>
      )}
    </div>
  );
};

export default CustomScrollbar;
