import { useReducer, useCallback, useMemo } from 'react';
import type {
  BookingStep,
  BookingStatus,
  BookingContact,
  BookingLocation,
  PaymentMode,
  Plan,
} from '../types/booking';
import { bookingReducer, initialBookingState } from '../types/booking';

export function useBookingFlow() {
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);

  /* ── Setters ── */

  const setPlan = useCallback((plan: Plan) => {
    dispatch({ type: 'SET_PLAN', plan });
  }, []);

  const setLocation = useCallback((location: BookingLocation) => {
    dispatch({ type: 'SET_LOCATION', location });
  }, []);

  const setContact = useCallback((contact: BookingContact) => {
    dispatch({ type: 'SET_CONTACT', contact });
  }, []);

  const setPaymentMode = useCallback((paymentMode: PaymentMode) => {
    dispatch({ type: 'SET_PAYMENT_MODE', paymentMode });
  }, []);

  const setPI = useCallback((id: string, clientSecret: string) => {
    dispatch({ type: 'SET_PI', id, clientSecret });
  }, []);

  const setStatus = useCallback((status: BookingStatus) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const setEta = useCallback((etaMessage: string) => {
    dispatch({ type: 'SET_ETA', etaMessage });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  /* ── Navigation ── */

  const goNext = useCallback(() => {
    dispatch({ type: 'GO_NEXT' });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const goTo = useCallback((step: BookingStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  /* ── Derived validation flags ── */

  const canProceedLocation = useMemo(() => {
    const loc = state.location;
    return !!(loc.address1.trim() && loc.city.trim() && loc.state.trim() && loc.zip.trim());
  }, [state.location]);

  const canProceedContact = useMemo(() => {
    const c = state.contact;
    return !!(c.name.trim() && c.email.trim() && c.phone.trim());
  }, [state.contact]);

  const isBusy = useMemo(
    () => state.status === 'creating_intent' || state.status === 'confirming' || state.status === 'requires_action',
    [state.status]
  );

  return {
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
  };
}
