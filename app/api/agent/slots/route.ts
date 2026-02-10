import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLOT_DURATION = 30; // 분 단위
const DEFAULT_START = "10:00";
const DEFAULT_END = "17:00";
const FULL_DAY_START = "09:00"; // 전체 표시 시작
const FULL_DAY_END = "18:00"; // 전체 표시 끝
const CLOSED_TIME = "00:00";

// 슬롯 시간 생성 헬퍼
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current < end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += SLOT_DURATION;
  }
  return slots;
}

function isValidTime(value: string | null | undefined) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(value: number) {
  const h = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const m = (value % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// GET: 특정 상담사의 열린 슬롯 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!agentId || !date) {
      return NextResponse.json(
        { error: "agentId와 date가 필요합니다" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date + "T00:00:00+09:00");
    const dayOfWeek = targetDate.getDay();

    const { data: holidayRow } = await adminSupabase
      .from("agent_holidays")
      .select("holiday_date")
      .eq("agent_id", agentId)
      .eq("holiday_date", date)
      .maybeSingle();

    const isHoliday = !!holidayRow?.holiday_date;

    // 1) 기본 운영시간 조회 (없으면 기본값 사용)
    const { data: workingHours } = await adminSupabase
      .from("agent_working_hours")
      .select("start_time, end_time, is_enabled")
      .eq("agent_id", agentId)
      .eq("day_of_week", dayOfWeek)
      .single();

    const rawStart = workingHours?.start_time?.slice(0, 5);
    const rawEnd = workingHours?.end_time?.slice(0, 5);
    const isWorkingEnabled =
      typeof workingHours?.is_enabled === "boolean"
        ? workingHours.is_enabled
        : true;

    const defaultStartTime =
      isValidTime(rawStart) && rawStart !== CLOSED_TIME
        ? rawStart
        : DEFAULT_START;
    const defaultEndTime =
      isValidTime(rawEnd) && rawEnd !== CLOSED_TIME ? rawEnd : DEFAULT_END;

    // 2) 전체 슬롯 생성 (기본 운영시간을 포함하도록 범위 확장)
    const fullStartMinutes = Math.min(
      timeToMinutes(FULL_DAY_START),
      timeToMinutes(defaultStartTime),
    );
    const fullEndMinutes = Math.max(
      timeToMinutes(FULL_DAY_END),
      timeToMinutes(defaultEndTime),
    );
    const fullDayStart = minutesToTime(fullStartMinutes);
    const fullDayEnd = minutesToTime(fullEndMinutes);
    const allSlots = generateTimeSlots(fullDayStart, fullDayEnd);

    // 기본 운영시간 내 슬롯 목록
    const defaultOpenSlots = isWorkingEnabled
      ? generateTimeSlots(defaultStartTime, defaultEndTime)
      : [];

    // 3) 오버라이드 조회
    const { data: overrides } = await adminSupabase
      .from("agent_slot_overrides")
      .select("slot_time, is_open")
      .eq("agent_id", agentId)
      .eq("slot_date", date);

    const overrideMap = new Map(
      (overrides || []).map((o: { slot_time: string; is_open: boolean }) => [
        o.slot_time.slice(0, 5),
        o.is_open,
      ])
    );

    // 4) 이미 예약된 시간 조회 (requested, pending, confirmed 모두)
    const dayStart = `${date}T00:00:00+09:00`;
    const dayEnd = `${date}T23:59:59+09:00`;

    const { data: bookedConsultations } = await adminSupabase
      .from("consultations")
      .select("scheduled_at")
      .eq("agent_id", agentId)
      .in("status", ["requested", "pending", "confirmed"])
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd);

    const bookedTimes = new Set(
      (bookedConsultations || []).map((c: { scheduled_at: string }) => {
        const d = new Date(c.scheduled_at);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      })
    );

    // 5) 현재 시각 기준 1시간 이후부터 예약 가능 (오늘인 경우)
    // KST (UTC+9) 기준으로 현재 시간 계산
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // UTC 밀리초
    const kstTime = new Date(utcTime + (9 * 60 * 60 * 1000)); // KST = UTC + 9시간

    const todayStr = `${kstTime.getFullYear()}-${String(kstTime.getMonth() + 1).padStart(2, "0")}-${String(kstTime.getDate()).padStart(2, "0")}`;
    const isToday = date === todayStr;

    // 현재 KST 시간 + 1시간 (분 단위)
    const currentMinutes = kstTime.getHours() * 60 + kstTime.getMinutes();
    const oneHourLater = currentMinutes + 60;

    // 6) 최종 슬롯 계산 (전체 시간대 + 기본값 기준 열림/닫힘)
    const slots = allSlots.map((time: string) => {
      const [h, m] = time.split(":").map(Number);
      const slotMinutes = h * 60 + m;

      // 기본적으로 기본 운영시간 내면 열림, 아니면 닫힘
      const isInDefaultHours = defaultOpenSlots.includes(time);

      // 오버라이드가 있으면 그 값 사용, 없으면 기본값 사용
      let isOpen = isInDefaultHours;
      if (overrideMap.has(time)) {
        isOpen = overrideMap.get(time) === true;
      }

      // 이미 예약된 경우
      if (bookedTimes.has(time)) {
        return { time, available: false, reason: "booked", isOpen: true };
      }

      // 오늘이고 1시간 이내인 경우
      if (isToday && slotMinutes <= oneHourLater) {
        return { time, available: false, reason: "past", isOpen };
      }

      if (isHoliday) {
        return { time, available: false, reason: "closed", isOpen: false };
      }

      // 닫힌 경우
      if (!isOpen) {
        return { time, available: false, reason: "closed", isOpen: false };
      }

      return { time, available: true, isOpen: true };
    });

    return NextResponse.json({ slots });
  } catch (err: unknown) {
    console.error("슬롯 조회 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: 슬롯 오버라이드 설정 (상담사 전용)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 읽기 전용 컨텍스트에서는 무시
          }
        },
      },
    }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    }

    // 상담사 권한 확인
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "agent" && profile?.role !== "admin") {
      return NextResponse.json({ error: "상담사 권한 필요" }, { status: 403 });
    }

    const body = await req.json();
    const { date, time, is_open } = body;

    if (!date || !time || is_open === undefined) {
      return NextResponse.json(
        { error: "date, time, is_open 필요" },
        { status: 400 }
      );
    }

    const { data: holidayRow } = await adminSupabase
      .from("agent_holidays")
      .select("holiday_date")
      .eq("agent_id", user.id)
      .eq("holiday_date", date)
      .maybeSingle();

    if (holidayRow?.holiday_date) {
      return NextResponse.json({ error: "Holiday closed" }, { status: 409 });
    }

    // upsert
    const { error } = await adminSupabase
      .from("agent_slot_overrides")
      .upsert(
        {
          agent_id: user.id,
          slot_date: date,
          slot_time: time,
          is_open,
        },
        { onConflict: "agent_id,slot_date,slot_time" }
      );

    if (error) {
      console.error("슬롯 오버라이드 오류:", error);
      return NextResponse.json({ error: "저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("슬롯 API 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
