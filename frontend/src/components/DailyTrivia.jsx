import React, { useState, useEffect } from 'react';
import { HelpCircle, Award, CheckCircle, XCircle, ArrowRight, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { playClickSound, playGoalChime, triggerHapticFeedback } from '../utils/soundEffects';

const TRIVIA_QUESTIONS = [
  {
    id: 'q1',
    question: '¿Qué país es el máximo ganador en la historia de las Copas Mundiales?',
    options: ['Italia', 'Alemania', 'Brasil', 'Argentina'],
    answer: 'Brasil',
    explanation: 'Brasil ha ganado la Copa del Mundo en 5 ocasiones: 1958, 1962, 1970, 1994 y 2002.'
  },
  {
    id: 'q2',
    question: '¿Quién es el máximo goleador histórico de los mundiales masculinos?',
    options: ['Pelé', 'Miroslav Klose', 'Ronaldo Nazário', 'Lionel Messi'],
    answer: 'Miroslav Klose',
    explanation: 'El delantero alemán Miroslav Klose anotó un total de 16 goles a lo largo de 4 Copas del Mundo (2002-2014).'
  },
  {
    id: 'q3',
    question: '¿En qué Copa del Mundo se utilizó el Árbitro de Asistente de Video (VAR) por primera vez?',
    options: ['Brasil 2014', 'Rusia 2018', 'Qatar 2022', 'Sudáfrica 2010'],
    answer: 'Rusia 2018',
    explanation: 'El sistema VAR fue implementado de manera oficial por la FIFA por primera vez en el mundial de Rusia 2018.'
  },
  {
    id: 'q4',
    question: '¿Qué selección ha disputado más finales de la Copa del Mundo sin lograr ganar el título?',
    options: ['Suecia', 'Hungría', 'Croacia', 'Países Bajos'],
    answer: 'Países Bajos',
    explanation: 'Países Bajos llegó a la final en tres ocasiones (1974, 1978 y 2010), perdiendo las tres veces.'
  },
  {
    id: 'q5',
    question: '¿Quién anotó el famoso gol denominado "La Mano de Dios" en el mundial de 1986?',
    options: ['Diego Maradona', 'Pelé', 'Mario Kempes', 'Zico'],
    answer: 'Diego Maradona',
    explanation: 'Diego Armando Maradona anotó este legendario e icónico gol con la mano izquierda contra Inglaterra en los cuartos de final de México 1986.'
  }
];

export default function DailyTrivia({ user, isDemo, onUpdateProfile, showToast }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [history, setHistory] = useState({});
  const [score, setScore] = useState(0);

  const userKey = user ? user.email : 'guest';

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`trivia_history_${userKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
        // Calculate current score
        let count = 0;
        Object.values(parsed).forEach(attempt => {
          if (attempt.correct) count += 1;
        });
        setScore(count);
      }
    } catch (e) {
      console.warn("Could not read trivia history:", e);
    }
  }, [userKey]);

  const activeQuestion = TRIVIA_QUESTIONS[currentIdx];
  const totalQuestions = TRIVIA_QUESTIONS.length;
  const isFinished = currentIdx >= totalQuestions;

  const currentAttempt = activeQuestion ? history[activeQuestion.id] : null;

  const handleOptionSelect = (option) => {
    if (isSubmitted || currentAttempt) return;
    playClickSound();
    triggerHapticFeedback(10);
    setSelectedOption(option);
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitted || !selectedOption || currentAttempt) return;
    setIsSubmitted(true);

    const isCorrect = selectedOption === activeQuestion.answer;
    
    if (isCorrect) {
      playGoalChime();
      triggerHapticFeedback(60);
      setScore(prev => prev + 1);

      // In Demo Mode, directly reward +1 point to their actual leaderboard score!
      if (isDemo && onUpdateProfile) {
        try {
          const updatedUser = {
            ...user,
            points: (user.points || 0) + 1
          };
          // Save in LocalStorage demo_users
          const demoUsersStr = localStorage.getItem('demo_users');
          if (demoUsersStr) {
            const demoUsers = JSON.parse(demoUsersStr);
            const idx = demoUsers.findIndex(u => u.email === user.email);
            if (idx !== -1) {
              demoUsers[idx].points = updatedUser.points;
              localStorage.setItem('demo_users', JSON.stringify(demoUsers));
            }
          }
          await onUpdateProfile(updatedUser);
          if (showToast) showToast('¡Respuesta correcta! +1 Punto en el Ranking 🎉');
        } catch (e) {
          console.warn("Failed to add points:", e);
        }
      } else {
        if (showToast) showToast('¡Excelente! Respuesta correcta 🧠✨');
      }
    } else {
      triggerHapticFeedback(100);
      if (showToast) showToast('Incorrecto. ¡Sigue aprendiendo! ⚽');
    }

    // Save attempt in state and localStorage
    const newAttempt = {
      selected: selectedOption,
      correct: isCorrect,
      timestamp: new Date().toISOString()
    };

    const newHistory = {
      ...history,
      [activeQuestion.id]: newAttempt
    };

    setHistory(newHistory);
    localStorage.setItem(`trivia_history_${userKey}`, JSON.stringify(newHistory));
  };

  const handleNext = () => {
    playClickSound();
    triggerHapticFeedback(15);
    setCurrentIdx(prev => prev + 1);
    setSelectedOption(null);
    setIsSubmitted(false);
  };

  const handleReset = () => {
    playClickSound();
    triggerHapticFeedback(25);
    localStorage.removeItem(`trivia_history_${userKey}`);
    setHistory({});
    setScore(0);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsSubmitted(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Trivia Header Banner */}
      <div className="glass-pitch-glow border-gold-glow rounded-3xl p-6 relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="absolute right-0 top-0 w-36 h-36 bg-brand-gold/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="p-3.5 bg-brand-gold/15 rounded-2xl border border-brand-gold/25 text-brand-gold animate-bounce">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 space-y-0.5">
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
            <span>Trivia Mundialista</span>
            <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400 font-medium">Demuestra tus conocimientos históricos y gana medallas locales en el perfil.</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 py-1.5 px-4 rounded-2xl shrink-0 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-brand-gold fill-brand-gold/15" />
          <span className="text-xs font-black text-white tabular-nums">{score} / {totalQuestions} Aciertos</span>
        </div>
      </div>

      {!isFinished ? (
        <div className="glass rounded-3xl p-6 border border-slate-800/80 space-y-6 relative overflow-hidden">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Pregunta {currentIdx + 1} de {totalQuestions}</span>
              <span className="text-brand-gold">Mundiales FIFA</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-900 overflow-hidden">
              <div 
                className="bg-brand-gold h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Text */}
          <div className="py-2">
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {activeQuestion.question}
            </h3>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {activeQuestion.options.map((option) => {
              const attempt = currentAttempt || (isSubmitted ? { selected: selectedOption, correct: selectedOption === activeQuestion.answer } : null);
              const isSelected = selectedOption === option;
              const isCorrectAnswer = option === activeQuestion.answer;
              
              let btnStyle = 'border-slate-850 hover:border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 text-slate-350';
              let iconElement = null;

              if (attempt) {
                if (isCorrectAnswer) {
                  btnStyle = 'border-emerald-500/30 bg-emerald-500/10 text-emerald-450';
                  iconElement = <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />;
                } else if (attempt.selected === option) {
                  btnStyle = 'border-red-500/30 bg-red-500/10 text-red-400';
                  iconElement = <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />;
                } else {
                  btnStyle = 'border-slate-900 bg-slate-950/10 text-slate-600 opacity-60 pointer-events-none';
                }
              } else if (isSelected) {
                btnStyle = 'border-brand-gold bg-brand-gold/5 text-white';
              }

              return (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  disabled={!!attempt}
                  className={`p-4 rounded-2xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between gap-3 ${btnStyle}`}
                >
                  <span>{option}</span>
                  {iconElement}
                </button>
              );
            })}
          </div>

          {/* Submit/Next Actions */}
          <div className="pt-2 flex justify-between items-center gap-4">
            <div>
              {isDemo && !currentAttempt && !isSubmitted && (
                <span className="text-[9px] font-black uppercase text-emerald-450 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider">
                  Bono: +1 Pto
                </span>
              )}
            </div>

            {currentAttempt || isSubmitted ? (
              <button
                onClick={handleNext}
                className="py-2.5 px-5 rounded-xl bg-brand-gold text-brand-dark hover:bg-amber-400 text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-brand-gold/15 shrink-0"
              >
                <span>{currentIdx === totalQuestions - 1 ? 'Ver Resumen' : 'Siguiente'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedOption}
                className="py-2.5 px-5 rounded-xl bg-brand-purple text-white hover:bg-blue-600 text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                <span>Enviar Respuesta</span>
              </button>
            )}
          </div>

          {/* Explanation Box */}
          {(currentAttempt || isSubmitted) && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-900 text-xs space-y-1 animate-[fadeIn_0.2s_ease-out]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">¿Sabías qué?</span>
              <p className="text-slate-350 leading-relaxed font-medium">{activeQuestion.explanation}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-3xl p-8 border border-slate-800/80 text-center space-y-6 animate-[fadeIn_0.3s_ease-out] relative overflow-hidden">
          <div className="absolute right-10 top-10 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-md mx-auto space-y-4">
            <Trophy className="w-16 h-16 text-brand-gold fill-brand-gold/15 mx-auto animate-bounce" />
            <h3 className="text-xl font-black text-white">¡Trivia Completada! 🏁</h3>
            <p className="text-xs text-slate-400 font-medium">
              Has respondido todas las preguntas de la trivia. Lograste un total de <span className="font-extrabold text-brand-gold text-sm">{score} respuestas correctas</span> de {totalQuestions} posibles.
            </p>
          </div>

          <div className="py-2 max-w-sm mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900 text-center">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Efectividad</span>
                <span className="text-2xl font-black text-white">{Math.round((score / totalQuestions) * 100)}%</span>
              </div>
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-900 text-center">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Logro</span>
                <span className="text-xs font-black text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full border border-brand-gold/20 mt-1 inline-block uppercase tracking-wider">
                  {score === totalQuestions ? 'Genio Total' : (score >= 3 ? 'Experto' : 'Principiante')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleReset}
              className="py-2.5 px-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reiniciar Trivia</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
