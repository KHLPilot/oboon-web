"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, CheckCircle, Clock, XCircle, Calendar } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Property {
  id: number;
  name: string;
  property_type: string;
  image_url?: string;
  status?: string;
}

interface PropertyAgent {
  id: string;
  property_id: number;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  property: Property | null;
}

export default function AgentPropertiesPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [myRequests, setMyRequests] = useState<PropertyAgent[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hasApprovedProperty, setHasApprovedProperty] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    try {
      // 현재 사용자 확인
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      setUser(currentUser);

      // 프로필 조회
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (
        !profileData ||
        (profileData.role !== "agent" && profileData.role !== "admin")
      ) {
        alert("상담사만 접근할 수 있습니다");
        router.push("/");
        return;
      }

      setProfile(profileData);

      // 내 소속 신청 내역 조회
      const { data: requests } = await supabase
        .from("property_agents")
        .select(
          `
          id,
          property_id,
          status,
          requested_at,
          approved_at,
          rejected_at,
          rejection_reason
        `,
        )
        .eq("agent_id", currentUser.id)
        .order("requested_at", { ascending: false });

      // 관계 데이터를 별도로 조회
      let enrichedRequests: PropertyAgent[] = [];
      if (requests && requests.length > 0) {
        const propertyIds = [...new Set(requests.map((r) => r.property_id))];
        const { data: propertiesData } = await supabase
          .from("properties")
          .select("id, name, property_type, image_url, status")
          .in("id", propertyIds);

        const propertiesMap = new Map(
          (propertiesData || []).map((p) => [p.id, p])
        );

        enrichedRequests = requests.map((r) => ({
          ...r,
          property: propertiesMap.get(r.property_id) || null,
        }));
      }

      setMyRequests(enrichedRequests);

      // 승인된 현장이 있는지 확인
      const hasApproved = (requests || []).some((r) => r.status === "approved");
      setHasApprovedProperty(hasApproved);

      // 대기 중인 신청이 있는지 확인
      const hasPending = (requests || []).some((r) => r.status === "pending");
      setHasPendingRequest(hasPending);

      // 전체 현장 목록 조회
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name, property_type, image_url, status")
        .order("name");

      setProperties(propertiesData || []);
    } catch (error) {
      console.error("데이터 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(propertyId: number) {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setSubmitting(propertyId);

    try {
      const response = await fetch("/api/property-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "신청에 실패했습니다");
      }

      alert(data.message);
      fetchData(); // 목록 새로고침
    } catch (error: any) {
      console.error("소속 신청 오류:", error);
      alert(error.message || "신청에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCancel(requestId: string) {
    if (!confirm("소속 신청을 취소하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/property-agents/${requestId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "취소에 실패했습니다");
      }

      alert(data.message);
      fetchData(); // 목록 새로고침
    } catch (error: any) {
      console.error("신청 취소 오류:", error);
      alert(error.message || "취소에 실패했습니다");
    }
  }

  function getRequestStatus(propertyId: number) {
    return myRequests.find((r) => r.property_id === propertyId);
  }

  function getStatusBadge(status: "pending" | "approved" | "rejected") {
    switch (status) {
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            승인됨
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            승인 대기
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            거절됨
          </Badge>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-(--oboon-primary)" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--oboon-bg-subtle)">
            <Building2 className="h-5 w-5 text-(--oboon-text-title)" />
          </div>
          <h1 className="text-2xl font-bold text-(--oboon-text-title)">
            현장 소속 관리
          </h1>
        </div>
        <p className="text-sm text-(--oboon-text-muted)">
          현장에 소속을 신청하고 관리할 수 있습니다
        </p>
      </div>

      {/* 내 소속 신청 현황 */}
      {myRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-4">
            내 소속 신청 현황
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myRequests.map((request) => {
              const property = request.property;
              return (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-lg bg-(--oboon-bg-subtle) shrink-0">
                      {property?.image_url ? (
                        <img
                          src={property.image_url}
                          alt={property.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-(--oboon-text-muted)" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        {getStatusBadge(request.status)}
                      </div>
                      <h3 className="font-semibold text-(--oboon-text-title) mb-1">
                        {property?.name || "-"}
                      </h3>
                      <p className="text-xs text-(--oboon-text-muted)">
                        신청일:{" "}
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                      {request.status === "rejected" &&
                        request.rejection_reason && (
                          <p className="mt-2 text-xs text-(--oboon-danger) bg-(--oboon-danger)/10 p-2 rounded">
                            거절 사유: {request.rejection_reason}
                          </p>
                        )}
                      {request.status === "pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2 w-full"
                          onClick={() => handleCancel(request.id)}
                        >
                          신청 취소
                        </Button>
                      )}
                      {request.status === "approved" && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="mt-2 w-full flex items-center justify-center gap-2"
                          onClick={() => router.push(`/agent/schedule?propertyId=${request.property_id}`)}
                        >
                          <Calendar className="h-4 w-4" />
                          스케줄 관리
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 전체 현장 목록 */}
      <div>
        <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-4">
          전체 현장 목록
        </h2>

        {hasApprovedProperty && (
          <div className="mb-4 rounded-xl border border-(--oboon-primary) bg-(--oboon-primary)/10 px-4 py-3 text-sm text-(--oboon-primary)">
            이미 승인된 현장이 있습니다. 한 명의 상담사는 한 곳의 현장에만
            소속될 수 있습니다.
          </div>
        )}

        {!hasApprovedProperty && hasPendingRequest && (
          <div className="mb-4 rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning)/10 px-4 py-3 text-sm text-(--oboon-warning)">
            현재 승인 대기 중인 신청이 있습니다. 승인 또는 거절 후 다른 현장에
            신청할 수 있습니다.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const requestStatus = getRequestStatus(property.id);
            const canApply =
              !hasApprovedProperty &&
              !hasPendingRequest &&
              (!requestStatus || requestStatus.status === "rejected");

            return (
              <Card key={property.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-(--oboon-bg-subtle) shrink-0">
                    {property.image_url ? (
                      <img
                        src={property.image_url}
                        alt={property.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-(--oboon-text-muted)" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {requestStatus && (
                      <div className="mb-2">
                        {getStatusBadge(requestStatus.status)}
                      </div>
                    )}
                    <h3 className="font-semibold text-(--oboon-text-title) mb-1">
                      {property.name}
                    </h3>
                    <p className="text-xs text-(--oboon-text-muted) mb-3">
                      {property.property_type}
                    </p>
                    {canApply && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full"
                        disabled={submitting === property.id}
                        onClick={() => handleApply(property.id)}
                      >
                        {submitting === property.id ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            신청 중...
                          </span>
                        ) : (
                          "소속 신청"
                        )}
                      </Button>
                    )}
                    {hasApprovedProperty && !requestStatus && (
                      <div className="text-xs text-(--oboon-text-muted) text-center">
                        이미 다른 현장에 소속됨
                      </div>
                    )}
                    {!hasApprovedProperty && hasPendingRequest && !requestStatus && (
                      <div className="text-xs text-(--oboon-text-muted) text-center">
                        다른 현장 승인 대기 중
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {properties.length === 0 && (
          <div className="text-center py-12 text-(--oboon-text-muted)">
            현재 등록된 현장이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
