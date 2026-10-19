export { default as AuditLogModel, type AuditLogDocument } from './audit-log';
export { default as BookingModel, type BookingDocument, type EmailStatus } from './booking';

export {
    default as EmailVerificationModel,
    type EmailVerificationDocument,
} from './email-verification';

export { default as SettingsModel, EVENT_SETTINGS_KEY, type SettingsDocument } from './settings';
export { default as StudentModel, type StudentDocument } from './student';
export { default as UserModel, type UserDocument, type UserRole } from './user';
