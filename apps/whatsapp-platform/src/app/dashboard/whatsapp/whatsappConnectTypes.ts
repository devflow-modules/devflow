export interface WhatsappPhoneNumberRow {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  wabaId: string | null;
  status: string;
  isPrimary: boolean;
  isDefaultOutbound: boolean;
  label: string | null;
  createdAt: string;
}
