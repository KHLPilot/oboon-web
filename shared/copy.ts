/**
 * shared/copy.ts
 *
 * 오분(OBOON) 카피라이팅 단일 출처(SSOT).
 * 서비스 내 모든 마케팅 문구·UI 텍스트는 이 파일에서 관리한다.
 *
 * ─────────────────────────────────────────
 *  포함 범위
 *  - 브랜드 슬로건/태그라인
 *  - 히어로 섹션
 *  - 홈 페이지 섹션
 *  - 분양/현장 (목록·상세·지도)
 *  - 예약/상담
 *  - 인증 (플레이스홀더·오류)
 *  - 공통 UI (버튼·라벨)
 *
 *  포함하지 않는 범위 (별도 파일 관리)
 *  - UX 상태 문구 (로딩·확인중) → shared/uxCopy.ts
 *  - 입력 유효성 메시지       → shared/uxCopy.ts (validation)
 *  - DB/API 오류 매핑        → shared/errorMessage.ts
 *  - 알림 타입 라벨           → features/notifications/domain/notification.constants.ts
 *  - 분양 상태 라벨           → features/offerings/domain/offering.constants.ts
 * ─────────────────────────────────────────
 */

export const Copy = {
  // ───────────────────────────────────────
  // 1. 브랜드
  // ───────────────────────────────────────
  brand: {
    name: "오분",
    fullName: "오늘의 분양",
    slogan: "좋은 현장은 좋은 상담사로부터.",
    description: "전문 상담사와 AI 조건 검증으로 내 분양을 찾는 플랫폼",
  },

  // ───────────────────────────────────────
  // 2. 히어로 섹션
  // ───────────────────────────────────────
  hero: {
    // 슬라이드 1 — 1:1 상담사 매칭
    agentMatch: {
      badge: "1:1 상담사 매칭 시스템",
      title: "좋은 현장은 좋은 상담사로부터.",
      subtitle: "전문성과 경험을 공개하고 선택의 기준을 제공합니다.",
      cta: {
        primary: "분양 리스트 보기",
        secondary: "지도로 현장 찾기",
      },
      agentWaiting: (count: number) => `${count}명+의 상담사 대기 중`,
      hint: "상담 스타일과 전문 분야를 확인하고 선택해 보세요.",
    },

    // 슬라이드 2 — AI 맞춤 현장 추천
    aiMatch: {
      badge: "AI 맞춤 현장 추천",
      title: "내 조건에 딱 맞는 현장을 찾아드려요.",
      subtitle:
        "교통, 학군, 개발호재, 반려동물 조건까지 한 번에 검증해 즉시 비교할 수 있어요.",
      cta: {
        primary: "맞춤 현장 보기",
        secondary: "조건 상세 설정",
      },
      stat: "평균 3.2개 현장 매칭",
      preview: {
        title: "맞춤 현장 미리보기",
        subtitle: "광고 매물 말고, 조건이 맞는 현장만",
      },
    },
  },

  // ───────────────────────────────────────
  // 3. 홈 페이지 섹션
  // ───────────────────────────────────────
  home: {
    // 상담 신청 가능 현장
    consultable: {
      title: "상담 신청 가능 현장",
      subtitle: "상담사 연결이 완료되어 바로 상담 예약이 가능한 현장입니다.",
      viewAll: "전체보기",
      empty: {
        title: "상담 신청 가능한 현장이 없어요",
        subtitle: "곧 새로운 현장이 등록될 예정이에요.",
      },
    },

    // 지역별 인기 분양
    regional: {
      title: "지역별 인기 분양",
      subtitle: "지역별로 인기있는 분양 현장을 확인해보세요.",
      viewAll: "전체보기",
      empty: {
        title: "선택한 지역에 분양이 없어요",
        subtitle: "다른 지역을 선택하거나 전체를 확인해보세요.",
      },
    },

    // 맞춤 현장 카드
    customMatch: {
      title: "교통·학군·개발호재\n반려동물 여부까지",
      subtitle:
        "관심 현장의 모든 조건을 한눈에 검증합니다.\n기존 조건 검증 기준으로 자동 추천해 드려요.",
      cta: "현장 조건 검증하기",

      // 4대 조건 라벨
      conditions: {
        traffic: {
          label: "교통 접근성",
          description: "지하철·버스 접근성과 이동 편의 기준을 확인합니다.",
        },
        school: {
          label: "학군 정보",
          description: "학군 배정·통학 생활권 관련 기준을 반영합니다.",
        },
        development: {
          label: "개발 호재",
          description: "주요 개발 계획과 생활 인프라 변화 요소를 반영합니다.",
        },
        pets: {
          label: "반려동물",
          description: "반려동물 생활 적합성 관련 조건을 함께 검토합니다.",
        },
      },

      listTitle: "맞춤 현장 리스트",
      listSubtitle: "조건 검증과 함께 확인하기 좋은 현장을 모아봤어요.",
    },
  },

  // ───────────────────────────────────────
  // 4. 분양/현장
  // ───────────────────────────────────────
  offerings: {
    // 검색
    search: {
      placeholder: "지역, 단지명으로 검색",
    },

    // 필터
    filter: {
      status: "분양 상태",
      agent: "상담사",
    },

    // 지도
    map: {
      title: "분양 지도",
      empty: "지도에 표시할 좌표 정보가 있는 현장이 아직 없어요.",
    },

    // 목록
    list: {
      empty: {
        recommended: {
          title: "조건에 맞는 현장이 없어요",
          subtitle: "필터를 조정하거나 전체 현장을 확인해보세요.",
        },
        general: {
          title: "아직 등록된 분양이 없어요",
          subtitle: "곧 새로운 분양 현장이 등록될 예정이에요.",
        },
      },
    },

    // 상세 페이지
    detail: {
      sections: {
        type: "분양 유형",
        location: "현장 위치",
        priceRange: "분양가 범위",
        priceTable: "분양가표",
        infra: {
          title: "주변 인프라",
          description:
            "현장 기준 주요 생활 인프라를 확인합니다. 인프라 거리는 직선거리 기준 참고값입니다.",
          empty:
            "아직 주변 인프라 데이터가 없습니다. 잠시 후 다시 확인해 주세요.",
        },
        schedule: {
          title: "분양 일정",
          description:
            "분양 일정 아래에서 위치를 바로 확인할 수 있습니다.",
          moveInNote:
            "입주 예정 정보는 일정 특성에 맞춰 날짜 또는 안내 문구로 표시되며, 반드시 확인해 주세요.",
        },
        mapLocation: "현장/모델하우스 위치",
        basicInfo: {
          title: "기본 정보",
          description: "판단에 필요한 현장 정보를 한 화면에서 확인합니다.",
        },
        appraisalMemo: {
          title: "감정평가사 메모",
          description: "등록된 항목만 노출합니다.",
        },
      },

      // 조건 확인(검증) 카드
      condition: {
        title: "조건 확인",
        cta: "조건 확인",
        applied:
          "맞춤 정보가 적용되었습니다. 바로 조건 확인을 진행할 수 있어요.",
        loginRequired: {
          cash: "로그인 후 자금 분석을 확인할 수 있어요.",
          monthly: "로그인 후 월부담 분석을 확인할 수 있어요.",
          risk: "로그인 후 리스크 분석을 확인할 수 있어요.",
        },
        disclaimer:
          "조건 검증 결과는 참고용이며, 최종 진행 가능 여부는 실제 상담에서 재확인됩니다.",
        placeholder: {
          price: "예: 8,000",
          area: "예: 400",
          income: "0",
        },
      },
    },
  },

  // ───────────────────────────────────────
  // 5. 예약/상담
  // ───────────────────────────────────────
  booking: {
    // 모달 제목
    title: {
      selectAgent: "상담 예약",
      confirm: "예약금 안내 및 동의",
    },

    // CTA
    cta: {
      save: "저장하고 예약",
      book: "상담 예약",
      connect: "상담하기",
      loginRequired: "로그인 후 상담 연결",
    },

    // 상담사 정보
    agent: {
      noIntro: "등록된 상담사 소개가 없습니다.",
      recommended: "상담 권장",
      responseTime: {
        within10min: "보통 10분 이내 응답",
        within30min: "보통 30분 이내 응답",
        within1hr: "보통 1시간 이내 응답",
        within2hr: "보통 2시간 이내 응답",
        within1day: "보통 하루 이내 응답",
        over1day: "보통 하루 이상 소요",
      },
    },

    // 예약금 안내
    deposit: {
      title: "예약금 입금 안내",
      description:
        "예약 후 실제 방문이 확인되면,\n프로필에 등록된 계좌로 방문 환급됩니다.",
      pointNote:
        "포인트로 예약하면 관리자 승인 없이 즉시 예약이 진행됩니다.",
      cancelPolicy:
        "고객 사유 취소 시 결제된 예약금 1,000원은 1,000P로 전환됩니다.",
      agree: "위 내용을 확인하였으며 동의합니다",
    },

    // 계좌 정보
    account: {
      bankPlaceholder: "은행명",
      numberPlaceholder: "계좌번호",
      holderPlaceholder: "입금자명",
      saveFail: "계좌 정보 저장에 실패했습니다",
    },

    // 오류
    errors: {
      noAgent: "상담사를 선택해주세요",
      noSlot: "선택한 날짜에 예약 가능한 시간이 없습니다",
      loadFail: "상담사 목록을 불러오는데 실패했습니다",
    },
  },

  // ───────────────────────────────────────
  // 6. 인증
  // ───────────────────────────────────────
  auth: {
    placeholder: {
      email: "name@example.com",
      emailSignup: "example@email.com",
      password: "대소문자 + 숫자 + 특수문자 포함 8자 이상",
      passwordConfirm: "••••••••",
      name: "김오분",
      nickname: "오분이",
      phone: "01012345678",
      recoveryEmail: "탈퇴한 계정의 이메일",
    },
    error: {
      deactivated: "계정이 비활성화되었습니다. 관리자에게 문의하세요.",
    },
  },

  // ───────────────────────────────────────
  // 7. 공통 UI
  // ───────────────────────────────────────
  common: {
    cta: {
      viewAll: "전체보기",
      confirm: "확인",
      cancel: "취소",
      save: "저장",
      close: "닫기",
      back: "뒤로",
      next: "다음",
      submit: "제출",
      retry: "다시 시도",
    },
    status: {
      reserved: "예약됨",
    },
  },
} as const;
