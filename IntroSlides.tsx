import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sound } from './utils/sound';

interface IntroSlide {
  image: string;
  text: string;
}

interface IntroSlidesProps {
  onComplete: () => void;
  onSkip: () => void;
}

// מערך של 5 תמונות אינטרו עם טקסטים
const INTRO_SLIDES: IntroSlide[] = [
  {
    image: '/intro/slide1.png',
    text: 'צי צללים כיסה את השמש והותיר את העולם בעלטה.'
  },
  {
    image: '/intro/slide2.png',
    text: 'במעמקים התגלתה התקווה: תדר קולי שחודר את שריון האויב.'
  },
  {
    image: '/intro/slide3.png',
    text: 'הכלי שלך הוא מטוס קרב החמוש במערכות שידור קטלניות.'
  },
  {
    image: '/intro/slide4.png',
    text: 'המשימה: זהה את המילה באנגלית ופגע בתרגום המדויק.'
  },
  {
    image: '/intro/slide5.png',
    text: 'צא לקרב! שחרר את גל ההדף והביס את ספינת האם.'
  }
];

const SLIDE_DURATION = 5000; // 5 שניות לכל תמונה
const FADE_DURATION = 500; // 500ms לאנימציית fade

export const IntroSlides: React.FC<IntroSlidesProps> = ({ onComplete, onSkip }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleComplete = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    Sound.stopMusic(); // עצירת מוזיקת אינטרו
    onComplete();
  }, [onComplete]);

  // Preloading של כל התמונות
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = INTRO_SLIDES.length;
    imagesRef.current = [];

    const loadImage = (src: string, index: number) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          imagesRef.current[index] = img;
          setLoadingProgress(Math.round((loadedCount / totalImages) * 100));
          if (loadedCount === totalImages) {
            setImagesLoaded(true);
          }
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load intro image: ${src}`);
          loadedCount++;
          setLoadingProgress(Math.round((loadedCount / totalImages) * 100));
          if (loadedCount === totalImages) {
            setImagesLoaded(true);
          }
          resolve(); // המשך גם אם תמונה נכשלה
        };
        img.src = src;
      });
    };

    // טעינת כל התמונות במקביל
    Promise.all(INTRO_SLIDES.map((slide, index) => loadImage(slide.image, index)))
      .catch(err => {
        console.error('Error loading intro images:', err);
        setImagesLoaded(true); // המשך גם אם יש שגיאות
      });
  }, []);

  // מעבר אוטומטי בין תמונות
  useEffect(() => {
    if (!imagesLoaded) return;

    // התחלת מוזיקת אינטרו (רק בפעם הראשונה)
    if (currentSlide === 0) {
      Sound.playIntroMusic();
    }

    const startSlide = () => {
      setFadeState('in');
      
      timerRef.current = setTimeout(() => {
        // Fade out לפני מעבר לתמונה הבאה
        setFadeState('out');
        
        fadeTimerRef.current = setTimeout(() => {
          if (currentSlide < INTRO_SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
          } else {
            // סיום האינטרו
            handleComplete();
          }
        }, FADE_DURATION);
      }, SLIDE_DURATION - FADE_DURATION);
    };

    startSlide();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [currentSlide, imagesLoaded, handleComplete]);

  const handleSkip = useCallback(() => {
    Sound.play('ui_click');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    Sound.stopMusic(); // עצירת מוזיקת אינטרו
    onSkip();
  }, [onSkip]);

  // מסך טעינה
  if (!imagesLoaded) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[200]">
        <div className="text-center">
          <div className="rk-neon-title text-4xl md:text-6xl mb-8 font-aramaic">
            טוען...
          </div>
          <div className="w-64 md:w-96 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="mt-4 text-slate-400 text-sm md:text-lg">
            {loadingProgress}%
          </div>
        </div>
      </div>
    );
  }

  const currentSlideData = INTRO_SLIDES[currentSlide];

  return (
    <div 
      className="fixed inset-0 z-[200] overflow-hidden bg-black"
    >
      {/* תמונה fullscreen - ממלאת את כל המסך */}
      <img
        src={currentSlideData.image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{
          opacity: fadeState === 'in' ? 1 : 0
        }}
        draggable={false}
        onError={(e) => {
          // Fallback אם התמונה לא נטענת - הצג רקע כחול
          console.warn('Failed to load intro image:', currentSlideData.image);
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      
      {/* כפתור דלג - למעלה בצד - קרוב יותר למרכז */}
      <button
        onClick={handleSkip}
        className="absolute top-4 md:top-6 right-4 md:right-8 rk-btn rk-btn-muted px-4 py-2 md:px-6 md:py-3 text-sm md:text-lg font-bold z-20"
        aria-label="דלג על האינטרו"
      >
        דלג
      </button>

      {/* טקסט למטה - ללא נקודות או אינדיקטורים */}
      <div 
        className="absolute bottom-0 left-0 right-0 transition-opacity duration-500 z-10"
        style={{ opacity: fadeState === 'in' ? 1 : 0 }}
      >
        <div className="bg-black/90 backdrop-blur-sm border-t border-slate-700/50 p-6 md:p-8 shadow-2xl">
          <h2 className="font-aramaic text-xl md:text-3xl lg:text-4xl text-white font-bold leading-relaxed text-center max-w-5xl mx-auto">
            {currentSlideData.text}
          </h2>
        </div>
      </div>
    </div>
  );
};
