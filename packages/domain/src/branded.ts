declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type OperatorId = Brand<string, 'OperatorId'>;
export type FleetId = Brand<string, 'FleetId'>;
export type AircraftId = Brand<string, 'AircraftId'>;
export type PilotId = Brand<string, 'PilotId'>;
export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type ExerciseId = Brand<string, 'ExerciseId'>;
export type SignOffId = Brand<string, 'SignOffId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type DocumentVersionId = Brand<string, 'DocumentVersionId'>;
export type KCAASubmissionId = Brand<string, 'KCAASubmissionId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type CurrencyRecordId = Brand<string, 'CurrencyRecordId'>;
export type AssessmentResultId = Brand<string, 'AssessmentResultId'>;

export type IsoDate = Brand<string, 'IsoDate'>;
export type IsoDateTime = Brand<string, 'IsoDateTime'>;
