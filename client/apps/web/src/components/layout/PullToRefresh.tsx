import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Paperclip, Check } from 'lucide-react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';

interface PullToRefreshProps {
  children: React.ReactNode;
  isDarkMode: boolean;
}

export default function PullToRefresh({ children, isDarkMode }: PullToRefreshProps) {
  const queryClient = useQueryClient();
  const isFetchingCount = useIsFetching();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const hasDeterminedIntentRef = useRef(false);
  const isScrolledDownRef = useRef(false);
  const prevIsFetchingRef = useRef(0);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to check if any element in the target chain is scrolled down
  const isScrolledDown = (node: HTMLElement | null, limitNode: HTMLElement | null): boolean => {
    if (!node) return false;
    if (node.scrollTop > 0) return true;
    if (node === limitNode) return false;
    return isScrolledDown(node.parentElement, limitNode);
  };

  // Monitor background query refetch statuses
  useEffect(() => {
    if (isRefreshing && prevIsFetchingRef.current > 0 && isFetchingCount === 0) {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      setIsCompleted(true);
      setTimeout(() => {
        setIsRefreshing(false);
        setIsCompleted(false);
        setPullDistance(0);
      }, 800);
    }
    prevIsFetchingRef.current = isFetchingCount;
  }, [isFetchingCount, isRefreshing]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const container = containerRef.current;
    if (!container) return;
    
    // Only lock starting position if not already active
    if (!isRefreshing && !isCompleted) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
      hasDeterminedIntentRef.current = false;
      isScrolledDownRef.current = isScrolledDown(target, container);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing || isCompleted) return;
    if (startYRef.current === 0 || isScrolledDownRef.current) return;
    
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - startYRef.current;
    
    // Determine user gesture intent (pull vs scroll)
    if (!hasDeterminedIntentRef.current) {
      if (Math.abs(deltaY) > 5) {
        hasDeterminedIntentRef.current = true;
        
        const target = e.target as HTMLElement;
        const currentlyScrolledDown = isScrolledDown(target, container);
        if (deltaY > 5 && !currentlyScrolledDown) {
          isPullingRef.current = true;
        } else {
          isPullingRef.current = false;
        }
      }
      return;
    }
    
    if (isPullingRef.current) {
      if (deltaY > 0) {
        const distance = Math.min(deltaY * 0.45, 110);
        setPullDistance(distance);
        
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    }
  };

  const handleTouchEnd = async () => {
    const wasPulling = isPullingRef.current;
    isPullingRef.current = false;
    hasDeterminedIntentRef.current = false;
    isScrolledDownRef.current = false;
    startYRef.current = 0;
    
    if (!wasPulling) return;
    
    // Threshold is 75px
    if (pullDistance >= 75) {
      setIsRefreshing(true);
      setPullDistance(70); // Retain active position
      
      try {
        await queryClient.invalidateQueries();
        
        // Safety fallback timeout
        safetyTimeoutRef.current = setTimeout(() => {
          setIsRefreshing((current) => {
            if (current) {
              setIsCompleted(true);
              setTimeout(() => {
                setIsRefreshing(false);
                setIsCompleted(false);
                setPullDistance(0);
              }, 800);
            }
            return false;
          });
        }, 1500);
      } catch (err) {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const container = containerRef.current;
    if (!container) return;
    
    if (!isRefreshing && !isCompleted) {
      startYRef.current = e.clientY;
      isPullingRef.current = false;
      hasDeterminedIntentRef.current = false;
      isScrolledDownRef.current = isScrolledDown(target, container);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing || isCompleted) return;
    if (startYRef.current === 0 || isScrolledDownRef.current) return;
    
    const deltaY = e.clientY - startYRef.current;
    if (!hasDeterminedIntentRef.current) {
      if (Math.abs(deltaY) > 5) {
        hasDeterminedIntentRef.current = true;
        const target = e.target as HTMLElement;
        const currentlyScrolledDown = isScrolledDown(target, container);
        if (deltaY > 5 && !currentlyScrolledDown) {
          isPullingRef.current = true;
        } else {
          isPullingRef.current = false;
        }
      }
      return;
    }

    if (isPullingRef.current) {
      if (deltaY > 0) {
        const distance = Math.min(deltaY * 0.45, 110);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    }
  };

  const handleMouseUpOrLeave = () => {
    if (!isPullingRef.current) return;
    handleTouchEnd();
  };

  const progress = Math.min(pullDistance / 75, 1);
  const isTriggerReady = progress >= 1;

  // Circular progress properties
  const radius = 10;
  const stroke = 2.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto p-4 lg:p-8 relative scroll-smooth"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      {/* Premium Stationery-Themed Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 top-0 flex justify-center pointer-events-none z-50 overflow-hidden"
        style={{ height: '95px' }}
      >
        <AnimatePresence>
          {(pullDistance > 10 || isRefreshing || isCompleted) && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ 
                y: (isRefreshing || isCompleted) ? 16 : Math.max(10, pullDistance - 45), 
                opacity: 1,
                scale: isTriggerReady && !isRefreshing && !isCompleted ? 1.06 : 1,
              }}
              exit={{ y: -60, opacity: 0, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', damping: 15, stiffness: 240 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-xs font-medium tracking-wide shadow-xl backdrop-blur-md transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-zinc-900/80 border-zinc-700/60 text-zinc-100 shadow-black/40' 
                  : 'bg-white/80 border-cv-sage/20 text-zinc-700 shadow-zinc-200/50'
              }`}
            >
              {/* Spinner & Progress Circle Container */}
              <div className="relative w-7 h-7 flex items-center justify-center">
                {isCompleted ? (
                  // Success Checkmark state
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-cv-olive flex items-center justify-center text-white"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </motion.div>
                ) : (
                  <>
                    {/* SVG circular progress ring */}
                    <svg className="w-7 h-7 -rotate-90">
                      <circle
                        className={`${isDarkMode ? 'stroke-zinc-800' : 'stroke-zinc-100'}`}
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={14}
                        cy={14}
                      />
                      <motion.circle
                        className="stroke-cv-olive"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        r={normalizedRadius}
                        cx={14}
                        cy={14}
                        animate={isRefreshing ? { rotate: 360 } : {}}
                        transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
                      />
                    </svg>
                    
                    {/* Central Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {isRefreshing ? (
                          <motion.div
                            key="refreshing-icon"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            <Paperclip className="w-3 h-3 text-cv-olive" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="pulling-icon"
                            initial={{ scale: 0.8 }}
                            animate={{ 
                              scale: 1,
                              rotate: isTriggerReady ? 180 : 0
                            }}
                            exit={{ scale: 0.8 }}
                          >
                            <ArrowDown className={`w-3.5 h-3.5 ${isTriggerReady ? 'text-cv-olive' : 'text-zinc-400'}`} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>

              {/* Label Status */}
              <div className="flex flex-col select-none pr-1">
                <span className="font-bold text-[11px] tracking-wider uppercase font-sans">
                  {isCompleted ? 'Synced' : (isRefreshing ? 'Syncing Vault' : (isTriggerReady ? 'Release to Sync' : 'Pull to Sync'))}
                </span>
                <span className={`text-[9px] font-normal leading-none ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {isCompleted ? 'All clips updated' : (isRefreshing ? 'Checking for clips...' : 'ClipVault Monitor')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {children}
    </div>
  );
}
