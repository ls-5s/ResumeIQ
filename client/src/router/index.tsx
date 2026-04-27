import { createBrowserRouter, redirect } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "../layout/layout";
import NotFound from "../pages/NotFound";
import { PageLoader } from "../components/PageLoader";
import { useLoginStore } from "../store/Login";

// 懒加载页面组件
const Login = lazy(() => import("../pages/login/Login"));
const GithubCallback = lazy(() => import("../pages/auth/GithubCallback"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Activities = lazy(() => import("../pages/activities/Activities"));
const Resumes = lazy(() => import("../pages/resumes/Resumes"));
const ResumesAll = lazy(() => import("../pages/resumes/ResumesAll"));

const Aiscreening = lazy(() => import("../pages/aiscreening/aiscreening"));
const ScreeningTemplate = lazy(() => import("../pages/screeningtemplate/ScreeningTemplate"));
const InterviewQuestions = lazy(() => import("../pages/interview/InterviewQuestions"));
const Settings = lazy(() => import("../pages/settings/Settings"));
const EmailTemplates = lazy(() => import("../pages/emails/EmailTemplates"));
const InvitePage = lazy(() => import("../pages/invite/InvitePage"));
const ShareQuestion = lazy(() => import("../pages/share/ShareQuestion"));

// 路由守卫：检查是否已登录
const requireAuth = () => {
  const token = useLoginStore.getState().token;
  if (!token) {
    throw redirect("/?redirect=unauthorized");
  }
  return null;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/auth/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/auth/github/callback",
    element: <GithubCallback />,
  },
  {
    path: "/app",
    loader: requireAuth,
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "activities",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Activities />
          </Suspense>
        ),
      },
      {
        path: "resumes/all",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ResumesAll />
          </Suspense>
        ),
      },
      {
        path: "resumes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Resumes />
          </Suspense>
        ),
      },

      {
        path: "aiscreening",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Aiscreening />
          </Suspense>
        ),
      },
      {
        path: "interview-questions",
        element: (
          <Suspense fallback={<PageLoader />}>
            <InterviewQuestions />
          </Suspense>
        ),
      },
      {
        path: "screening-template",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ScreeningTemplate />
          </Suspense>
        ),
      },
      {
        path: "emails",
        element: (
          <Suspense fallback={<PageLoader />}>
            <EmailTemplates />
          </Suspense>
        ),
      },
      {
        path: "settings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
    errorElement: <NotFound />,
  },
  {
    path: "/invite/:token",
    element: (
      <Suspense fallback={<PageLoader />}>
        <InvitePage />
      </Suspense>
    ),
  },
  {
    path: "/share/:data",
    element: (
      <Suspense fallback={<PageLoader />}>
        <ShareQuestion />
      </Suspense>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
