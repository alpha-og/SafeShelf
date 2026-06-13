import { useState, useEffect, useCallback } from 'react'
import { motion, useAnimation, type PanInfo, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShoppingCart, Check, AlertTriangle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/providers/CartProvider'
import type { ProductInfo } from '../services/detection'

import { AuroraBackground } from '@/components/reactbits/AuroraBackground'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { TiltCard } from '@/components/reactbits/TiltCard'
import { GradientText } from '@/components/reactbits/GradientText'
import { AnimatedChip } from '@/components/reactbits/AnimatedChip'
import { ShinyButton } from '@/components/reactbits/ShinyButton'

interface ProductSheetProps {
  isProcessing: boolean
  result: ProductInfo | null
  error: string | null
  onDismiss: () => void
  dismissRef?: React.MutableRefObject<(() => void) | null>
}

const OFFRANGE = typeof window !== 'undefined' ? window.innerHeight : 700

function IngredientsAccordion({ ingredients }: { ingredients: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-md">
      <button 
        className="w-full px-4 py-3 flex items-center justify-between font-semibold text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Ingredients</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-foreground/80 leading-relaxed">
              {ingredients.join(', ')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProductSheet({ isProcessing, result, error, onDismiss, dismissRef }: ProductSheetProps) {
  const [peekY] = useState(() => (typeof window !== 'undefined' ? window.innerHeight * 0.1 : 100))
  const controls = useAnimation()
  const [isFull, setIsFull] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const { addToCart } = useCart()

  // Make the sheet open fully by default if we have a result for the premium feel
  useEffect(() => {
    if (result || isProcessing || error) {
      setIsFull(true)
      controls.start({
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      })
    }
  }, [result, isProcessing, error, controls])

  const snapTo = useCallback((y: number) => {
    controls.start({
      y,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    })
  }, [controls])

  const handleDismiss = useCallback(async () => {
    await controls.start({
      y: OFFRANGE,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    })
    onDismiss()
  }, [controls, onDismiss])

  useEffect(() => {
    if (dismissRef) {
      dismissRef.current = handleDismiss
    }
  }, [dismissRef, handleDismiss])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info

    if (isFull) {
      if (offset.y > 150 || (offset.y > 50 && velocity.y > 800)) {
        handleDismiss()
        return
      }
      snapTo(0)
      return
    }

    if (offset.y > 100 || (offset.y > 30 && velocity.y > 500)) {
      handleDismiss()
      return
    }

    const shouldSnapToFull = offset.y < -50 || velocity.y < -500
    setIsFull(shouldSnapToFull)
    snapTo(shouldSnapToFull ? 0 : peekY)
  }

  return (
    <>
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
        style={{ height: '100dvh' }}
        initial={{ y: OFFRANGE }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        <AuroraBackground className="flex-1 rounded-t-3xl">
          <div className="flex justify-center pt-3 pb-2 relative z-20">
            <div className="w-12 h-1.5 rounded-full bg-white/30 backdrop-blur-md" />
          </div>

          <div className="flex items-center px-4 pb-3 relative z-20">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
              onClick={handleDismiss}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 px-4 pb-32 overflow-y-auto relative z-20 no-scrollbar">
            {isProcessing ? (
              <div className="space-y-4 pt-10">
                <div className="w-48 h-48 mx-auto rounded-3xl bg-white/5 animate-pulse" />
                <div className="h-8 bg-white/5 rounded-lg w-3/4 mx-auto animate-pulse" />
                <div className="h-4 bg-white/5 rounded w-1/2 mx-auto animate-pulse" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4 opacity-80" />
                <p className="text-destructive font-bold text-xl mb-2">Oops!</p>
                <p className="text-white/60 text-sm max-w-[250px]">{error}</p>
              </div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center space-y-6 pt-4">
                  <TiltCard className="w-56 h-56 mx-auto">
                    {result.imageUrl ? (
                      <div className="w-full h-full rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                        <img src={result.imageUrl} alt={result.productName || 'Product'} className="w-full h-full object-contain p-4" />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm">
                        <span className="text-white/40 text-sm font-medium">No Image</span>
                      </div>
                    )}
                  </TiltCard>
                  
                  <div className="space-y-2">
                    <GradientText className="text-3xl font-extrabold tracking-tight">
                      {result.productName || 'Unknown Product'}
                    </GradientText>
                    {result.brand && (
                      <p className="text-white/60 text-lg font-medium">{result.brand}</p>
                    )}
                  </div>
                </div>

                {/* Categories */}
                {result.categories && result.categories.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider pl-1">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.categories.map((c, i) => (
                        <AnimatedChip key={i} index={i}>
                          {c}
                        </AnimatedChip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergens */}
                {result.allergens && result.allergens.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.15)" className="p-5 border-destructive/30">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <h4 className="text-sm font-bold text-destructive uppercase tracking-wider">Allergens Warning</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.allergens.map((a, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-xl bg-destructive/20 text-destructive-foreground text-xs font-bold border border-destructive/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            {a}
                          </span>
                        ))}
                      </div>
                    </SpotlightCard>
                  </motion.div>
                )}

                {/* Ingredients Accordion */}
                {result.ingredients && result.ingredients.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <IngredientsAccordion ingredients={result.ingredients} />
                  </motion.div>
                )}
                
                {/* Meta details */}
                {result.barcode && (
                  <div className="pt-4 flex justify-center">
                    <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
                      Barcode: {result.barcode}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
               <div className="flex flex-col items-center justify-center py-20 text-center text-white/40">
                <p className="text-sm">No product information available.</p>
               </div>
            )}
          </div>
          
          {/* Sticky CTA Bottom Bar */}
          {result && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 pt-12">
              <ShinyButton 
                className="w-full"
                onClick={() => {
                  addToCart(result)
                  setIsAdded(true)
                  setTimeout(() => setIsAdded(false), 2000)
                }}
                disabled={!result.barcode || isAdded}
              >
                {isAdded ? (
                  <>
                    <Check className="h-6 w-6 text-green-400" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-6 w-6" />
                    Add to Cart
                  </>
                )}
              </ShinyButton>
            </div>
          )}
        </AuroraBackground>
      </motion.div>
    </>
  )
}
