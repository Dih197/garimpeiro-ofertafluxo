import { redirect } from "next/navigation";

// Analytics foi consolidado dentro do Painel ROI (/roas)
export default function AnalyticsPage() {
  redirect("/roas");
}
