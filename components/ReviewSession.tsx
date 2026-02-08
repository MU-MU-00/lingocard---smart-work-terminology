import React, { useState, useEffect } from 'react';
import { TermData } from '../types';
import { Check, X, Volume2 } from 'lucide-react';
import { playPronunciation } from '../services/geminiService';

interface ReviewSessionProps {
  terms: TermData[];
  onComplete: (results: { termId: string; success: boolean }[]) => void;
  onExit: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ terms, onComplete, onExit }) => {
  const [queue, setQueue] = useState<TermData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionResults, setSessionResults] = useState<{ termId: string; success: boolean }[]>([]);
  const [failedCountMap, setFailedCountMap] = useState<Record<string, number>>({});

  useEffect(() => {
    // Shuffle terms for the session
    const shuffled = [...terms].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
  }, [terms]);

  useEffect(() => {
    if (queue.length > 0 && currentIndex < queue.length) {
      const currentTerm = queue[currentIndex];
      // Create options: Correct Chinese def + 2 Chinese distractors
      const allOptions = [
        currentTerm.definitionCn,
        ...currentTerm.wrongDefinitions.slice(0, 2)
      ];
      // Shuffle options
      setOptions(allOptions.sort(() => Math.random() - 0.5));
      setSelectedOption(null);
      setIsCorrect(null);
    } else if (queue.length > 0 && currentIndex >= queue.length) {
        // Finished
        onComplete(sessionResults);
    }
  }, [currentIndex, queue]);

  const handleSelect = (option: string) => {
    if (selectedOption) return; // Prevent double click
    
    const currentTerm = queue[currentIndex];
    setSelectedOption(option);
    
    const correct = option === currentTerm.definitionCn;
    setIsCorrect(correct);

    // Record result logic
    if (correct) {
      setSessionResults(prev => [...prev, { termId: currentTerm.id, success: true }]);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1500);
    } else {
      // Failed
      const fails = (failedCountMap[currentTerm.id] || 0) + 1;
      setFailedCountMap(prev => ({ ...prev, [currentTerm.id]: fails }));

      if (fails < 3) {
        // Re-queue at the end for this session if failed < 3 times
        setQueue(prev => [...prev, currentTerm]);
      } else {
         // Mark as totally failed for today
         setSessionResults(prev => [...prev, { termId: currentTerm.id, success: false }]);
      }

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 2000);
    }
  };

  if (queue.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <h2 className="text-xl font-bold mb-4">No cards to review!</h2>
            <button type="button" onClick={onExit} className="touch-target min-h-[44px] px-6 py-3 bg-primary text-white rounded-full active:scale-95">Go Back</button>
        </div>
    )
  }

  if (currentIndex >= queue.length) {
      return (
          <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-500">Saving progress...</p>
          </div>
      )
  }

  const currentTerm = queue[currentIndex];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-100 w-full">
        <div 
          className="h-full bg-primary transition-all duration-300" 
          style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
        ></div>
      </div>

      <div className="flex justify-between items-center p-4">
        <button type="button" onClick={onExit} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full">
            <X size={24} />
        </button>
        <div className="text-sm font-bold text-gray-400">
            {currentIndex + 1} / {queue.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 space-y-8">
        
        {/* The Card/Question */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-gray-800">{currentTerm.term}</h2>
          <div className="flex justify-center items-center space-x-2 text-gray-500">
             <span>{currentTerm.phonetic}</span>
             <button type="button" onClick={() => playPronunciation(currentTerm.term)} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center text-primary rounded-full active:bg-primary/10">
                <Volume2 size={20} />
             </button>
          </div>
        </div>

        {/* Options */}
        <div className="w-full space-y-3 max-w-md">
            {options.map((opt, idx) => {
                let btnClass = "w-full p-4 rounded-xl text-left border-2 transition-all font-medium text-sm leading-relaxed ";
                if (selectedOption) {
                    if (opt === currentTerm.definitionCn) {
                        btnClass += "border-green-500 bg-green-50 text-green-700";
                    } else if (opt === selectedOption) {
                        btnClass += "border-red-500 bg-red-50 text-red-700";
                    } else {
                        btnClass += "border-gray-100 opacity-50";
                    }
                } else {
                    btnClass += "border-gray-100 hover:border-primary hover:bg-primary/5 text-gray-700 shadow-sm";
                }

                return (
                    <button 
                        type="button"
                        key={idx}
                        onClick={() => handleSelect(opt)}
                        disabled={!!selectedOption}
                        className={btnClass + " touch-target min-h-[48px] py-4 active:scale-[0.99]"}
                    >
                        {opt}
                    </button>
                )
            })}
        </div>

        {/* Feedback Area */}
        <div className="h-12 flex items-center justify-center">
             {selectedOption && isCorrect === true && (
                 <div className="flex items-center text-green-600 font-bold animate-bounce">
                     <Check size={24} className="mr-2" /> Correct!
                 </div>
             )}
             {selectedOption && isCorrect === false && (
                 <div className="flex items-center text-red-500 font-bold">
                     <X size={24} className="mr-2" /> Incorrect
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default ReviewSession;