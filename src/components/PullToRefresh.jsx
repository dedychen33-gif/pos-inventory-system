import { useState, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

export default function PullToRefresh({ children, onRefresh }) {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const THRESHOLD = 80 // pixels to pull before triggering refresh

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault()
      // Apply resistance to make it feel natural
      const resistance = 0.4
      setPullDistance(Math.min(diff * resistance, THRESHOLD * 1.5))
    }
  }, [isPulling, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    if (pullDistance >= THRESHOLD && onRefresh) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh error:', error)
      }
      setIsRefreshing(false)
    }

    setIsPulling(false)
    setPullDistance(0)
  }, [isPulling, pullDistance, onRefresh])

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ 
          height: isRefreshing ? 50 : pullDistance,
          opacity: pullDistance > 20 || isRefreshing ? 1 : 0
        }}
      >
        <div className={`flex items-center gap-2 text-blue-600 ${isRefreshing ? 'animate-pulse' : ''}`}>
          <RefreshCw 
            size={20} 
            className={isRefreshing ? 'animate-spin' : ''}
            style={{ 
              transform: `rotate(${pullDistance * 2}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.1s'
            }}
          />
          <span className="text-sm font-medium">
            {isRefreshing 
              ? 'Memuat...' 
              : pullDistance >= THRESHOLD 
                ? 'Lepaskan untuk refresh' 
                : 'Tarik untuk refresh'}
          </span>
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  )
}
