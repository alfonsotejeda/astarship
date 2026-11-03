import type { ComponentType } from "react";
import { Navigate, useParams } from "react-router";
import { findReport } from "./reports";
import type { ReportKey } from "./reports";
import { PendingReport } from "./ReportTemplate";
import { Rc3 } from "./reports/Rc3";
import "./ReportsPage.css";

// Each query (#106–#111) adds its report here, from reports/RcN.tsx built on ReportTemplate
const REPORT_VIEWS: Partial<Record<ReportKey, ComponentType>> = { rc3: Rc3 };

export function ReportsPage() {
  const { rc } = useParams();
  const report = findReport(rc);

  if (!report) return <Navigate to="/reports/rc1" replace />;

  const View = REPORT_VIEWS[report.key];
  // The key resets each report's filters when switching tabs
  return View ? <View key={report.key} /> : <PendingReport rc={report.key} />;
}
