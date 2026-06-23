/* ── Plan (matches Pricing component data) ── */

export type PlanId = 'basic' | 'deluxe' | 'platinum';

export interface Plan {
  id: PlanId;
  label: string;
  amountCents: number;
  features: string[];
}

/* ── Booking flow data ── */

export type PaymentMode = 'now' | 'later';

export interface BookingContact {
  name: string;
  email: string;
  phone: string;
}

export interface BookingLocation {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  /** Geocoded coordinates — set when address is picked via autocomplete or map */
  lat?: number;
  lng?: number;
}

/* ── State machine ── */

export type BookingStep = 'location' | 'contactPayment' | 'confirmation' | 'success';

export type BookingStatus =
  | 'idle'
  | 'creating_intent'
  | 'confirming'
  | 'requires_action'
  | 'succeeded'
  | 'queued'
  | 'failed';

export interface BookingState {
  step: BookingStep;
  plan: Plan | null;
  paymentMode: PaymentMode;
  contact: BookingContact;
  location: BookingLocation;
  paymentIntentId: string | null;
  clientSecret: string | null;
  status: BookingStatus;
  etaMessage: string | null;
  error: string | null;
}

/* ── Actions ── */

export type BookingAction =
  | { type: 'SET_PLAN'; plan: Plan }
  | { type: 'SET_LOCATION'; location: BookingLocation }
  | { type: 'SET_CONTACT'; contact: BookingContact }
  | { type: 'SET_PAYMENT_MODE'; paymentMode: PaymentMode }
  | { type: 'SET_PI'; id: string; clientSecret: string }
  | { type: 'SET_STATUS'; status: BookingStatus }
  | { type: 'SET_ETA'; etaMessage: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'RESET' };

/* ── Initial state ── */

export const EMPTY_CONTACT: BookingContact = { name: '', email: '', phone: '' };
export const EMPTY_LOCATION: BookingLocation = { address1: '', address2: '', city: '', state: '', zip: '' };

export const initialBookingState: BookingState = {
  step: 'location',
  plan: null,
  paymentMode: 'now',
  contact: EMPTY_CONTACT,
  location: EMPTY_LOCATION,
  paymentIntentId: null,
  clientSecret: null,
  status: 'idle',
  etaMessage: null,
  error: null,
};

/* ── Step ordering helpers ── */

const STEPS: BookingStep[] = ['location', 'contactPayment', 'confirmation', 'success'];

function nextStep(current: BookingStep): BookingStep {
  const idx = STEPS.indexOf(current);
  return idx < STEPS.length - 1 ? STEPS[idx + 1]! : current;
}

function prevStep(current: BookingStep): BookingStep {
  const idx = STEPS.indexOf(current);
  return idx > 0 ? STEPS[idx - 1]! : current;
}

/* ── Reducer ── */

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_PLAN':
      return { ...state, plan: action.plan, error: null };
    case 'SET_LOCATION':
      return { ...state, location: action.location, error: null };
    case 'SET_CONTACT':
      return { ...state, contact: action.contact, error: null };
    case 'SET_PAYMENT_MODE':
      return { ...state, paymentMode: action.paymentMode, error: null };
    case 'SET_PI':
      return { ...state, paymentIntentId: action.id, clientSecret: action.clientSecret, error: null };
    case 'SET_STATUS':
      return { ...state, status: action.status, error: action.status === 'failed' ? state.error : null };
    case 'SET_ETA':
      return { ...state, etaMessage: action.etaMessage };
    case 'SET_ERROR':
      return { ...state, error: action.error, status: action.error ? 'failed' : state.status };
    case 'SET_STEP':
      return { ...state, step: action.step, error: null };
    case 'GO_NEXT':
      return { ...state, step: nextStep(state.step), error: null };
    case 'GO_BACK':
      return { ...state, step: prevStep(state.step), error: null };
    case 'RESET':
      return initialBookingState;
    default:
      return state;
  }
}
