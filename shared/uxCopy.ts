// shared/uxCopy.ts

export const UXCopy = {
  // 범용
  checking: "아직 확인 중이에요",
  checkingShort: "확인 중",

  // 입력/등록 전(내부 데이터 미입력)
  notRegistered: "아직 등록 전이에요",
  notRegisteredShort: "등록 전",

  // 공고/발표 전(일정/날짜류)
  preNotice: "공고 전이에요",
  preNoticeShort: "공고 전",

  // 가격/범위
  priceRange: "가격을 확인 중이에요",
  priceRangeShort: "가격 확인 중",

  // 주소
  address: "주소를 확인 중이에요",
  addressShort: "주소 확인 중",

  // 지역
  region: "지역을 확인 중이에요",
  regionShort: "지역 확인 중",

  // 이미지
  imagePlaceholder: "사진은 준비 중이에요",

  //  ë¡œë”©
  loading: "불러오는 중이에요",
  loadingShort: "불러오는 중...",

  // 기타
  typeCheckingShort: "타입 확인 중",

  /* Validation Messages */
  validation: {
    required: "필수 입력 항목입니다.",
    email: "올바른 이메일 형식을 입력해 주세요.",
    passwordRequired: "비밀번호를 입력해 주세요.",
    generic: "입력 값을 다시 확인해 주세요.",
    // 필요하면 아래처럼 더 세분화
    tooShort: (min: number) => `최소 ${min}자 이상 입력해 주세요.`,
    tooLong: (max: number) => `최대 ${max}자까지 입력할 수 있어요.`,
    pattern: "형식이 올바르지 않습니다.",
    password: {
      required: "비밀번호를 입력해주세요.",
      length: "비밀번호는 8~20자 사이로 입력해주세요.",
      needUpper: "비밀번호에 영문 대문자를 포함해주세요.",
      needLower: "비밀번호에 영문 소문자를 포함해주세요.",
      needNumber: "비밀번호에 숫자를 포함해주세요.",
      needSpecial: "비밀번호에 특수문자를 포함해주세요.",
      noWhitespace: "비밀번호에 공백을 사용할 수 없습니다.",
    },
  },
} as const;
