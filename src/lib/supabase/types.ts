export interface UserData {
  id: string;
  telegram_user_id: number;
  phone_number?: string;
  init_data_raw?: string;
  init_data_user?: any;
  init_data_chat?: any;
  custom_prompt?: string;
  created_at: string;
  updated_at: string;
}
