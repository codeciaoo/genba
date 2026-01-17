export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * メールアドレスのバリデーション
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('メールアドレスを入力してください');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('有効なメールアドレスを入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * パスワードのバリデーション
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('パスワードを入力してください');
  } else if (password.length < 6) {
    errors.push('パスワードは6文字以上で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 事業者名のバリデーション
 */
export function validateBusinessName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name) {
    errors.push('屋号（事業者名）を入力してください');
  } else if (name.length > 100) {
    errors.push('屋号は100文字以内で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * インボイス登録番号のバリデーション
 * T + 13桁の数字
 */
export function validateInvoiceNumber(number: string | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (number && !/^T[0-9]{13}$/.test(number)) {
    errors.push('インボイス登録番号はT＋13桁の数字で入力してください（例: T1234567890123）');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 郵便番号のバリデーション
 */
export function validatePostalCode(code: string | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (code && !/^\d{3}-?\d{4}$/.test(code)) {
    errors.push('郵便番号は7桁の数字で入力してください（例: 123-4567）');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 電話番号のバリデーション
 */
export function validatePhone(phone: string | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (phone && !/^[\d-]+$/.test(phone)) {
    errors.push('電話番号は数字とハイフンのみで入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 口座番号のバリデーション
 */
export function validateAccountNumber(number: string): ValidationResult {
  const errors: string[] = [];

  if (!number) {
    errors.push('口座番号を入力してください');
  } else if (!/^\d{7}$/.test(number)) {
    errors.push('口座番号は7桁の数字で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
