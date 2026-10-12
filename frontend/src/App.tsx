import { useState } from "react";
import GlobalHeader, { PageType } from "./components/GlobalHeader";
import WelcomePage from "./components/WelcomePage";
import ChatPage from "./components/ChatExpertPage";
import TourIntroPage from "./components/TourIntroPage";
import MapPlanPage from "./components/MapPlanPage";
import TripSetupPage from "./components/TripSetupPage";
import OnboardingPage, { OnboardingData } from "./components/OnboardingPage";
import PrepPage from "./components/PrepPage";
import type { PlanResult, Place } from "./lib/types";
import { logout as clearBackendSession, resetSession } from "./lib/chatExpert";
import { clearGlobalCache } from "./components/MapPlanPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("welcome");
  const [tripDays, setTripDays] = useState<number>(3); // 用户选择的行程天数
  const [travelPlan, setTravelPlan] = useState<PlanResult | null>(null); // 生成的行程数据
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null); // 引导页采集的数据
  const [confirmedDays, setConfirmedDays] = useState<Set<number>>(new Set()); // 已确认的天数
  const [manualAddedPlaces, setManualAddedPlaces] = useState<Record<number, Place[]>>({}); // 手动添加的景点
  const [hasVisitedMapPlan, setHasVisitedMapPlan] = useState<boolean>(false); // 是否已经访问过地图规划页

  // 退出登录：清除所有用户数据（前端 + 后端对话历史），回到欢迎页
  const handleLogout = async () => {
    // 清除后端对话历史（Redis/内存）
    try {
      await clearBackendSession();
    } catch (e) {
      console.warn("清除后端对话历史失败:", e);
    }
    
    // 重置前端会话ID
    resetSession();
    
    // 清除地图页全局缓存（景点、行程、聊天记录等）
    clearGlobalCache();
    
    // 清除前端状态
    setOnboardingData(null);
    setTravelPlan(null);
    setTripDays(3);
    setConfirmedDays(new Set());
    setManualAddedPlaces({});
    setHasVisitedMapPlan(false);
    setCurrentPage("welcome");
  };

  // 导航处理：已填写过信息或已访问过地图页则直接进入行程规划页
  const handleNavigate = (page: PageType) => {
    if (page === "mapPlan") {
      // 如果已经有用户数据，或者已经访问过地图页，或者已经确认过行程，直接进入地图规划页
      if (onboardingData || hasVisitedMapPlan || confirmedDays.size > 0) {
        setCurrentPage("mapPlan");
      } else {
        setCurrentPage("onboarding");
      }
    } else {
      setCurrentPage(page);
    }
  };

  // 从地图页返回信息收集页（用于修改偏好）
  const handleBackToOnboarding = () => {
    setCurrentPage("onboarding");
  };

  // 行程更新回调（用户手动修改并确认后触发）
  const handlePlanUpdated = (updatedPlan: PlanResult, newConfirmedDays: Set<number>, newManualPlaces?: Record<number, Place[]>) => {
    setTravelPlan(updatedPlan);
    setConfirmedDays(newConfirmedDays);
    if (newManualPlaces !== undefined) {
      setManualAddedPlaces(newManualPlaces);
    }
  };

  // 手动添加景点更新回调
  const handleManualPlacesChange = (places: Record<number, Place[]>) => {
    setManualAddedPlaces(places);
  };

  // 渲染页面内容
  const renderPageContent = () => {
    switch (currentPage) {
      case "chat":
        return <ChatPage />;
      case "intro":
        return <TourIntroPage onStartExplore={() => setCurrentPage("chat")} />;
      case "tripSetup":
        return (
          <TripSetupPage
            onConfirm={(days) => {
              setTripDays(days);
              setHasVisitedMapPlan(true);
              setCurrentPage("mapPlan");
            }}
          />
        );
      case "onboarding":
        return (
          <OnboardingPage
            onComplete={(data) => {
              setOnboardingData(data);
              setTripDays(data.travel_days);
              setHasVisitedMapPlan(true);
              setCurrentPage("mapPlan");
            }}
            onBack={() => setCurrentPage("chat")}
            onSkip={() => {
              setHasVisitedMapPlan(true);
              setCurrentPage("mapPlan");
            }}
            initialData={onboardingData}
          />
        );
      case "mapPlan":
        return (
          <MapPlanPage
            dark={true}
            tripDays={tripDays}
            onboardingData={onboardingData}
            onPlanGenerated={(plan) => setTravelPlan(plan)}
            onPlanUpdated={handlePlanUpdated}
            onManualPlacesChange={handleManualPlacesChange}
            confirmedDays={confirmedDays}
            manualAddedPlaces={manualAddedPlaces}
            onGoToPrep={() => setCurrentPage("prepReady")}
            onBackToOnboarding={handleBackToOnboarding}
          />
        );
      case "prepReady":
        return <PrepPage tripDays={tripDays} travelPlan={travelPlan} manualAddedPlaces={manualAddedPlaces} />;
      default:
        return <WelcomePage onEnter={() => setCurrentPage("intro")} />;
    }
  };

  return (
    <div className="h-dvh w-full bg-[#060813] text-slate-100 flex flex-col overflow-hidden">
      {/* 非欢迎页和引导页显示顶部导航：固定高度，不收缩 */}
      {currentPage !== "welcome" && currentPage !== "onboarding" && (
        <div className="flex-shrink-0 z-10">
          <GlobalHeader
            currentPage={currentPage}
            hasValidPlan={!!travelPlan}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </div>
      )}
      
      {/* 页面内容：占满剩余高度，内容超出时自动滚动，不再强制裁剪 */}
      <div className="flex-1 min-h-0 w-full overflow-auto relative">
        {renderPageContent()}
      </div>
    </div>
  );
}