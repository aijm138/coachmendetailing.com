import React, { useEffect } from 'react';
import { Modal } from '../common/Modal';
import { StepLocation } from './steps/StepLocation';
import { StepContactPayment } from './steps/StepContactPayment';
import { StepConfirmation } from './steps/StepConfirmation';
import { StepSuccess } from './steps/StepSuccess';
import { useBookingFlow } from '../../hooks/useBookingFlow';
import type { Plan } from '../../types/booking';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
}

export function BookingModal({ isOpen, onClose, plan }: BookingModalProps) {
  const {
    state,
    setPlan,
    setLocation,
    setContact,
    setPaymentMode,
    setPI,
    setStatus,
    setEta,
    setError,
    goNext,
    goBack,
    goTo,
    reset,
    canProceedLocation,
    canProceedContact,
    isBusy,
  } = useBookingFlow();

  // Sync plan from props whenever modal opens
  useEffect(() => {
    if (isOpen && plan) {
      setPlan(plan);
    }
  }, [isOpen, plan, setPlan]);

  // Reset state when modal closes (only if not mid-payment)
  const handleClose = () => {
    if (isBusy) {
      // Don't close during active payment processing
      return;
    }
    onClose();
    // Delay reset so close animation can play
    setTimeout(() => reset(), 300);
  };

  const renderStep = () => {
    switch (state.step) {
      case 'location':
        return (
          <StepLocation
            location={state.location}
            onChange={setLocation}
            onNext={goNext}
            canProceed={canProceedLocation}
            error={state.error}
          />
        );

      case 'contactPayment':
        return (
          <StepContactPayment
            state={state}
            contact={state.contact}
            onContactChange={setContact}
            paymentMode={state.paymentMode}
            onPaymentModeChange={setPaymentMode}
            onPI={setPI}
            onStatus={setStatus}
            onEta={setEta}
            onError={setError}
            onSuccess={() => goTo('success')}
            onBack={goBack}
            isBusy={isBusy}
          />
        );

      case 'confirmation':
        return <StepConfirmation state={state} />;

      case 'success':
        return <StepSuccess state={state} onClose={handleClose} />;

      default:
        return null;
    }
  };

  // Build title with plan name if available
  const title = state.plan
    ? `Book ${state.plan.label} Detail — $${(state.plan.amountCents / 100).toFixed(2)}`
    : 'Book Your Detail';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      showCloseButton={!isBusy && state.step !== 'success'}
    >
      {renderStep()}
    </Modal>
  );
}

export default BookingModal;
