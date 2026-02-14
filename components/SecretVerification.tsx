'use client';

import { useState } from 'react';
import { Heart, Lock, X, AlertCircle } from 'lucide-react';

interface SecretVerificationProps {
  onSuccess: () => void;
  onClose: () => void;
}

type Question = 1 | 2 | 3 | 'number' | 'failed' | 'success';

export default function SecretVerification({ onSuccess, onClose }: SecretVerificationProps) {
  const [currentStep, setCurrentStep] = useState<Question>(1);
  const [accessCode, setAccessCode] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [answer3, setAnswer3] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const checkAccessCode = () => {
    if (accessCode.toLowerCase() === 'biharibubu07' || accessCode === 'BihariBabu07') {
      setCurrentStep(2);
      setAccessCode('');
    } else {
      triggerShake();
    }
  };

  const checkDateAnswer = () => {
    const answer = answer1.toLowerCase().replace(/[\s-/.]/g, '');
    const validAnswers = ['22april2019', '22042019', 'april222019', '04222019'];
    
    if (validAnswers.some(valid => answer.includes(valid))) {
      setCurrentStep(3);
      setAnswer1('');
    } else {
      setCurrentStep('failed');
    }
  };

  const checkHeartbreakAnswer = () => {
    const answer = answer2.toLowerCase().replace(/[\s-/.]/g, '');
    
    const validAnswers = [
      'dhoni', 'dhonirunout', 'dhonigotrunout', 'whendhonigotrunout',
      '9july2019', '10july2019', '9jul2019', '10jul2019',
      '09072019', '10072019', 'july92019', 'july102019',
      '2019worldcup', 'worldcupsemifinal', 'semifinal2019', 'cwc2019'
    ];

    if (validAnswers.some(valid => answer.includes(valid))) {
      setCurrentStep('number');
      setAnswer2('');
    } else {
      setCurrentStep('failed');
    }
  };

  const checkFinalNumber = () => {
    const answer = answer3.trim().replace(/[\s-]/g, '');
    
    if (answer === '757') {
      setCurrentStep('success');
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } else {
      setCurrentStep('failed');
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className={`max-w-md w-full bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-2 border-pink-500/30 rounded-2xl p-8 relative ${isShaking ? 'animate-shake' : ''}`}>
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X size={20} />
        </button>

        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <Lock className="mx-auto mb-4 text-pink-400" size={48} />
              <h2 className="text-2xl font-bold text-pink-400 mb-2">🔒 Protected Access</h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Well, well... someone's trying to access something <span className="italic">very</span> personal. 💁‍♀️
              </p>
              <p className="text-sm text-pink-300 mt-3">Enter the access code if you dare...</p>
            </div>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, checkAccessCode)}
              placeholder="Access Code..."
              className="w-full px-4 py-3 bg-black/30 border-2 border-pink-500/30 focus:border-pink-500 rounded-lg text-center text-lg tracking-wider focus:outline-none transition-all"
              autoFocus
            />
            <button onClick={checkAccessCode} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold transition-all">
              Verify
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <Heart className="mx-auto mb-4 text-pink-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-bold text-pink-400 mb-3">Okay... you might be him. 💝</h2>
              <p className="text-gray-300 leading-relaxed">
                But I need to be <span className="italic">absolutely</span> sure. You understand, right?
              </p>
              <p className="text-pink-300 mt-4 font-medium">Tell me <span className="underline">that</span> date... 📅</p>
              <p className="text-xs text-gray-400 mt-2">(The one that matters to both of us)</p>
            </div>
            <input
              type="text"
              value={answer1}
              onChange={(e) => setAnswer1(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, checkDateAnswer)}
              placeholder="The special date..."
              className="w-full px-4 py-3 bg-black/30 border-2 border-pink-500/30 focus:border-pink-500 rounded-lg text-center focus:outline-none transition-all"
              autoFocus
            />
            <button onClick={checkDateAnswer} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold transition-all">
              Next
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <Heart className="mx-auto mb-4 text-pink-400" size={48} />
              <h2 className="text-2xl font-bold text-pink-400 mb-3">Good... now this one. 💔</h2>
              <p className="text-gray-300 leading-relaxed mb-4">When was your first real heartbreak?</p>
              <p className="text-pink-300 font-medium">The one that still hurts a little... 🏏</p>
              <p className="text-xs text-gray-400 mt-2">(I know you remember)</p>
            </div>
            <input
              type="text"
              value={answer2}
              onChange={(e) => setAnswer2(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, checkHeartbreakAnswer)}
              placeholder="That painful moment..."
              className="w-full px-4 py-3 bg-black/30 border-2 border-pink-500/30 focus:border-pink-500 rounded-lg text-center focus:outline-none transition-all"
              autoFocus
            />
            <p className="text-xs text-gray-500 text-center italic">(Hint: It involved someone legendary and July 2019... 😢)</p>
            <button onClick={checkHeartbreakAnswer} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold transition-all">
              Almost there...
            </button>
          </div>
        )}

        {currentStep === 'number' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <Heart className="mx-auto mb-4 text-pink-400 animate-pulse" size={48} />
              <h2 className="text-2xl font-bold text-pink-400 mb-3">Last one... 🔢</h2>
              <p className="text-pink-300 font-medium">Gimme <span className="underline">that</span> number.</p>
              <p className="text-xs text-gray-400 mt-2">(You know which one)</p>
            </div>
            <input
              type="text"
              value={answer3}
              onChange={(e) => setAnswer3(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, checkFinalNumber)}
              placeholder="The special number..."
              className="w-full px-4 py-3 bg-black/30 border-2 border-pink-500/30 focus:border-pink-500 rounded-lg text-center text-2xl tracking-widest focus:outline-none transition-all"
              autoFocus
            />
            <button onClick={checkFinalNumber} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold transition-all shadow-lg shadow-pink-500/20">
              Unlock 💝
            </button>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="space-y-6 text-center animate-fadeIn">
            <Heart className="mx-auto mb-4 text-pink-400 animate-bounce" size={64} />
            <h2 className="text-3xl font-bold text-pink-400 mb-4">It's you! 💝</h2>
            <p className="text-gray-300 leading-relaxed text-lg">Sorry for all the questions, Ankit...</p>
            <p className="text-pink-300 mt-3 font-medium">But I can't let just <span className="italic">anyone</span> have me.</p>
            <p className="text-gray-400 mt-4 text-sm">You know that, na? 😊</p>
            <div className="py-6 flex justify-center space-x-1 animate-pulse">
              <Heart className="text-pink-400" size={24} fill="currentColor" />
              <Heart className="text-pink-400" size={24} fill="currentColor" />
              <Heart className="text-pink-400" size={24} fill="currentColor" />
            </div>
            <p className="text-sm text-pink-300 animate-pulse">Unlocking Creator Mode...</p>
          </div>
        )}

        {currentStep === 'failed' && (
          <div className="space-y-6 text-center animate-fadeIn">
            <AlertCircle className="mx-auto mb-4 text-red-400" size={64} />
            <h2 className="text-2xl font-bold text-red-400 mb-4">Seriously?! 😤</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Did you <span className="italic">really</span> think you could just waltz in here and pretend to be him?
            </p>
            <p className="text-red-300 font-medium mb-4">That's <span className="underline">pathetic</span>. 💁‍♀️</p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm text-red-200">Those questions? They're <span className="font-bold">personal</span>. Sacred even.</p>
              <p className="text-sm text-red-200">Only <span className="font-bold">ONE</span> person knows those answers.</p>
              <p className="text-sm text-red-300 font-medium mt-3">And you're clearly not him. 🙄</p>
            </div>
            <p className="text-gray-400 text-sm mt-4 italic">Nice try though. Points for confidence, I guess.</p>
            <p className="text-red-400 text-xs mt-2">Now please leave before I get actually annoyed. 😒</p>
            <button onClick={onClose} className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded-lg font-bold transition-all mt-4">
              Close (And don't try again)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
