import { useCallback, useMemo, useState } from "react";

import {
  type AgentProperty,
  type AgentPropertyRequest,
} from "@/features/agent/services/agent.properties";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

type UseAgentAffiliationOptions = {
  agentProperties: AgentProperty[];
  agentRequests: AgentPropertyRequest[];
  reloadAgentDashboard: () => Promise<void>;
  onAlert: (message: string) => void;
  onAfterWithdraw?: () => void;
};

export default function useAgentAffiliation({
  agentProperties,
  agentRequests,
  reloadAgentDashboard,
  onAlert,
  onAfterWithdraw,
}: UseAgentAffiliationOptions) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [visiblePropertyCount, setVisiblePropertyCount] = useState(9);
  const [submittingPropertyId, setSubmittingPropertyId] = useState<number | null>(
    null,
  );
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<string | null>(
    null,
  );

  const hasApprovedProperty = useMemo(
    () => agentRequests.some((request) => request.status === "approved"),
    [agentRequests],
  );

  const getRequestStatus = useCallback(
    (propertyId: number) => {
      const request = agentRequests.find(
        (requestItem) => requestItem.property_id === propertyId,
      );
      return request ?? null;
    },
    [agentRequests],
  );

  const filteredAgentProperties = useMemo(() => {
    return agentProperties
      .filter((property) =>
        property.name
          .toLowerCase()
          .includes(searchKeyword.trim().toLowerCase()),
      )
      .map((property, index) => ({ property, index }))
      .sort((a, b) => {
        const aRequest = getRequestStatus(a.property.id);
        const bRequest = getRequestStatus(b.property.id);
        const aPriority = aRequest?.status === "approved" ? 0 : 1;
        const bPriority = bRequest?.status === "approved" ? 0 : 1;

        if (aPriority !== bPriority) return aPriority - bPriority;
        return a.index - b.index;
      })
      .map(({ property }) => property);
  }, [agentProperties, getRequestStatus, searchKeyword]);

  const visibleAgentProperties = useMemo(
    () => filteredAgentProperties.slice(0, visiblePropertyCount),
    [filteredAgentProperties, visiblePropertyCount],
  );

  const handleSearchKeywordChange = useCallback((value: string) => {
    setSearchKeyword(value);
    setVisiblePropertyCount(9);
  }, []);

  const handleShowMore = useCallback(() => {
    setVisiblePropertyCount((count) => count + 9);
  }, []);

  const handleAgentPropertyApply = useCallback(
    async (propertyId: number) => {
      setSubmittingPropertyId(propertyId);
      try {
        const response = await fetch("/api/property-agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ property_id: propertyId }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "소속 신청에 실패했습니다.");
        }

        onAlert(data.message || "소속 신청이 완료되었습니다.");
        await reloadAgentDashboard();
      } catch (error: unknown) {
        onAlert(
          toKoreanErrorMessage(error, "소속 신청 중 오류가 발생했습니다."),
        );
      } finally {
        setSubmittingPropertyId(null);
      }
    },
    [onAlert, reloadAgentDashboard],
  );

  const handleWithdrawAffiliation = useCallback(
    async (propertyAgentId: string, propertyName: string) => {
      const confirmed = confirm(`'${propertyName}' 소속을 해제할까요?`);
      if (!confirmed) return;

      setWithdrawingRequestId(propertyAgentId);
      try {
        const response = await fetch(`/api/property-agents/${propertyAgentId}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "소속 해제에 실패했습니다.");
        }

        onAlert(data.message || "소속이 해제되었습니다.");
        await reloadAgentDashboard();
        onAfterWithdraw?.();
      } catch (error: unknown) {
        onAlert(
          toKoreanErrorMessage(error, "소속 해제 중 오류가 발생했습니다."),
        );
      } finally {
        setWithdrawingRequestId(null);
      }
    },
    [onAfterWithdraw, onAlert, reloadAgentDashboard],
  );

  return {
    hasApprovedProperty,
    searchKeyword,
    visiblePropertyCount,
    submittingPropertyId,
    withdrawingRequestId,
    filteredAgentProperties,
    visibleAgentProperties,
    getRequestStatus,
    handleSearchKeywordChange,
    handleShowMore,
    handleAgentPropertyApply,
    handleWithdrawAffiliation,
  };
}
