import { AppError, ERR } from "@/lib/errors";
import { updateCurrentProfileBankAccount } from "@/features/profile/services/profile.bank-account";

export async function updateAgentRefundAccount(input: {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}) {
  const { error } = await updateCurrentProfileBankAccount(input);

  return {
    data: error ? null : { id: "ok" },
    error: error
      ? new AppError(
          error.includes("로그인이 필요합니다") ? ERR.UNAUTHORIZED : ERR.DB_QUERY,
          error,
          error.includes("로그인이 필요합니다") ? 401 : 500,
        )
      : null,
  };
}
