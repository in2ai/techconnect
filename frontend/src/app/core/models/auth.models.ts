export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}