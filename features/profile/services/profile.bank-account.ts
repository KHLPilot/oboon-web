export type ProfileBankAccount = {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

export async function fetchCurrentProfileBankAccount(): Promise<{
  data: ProfileBankAccount | null;
  error: string | null;
}> {
  try {
    const response = await fetch("/api/profile/bank-account", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        data: null,
        error: data.error || "은행 계좌 정보를 불러오지 못했습니다",
      };
    }

    return {
      data: data as ProfileBankAccount,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "은행 계좌 정보를 불러오지 못했습니다",
    };
  }
}

export async function updateCurrentProfileBankAccount(input: {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}): Promise<{ error: string | null }> {
  try {
    const response = await fetch("/api/profile/bank-account", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bank_name: input.bankName,
        bank_account_number: input.bankAccountNumber,
        bank_account_holder: input.bankAccountHolder,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.error || "은행 계좌 정보를 저장하지 못했습니다",
      };
    }

    return { error: null };
  } catch {
    return {
      error: "은행 계좌 정보를 저장하지 못했습니다",
    };
  }
}
