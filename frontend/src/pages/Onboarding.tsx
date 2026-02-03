import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ChevronRight,
  ChevronLeft,
  Check,
  RefreshCw,
  Settings,
  User,
} from 'lucide-react';
import { MorphingCard, FluidButton } from '../components/morphic';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Training Optimizer',
    description: 'Your personal training monitor that pulls data from Garmin Connect and provides insights to optimize your performance.',
    icon: Activity,
  },
  {
    id: 'garmin',
    title: 'Connect Garmin Account',
    description: 'Link your Garmin Connect account to automatically sync your activities, health metrics, and training data.',
    icon: RefreshCw,
  },
  {
    id: 'sync',
    title: 'Initial Sync',
    description: 'We\'ll fetch your recent activities and health data to build your training history.',
    icon: RefreshCw,
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Set up your basic information to personalize your training recommendations.',
    icon: User,
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Your dashboard is ready. Start exploring your training data and insights.',
    icon: Check,
  },
];

export function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    max_hr: '',
    resting_hr: '',
  });

  const step = steps[currentStep];
  const Icon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = async () => {
    if (isLastStep) {
      navigate('/');
      return;
    }

    if (step.id === 'garmin') {
      setIsConnecting(true);
      // Simulate Garmin connection
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsConnecting(false);
    }

    if (step.id === 'sync') {
      setIsSyncing(true);
      // Simulate sync progress
      for (let i = 0; i <= 100; i += 20) {
        setSyncProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      setIsSyncing(false);
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    navigate('/');
  };

  const canProceed = () => {
    if (step.id === 'profile') {
      return profile.name.trim() !== '';
    }
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, index) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                index <= currentStep
                  ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-500'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <MorphingCard glowColor="rgba(59, 130, 246, 0.3)">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
              >
                <Icon className="w-10 h-10 text-white" />
              </motion.div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white mb-4">{step.title}</h1>

              {/* Description */}
              <p className="text-gray-400 mb-8 leading-relaxed">{step.description}</p>

              {/* Step Content */}
              <div className="mb-8">
                {step.id === 'garmin' && (
                  <div className="space-y-4">
                    {isConnecting ? (
                      <div className="flex items-center justify-center gap-3 p-4 bg-blue-500/10 rounded-xl">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                        />
                        <span className="text-blue-400">Connecting to Garmin...</span>
                      </div>
                    ) : (
                      <FluidButton
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleNext}
                      >
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Connect Garmin Account
                      </FluidButton>
                    )}
                    <p className="text-xs text-gray-500">
                      You can skip this and connect later in Settings
                    </p>
                  </div>
                )}

                {step.id === 'sync' && (
                  <div className="space-y-4">
                    {isSyncing ? (
                      <div className="space-y-3">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${syncProgress}%` }}
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          />
                        </div>
                        <p className="text-sm text-gray-400">
                          Syncing your activities... {syncProgress}%
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-green-500/10 rounded-xl">
                        <Check className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400">Ready to sync!</p>
                      </div>
                    )}
                  </div>
                )}

                {step.id === 'profile' && (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your name"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Max HR (optional)
                        </label>
                        <input
                          type="number"
                          value={profile.max_hr}
                          onChange={(e) => setProfile({ ...profile, max_hr: e.target.value })}
                          placeholder="180"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Resting HR (optional)
                        </label>
                        <input
                          type="number"
                          value={profile.resting_hr}
                          onChange={(e) => setProfile({ ...profile, resting_hr: e.target.value })}
                          placeholder="60"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step.id === 'complete' && (
                  <div className="p-6 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Activity className="w-6 h-6 text-blue-400" />
                      <Settings className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="text-white font-medium">
                      You can always update your settings later
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <FluidButton
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isFirstStep || isConnecting || isSyncing}
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </FluidButton>

                <div className="flex items-center gap-3">
                  {!isLastStep && step.id !== 'garmin' && (
                    <FluidButton variant="ghost" onClick={handleSkip}>
                      Skip
                    </FluidButton>
                  )}

                  {step.id !== 'garmin' && (
                    <FluidButton
                      variant="primary"
                      onClick={handleNext}
                      disabled={!canProceed() || isConnecting || isSyncing}
                    >
                      {isLastStep ? 'Get Started' : 'Continue'}
                      {!isLastStep && <ChevronRight className="w-5 h-5 ml-1" />}
                    </FluidButton>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </MorphingCard>

        {/* Skip All Link */}
        {currentStep < steps.length - 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleSkip}
            className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors mx-auto block"
          >
            Skip onboarding and go to dashboard
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
