export type EventKey =
  | "lab.test.requested"
  | "lab.test.completed"
  | "pharmacy.prescription.ready"
  | "admin.room.assigned";

export interface Envelope<T> {
  key: EventKey;
  payload: T;
  timestamp: string;
  correlationId?: string;
}

export interface TestRequestedPayload {
  patientId: string;
  testType: string;
  orderedBy: string;
}

export interface TestCompletedPayload {
  patientId: string;
  testType: string;
  resultRef: string;
}
