import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils } from 'lucide-react';
import SensoryButton from '@/components/SensoryButton';
import { playPop } from '@/lib/sensoryAudio';

// A playful lunch-time break: tap each food to "eat" it. When the tray is
// empty, the kid gets a "Yum! All done" celebration.
const FOODS = [
  { id: 'sandwich', emoji: '🥪', label: 'Sandwich' },
  { id: 'apple', emoji: '🍎', label: 'Apple' },
  { id: 'carrot', emoji: '🥕', label: 'Carrot' },
  { id: 'milk', emoji: '🥛', label: 'Milk' },
  { id: 'banana', emoji: '🍌', label: 'Banana' },
  { id: 'cracker', emoji: '🍪', label: 'Cracker' },
];

export default function LunchActivity({ kidName }) {
  const [eaten, setEaten] = useState([]);

  const eat = (id) => {
    if (eaten.includes(id)) return;
    playPop();
    setEaten((e) => [...e, id]);
  };

  const allDone = eaten.length === FOODS.length;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Utensils className="h-5 w-5 text-[#F2A03D]" />
        <h2 className="text-lg font-bold text-black/80">Lunch time!</h2>
      </div>
      <p className="mb-4 text-sm font-semibold text-black/50">
        Tap each food to eat it, {kidName || 'friend'}! 🍽️
      </p>

      <div className="grid grid-cols-3 gap-3">
        {FOODS.map((f) => {
          const isEaten = eaten.includes(f.id);
          return (
            <motion.button
              key={f.id}
              type="button"
              disabled={isEaten}
              onClick={() => eat(f.id)}
              whileTap={{ scale: 0.9 }}
              whileHover={!isEaten ? { scale: 1.05 } : {}}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition ${
                isEaten
                  ? 'border-green-200 bg-green-50'
                  : 'border-black/10 bg-[#FFF7E6] active:scale-95'
              }`}
            >
              <AnimatePresence>
                {!isEaten ? (
                  <motion.span
                    key="food"
                    className="text-4xl"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 12 }}
                  >
                    {f.emoji}
                  </motion.span>
                ) : (
                  <motion.span
                    key="done"
                    className="text-3xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 10 }}
                  >
                    ✅
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="mt-1 text-xs font-bold text-black/50">{f.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4">
        <AnimatePresence>
          {allDone ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-green-100 px-4 py-3 text-center font-bold text-green-700"
            >
              Yum! All done — great lunch! 🎉
            </motion.div>
          ) : (
            <p className="text-center text-sm font-semibold text-black/40">
              {eaten.length} of {FOODS.length} eaten
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}